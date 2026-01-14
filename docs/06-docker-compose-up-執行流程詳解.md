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

**重要**：當容器啟動時，會執行 Dockerfile 中的 `CMD` 指令。在這個專案中：
- `CMD ["pnpm", "dev"]` 會在容器啟動時執行
- 這對應到 `package.json` 中的 `"dev": "vite"` 腳本
- 因此 `pnpm run dev` 是在容器啟動時執行的，不是構建時

### docker attach

**用途**：附加到運行中容器的標準輸出

## 關鍵問題：`pnpm run dev` 和 `pnpm run build` 何時執行？

### `pnpm run build` 的執行時機

**執行時機**：構建映像檔時（`docker build`）

**Dockerfile 位置**：
```dockerfile
# 第 68 行，在 build 階段
RUN pnpm run build
```

**對應的 Docker 指令**：
```bash
# 在執行 docker build 時，會執行這個 RUN 指令
docker build --target build --file Dockerfile .
```

**注意**：`docker build` 命令必須包含構建上下文（最後的 `.`），這是必需的參數。

**說明**：
- 這是在構建映像檔的過程中執行的
- 屬於 `build` 階段的一部分
- 執行時會在**容器內部**產生 `dist/` 目錄
- 產物會被複製到 `production` 階段

**重要**：`dist/` 目錄是在容器內部產生的，**不會自動出現在主機上**。如果需要在主機上看到 `dist/` 目錄，需要額外操作（見下方說明）。

**實際流程**：
```
docker build --target build --file Dockerfile .
  ↓
執行 Dockerfile 的 build 階段
  ↓
執行 RUN pnpm run build（第 68 行）
  ↓
在容器內部產生 dist/ 目錄
  ↓
構建完成（dist/ 包含在映像檔中，但不在主機上）
```

**注意**：
- `docker build` 命令必須包含構建上下文（通常是 `.` 表示當前目錄），否則會報錯
- `dist/` 目錄是在容器內部產生的，**不會自動複製到主機**
- 如果需要在主機上看到 `dist/` 目錄，見下方「如何從容器中提取 dist/ 目錄」

### `pnpm run dev` 的執行時機

**執行時機**：容器啟動時（`docker start` 或 `docker run`）

**Dockerfile 位置**：
```dockerfile
# 第 45 行，在 development 階段
CMD ["pnpm", "dev"]
```

**對應的 Docker 指令**：
```bash
# 當容器啟動時，會執行這個 CMD
docker start sen-ba-li-18-dev
# 或
docker run sen-ba-li-18-docker-app:latest
```

**說明**：
- 這是在容器啟動時執行的，不是構建時
- `CMD` 指令定義了容器的預設啟動命令
- 當容器啟動後，會執行 `pnpm dev`，啟動 Vite 開發伺服器
- 這對應到 `package.json` 中的 `"dev": "vite"` 腳本

**實際流程**：
```
docker start sen-ba-li-18-dev
  ↓
容器啟動
  ↓
執行 CMD ["pnpm", "dev"]（第 45 行）
  ↓
執行 pnpm dev → vite
  ↓
Vite 開發伺服器運行在 5173 端口
```

### 兩者的差異對比

| 項目 | `pnpm run build` | `pnpm run dev` |
|------|-----------------|---------------|
| **Dockerfile 指令** | `RUN pnpm run build` | `CMD ["pnpm", "dev"]` |
| **執行時機** | 構建映像檔時 | 容器啟動時 |
| **對應 Docker 指令** | `docker build` | `docker start` / `docker run` |
| **執行階段** | `build` 階段 | `development` 階段 |
| **目的** | 產生生產構建產物 | 啟動開發伺服器 |
| **產物** | `dist/` 目錄 | 運行中的開發伺服器 |
| **是否會持續運行** | ❌ 執行完即結束 | ✅ 持續運行直到容器停止 |

### 完整執行流程對照

#### 開發環境（使用 development 階段）

**完整流程（`docker compose up --build` 實際執行的所有步驟）**

```bash
# 1. 構建映像檔
docker build --target development
  ↓
執行 RUN 指令（安裝依賴、複製檔案等）
  ↓
映像檔構建完成（包含 CMD ["pnpm", "dev"]）

# 2. 建立網路（如果不存在）
docker network create sen-ba-li-18-docker_default

# 3. 創建容器（但尚未啟動）
docker create --name sen-ba-li-18-dev ...

# 4. 啟動容器
docker start sen-ba-li-18-dev
  ↓
執行 CMD ["pnpm", "dev"]
  ↓
執行 pnpm dev → vite
  ↓
Vite 開發伺服器運行

# 5. 附加到輸出（顯示日誌）
docker attach sen-ba-li-18-dev
```

**簡化版本（核心流程）**：
```bash
# 1. 構建映像檔
docker build --target development --file Dockerfile .
  ↓
映像檔構建完成（包含 CMD ["pnpm", "dev"]）

# 2. 啟動容器
docker start sen-ba-li-18-dev
  ↓
執行 CMD ["pnpm", "dev"]
  ↓
執行 pnpm dev → vite
  ↓
Vite 開發伺服器運行
```

**注意**：所有 `docker build` 命令都需要構建上下文（最後的 `.`），這是必需的參數。

**總結**：
- ✅ `docker compose up --build` 確實會執行構建和啟動容器的核心流程
- ✅ 但還包括建立網路、創建容器、附加輸出等額外步驟
- ✅ 這些額外步驟是 Docker Compose 自動處理的，讓整個過程更簡單

#### 生產環境（使用 production 階段）

**執行指令**：
```bash
docker compose --profile production up --build
```

**完整流程**：

```bash
# 1. 構建映像檔（包含 build 階段）
docker build --target build --file Dockerfile .
  ↓
執行 RUN pnpm run build（第 68 行）
  ↓
產生 dist/ 目錄

# 2. 構建 production 階段
docker build --target production --file Dockerfile .
  ↓
從 build 階段複製 dist/ 到 nginx

# 3. 建立網路（如果不存在）
docker network create sen-ba-li-18-docker_default

# 4. 創建容器
docker create --name sen-ba-li-18-prod ...

# 5. 啟動容器
docker start sen-ba-li-18-prod
  ↓
執行 CMD ["nginx", "-g", "daemon off;"]
  ↓
nginx 提供靜態檔案服務
```

**說明**：
- `--profile production`：只啟動帶有 `profiles: - production` 標籤的服務
- `--build`：在啟動前先構建映像檔
- 生產環境會自動構建 `build` 階段（執行 `pnpm run build`），然後構建 `production` 階段

**等價的手動指令序列**：
```bash
# 1. 構建映像檔（會自動構建 build 和 production 階段）
docker build \
  --file Dockerfile \
  --target production \
  --tag sen-ba-li-18-docker-app-prod:latest \
  .

# 2. 建立網路（如果不存在）
docker network inspect sen-ba-li-18-docker_default >/dev/null 2>&1 || \
  docker network create sen-ba-li-18-docker_default

# 3. 創建容器
docker create \
  --name sen-ba-li-18-prod \
  --network sen-ba-li-18-docker_default \
  --publish 80:80/tcp \
  --restart unless-stopped \
  sen-ba-li-18-docker-app-prod:latest

# 4. 啟動容器
docker start sen-ba-li-18-prod
```

### 重要概念

1. **RUN vs CMD**：
   - `RUN`：在構建映像檔時執行，執行完即結束
   - `CMD`：在容器啟動時執行，通常會持續運行

2. **構建時 vs 運行時**：
   - 構建時：執行 `docker build` 的過程
   - 運行時：容器啟動後的執行過程

3. **階段選擇**：
   - `--target development`：使用 development 階段，包含 `CMD ["pnpm", "dev"]`
   - `--target build`：使用 build 階段，包含 `RUN pnpm run build`
   - `--target production`：使用 production 階段，使用 nginx 提供服務

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

### docker compose --profile production up --build（生產環境）

```bash
docker compose --profile production up --build
```

**說明**：
- `--profile production`：只啟動帶有 `profiles: - production` 標籤的服務
- 會構建 `production` 階段，自動包含 `build` 階段的構建
- 啟動 nginx 容器提供靜態檔案服務
- 端口映射為 `80:80`

**完整流程**：
1. 構建 `build` 階段（執行 `pnpm run build`，產生 `dist/`）
2. 構建 `production` 階段（複製 `dist/` 到 nginx）
3. 建立網路
4. 創建並啟動容器
5. nginx 開始提供服務

## 常見問題

### 為什麼執行 `docker build --target build` 後主機上沒有 `dist/` 目錄？

**原因**：
- `docker build` 只會構建映像檔，不會將容器內的檔案複製回主機
- `dist/` 目錄是在構建過程中的臨時容器內產生的
- 構建完成後，`dist/` 會包含在映像檔中，但不會自動出現在主機上

**解決方案**：

#### 方法一：從映像檔中提取檔案（推薦，跨平台）

```bash
# 1. 構建映像檔
docker build --target build --file Dockerfile . -t my-app:build

# 2. 創建臨時容器並複製 dist/ 到主機
docker create --name temp-container my-app:build
docker cp temp-container:/app/dist ./dist
docker rm temp-container
```

**說明**：此方法在所有平台（Windows、Linux、Mac）上都能正常運作。

#### 方法二：使用 docker run 掛載卷

**Linux/Mac**：
```bash
# 1. 構建映像檔
docker build --target build --file Dockerfile . -t my-app:build

# 2. 運行容器並掛載當前目錄
docker run --rm -v "$(pwd)/dist:/app/dist" my-app:build sh -c "pnpm run build"
```

**Windows (PowerShell)**：
```powershell
# 1. 構建映像檔
docker build --target build --file Dockerfile . -t my-app:build

# 2. 運行容器並掛載當前目錄（使用絕對路徑）
docker run --rm -v "${PWD}/dist:/app/dist" my-app:build sh -c "pnpm run build"
```

**Windows (CMD)**：
```cmd
# 1. 構建映像檔
docker build --target build --file Dockerfile . -t my-app:build

# 2. 運行容器並掛載當前目錄（使用 %CD%）
docker run --rm -v "%CD%\dist:/app/dist" my-app:build sh -c "pnpm run build"
```

**注意**：
- Windows 需要使用絕對路徑或環境變數
- PowerShell 使用 `${PWD}` 或 `$PWD`
- CMD 使用 `%CD%`
- 確保 `dist` 目錄存在，或 Docker 會自動創建

#### 方法三：直接在主機上構建（最簡單）

```bash
# 如果只是需要 dist/ 目錄，直接在主機上執行
pnpm run build
```

#### 方法四：使用 Docker Compose 構建並提取

```bash
# 1. 構建映像檔
docker compose build app-prod

# 2. 從生產映像檔中提取
docker create --name temp-prod sen-ba-li-18-docker-app-prod:latest
docker cp temp-prod:/usr/share/nginx/html ./dist
docker rm temp-prod
```

**說明**：
- 方法一和方法二適合需要從 Docker 構建中提取檔案的情況
- 方法三最簡單，適合開發時快速構建
- 方法四適合從生產映像檔中提取最終產物

## 總結

執行 `docker compose up --build` 實際上：

1. **構建映像檔**：執行 `docker build` 構建所有服務的映像檔
2. **建立網路**：執行 `docker network create` 建立專案網路
3. **建立卷**：自動建立所需的卷
4. **創建容器**：執行 `docker create` 為每個服務創建容器
5. **啟動容器**：執行 `docker start` 啟動所有容器
6. **附加輸出**：執行 `docker attach` 顯示容器日誌

所有這些操作都由 Docker Compose 自動協調執行，提供了一個簡化的介面來管理多容器應用程式。
