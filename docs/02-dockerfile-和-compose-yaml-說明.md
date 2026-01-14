# Dockerfile 和 compose.yaml 說明

本文件詳細說明 Dockerfile 和 compose.yaml 的作用、結構和寫法。

## Dockerfile

### 作用

Dockerfile 是用來定義如何構建 Docker 映像檔（Image）的指令檔。它包含了一系列指令，告訴 Docker 如何從基礎映像檔開始，逐步構建出包含你的應用程式的映像檔。

### 基本結構

```dockerfile
# 指定 Dockerfile 語法版本（Docker v2）
# syntax=docker/dockerfile:1.4

# 從基礎映像檔開始
FROM node:20-alpine

# 執行命令
RUN npm install -g pnpm

# 設定工作目錄
WORKDIR /app

# 複製檔案
COPY package.json ./

# 暴露端口
EXPOSE 5173

# 設定預設命令
CMD ["pnpm", "dev"]
```

### 常用指令說明

#### FROM
指定基礎映像檔，所有構建都從這裡開始。

```dockerfile
FROM node:20-alpine AS development
```

- `node:20-alpine`：使用 Node.js 20 的 Alpine Linux 版本（體積較小）
- `AS development`：為這個階段命名，用於多階段構建

#### RUN
在構建過程中執行命令。

```dockerfile
RUN npm install -g pnpm@10.24.0
RUN pnpm install --frozen-lockfile
```

#### WORKDIR
設定工作目錄，後續的指令都會在這個目錄下執行。

```dockerfile
WORKDIR /app
```

#### COPY
從主機複製檔案到容器內。

```dockerfile
# 複製單一檔案
COPY package.json ./

# 複製多個檔案
COPY package.json pnpm-lock.yaml ./

# 複製整個目錄
COPY . .

# 從其他階段複製（多階段構建）
COPY --from=deps /app/node_modules ./node_modules
```

#### EXPOSE
聲明容器會使用的端口（僅為文檔說明，實際映射在 compose.yaml 中設定）。

```dockerfile
EXPOSE 5173
```

#### CMD
設定容器啟動時執行的預設命令。

```dockerfile
CMD ["pnpm", "dev"]
```

### 多階段構建（Multi-stage Build）

多階段構建可以：
- 減少最終映像檔大小
- 分離開發、構建和生產環境
- 提高構建效率（利用快取）

```dockerfile
# 階段 1: 依賴安裝
FROM node:20-alpine AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# 階段 2: 開發環境
FROM node:20-alpine AS development
COPY --from=deps /app/node_modules ./node_modules
COPY . .
CMD ["pnpm", "dev"]

# 階段 3: 構建
FROM node:20-alpine AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm run build

# 階段 4: 生產環境
FROM nginx:alpine AS production
COPY --from=build /app/dist /usr/share/nginx/html
```

### 最佳實踐

1. **利用層快取**：將不常變動的檔案（如 `package.json`）先複製，再安裝依賴
2. **使用 .dockerignore**：排除不需要的檔案，減少構建上下文大小
3. **多階段構建**：分離不同環境的需求
4. **使用 Alpine 映像檔**：減少映像檔大小
5. **固定版本**：避免使用 `latest` 標籤，確保構建可重現

## compose.yaml

### 作用

Docker Compose 用於定義和運行多容器 Docker 應用程式。透過 YAML 檔案配置應用程式的服務、網路、卷等，可以一次性啟動整個應用程式堆疊。

### 基本結構

```yaml
services:
  app:
    build: .
    ports:
      - "5173:5173"
    volumes:
      - .:/app
```

### 常用配置說明

#### services
定義應用程式的各個服務（容器）。

```yaml
services:
  app:          # 服務名稱
    build:      # 構建配置區塊（告訴 Docker Compose 如何構建映像檔）
      context: .              # 構建上下文目錄
      dockerfile: Dockerfile  # Dockerfile 路徑
      target: development     # 多階段構建的目標階段（指定使用 Dockerfile 中的哪個階段）
```

**重要說明**：
- `build:` 是 Docker Compose 的配置區塊，用於指定如何構建映像檔
- `target:` 指定使用 Dockerfile 中哪個多階段構建的階段
  - `target: development` → 使用 Dockerfile 中的 `AS development` 階段
  - `target: build` → 使用 Dockerfile 中的 `AS build` 階段（僅用於構建，不直接用於運行）
  - `target: production` → 使用 Dockerfile 中的 `AS production` 階段

#### ports
映射主機端口到容器端口。

```yaml
ports:
  - "5173:5173"        # 主機端口:容器端口
  - "3000:3000"        # 可以映射多個端口
```

#### volumes
掛載主機目錄或命名卷到容器內。

```yaml
volumes:
  - .:/app                    # 掛載當前目錄到容器的 /app
  - /app/node_modules         # 匿名卷，排除 node_modules（使用容器內的版本）
  - my-data:/data             # 命名卷
```

#### environment
設定環境變數。

```yaml
environment:
  - NODE_ENV=development
  - API_URL=http://api.example.com
```

或使用檔案：

```yaml
env_file:
  - .env
  - .env.local
```

#### restart
設定容器重啟策略。

```yaml
restart: unless-stopped
```

選項：
- `no`：不自動重啟（預設）
- `always`：總是重啟
- `on-failure`：失敗時重啟
- `unless-stopped`：除非手動停止，否則總是重啟

#### profiles
使用 profile 來控制服務的啟動。

```yaml
profiles:
  - production
```

啟動時使用：
```bash
docker compose --profile production up
```

#### develop.watch（Docker Compose v2.22+）
配置檔案監控，用於 `docker compose watch` 命令。

```yaml
develop:
  watch:
    # sync: 即時同步檔案到容器（最快，無需重啟）
    - action: sync
      path: ./src
      target: /app/src
    
    # rebuild: 重建映像檔並重啟容器（用於依賴變更）
    - action: rebuild
      path: ./package.json
    
    # sync+restart: 同步檔案並重啟容器（用於配置變更）
    - action: sync+restart
      path: ./vite.config.ts
      target: /app/vite.config.ts
```

**Watch Actions**：
- `sync`: 即時同步檔案到運行中的容器，無需重啟（最快）
- `rebuild`: 重建映像檔並重啟容器（用於需要重新構建的情況）
- `sync+restart`: 同步檔案後重啟容器（用於需要重啟才能生效的變更）

**使用方式**：
```bash
docker compose watch  # 啟動並監控檔案變更
```

### 完整範例

```yaml
services:
  # 開發環境
  app:
    build:
      context: .
      dockerfile: Dockerfile
      target: development
    container_name: my-app-dev
    ports:
      - "5173:5173"
    volumes:
      - .:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
    stdin_open: true
    tty: true
    restart: unless-stopped

  # 生產環境
  app-prod:
    build:
      context: .
      dockerfile: Dockerfile
      target: production
    container_name: my-app-prod
    ports:
      - "80:80"
    restart: unless-stopped
    profiles:
      - production
```

### 常用命令

```bash
# 構建並啟動服務
docker compose up --build

# 使用 watch 模式（推薦，Docker Compose v2.22+）
docker compose watch

# 在背景執行
docker compose up -d

# 停止服務
docker compose down

# 查看日誌
docker compose logs -f

# 執行命令
docker compose exec app pnpm install

# 使用特定 profile
docker compose --profile production up
```

### 最佳實踐

1. **使用命名容器**：`container_name` 方便識別和管理
2. **掛載開發目錄**：開發時掛載原始碼目錄以實現熱重載
3. **排除 node_modules**：使用匿名卷排除，避免主機和容器版本衝突
4. **使用 profiles**：分離開發和生產環境配置
5. **設定 restart 策略**：確保服務穩定性

## 兩者的關係

- **Dockerfile**：定義如何構建映像檔（Image）
- **compose.yaml**：定義如何運行容器（Container），可以指定使用哪個映像檔或如何構建

```
Dockerfile → 構建 → Image → compose.yaml → 運行 → Container
```

## 參考資源

- [Dockerfile 參考文件](https://docs.docker.com/reference/dockerfile/)
- [Docker Compose 文件](https://docs.docker.com/compose/)
- [Docker 最佳實踐](https://docs.docker.com/develop/dev-best-practices/)
