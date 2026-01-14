# 如何在新專案中加入 Docker

本文件說明如何在新的專案中快速加入 Docker 支援。

## 前置需求

- 已安裝 Docker Desktop 或 Docker Engine（版本 20.10+）
- 已安裝 Docker Compose（版本 2.0+，通常包含在 Docker Desktop 中）

## 步驟一：建立 Dockerfile

在專案根目錄建立 `Dockerfile` 檔案，內容範例如下：

```dockerfile
# syntax=docker/dockerfile:1.4

# ============================================
# 依賴安裝階段 (Dependencies Stage)
# ============================================
FROM node:20-alpine AS deps

RUN npm install -g pnpm@10.24.0

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile

# ============================================
# 開發階段 (Development Stage)
# ============================================
FROM node:20-alpine AS development

RUN npm install -g pnpm@10.24.0

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package.json pnpm-lock.yaml ./
COPY . .

EXPOSE 5173

CMD ["pnpm", "dev"]

# ============================================
# 建置階段 (Build Stage)
# ============================================
FROM node:20-alpine AS build

RUN npm install -g pnpm@10.24.0

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package.json pnpm-lock.yaml ./
COPY . .

RUN pnpm run build

# ============================================
# 生產階段 (Production Stage)
# ============================================
FROM nginx:alpine AS production

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### 根據專案類型調整

- **Node.js 版本**：根據專案需求調整 `node:20-alpine`
- **套件管理器**：如果使用 npm 或 yarn，調整對應的安裝和執行命令
- **端口號**：根據專案的開發伺服器端口調整 `EXPOSE` 和端口映射
- **構建命令**：根據 `package.json` 中的 scripts 調整

## 步驟二：建立 compose.yaml

在專案根目錄建立 `compose.yaml` 檔案（或 `docker-compose.yml`），內容範例如下：

```yaml
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
      target: development
    container_name: your-project-dev
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

  app-prod:
    build:
      context: .
      dockerfile: Dockerfile
      target: production
    container_name: your-project-prod
    ports:
      - "80:80"
    restart: unless-stopped
    profiles:
      - production
```

### 調整項目

- **container_name**：改為專案名稱
- **ports**：根據專案端口調整
- **volumes**：確保掛載路徑正確

## 步驟三：建立 .dockerignore

在專案根目錄建立 `.dockerignore` 檔案，排除不需要複製到容器的檔案：

```
node_modules
dist
.git
.gitignore
.env.local
.env.*.local
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
.DS_Store
*.log
.vscode
.idea
```

## 步驟四：測試 Docker 設定

### 開發環境

**推薦方式（使用 watch，Docker Compose v2.22+）：**

```bash
# 使用 watch 模式，自動監控檔案變更
docker compose watch
```

**傳統方式：**

```bash
# 構建並啟動開發容器
docker compose up --build

# 或使用舊版語法
docker-compose up --build
```

**差異說明**：
- `docker compose watch`：自動監控檔案變更並同步到容器，無需手動重建
- `docker compose up --build`：一次性構建並啟動，檔案變更後需手動重建

> 💡 **建議**：如果使用 Docker Compose v2.22+，優先使用 `docker compose watch` 獲得更好的開發體驗。

### 生產環境

```bash
# 構建並啟動生產容器
docker compose --profile production up --build
```

## 常見問題

### 1. 端口已被占用

修改 `compose.yaml` 中的端口映射，例如：
```yaml
ports:
  - "5174:5173"  # 主機端口:容器端口
```

### 2. 熱重載不工作

確保 `volumes` 設定正確，並且開發伺服器配置為監聽 `0.0.0.0`：
```javascript
// vite.config.ts
server: {
  host: "0.0.0.0",
  port: 5173
}
```

### 3. 權限問題（Linux/Mac）

如果遇到權限問題，可能需要調整檔案權限或使用 `--user` 參數。

### 4. Docker Desktop 顯示的 URL 不完整

**問題**：Docker Desktop 介面中顯示的連結只有 `http://localhost` 或 `http://localhost:5173`，而不是完整的 URL（如 `http://localhost:5173/red_heart/sen-ba-li-18/`）。

**原因**：
- Docker Desktop 只能從 `ports` 配置中識別端口號
- 它無法知道應用程式內部的 base path 或路由配置
- 這是 Docker Desktop 的已知限制

**解決方案**：
1. **查看容器日誌**：在終端或 Docker Desktop 的日誌視窗中，Vite 會輸出完整的 URL：
   ```
   -> Local:   http://localhost:5173/red_heart/sen-ba-li-18/
   -> Network: http://172.19.0.2:5173/red_heart/sen-ba-li-18/
   ```

2. **手動輸入完整 URL**：在瀏覽器中手動輸入完整的 URL，包括 base path

3. **使用終端輸出**：執行 `docker compose watch` 或 `docker compose up` 時，終端會顯示完整的 URL

**注意**：這不影響應用程式的正常運行，只是 Docker Desktop 的顯示限制。

## 下一步

- 閱讀 [Dockerfile 和 compose.yaml 說明](./02-dockerfile-和-compose-yaml-說明.md)
- 了解 [Docker 運作流程](./03-docker-運作流程.md)
