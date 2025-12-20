# Docker 服務啟動故障排除

## 🔍 問題診斷

如果 `oga-backend` 和 `oga-frontend` 無法啟動，請按照以下步驟排查：

## 1. 檢查容器日誌

### 在 Docker Desktop 中
1. 點擊 `oga-backend` 服務
2. 查看 "Logs" 標籤頁
3. 查看錯誤訊息

### 使用命令列
```bash
# 查看 Backend 日誌
docker logs oga-backend

# 查看 Frontend 日誌
docker logs oga-frontend

# 查看最近 50 行日誌
docker logs --tail=50 oga-backend
```

## 2. 常見問題與解決方案

### 問題 1: 端口被佔用

**症狀**: 錯誤訊息包含 `Bind for 0.0.0.0:3001 failed: port is already allocated`

**解決方案**:
```bash
# 查找佔用端口的進程
lsof -ti:3001
lsof -ti:3000

# 停止佔用端口的進程
lsof -ti:3001 | xargs kill -9
lsof -ti:3000 | xargs kill -9

# 或修改 docker-compose.yml 中的端口映射
# 將 3001:3001 改為 3002:3001
```

### 問題 2: 資料庫連接失敗

**症狀**: Backend 日誌顯示 `postgres:5432 - no response` 或 `database connection failed`

**解決方案**:
1. 確認 `oga-postgres` 容器正在運行
2. 檢查網路連接：
   ```bash
   docker exec oga-backend ping -c 1 postgres
   ```
3. 確認環境變數正確設定（在 docker-compose.yml 中）

### 問題 3: 映像未建置

**症狀**: 錯誤訊息包含 `unable to get image 'ogaaisystem-backend'`

**解決方案**:
```bash
# 重新建置映像
docker-compose build --no-cache backend frontend

# 然後啟動服務
docker-compose up -d
```

### 問題 4: 依賴服務未就緒

**症狀**: Backend 無法連接到 postgres、redis 或 minio

**解決方案**:
1. 確認所有基礎服務都在運行：
   ```bash
   docker-compose ps
   ```
2. 等待基礎服務完全啟動（約 10-30 秒）
3. 然後啟動 Backend 和 Frontend：
   ```bash
   docker-compose up -d backend frontend
   ```

### 問題 5: 資料庫遷移失敗

**症狀**: Backend 日誌顯示遷移錯誤

**解決方案**:
```bash
# 進入 Backend 容器
docker exec -it oga-backend sh

# 手動執行遷移
cd /app/packages/backend
npm run migrate 001_initial_schema.sql
npm run migrate 002_add_missing_features.sql
```

## 3. 手動啟動服務

### 方法 1: 使用 Docker Desktop
1. 在 Docker Desktop 中找到 `oga-backend`
2. 點擊播放按鈕（▶️）啟動
3. 查看日誌確認啟動狀態

### 方法 2: 使用命令列
```bash
# 啟動 Backend
docker-compose up -d backend

# 啟動 Frontend
docker-compose up -d frontend

# 或同時啟動
docker-compose up -d backend frontend
```

## 4. 檢查服務狀態

```bash
# 查看所有服務狀態
docker-compose ps

# 查看詳細狀態
docker-compose ps -a

# 查看服務健康狀態
docker inspect oga-backend | grep -A 5 Health
```

## 5. 重新部署

如果以上方法都無法解決，嘗試完全重新部署：

```bash
# 停止所有服務
docker-compose down

# 清理 volumes（可選，會刪除資料）
docker-compose down -v

# 重新建置映像
docker-compose build --no-cache

# 啟動所有服務
docker-compose up -d
```

## 6. 檢查網路連接

```bash
# 檢查容器是否在同一網路
docker network inspect ogaaisystem_oga-network

# 測試 Backend 到 Postgres 的連接
docker exec oga-backend ping -c 1 postgres

# 測試 Backend 到 Redis 的連接
docker exec oga-backend ping -c 1 redis
```

## 7. 查看完整錯誤訊息

```bash
# Backend 完整日誌
docker-compose logs backend

# Frontend 完整日誌
docker-compose logs frontend

# 即時追蹤日誌
docker-compose logs -f backend
```

## 📝 常見錯誤訊息對照表

| 錯誤訊息 | 原因 | 解決方案 |
|---------|------|---------|
| `port is already allocated` | 端口被佔用 | 釋放端口或修改端口映射 |
| `Cannot connect to the Docker daemon` | Docker 未運行 | 啟動 Docker Desktop |
| `no response` | 服務未就緒 | 等待服務啟動或檢查依賴 |
| `unable to get image` | 映像未建置 | 執行 `docker-compose build` |
| `database connection failed` | 資料庫連接失敗 | 檢查資料庫服務和網路 |

## 🔗 相關文檔

- [DOCKER_DEPLOYMENT.md](DOCKER_DEPLOYMENT.md) - 詳細部署說明
- [QUICK_START.md](QUICK_START.md) - 快速開始指南



