# 如何在區網中訪問 Docker 應用

本文件說明如何讓區網內的其他設備也能訪問運行在 Docker 中的應用程式。

## 前置檢查

### 1. 確認 Vite 配置

確認 `vite.config.ts` 中的 `server.host` 設定為 `"0.0.0.0"`：

```typescript
server: {
  host: "0.0.0.0", // 監聽所有網路介面，允許區網內其他設備訪問
  port: Number(process.env.VITE_DEV_PORT) || 5173,
  // ...
}
```

**說明**：
- `"0.0.0.0"` 表示監聽所有網路介面（包括本機和區網）
- 如果設定為 `"localhost"` 或 `"127.0.0.1"`，則只能從本機訪問

### 2. 確認 Docker Compose 端口映射

確認 `compose.yaml` 中的端口映射配置：

```yaml
ports:
  - "${VITE_DEV_PORT:-5173}:${VITE_DEV_PORT:-5173}"
```

**說明**：
- Docker 的端口映射預設會綁定到所有網路介面（`0.0.0.0`）
- 格式為 `主機端口:容器端口`
- 如果只寫 `"5173:5173"`，預設就是 `0.0.0.0:5173:5173`

## 步驟一：取得主機的 IP 地址

### Windows

#### 方法一：使用命令提示字元（CMD）

```cmd
ipconfig
```

查找「IPv4 位址」，例如：`192.168.1.100`

#### 方法二：使用 PowerShell

```powershell
Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -notlike "127.*"} | Select-Object IPAddress
```

#### 方法三：查看網路連線詳細資訊

1. 開啟「設定」→「網路和網際網路」
2. 點選您的網路連線（Wi-Fi 或乙太網路）
3. 查看「IPv4 位址」

### Linux/Mac

```bash
# Linux
ip addr show
# 或
ifconfig

# Mac
ifconfig | grep "inet " | grep -v 127.0.0.1
```

查找區網 IP，通常是 `192.168.x.x` 或 `10.x.x.x`

## 步驟二：確認防火牆設定

### Windows 防火牆

#### 方法一：允許應用程式通過防火牆（推薦）

1. 開啟「Windows 安全性」→「防火牆與網路保護」
2. 點選「允許應用程式通過防火牆」
3. 找到「Docker Desktop」或「Docker」，確保已勾選「私人」和「公用」
4. 如果沒有，點選「變更設定」→「允許其他應用程式」→ 選擇 Docker

#### 方法二：新增防火牆規則（進階）

1. 開啟「Windows 安全性」→「防火牆與網路保護」→「進階設定」
2. 點選「輸入規則」→「新增規則」
3. 選擇「連接埠」→「下一步」
4. 選擇「TCP」，輸入特定本機連接埠：`5173`（或您使用的端口）
5. 選擇「允許連線」→「下一步」
6. 勾選所有設定檔（網域、私人、公用）→「下一步」
7. 輸入規則名稱，例如：「Docker Vite Dev Server」→「完成」

#### 方法三：使用命令列（管理員權限）

```cmd
# 允許 TCP 端口 5173 通過防火牆
netsh advfirewall firewall add rule name="Docker Vite Dev Server" dir=in action=allow protocol=TCP localport=5173
```

### Linux 防火牆（ufw）

```bash
# 允許端口 5173
sudo ufw allow 5173/tcp

# 檢查狀態
sudo ufw status
```

### Mac 防火牆

1. 開啟「系統設定」→「網路」→「防火牆」
2. 點選「防火牆選項」
3. 確認 Docker 或相關應用程式已允許連入連線

## 步驟三：啟動 Docker 容器

確認容器正常運行：

```bash
docker compose up --build
```

或背景執行：

```bash
docker compose up -d --build
```

檢查容器狀態：

```bash
docker ps
```

應該會看到類似以下的輸出：

```
CONTAINER ID   IMAGE                          STATUS         PORTS                    NAMES
abc123def456   sen-ba-li-18-docker-app:latest Up 2 minutes   0.0.0.0:5173->5173/tcp   sen-ba-li-18-dev
```

**重點**：確認 `PORTS` 欄位顯示 `0.0.0.0:5173->5173/tcp`，這表示端口已正確映射到所有網路介面。

## 步驟四：從區網設備訪問

### 在區網內的其他設備上

開啟瀏覽器，輸入：

```
http://主機IP:端口號
```

例如：
- 如果主機 IP 是 `192.168.1.100`，端口是 `5173`
- 則訪問：`http://192.168.1.100:5173`

### 從本機訪問

您仍然可以使用：
- `http://localhost:5173`
- `http://127.0.0.1:5173`

## 常見問題排除

### 問題一：無法從區網訪問，但本機可以

**可能原因**：
1. 防火牆阻擋
2. Vite 配置未設定 `host: "0.0.0.0"`
3. Docker 端口映射問題

**解決方案**：

1. **檢查 Vite 配置**：
   ```typescript
   // vite.config.ts
   server: {
     host: "0.0.0.0", // 確保是 0.0.0.0，不是 localhost
     port: 5173,
   }
   ```

2. **檢查 Docker 端口映射**：
   ```bash
   docker ps
   ```
   確認 `PORTS` 顯示 `0.0.0.0:5173->5173/tcp`

3. **檢查防火牆**：
   - Windows：確認防火牆允許 Docker 或端口 5173
   - Linux：確認 ufw 允許端口 5173

4. **明確指定綁定地址**（如果需要）：
   ```yaml
   # compose.yaml
   ports:
     - "0.0.0.0:${VITE_DEV_PORT:-5173}:${VITE_DEV_PORT:-5173}"
   ```

### 問題二：連接被拒絕（Connection Refused）

**可能原因**：
1. 容器未正常啟動
2. Vite 開發伺服器未啟動
3. 端口被其他程式占用

**解決方案**：

1. **檢查容器日誌**：
   ```bash
   docker logs sen-ba-li-18-dev
   ```
   確認 Vite 已成功啟動，應該會看到：
   ```
   VITE v7.x.x  ready in xxx ms
   ➜  Local:   http://localhost:5173/
   ➜  Network: http://172.x.x.x:5173/
   ```

2. **檢查端口占用**：
   ```bash
   # Windows
   netstat -ano | findstr :5173
   
   # Linux/Mac
   lsof -i :5173
   ```

3. **重啟容器**：
   ```bash
   docker compose restart
   ```

### 問題三：可以訪問但 HMR（熱模組替換）不工作

**可能原因**：
- HMR 配置中的 `host` 設定為 `localhost`

**解決方案**：

修改 `vite.config.ts`：

```typescript
server: {
  host: "0.0.0.0",
  port: 5173,
  hmr: {
    // 在 Docker 環境中，HMR host 可以保持 localhost
    // 或設定為實際的主機 IP
    host: "localhost", // 或使用主機 IP
    port: 5173,
  }
}
```

**注意**：在 Docker 環境中，HMR 的 `host` 設定為 `localhost` 通常沒問題，因為 HMR 連接是從瀏覽器到開發伺服器的。

### 問題四：生產環境（nginx）無法從區網訪問

**檢查項目**：

1. **確認端口映射**：
   ```yaml
   # compose.yaml
   app-prod:
     ports:
       - "0.0.0.0:${NGINX_PORT:-80}:80"
   ```

2. **確認防火牆允許端口 80**：
   ```cmd
   # Windows
   netsh advfirewall firewall add rule name="Docker Nginx" dir=in action=allow protocol=TCP localport=80
   ```

3. **從區網訪問**：
   ```
   http://主機IP:80
   ```
   或如果使用自訂端口：
   ```
   http://主機IP:自訂端口
   ```

## 測試連線

### 從本機測試

```bash
# Windows PowerShell
Test-NetConnection -ComputerName localhost -Port 5173

# Linux/Mac
curl http://localhost:5173
```

### 從區網其他設備測試

在另一台設備上：

```bash
# Linux/Mac
curl http://192.168.1.100:5173

# 或使用瀏覽器直接訪問
# http://192.168.1.100:5173
```

## 安全注意事項

⚠️ **重要**：允許區網訪問會讓您的開發伺服器暴露在區域網路中。

### 建議

1. **僅在開發環境使用**：生產環境應使用適當的安全措施（HTTPS、認證等）
2. **使用 VPN**：如果需要遠端訪問，建議使用 VPN 而非直接暴露端口
3. **限制訪問**：如果可能，使用防火牆規則限制特定 IP 範圍的訪問
4. **定期更新**：確保 Docker 和相關軟體保持最新版本

## 快速檢查清單

- [ ] `vite.config.ts` 中 `server.host` 設定為 `"0.0.0.0"`
- [ ] `compose.yaml` 中端口映射正確
- [ ] 防火牆允許端口通過
- [ ] 容器正常運行（`docker ps` 顯示狀態為 `Up`）
- [ ] 知道主機的 IP 地址
- [ ] 從區網設備可以訪問 `http://主機IP:端口`

## 總結

要讓區網內的其他設備訪問 Docker 應用，需要：

1. ✅ Vite 設定 `host: "0.0.0.0"`（已完成）
2. ✅ Docker 端口映射（預設已綁定到所有介面）
3. ⚠️ 防火牆允許端口通過（需要手動設定）
4. ⚠️ 知道主機 IP 地址（需要查詢）

完成以上步驟後，區網內的其他設備就可以通過 `http://主機IP:5173` 訪問您的應用程式了。
