# 快速修復指南

## 🚨 Backend 和 Frontend 無法啟動

### 最常見原因

根據您的 Docker Desktop 界面顯示，`oga-backend` 和 `oga-frontend` 處於停止狀態。最可能的原因是：

### 1. 端口衝突（最常見）

**檢查端口**:
```bash
# 檢查端口 3001 和 3000 是否被佔用
lsof -ti:3001
lsof -ti:3000
```

**解決方案**:
```bash
# 釋放端口
lsof -ti:3001 | xargs kill -9
lsof -ti:3000 | xargs kill -9

# 然後在 Docker Desktop 中點擊播放按鈕啟動服務
```

### 2. 在 Docker Desktop 中手動啟動

1. 找到 `oga-backend` 服務
2. 點擊右側的 **播放按鈕（▶️）**
3. 查看日誌確認是否啟動成功
4. 對 `oga-frontend` 重複相同步驟

### 3. 查看錯誤日誌

在 Docker Desktop 中：
1. 點擊 `oga-backend` 服務
2. 切換到 "Logs" 標籤
3. 查看最後的錯誤訊息

### 4. 重新啟動服務

```bash
# 停止並重新啟動
docker-compose restart backend frontend

# 或完全重新啟動
docker-compose down
docker-compose up -d
```

## 🔍 快速診斷命令

```bash
# 查看服務狀態
docker-compose ps

# 查看 Backend 日誌（最後 30 行）
docker logs --tail=30 oga-backend

# 查看 Frontend 日誌（最後 30 行）
docker logs --tail=30 oga-frontend
```

## 💡 建議

1. **先檢查日誌** - 在 Docker Desktop 中查看服務日誌，找出具體錯誤
2. **檢查端口** - 確認 3000 和 3001 端口未被佔用
3. **手動啟動** - 在 Docker Desktop 中點擊播放按鈕嘗試啟動
4. **查看完整故障排除指南** - [TROUBLESHOOTING.md](TROUBLESHOOTING.md)



