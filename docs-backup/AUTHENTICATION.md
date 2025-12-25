# 認證說明

## 預設管理員帳號

系統已創建預設管理員帳號：

- **使用者名稱**: `admin`
- **密碼**: `admin123`
- **Email**: `admin@oga-ai-system.local`

⚠️ **重要**：請在生產環境中立即更改此密碼！

## 登入方式

1. 訪問 http://localhost:23000/login
2. 使用上述憑證登入
3. 登入成功後會自動重定向到首頁

## 認證機制

- 系統使用 JWT (JSON Web Token) 進行認證
- Token 儲存在瀏覽器的 `localStorage` 中
- Token 有效期為 24 小時
- 如果 API 請求返回 401 (Unauthorized)，系統會自動重定向到登入頁

## 創建默認用戶

如果默認管理員用戶尚未創建，可以執行以下命令：

```bash
# 在 Docker 容器中執行 migration
docker exec -i oga-mcp-postgres psql -U postgres -d oga_ai_system < packages/backend/src/db/migrations/003_create_default_admin.sql
```

## API 認證

所有 API 端點（除了 `/api/auth/login`）都需要在請求頭中包含認證 token：

```
Authorization: Bearer <token>
```

前端會自動在每個請求中添加 token（如果已登入）。
