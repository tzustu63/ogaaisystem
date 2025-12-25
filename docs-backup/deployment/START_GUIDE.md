# 服務啟動指南

## 🎯 為什麼 Backend 和 Frontend 無法啟動？

根據 Docker Desktop 顯示，這兩個服務處於停止狀態。常見原因：

### 1. 端口衝突 ⭐ 最常見
- 端口 3001 或 3000 被其他程序佔用
- **解決**: 在 Docker Desktop 中查看 Backend 日誌，如果看到 `port is already allocated`，需要釋放端口

### 2. 啟動腳本問題
- Backend 使用 `pg_isready` 檢查資料庫，可能超時或失敗
- **已修復**: 已簡化啟動命令，改為固定等待時間

### 3. 依賴服務未就緒
- Frontend 依賴 Backend，如果 Backend 未啟動，Frontend 也會失敗
- **已修復**: 已更新依賴條件

## 🚀 啟動方法

### 方法 1: 使用啟動腳本（推薦）

```bash
./start-services.sh
```

這個腳本會：
1. 檢查並釋放端口
2. 啟動基礎服務
3. 等待服務就緒
4. 啟動 Backend
5. 啟動 Frontend

### 方法 2: 在 Docker Desktop 中手動啟動

1. **啟動 Backend**:
   - 找到 `oga-backend` 服務
   - 點擊播放按鈕（▶️）
   - 查看 Logs 確認是否成功

2. **啟動 Frontend**:
   - 找到 `oga-frontend` 服務
   - 點擊播放按鈕（▶️）
   - 查看 Logs 確認是否成功

### 方法 3: 使用命令列

```bash
# 釋放端口（如果需要）
lsof -ti:3001 | xargs kill -9
lsof -ti:3000 | xargs kill -9

# 啟動所有服務
docker-compose up -d

# 或分步啟動
docker-compose up -d postgres redis minio
sleep 10
docker-compose up -d backend
sleep 5
docker-compose up -d frontend
```

## 🔍 診斷問題

### 查看日誌

在 Docker Desktop 中：
1. 點擊 `oga-backend`
2. 查看 "Logs" 標籤
3. 找出錯誤訊息

或使用命令列：
```bash
# Backend 日誌
docker logs oga-backend

# Frontend 日誌
docker logs oga-frontend

# 即時追蹤
docker-compose logs -f backend
```

### 使用診斷腳本

```bash
./check-services.sh
```

## 📋 常見錯誤與解決

| 錯誤訊息 | 原因 | 解決方案 |
|---------|------|---------|
| `port is already allocated` | 端口被佔用 | `lsof -ti:3001 \| xargs kill -9` |
| `postgres:5432 - no response` | 資料庫未就緒 | 等待或檢查 postgres 容器 |
| `Cannot connect to the Docker daemon` | Docker 未運行 | 啟動 Docker Desktop |
| `unable to get image` | 映像未建置 | `docker-compose build` |

## 💡 建議

1. **先查看日誌** - 在 Docker Desktop 中查看服務日誌，找出具體錯誤
2. **檢查端口** - 確認 3000 和 3001 未被佔用
3. **使用啟動腳本** - `./start-services.sh` 會自動處理大部分問題
4. **手動啟動** - 如果腳本失敗，在 Docker Desktop 中手動啟動並查看日誌

## 🔗 相關文檔

- [WHY_NOT_STARTING.md](WHY_NOT_STARTING.md) - 詳細原因分析
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - 完整故障排除指南
- [QUICK_FIX.md](QUICK_FIX.md) - 快速修復



