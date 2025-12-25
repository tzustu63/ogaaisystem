# 快速開始 - Docker 部署

## 一鍵啟動

```bash
# 啟動所有服務
docker-compose up -d

# 查看服務狀態
docker-compose ps

# 查看日誌
docker-compose logs -f
```

## 服務訪問

- **前端應用**: http://localhost:13000
- **後端 API**: http://localhost:13001/api
- **MinIO Console**: http://localhost:19001 (帳號: minioadmin / 密碼: minioadmin)
- **PostgreSQL**: localhost:5432 (帳號: postgres / 密碼: postgres)

## 常用命令

```bash
# 使用 Makefile（推薦）
make help          # 查看所有命令
make up            # 啟動服務
make down          # 停止服務
make logs          # 查看日誌
make rebuild       # 重建並啟動

# 或直接使用 docker-compose
docker-compose up -d              # 啟動
docker-compose down               # 停止
docker-compose logs -f backend    # 查看後端日誌
docker-compose restart backend    # 重啟後端
```

## 資料庫遷移

資料庫遷移會在 Backend 容器啟動時自動執行。如果需要手動執行：

```bash
# 方法 1: 使用 Makefile
make migrate FILE=001_initial_schema.sql

# 方法 2: 直接執行
docker exec -it oga-backend npm run migrate 001_initial_schema.sql
```

## 故障排除

### 1. 端口被佔用
修改 `docker-compose.yml` 中的端口映射，例如：
```yaml
ports:
  - "3002:3001"  # 改為其他端口
```

### 2. 資料庫連線失敗
```bash
# 檢查資料庫狀態
docker logs oga-postgres

# 進入資料庫容器
docker exec -it oga-postgres psql -U postgres -d oga_ai_system
```

### 3. 重建服務
```bash
# 完全重建（不使用快取）
docker-compose build --no-cache
docker-compose up -d
```

### 4. 清理所有資料
```bash
# 停止並刪除所有容器、volumes
docker-compose down -v
```

## 開發模式

如果只想啟動基礎服務（資料庫、Redis、MinIO），在本地開發：

```bash
# 啟動基礎服務
docker-compose -f docker-compose.dev.yml up -d

# 在本地啟動開發伺服器
cd packages/backend && npm run dev
cd packages/frontend && npm run dev
```

## 下一步

1. 等待所有服務啟動完成（約 30-60 秒）
2. 訪問 http://localhost:3000 查看前端
3. 檢查後端 API: http://localhost:3001/api
4. 查看 MinIO Console: http://localhost:9001

詳細說明請參考 `DOCKER_DEPLOYMENT.md`

