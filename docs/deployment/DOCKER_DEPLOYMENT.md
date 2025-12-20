# Docker 部署指南

## 快速開始

### 1. 使用 Docker Compose 部署（推薦）

```bash
# 啟動所有服務（包含資料庫、Redis、MinIO、Backend、Frontend）
docker-compose up -d

# 查看服務狀態
docker-compose ps

# 查看日誌
docker-compose logs -f

# 停止所有服務
docker-compose down

# 停止並刪除所有資料（包括資料庫資料）
docker-compose down -v
```

### 2. 僅啟動基礎服務（開發環境）

如果您想在本地開發，只啟動資料庫、Redis、MinIO：

```bash
# 啟動基礎服務
docker-compose -f docker-compose.dev.yml up -d

# 然後在本地執行
cd packages/backend && npm run dev
cd packages/frontend && npm run dev
```

## 服務說明

### PostgreSQL 資料庫
- **容器名稱**: `oga-postgres`
- **端口**: `5432`
- **資料庫名稱**: `oga_ai_system`
- **使用者**: `postgres`
- **密碼**: `postgres`
- **資料持久化**: `postgres_data` volume

### Redis 快取
- **容器名稱**: `oga-redis`
- **端口**: `6379`
- **資料持久化**: `redis_data` volume

### MinIO 物件儲存
- **容器名稱**: `oga-minio`
- **API 端口**: `9000`
- **Console 端口**: `9001`
- **存取金鑰**: `minioadmin`
- **秘密金鑰**: `minioadmin`
- **資料持久化**: `minio_data` volume
- **Console 網址**: http://localhost:19001

### Backend API
- **容器名稱**: `oga-backend`
- **端口**: `13001`
- **API 網址**: http://localhost:13001/api

### Frontend
- **容器名稱**: `oga-frontend`
- **端口**: `13000`
- **網址**: http://localhost:13000

## 資料庫遷移

資料庫遷移會在 Backend 容器啟動時自動執行。遷移順序：
1. `001_initial_schema.sql`
2. `002_add_missing_features.sql`

如果需要手動執行遷移：

```bash
# 進入 Backend 容器
docker exec -it oga-backend sh

# 執行遷移
npm run migrate 001_initial_schema.sql
npm run migrate 002_add_missing_features.sql
```

## 環境變數

### 生產環境
Docker Compose 會自動設定環境變數。如需自訂，請修改 `docker-compose.yml` 中的 `environment` 區塊。

### 開發環境
複製 `.env.example` 為 `.env` 並修改：

```bash
cp .env.example .env
```

## 資料持久化

所有資料都儲存在 Docker volumes 中：
- `postgres_data`: PostgreSQL 資料
- `redis_data`: Redis 資料
- `minio_data`: MinIO 物件儲存
- `backend_logs`: Backend 日誌

查看 volumes：
```bash
docker volume ls | grep oga
```

備份資料：
```bash
# 備份 PostgreSQL
docker exec oga-postgres pg_dump -U postgres oga_ai_system > backup.sql

# 備份 volumes
docker run --rm -v oga_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres_backup.tar.gz /data
```

## 故障排除

### 1. 資料庫連線失敗
```bash
# 檢查資料庫是否正常運行
docker exec oga-postgres pg_isready -U postgres

# 查看資料庫日誌
docker logs oga-postgres
```

### 2. 遷移失敗
```bash
# 查看 Backend 日誌
docker logs oga-backend

# 手動執行遷移
docker exec -it oga-backend npm run migrate 001_initial_schema.sql
```

### 3. 端口衝突
如果端口已被佔用，請修改 `docker-compose.yml` 中的端口映射：
```yaml
ports:
  - "3001:3001"  # 改為 "3002:3001" 等
```

### 4. 重建服務
```bash
# 重建並啟動
docker-compose up -d --build

# 強制重建（不使用快取）
docker-compose build --no-cache
docker-compose up -d
```

### 5. 清理所有資料
```bash
# 停止並刪除所有容器、網路、volumes
docker-compose down -v

# 刪除所有相關映像
docker images | grep oga | awk '{print $3}' | xargs docker rmi
```

## 健康檢查

所有服務都配置了健康檢查。查看服務健康狀態：

```bash
docker-compose ps
```

## 日誌管理

```bash
# 查看所有服務日誌
docker-compose logs

# 查看特定服務日誌
docker-compose logs backend
docker-compose logs postgres

# 即時追蹤日誌
docker-compose logs -f backend
```

## 效能優化

### 生產環境建議
1. 修改預設密碼（PostgreSQL、MinIO、JWT_SECRET）
2. 啟用 SSL/TLS
3. 設定資源限制（CPU、記憶體）
4. 配置日誌輪轉
5. 設定備份策略

### 資源限制範例
在 `docker-compose.yml` 中為每個服務添加：
```yaml
deploy:
  resources:
    limits:
      cpus: '1'
      memory: 1G
    reservations:
      cpus: '0.5'
      memory: 512M
```

## 網路設定

所有服務都在 `oga-network` 網路中，可以透過服務名稱互相訪問：
- Backend → Postgres: `postgres:5432`
- Backend → Redis: `redis:6379`
- Backend → MinIO: `minio:9000`

## 安全建議

1. **修改預設密碼**
   - PostgreSQL: 修改 `POSTGRES_PASSWORD`
   - MinIO: 修改 `MINIO_ROOT_USER` 和 `MINIO_ROOT_PASSWORD`
   - JWT: 修改 `JWT_SECRET`

2. **限制網路存取**
   - 生產環境建議移除不必要的端口映射
   - 使用反向代理（Nginx）處理外部請求

3. **定期更新**
   ```bash
   docker-compose pull
   docker-compose up -d
   ```

## 下一步

1. 啟動服務：`docker-compose up -d`
2. 等待所有服務就緒（約 30 秒）
3. 訪問前端：http://localhost:3000
4. 訪問 MinIO Console：http://localhost:9001
5. 測試 API：http://localhost:3001/api

