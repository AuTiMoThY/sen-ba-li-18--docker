# syntax=docker/dockerfile:1.4

# ============================================
# 依賴安裝階段 (Dependencies Stage)
# 用於共享依賴安裝，減少重複構建
# ============================================
FROM node:20-alpine AS deps

# 安裝 pnpm
RUN npm install -g pnpm@10.24.0

# 設定工作目錄
WORKDIR /app

# 複製 package.json 和 pnpm-lock.yaml（利用 Docker 層快取）
COPY package.json pnpm-lock.yaml ./

# 安裝依賴（包含 devDependencies）
RUN pnpm install --frozen-lockfile

# ============================================
# 開發階段 (Development Stage)
# ============================================
FROM node:20-alpine AS development

# 安裝 pnpm
RUN npm install -g pnpm@10.24.0

# 設定工作目錄
WORKDIR /app

# 從 deps 階段複製 node_modules（利用快取）
COPY --from=deps /app/node_modules ./node_modules

# 複製 package.json 和 pnpm-lock.yaml
COPY package.json pnpm-lock.yaml ./

# 複製專案檔案
COPY . .

# 暴露 Vite 開發伺服器端口（使用 ARG 允許動態設定）
ARG VITE_DEV_PORT=5173
EXPOSE ${VITE_DEV_PORT}

# 開發模式命令
CMD ["pnpm", "dev"]

# ============================================
# 建置階段 (Build Stage)
# ============================================
FROM node:20-alpine AS build

# 安裝 pnpm
RUN npm install -g pnpm@10.24.0

# 設定工作目錄
WORKDIR /app

# 從 deps 階段複製 node_modules（利用快取）
COPY --from=deps /app/node_modules ./node_modules

# 複製 package.json 和 pnpm-lock.yaml
COPY package.json pnpm-lock.yaml ./

# 複製專案檔案
COPY . .

# 建置專案
RUN pnpm run build

# ============================================
# 生產階段 (Production Stage)
# ============================================
FROM nginx:alpine AS production

# 複製建置產物到 nginx
COPY --from=build /app/dist /usr/share/nginx/html

# 複製 nginx 配置（可選，如果需要自訂配置）
# COPY nginx.conf /etc/nginx/conf.d/default.conf

# 暴露端口（nginx 容器內部固定為 80，主機端口可在 compose.yaml 中設定）
EXPOSE 80

# 啟動 nginx
CMD ["nginx", "-g", "daemon off;"]
