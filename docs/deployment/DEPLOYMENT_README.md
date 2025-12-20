# Docker 部署完成 ✅

## 📦 已建立的檔案

1. **`docker-compose.yml`** - 完整生產環境配置
   - PostgreSQL 資料庫（獨立容器）
   - Redis 快取
   - MinIO 物件儲存
   - Backend API 服務
   - Frontend 應用

2. **`docker-compose.dev.yml`** - 開發環境配置（僅基礎服務）

3. **`packages/backend/Dockerfile`** - Backend 容器映像

4. **`packages/frontend/Dockerfile`** - Frontend 容器映像

5. **`.dockerignore`** - Docker 建置忽略檔案

6. **`Makefile`** - 便捷命令集合

7. **`DOCKER_DEPLOYMENT.md`** - 詳細部署文件

8. **`QUICK_START.md`** - 快速開始指南

## 🚀 立即開始

### 方法 1: 使用 Makefile（推薦）

```bash
# 查看所有可用命令
make help

# 啟動所有服務
make up

# 查看服務狀態
make status

# 查看日誌
make logs
```

### 方法 2: 使用 Docker Compose

```bash
# 啟動所有服務
docker-compose up -d

# 查看服務狀態
docker-compose ps

# 查看日誌
docker-compose logs -f
```

## 🌐 服務訪問

啟動後，您可以訪問：

- **前端應用**: http://localhost:3000
- **後端 API**: http://localhost:3001/api
- **MinIO Console**: http://localhost:9001
  - 帳號: `minioadmin`
  - 密碼: `minioadmin`
- **PostgreSQL**: `localhost:5432`
  - 資料庫: `oga_ai_system`
  - 使用者: `postgres`
  - 密碼: `postgres`

## 📋 服務說明

### PostgreSQL 資料庫
- **容器名稱**: `oga-postgres`
- **獨立容器**: ✅ 是
- **資料持久化**: `postgres_data` volume
- **自動遷移**: Backend 啟動時自動執行

### Redis 快取
- **容器名稱**: `oga-redis`
- **資料持久化**: `redis_data` volume

### MinIO 物件儲存
- **容器名稱**: `oga-minio`
- **Console**: http://localhost:9001

### Backend API
- **容器名稱**: `oga-backend`
- **自動遷移**: 啟動時自動執行資料庫遷移

### Frontend
- **容器名稱**: `oga-frontend`

## 🔧 常用操作

### 查看日誌
```bash
# 所有服務
docker-compose logs -f

# 特定服務
docker-compose logs -f backend
docker-compose logs -f postgres
```

### 進入容器
```bash
# Backend 容器
docker exec -it oga-backend sh

# 資料庫容器
docker exec -it oga-postgres psql -U postgres -d oga_ai_system
```

### 手動執行遷移
```bash
docker exec -it oga-backend npm run migrate 001_initial_schema.sql
docker exec -it oga-backend npm run migrate 002_add_missing_features.sql
```

### 重建服務
```bash
# 重建並啟動
docker-compose up -d --build

# 強制重建（不使用快取）
docker-compose build --no-cache
docker-compose up -d
```

### 清理所有資料
```bash
# 停止並刪除所有容器、volumes
docker-compose down -v
```

## 🛠️ 開發模式

如果只想啟動基礎服務，在本地開發：

```bash
# 啟動基礎服務（資料庫、Redis、MinIO）
docker-compose -f docker-compose.dev.yml up -d

# 在本地啟動開發伺服器
cd packages/backend && npm run dev
cd packages/frontend && npm run dev
```

## ⚠️ 注意事項

1. **首次啟動**：首次啟動需要建置映像，可能需要 5-10 分鐘
2. **資料庫遷移**：遷移會在 Backend 啟動時自動執行
3. **端口衝突**：如果端口被佔用，請修改 `docker-compose.yml` 中的端口映射
4. **密碼安全**：生產環境請修改所有預設密碼

## 📚 更多資訊

- 詳細部署說明：`DOCKER_DEPLOYMENT.md`
- 快速開始指南：`QUICK_START.md`
- 環境變數範例：`.env.example`（需手動建立）

## 🎯 下一步

1. 執行 `docker-compose up -d` 啟動服務
2. 等待所有服務就緒（約 30-60 秒）
3. 訪問 http://localhost:3000 查看前端
4. 檢查後端 API: http://localhost:3001/api

祝您使用愉快！🎉

