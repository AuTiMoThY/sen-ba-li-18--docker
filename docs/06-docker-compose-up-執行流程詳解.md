# docker compose up --build 執行流程詳解

本文件詳細說明執行 `docker compose up --build` 時，實際上發生了什麼事，以及內部執行了哪些 Docker 指令。

## 命令解析

```bash
docker compose up --build
```

**參數說明**：
- `docker compose`：Docker Compose v2 命令
- `up`：啟動服務
- `--build`：在啟動前先構建映像檔

## 完整執行流程

### 階段一：讀取和解析配置

```
1. 讀取 compose.yaml
   ↓
2. 解析服務定義（services）
   ↓
3. 檢查依賴關係
   ↓
4. 確定構建順序
```

**內部操作**：
- 讀取 `compose.yaml` 檔案
- 解析 YAML 語法
- 驗證配置格式
- 檢查服務之間的依賴關係

### 階段二：構建映像檔（Build Phase）

當使用 `--build` 參數時，會先執行構建階段。

#### 2.1 構建上下文準備

**實際執行的指令**（隱含）：
```bash
# Docker Compose 內部會執行類似以下的操作
docker build \
  --file Dockerfile \
  --target development \
  --tag sen-ba-li-18-docker-app:latest \
  --build-arg BUILDKIT_INLINE_CACHE=1 \
  .
```

**說明**：
- `--file Dockerfile`：指定 Dockerfile 路徑
- `--target development`：指定多階段構建的目標階段
- `--tag`：為映像檔打標籤（格式：`專案名-服務名:latest`）
- `.`：構建上下文（當前目錄）

#### 2.2 執行 Dockerfile 構建

**實際執行的 Docker 指令序列**：

```bash
# 步驟 1: 構建 deps 階段
docker build \
  --target deps \
  --tag sen-ba-li-18-docker-app:deps \
  .

# 內部執行：
# FROM node:20-alpine AS deps
# RUN npm install -g pnpm@10.24.0
# WORKDIR /app
# COPY package.json pnpm-lock.yaml ./
# RUN pnpm install --frozen-lockfile

# 步驟 2: 構建 development 階段
docker build \
  --target development \
  --tag sen-ba-li-18-docker-app:latest \
  --from deps \
  .

# 內部執行：
# FROM node:20-alpine AS development
# RUN npm install -g pnpm@10.24.0
# WORKDIR /app
# COPY --from=deps /app/node_modules ./node_modules
# COPY package.json pnpm-lock.yaml ./
# COPY . .
# EXPOSE 5173
# CMD ["pnpm", "dev"]
```

**實際的 Docker 層級操作**：

```
Layer 1: FROM node:20-alpine AS deps
  ↓ (快取檢查)
Layer 2: RUN npm install -g pnpm@10.24.0
  ↓ (快取檢查)
Layer 3: WORKDIR /app
  ↓ (快取檢查)
Layer 4: COPY package.json pnpm-lock.yaml ./
  ↓ (檢查檔案變更)
Layer 5: RUN pnpm install --frozen-lockfile
  ↓ (如果 Layer 4 變更，重新執行)
Layer 6: FROM node:20-alpine AS development
  ↓
Layer 7: COPY --from=deps /app/node_modules ./node_modules
  ↓
Layer 8: COPY package.json pnpm-lock.yaml ./
  ↓
Layer 9: COPY . .
  ↓
Layer 10: EXPOSE 5173
  ↓
Layer 11: CMD ["pnpm", "dev"]
```

#### 2.3 構建上下文處理

**實際操作**：
```bash
# Docker 會：
1. 讀取 .dockerignore
2. 過濾不需要的檔案
3. 準備構建上下文（tar 檔案）
4. 發送到 Docker daemon
```

**等價的指令**：
```bash
# 類似於手動執行
tar --exclude-from=.dockerignore -czf - . | \
  docker build --file Dockerfile --target development -
```

### 階段三：建立網路（Network）

**實際執行的指令**：
```bash
docker network create \
  --driver bridge \
  --label com.docker.compose.project=sen-ba-li-18-docker \
  --label com.docker.compose.network=default \
  sen-ba-li-18-docker_default
```

**說明**：
- 建立一個橋接網路
- 網路名稱格式：`專案名_網路名`
- 如果網路已存在，會跳過此步驟

### 階段四：建立卷（Volumes）

**實際執行的指令**：
```bash
# 對於匿名卷 /app/node_modules
# Docker 會自動建立一個匿名卷

# 對於命名卷（如果有）
docker volume create \
  --label com.docker.compose.project=sen-ba-li-18-docker \
  sen-ba-li-18-docker_volume_name
```

**說明**：
- 匿名卷會在容器創建時自動建立
- 命名卷需要明確建立

### 階段五：創建容器（Container Creation）

**實際執行的指令**：
```bash
docker create \
  --name sen-ba-li-18-dev \
  --label com.docker.compose.project=sen-ba-li-18-docker \
  --label com.docker.compose.service=app \
  --label com.docker.compose.version=1.29.2 \
  --network sen-ba-li-18-docker_default \
  --publish 5173:5173/tcp \
  --volume /path/to/project:/app \
  --volume /app/node_modules \
  --env NODE_ENV=development \
  --env-file .env \
  --stdin \
  --tty \
  --restart unless-stopped \
  sen-ba-li-18-docker-app:latest
```

**參數對應**：

| compose.yaml 配置 | Docker 指令參數 |
|------------------|----------------|
| `container_name: sen-ba-li-18-dev` | `--name sen-ba-li-18-dev` |
| `ports: - "5173:5173"` | `--publish 5173:5173/tcp` |
| `volumes: - .:/app` | `--volume /path/to/project:/app` |
| `volumes: - /app/node_modules` | `--volume /app/node_modules` |
| `environment: - NODE_ENV=development` | `--env NODE_ENV=development` |
| `stdin_open: true` | `--stdin` |
| `tty: true` | `--tty` |
| `restart: unless-stopped` | `--restart unless-stopped` |

### 階段六：啟動容器（Container Start）

**實際執行的指令**：
```bash
docker start sen-ba-li-18-dev
```

**內部操作**：
1. 執行 Dockerfile 中的 `CMD ["pnpm", "dev"]`
2. 啟動進程
3. 綁定端口
4. 掛載卷

### 階段七：附加到輸出（Attach）

**實際執行的指令**：
```bash
docker attach sen-ba-li-18-dev
# 或
docker logs -f sen-ba-li-18-dev
```

**說明**：
- 將容器的標準輸出和錯誤輸出連接到終端
- 可以看到應用程式的日誌輸出

## 完整指令序列總結

執行 `docker compose up --build` 實際上等價於以下指令序列：

```bash
# 1. 構建映像檔
docker build \
  --file Dockerfile \
  --target development \
  --tag sen-ba-li-18-docker-app:latest \
  .

# 2. 建立網路（如果不存在）
docker network inspect sen-ba-li-18-docker_default >/dev/null 2>&1 || \
  docker network create sen-ba-li-18-docker_default

# 3. 創建容器
docker create \
  --name sen-ba-li-18-dev \
  --network sen-ba-li-18-docker_default \
  --publish 5173:5173/tcp \
  --volume "$(pwd):/app" \
  --volume /app/node_modules \
  --env NODE_ENV=development \
  --stdin --tty \
  --restart unless-stopped \
  sen-ba-li-18-docker-app:latest

# 4. 啟動容器
docker start sen-ba-li-18-dev

# 5. 附加到輸出
docker attach sen-ba-li-18-dev
```

## 與手動執行 Docker 指令的對比

### 使用 Docker Compose（推薦）

```bash
docker compose up --build
```

**優點**：
- 一條命令完成所有操作
- 自動管理網路和卷
- 自動處理服務依賴
- 統一的配置管理

### 手動執行 Docker 指令

```bash
# 需要手動執行多個指令
docker build -t my-app .
docker network create my-network
docker run -d --name my-app --network my-network -p 5173:5173 my-app
docker logs -f my-app
```

**缺點**：
- 需要多個指令
- 需要手動管理網路和卷
- 容易出錯
- 配置分散

## 實際執行時的輸出

當你執行 `docker compose up --build` 時，會看到類似以下的輸出：

```
[+] Building 15.2s (15/15) FINISHED
 => [internal] load build definition from Dockerfile
 => => transferring dockerfile: 2.45kB
 => [internal] load .dockerignore
 => => transferring context: 1.23kB
 => [internal] load metadata for docker.io/library/node:20-alpine
 => [deps 1/5] FROM docker.io/library/node:20-alpine
 => [internal] load build context
 => => transferring context: 45.67MB
 => [deps 2/5] RUN npm install -g pnpm@10.24.0
 => [deps 3/5] WORKDIR /app
 => [deps 4/5] COPY package.json pnpm-lock.yaml ./
 => [deps 5/5] RUN pnpm install --frozen-lockfile
 => [development 1/6] FROM docker.io/library/node:20-alpine
 => [development 2/6] COPY --from=deps /app/node_modules ./node_modules
 => [development 3/6] COPY package.json pnpm-lock.yaml ./
 => [development 4/6] COPY . .
 => [development 5/6] EXPOSE 5173
 => [development 6/6] CMD ["pnpm", "dev"]
 => => exporting to image
 => => => exporting layers
 => => => writing image sha256:abc123...
 => => => naming to docker.io/library/sen-ba-li-18-docker-app:latest

[+] Running 2/2
 ✔ Network sen-ba-li-18-docker_default    Created
 ✔ Container sen-ba-li-18-dev             Created
Attaching to sen-ba-li-18-dev

sen-ba-li-18-dev  | > vite-project@0.0.0 dev /app
sen-ba-li-18-dev  | > vite
sen-ba-li-18-dev  | 
sen-ba-li-18-dev  |   VITE v7.3.1  ready in 568 ms
sen-ba-li-18-dev  | 
sen-ba-li-18-dev  |   ➜  Local:   http://localhost:5173/
sen-ba-li-18-dev  |   ➜  Network: http://172.19.0.2:5173/
```

## 關鍵 Docker 指令說明

### docker build

**用途**：構建 Docker 映像檔

**主要參數**：
- `--file`：指定 Dockerfile 路徑
- `--target`：指定多階段構建的目標階段
- `--tag`：為映像檔打標籤
- `--build-arg`：傳遞構建參數

### docker network create

**用途**：建立 Docker 網路

**主要參數**：
- `--driver`：網路驅動程式（bridge、host、overlay 等）
- `--label`：為網路添加標籤

### docker create

**用途**：創建容器但不啟動

**主要參數**：
- `--name`：容器名稱
- `--network`：加入的網路
- `--publish`：端口映射
- `--volume`：卷掛載
- `--env`：環境變數

### docker start

**用途**：啟動已創建的容器

### docker attach

**用途**：附加到運行中容器的標準輸出

## 執行時間線

```
T+0s    : 開始讀取 compose.yaml
T+0.1s  : 解析配置完成
T+0.2s  : 開始構建映像檔
T+5s    : 構建 deps 階段完成
T+10s   : 構建 development 階段完成
T+10.1s : 建立網路
T+10.2s : 創建容器
T+10.3s : 啟動容器
T+10.4s : 附加到輸出
T+11s   : Vite 啟動完成
```

## 與其他命令的關係

### docker compose up（無 --build）

```bash
docker compose up
```

**差異**：
- 不會執行 `docker build`
- 直接使用現有的映像檔
- 如果映像檔不存在，會自動構建

### docker compose build

```bash
docker compose build
```

**差異**：
- 只構建映像檔，不啟動容器
- 等價於只執行構建階段

### docker compose up -d

```bash
docker compose up -d --build
```

**差異**：
- `-d` 表示背景執行（detached mode）
- 不會執行 `docker attach`
- 容器在背景運行

## 總結

執行 `docker compose up --build` 實際上：

1. **構建映像檔**：執行 `docker build` 構建所有服務的映像檔
2. **建立網路**：執行 `docker network create` 建立專案網路
3. **建立卷**：自動建立所需的卷
4. **創建容器**：執行 `docker create` 為每個服務創建容器
5. **啟動容器**：執行 `docker start` 啟動所有容器
6. **附加輸出**：執行 `docker attach` 顯示容器日誌

所有這些操作都由 Docker Compose 自動協調執行，提供了一個簡化的介面來管理多容器應用程式。
