# 展版專案 ( 使用 docker )

專案使用技術: Vue 3 + TypeScript + Vite

## 📋 目錄

1. [運行專案](#運行專案)
2. [遷移專案](#遷移專案)
3. [vscode出現類型檢查問題](#vscode出現類型檢查問題)

---

## 運行專案

### 1：檢查 Docker 安裝

```bash
docker --version
docker compose version
```

### 2：啟動開發環境

```bash
docker compose up --build
```

### 3：訪問應用

開啟瀏覽器訪問：**http://localhost:5173**

### 4：測試熱重載

1. 修改任何原始碼檔案
2. 觀察終端日誌，應該看到重新編譯的訊息
3. 瀏覽器應該自動重新載入

### 5：生產環境 ( 產生 `dist/` 目錄 )

#### 方法一：從映像檔中提取檔案（推薦，跨平台）

```bash
# 1. 構建映像檔
docker build --target build --file Dockerfile . -t my-app:build

# 2. 創建臨時容器並複製 dist/ 到主機
docker create --name temp-container my-app:build
docker cp temp-container:/app/dist ./dist
docker rm temp-container
```

#### 方法二：使用 docker run 掛載卷

```cmd
# 1. 構建映像檔
docker build --target build --file Dockerfile . -t my-app:build

# 2. 運行容器並掛載當前目錄（使用 %CD%）
docker run --rm -v "%CD%\dist:/app/dist" my-app:build sh -c "pnpm run build"
```

---

## 遷移專案

### 1：建立新專案

在新專案資料夾中執行
`git clone D:\_au\projects\20260108--sen-ba-li-18\sen-ba-li-18--docker new-project`
( new-project 替換成新專案名稱 )

### 2：修改 port ( 若有需要 )

檔案
- `vite.config.ts`
- `compose.yaml`
- `Dockerfile`

### 3：修改容器名稱 (container_name)

檔案
- `compose.yaml`

---

## vscode出現類型檢查問題

當使用 Docker 運行專案時，在 VSCode 中可能會出現以下錯誤訊息：

```
Cannot find module 'vue' or its corresponding type declarations.
```

出現在所有導入 Vue 相關模組的地方，例如：

```typescript
import { onMounted, onUnmounted } from "vue";
```

### 原因

VSCode 的 TypeScript 語言服務在本地運行，需要訪問本地的 `node_modules` 來解析類型定義
docker 容器內的依賴對本地 VSCode 不可見

### 解決方案

在本地安裝所有依賴

```bash
pnpm install
# 或
npm install
# 或
yarn install
```