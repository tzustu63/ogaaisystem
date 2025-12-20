# 為什麼 Backend 和 Frontend 無法啟動？

## 🔍 根據 Docker Desktop 狀態分析

從您的 Docker Desktop 界面可以看到：
- ✅ `oga-postgres` - 運行中（綠色）
- ✅ `oga-redis` - 運行中（綠色）
- ✅ `oga-minio` - 運行中（綠色）
- ❌ `oga-backend` - 停止（灰色）
- ❌ `oga-frontend` - 停止（灰色）

## 🎯 最可能的原因

### 1. 端口衝突（最常見）⭐

**問題**: 端口 3001 或 3000 已被其他程序佔用

**檢查方法**:
在 Docker Desktop 中點擊 `oga-backend`，查看 Logs，如果看到：
```
Bind for 0.0.0.0:3001 failed: port is already allocated
```

**解決方案**:
```bash
# 釋放端口 3001
lsof -ti:3001 | xargs kill -9

# 釋放端口 3000
lsof -ti:3000 | xargs kill -9

# 然後在 Docker Desktop 中點擊播放按鈕啟動服務
```

### 2. 容器啟動時出錯

**檢查方法**:
在 Docker Desktop 中：
1. 點擊 `oga-backend` 服務
2. 查看 "Logs" 標籤
3. 查看最後的錯誤訊息

**常見錯誤**:
- 資料庫連接失敗
- 遷移腳本錯誤
- 依賴服務未就緒

### 3. 依賴服務檢查失敗

Backend 需要等待基礎服務就緒，但有時檢查會超時。

**解決方案**:
```bash
# 手動啟動 Backend（跳過依賴檢查）
docker-compose up -d backend

# 或等待基礎服務完全啟動後再啟動
sleep 10
docker-compose up -d backend frontend
```

## 🛠️ 快速修復步驟

### 步驟 1: 查看日誌
在 Docker Desktop 中：
1. 點擊 `oga-backend`
2. 查看 "Logs" 標籤
3. 複製錯誤訊息

### 步驟 2: 檢查端口
```bash
# 檢查端口是否被佔用
lsof -ti:3001
lsof -ti:3000
```

### 步驟 3: 手動啟動
在 Docker Desktop 中：
1. 找到 `oga-backend`
2. 點擊右側的 **播放按鈕（▶️）**
3. 觀察是否啟動成功
4. 對 `oga-frontend` 重複相同步驟

### 步驟 4: 如果仍然失敗
```bash
# 完全重新啟動
docker-compose down
docker-compose up -d

# 或使用診斷腳本
./check-services.sh
```

## 📋 診斷檢查清單

- [ ] 檢查端口 3001 和 3000 是否被佔用
- [ ] 查看 Backend 日誌找出錯誤
- [ ] 查看 Frontend 日誌找出錯誤
- [ ] 確認基礎服務（postgres、redis、minio）都在運行
- [ ] 檢查網路連接（Backend 能否連接到 postgres）
- [ ] 確認映像已成功建置

## 🔗 相關文檔

- [QUICK_FIX.md](QUICK_FIX.md) - 快速修復指南
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - 完整故障排除指南

## 💡 建議

**最簡單的方法**：
1. 在 Docker Desktop 中點擊 `oga-backend` 的播放按鈕
2. 立即查看 Logs 標籤，找出錯誤訊息
3. 根據錯誤訊息對症下藥

常見的錯誤訊息和解決方案都在 [TROUBLESHOOTING.md](TROUBLESHOOTING.md) 中。



