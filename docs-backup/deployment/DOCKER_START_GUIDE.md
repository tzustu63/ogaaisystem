# Docker 啟動指南

## ⚠️ Docker Daemon 未運行

如果遇到以下錯誤：
```
Cannot connect to the Docker daemon at unix:///Users/kuoyuming/.docker/run/docker.sock. 
Is the docker daemon running?
```

## 🔧 解決步驟

### macOS (Docker Desktop)

1. **啟動 Docker Desktop**
   - 打開「應用程式」資料夾
   - 雙擊「Docker」圖示啟動 Docker Desktop
   - 等待 Docker Desktop 完全啟動（狀態列會顯示 Docker 圖示）

2. **確認 Docker 運行**
   ```bash
   docker ps
   ```
   如果沒有錯誤，表示 Docker 已啟動

3. **啟動服務**
   ```bash
   cd "/Users/kuoyuming/coding/oga ai system"
   docker-compose up -d
   ```

### Linux

1. **啟動 Docker 服務**
   ```bash
   sudo systemctl start docker
   # 或
   sudo service docker start
   ```

2. **確認 Docker 運行**
   ```bash
   docker ps
   ```

3. **啟動服務**
   ```bash
   docker-compose up -d
   ```

## ✅ 啟動後檢查

啟動服務後，執行以下命令檢查狀態：

```bash
# 查看所有容器狀態
docker-compose ps

# 查看服務日誌
docker-compose logs -f

# 查看特定服務日誌
docker-compose logs -f backend
docker-compose logs -f postgres
```

## 🚀 預期結果

成功啟動後，您應該看到：

```
NAME           STATUS
oga-postgres   Up (healthy)
oga-redis      Up (healthy)
oga-minio      Up (healthy)
oga-backend    Up
oga-frontend   Up
```

## 📝 相關文檔

- [DOCKER_DEPLOYMENT.md](DOCKER_DEPLOYMENT.md) - 詳細部署說明
- [QUICK_START.md](QUICK_START.md) - 快速開始指南



