# MCP 獨立 Docker 部署指南

## 概述

這是一個完全獨立的 Docker 部署配置，使用不同的端口和容器名稱，避免與現有的 `docker-compose.yml` 配置衝突。

## 端口配置

| 服務 | 容器端口 | 主機端口 | 說明 |
|------|---------|---------|------|
| PostgreSQL | 5432 | **25432** | 資料庫（避免與現有的 15432 衝突）|
| Redis | 6379 | **26379** | 快取（避免與現有的 16379 衝突）|
| MinIO API | 9000 | **29000** | 物件儲存 API（避免與現有的 19000 衝突）|
| MinIO Console | 9001 | **29001** | MinIO 控制台（避免與現有的 19001 衝突）|
| Backend API | 3001 | **23001** | 後端服務（避免與現有的 13001 衝突）|
| Frontend | 3000 | **23000** | 前端應用（避免與現有的 13000 衝突）|

## 容器名稱

所有容器使用 `oga-mcp-` 前綴，避免與現有容器衝突：

- `oga-mcp-postgres`
- `oga-mcp-redis`
- `oga-mcp-minio`
- `oga-mcp-backend`
- `oga-mcp-frontend`

## 快速開始

### 1. 啟動所有服務

```bash
docker-compose -f docker-compose.mcp.yml up -d
```

### 2. 查看服務狀態

```bash
docker-compose -f docker-compose.mcp.yml ps
```

### 3. 查看日誌

```bash
# 所有服務
docker-compose -f docker-compose.mcp.yml logs -f

# 特定服務
docker-compose -f docker-compose.mcp.yml logs -f backend
docker-compose -f docker-compose.mcp.yml logs -f frontend
```

### 4. 停止服務

```bash
# 停止所有服務
docker-compose -f docker-compose.mcp.yml down

# 停止並刪除所有資料（包括資料庫資料）
docker-compose -f docker-compose.mcp.yml down -v
```

## 服務訪問

啟動後，您可以訪問：

- **前端應用**: http://localhost:23000
- **後端 API**: http://localhost:23001/api
- **MinIO Console**: http://localhost:29001
  - 帳號: `minioadmin`
  - 密碼: `minioadmin`
- **PostgreSQL**: `localhost:25432`
  - 資料庫: `oga_ai_system`
  - 使用者: `postgres`
  - 密碼: `postgres`

## 資料持久化

所有資料使用獨立的 volumes，與現有部署完全隔離：

- `postgres_mcp_data` - PostgreSQL 資料
- `redis_mcp_data` - Redis 資料
- `minio_mcp_data` - MinIO 物件儲存
- `backend_mcp_logs` - Backend 日誌

## 網路隔離

使用獨立的 Docker 網路 `oga-mcp-network`，與現有的 `oga-network` 完全隔離。

## 資料庫遷移

資料庫遷移會在 Backend 容器啟動時自動執行。遷移順序：
1. `001_initial_schema.sql`
2. `002_add_missing_features.sql`

## 與現有部署共存

此配置可以與現有的 `docker-compose.yml` 同時運行，因為：

1. ✅ 使用完全不同的端口範圍
2. ✅ 使用不同的容器名稱
3. ✅ 使用不同的 volumes
4. ✅ 使用不同的網路

## 常用命令

```bash
# 啟動服務
docker-compose -f docker-compose.mcp.yml up -d

# 重新建置並啟動
docker-compose -f docker-compose.mcp.yml up -d --build

# 查看服務狀態
docker-compose -f docker-compose.mcp.yml ps

# 查看特定服務日誌
docker-compose -f docker-compose.mcp.yml logs -f backend

# 進入容器
docker exec -it oga-mcp-backend sh
docker exec -it oga-mcp-postgres psql -U postgres -d oga_ai_system

# 停止服務
docker-compose -f docker-compose.mcp.yml stop

# 停止並刪除容器
docker-compose -f docker-compose.mcp.yml down

# 停止並刪除所有資料
docker-compose -f docker-compose.mcp.yml down -v
```

## 故障排除

### 檢查端口是否被占用

```bash
# 檢查所有端口
lsof -i :25432
lsof -i :26379
lsof -i :29000
lsof -i :29001
lsof -i :23000
lsof -i :23001
```

### 檢查容器狀態

```bash
docker ps -a | grep oga-mcp
```

### 檢查日誌

```bash
docker-compose -f docker-compose.mcp.yml logs backend
docker-compose -f docker-compose.mcp.yml logs postgres
```
