# MCP 部署錯誤修正

## 問題說明

### 錯誤 1: CORS 錯誤
```
Access to XMLHttpRequest at 'http://localhost:3001/api/kpi' from origin 'http://localhost:23000' 
has been blocked by CORS policy
```

**原因**：
- 前端在端口 23000 運行，但嘗試訪問 `localhost:3001`（應該是 23001）
- Next.js 的 `NEXT_PUBLIC_*` 環境變數在**構建時**被內嵌到代碼中
- 如果前端容器是使用舊的環境變數構建的，就會使用錯誤的 API URL

### 錯誤 2: 404 錯誤
- `settings?_rsc=...` - Next.js 內部路由，可能與構建相關
- `favicon.ico` - 靜態資源缺失

## 修正方案

### 1. 修正後端 CORS 配置
已更新 `packages/backend/src/index.ts`，明確允許以下來源：
- `http://localhost:23000` (MCP 前端)
- `http://localhost:13000` (原有前端)
- `http://localhost:3000` (開發環境)

### 2. 修正 Docker Compose 配置
已更新 `docker-compose.mcp.yml`：
- 使用 `build.args` 在構建時傳遞 `NEXT_PUBLIC_API_URL`
- 確保環境變數在構建階段可用

### 3. 修正 Dockerfile
已更新 `packages/frontend/Dockerfile`：
- 添加 `ARG NEXT_PUBLIC_API_URL` 支持構建參數
- 在構建時使用該參數設置環境變數

## 重新部署步驟

**重要**：需要重新構建前端容器才能應用更改！

```bash
# 停止現有服務
docker-compose -f docker-compose.mcp.yml down

# 重新構建並啟動（強制重新構建前端）
docker-compose -f docker-compose.mcp.yml up -d --build

# 或者只重新構建前端
docker-compose -f docker-compose.mcp.yml build frontend
docker-compose -f docker-compose.mcp.yml up -d
```

## 驗證

部署後檢查：

1. **檢查前端是否使用正確的 API URL**：
```bash
# 進入前端容器
docker exec -it oga-mcp-frontend sh

# 檢查構建時的環境變數（已內嵌到代碼中）
grep -r "23001" /app/packages/frontend/.next
```

2. **檢查後端 CORS 配置**：
```bash
# 檢查後端日誌
docker-compose -f docker-compose.mcp.yml logs backend | grep CORS
```

3. **測試 API 連接**：
```bash
# 從瀏覽器訪問前端
open http://localhost:23000

# 檢查瀏覽器控制台，應該看到 API 請求指向 localhost:23001
```

## 預期結果

修正後應該：
- ✅ 前端 API 請求指向 `http://localhost:23001/api`
- ✅ 沒有 CORS 錯誤
- ✅ 404 錯誤減少（部分可能是 Next.js 內部路由，不影響功能）
