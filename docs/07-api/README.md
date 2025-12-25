# API 文檔

本目錄將包含完整的 API 參考文檔。

## 🚧 規劃中

API 文檔正在規劃中，將包含以下內容：

### API 參考
- **REST API 端點** - 所有 API 端點的詳細說明
- **請求/回應範例** - 實際的請求和回應示例
- **錯誤代碼** - 錯誤代碼和處理指南
- **認證** - API 認證機制

### 計劃功能
- [ ] Swagger/OpenAPI 規格
- [ ] 互動式 API 文檔
- [ ] SDK 使用指南
- [ ] Webhook 文檔
- [ ] GraphQL API (未來)

## 📖 臨時資源

在正式 API 文檔完成前，可參考：

1. **程式碼中的路由定義**
   - `packages/backend/src/routes/*.ts`

2. **API 使用範例**
   - `packages/frontend/src/lib/api.ts`

3. **相關文檔**
   - [開發文檔](../04-development/)
   - [PRD 文檔](../02-core/PRD.md)

## 🔗 快速連結

主要 API 模組：
- `/api/kpi` - KPI 管理
- `/api/initiatives` - 策略專案
- `/api/okr` - OKR 管理
- `/api/tasks` - 任務管理
- `/api/pdca` - PDCA 循環
- `/api/incidents` - 緊急事件
- `/api/users` - 使用者管理
- `/api/auth` - 認證

## 📝 貢獻

如果你想協助完善 API 文檔，請參考：
- [貢獻指南](../06-guides/README.md)
- [開發規範](../02-core/AGENTS.md)
