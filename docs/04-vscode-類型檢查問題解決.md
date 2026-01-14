# VSCode 類型檢查問題解決

本文件說明在使用 Docker 運行專案時，VSCode 出現「Cannot find module 'vue'」等類型檢查錯誤的解決方法。

## 問題描述

當使用 Docker 運行專案時，在 VSCode 中可能會出現以下錯誤訊息：

```
Cannot find module 'vue' or its corresponding type declarations.
```

這個錯誤會出現在所有導入 Vue 相關模組的地方，例如：

```typescript
import { onMounted, onUnmounted } from "vue";
```

## 問題原因

### 根本原因

1. **依賴安裝位置不同**：
   - Docker 容器內：依賴項（`node_modules`）安裝在容器內
   - 本地環境：VSCode 在本地運行，無法訪問容器內的 `node_modules`

2. **TypeScript 類型檢查**：
   - VSCode 的 TypeScript 語言服務在本地運行
   - 需要訪問本地的 `node_modules` 來解析類型定義
   - 容器內的依賴對本地 VSCode 不可見

3. **`.dockerignore` 的影響**：
   - `node_modules` 通常被排除在 Docker 構建上下文之外
   - 本地可能沒有安裝依賴，導致 VSCode 找不到類型定義

## 解決方案

### 方法一：在本地安裝依賴（推薦）

在專案根目錄執行以下命令，在本地安裝所有依賴：

```bash
pnpm install
```

或使用其他套件管理器：

```bash
npm install
# 或
yarn install
```

#### 優點

- ✅ VSCode 可以正確進行類型檢查和自動完成
- ✅ 開發體驗最佳
- ✅ 不影響 Docker 容器的運行
- ✅ 本地和容器各自維護獨立的 `node_modules`

#### 注意事項

- 本地安裝的依賴版本應與容器內保持一致（通過 `package.json` 和鎖定檔案確保）
- 如果使用不同的 Node.js 版本，可能需要額外注意

### 方法二：使用 Docker 開發容器（進階）

如果不想在本地安裝依賴，可以使用 VSCode 的 Dev Containers 擴充功能，讓 VSCode 在容器內運行。

#### 步驟

1. 安裝 VSCode 擴充功能：**Dev Containers**
2. 建立 `.devcontainer/devcontainer.json` 配置檔案
3. 在容器內打開專案

#### 限制

- 需要額外配置
- 可能影響某些本地工具的使用

## 驗證解決方案

安裝依賴後，可以通過以下方式驗證：

1. **檢查 VSCode 錯誤**：
   - 打開 `src/App.vue` 或其他使用 Vue 的檔案
   - 確認不再顯示「Cannot find module 'vue'」錯誤

2. **檢查自動完成**：
   - 輸入 `import { onMounted } from "vue"` 時應該有自動完成提示

3. **檢查類型定義**：
   - 將滑鼠懸停在 Vue API 上（如 `onMounted`），應該顯示類型資訊

## 常見問題

### Q: 本地安裝依賴會影響 Docker 容器嗎？

**A:** 不會。Docker 容器會使用自己的 `node_modules`（在容器內安裝），與本地的 `node_modules` 完全獨立。

### Q: 為什麼 Docker 容器內有依賴，VSCode 還是找不到？

**A:** VSCode 的 TypeScript 語言服務在本地運行，無法訪問容器內部的檔案系統。即使容器正在運行，本地 VSCode 也無法讀取容器內的 `node_modules`。

### Q: 可以只在本地安裝 devDependencies 嗎？

**A:** 不建議。雖然類型定義通常在 `devDependencies` 中，但某些依賴的類型可能依賴於其他套件。建議完整安裝所有依賴。

### Q: 如果使用不同的套件管理器會怎樣？

**A:** 只要確保 `package.json` 和鎖定檔案（`pnpm-lock.yaml`、`package-lock.json`、`yarn.lock`）一致即可。建議團隊統一使用相同的套件管理器。

## 最佳實踐

1. **本地開發環境**：
   - 在本地安裝所有依賴，確保 VSCode 類型檢查正常
   - 使用與 Docker 容器相同的 Node.js 版本（可選，但建議）

2. **Docker 容器**：
   - 容器內獨立安裝依賴，確保運行環境一致
   - 使用多階段構建優化構建速度

3. **版本控制**：
   - 將 `package.json` 和鎖定檔案提交到版本控制
   - 將 `node_modules` 加入 `.gitignore`（不提交本地依賴）

4. **團隊協作**：
   - 統一使用相同的套件管理器
   - 在 README 中說明本地安裝依賴的步驟

## 相關文件

- [01-如何在新專案中加入-docker.md](./01-如何在新專案中加入-docker.md)
- [02-dockerfile-和-compose-yaml-說明.md](./02-dockerfile-和-compose-yaml-說明.md)
- [03-docker-運作流程.md](./03-docker-運作流程.md)

## 總結

使用 Docker 運行專案時，**必須在本地也安裝依賴**，才能讓 VSCode 正確進行類型檢查。這是因為 VSCode 的語言服務在本地運行，無法訪問容器內的檔案系統。本地和容器內的依賴是獨立的，不會互相影響。
