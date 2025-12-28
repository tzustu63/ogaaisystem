# AI 小幫手功能文檔

**功能版本**: 1.0
**建置日期**: 2025-12-25
**狀態**: ✅ 已完成並部署

---

## 📖 功能概述

AI 小幫手是一個智能對話功能，讓使用者可以用自然語言詢問系統資料庫相關的問題。系統使用 Google Gemini AI 將自然語言轉換為 SQL 查詢，從資料庫中提取資料並提供友善的回答。

### 主要特色

- 🤖 **自然語言查詢**: 使用日常語言提問，無需了解 SQL
- 🎯 **多模型選擇**: 支援多種 Gemini 模型（2.5 Flash、2.5 Pro、2.0 Flash 等）
- 💬 **對話記錄**: 自動保存對話歷史，可隨時回顧
- 🔍 **SQL 透明化**: 可查看 AI 生成的 SQL 查詢語句
- 📊 **結果視覺化**: 以表格形式展示查詢結果
- 🔒 **安全設計**: 只允許 SELECT 查詢，保護資料安全

---

## 🏗️ 系統架構

### 技術棧

- **AI 引擎**: Google Gemini 2.5 系列 (via @google/generative-ai)
  - Gemini 2.5 Flash (預設) - 最新快速模型，支援 1M tokens
  - Gemini 2.5 Pro - 最強大的模型，適合複雜查詢
  - Gemini 2.0 Flash - 快速且穩定
  - Gemini 2.0 Flash Experimental - 實驗性功能
- **後端**: Node.js + Express + TypeScript
- **前端**: Next.js 14 + React + Tailwind CSS
- **資料庫**: PostgreSQL (新增 conversations 和 messages 表)

### 資料流程

```
使用者輸入問題
    ↓
前端 (chat/page.tsx)
    ↓
API (/api/chat)
    ↓
Gemini AI (文字 → SQL)
    ↓
PostgreSQL (執行查詢)
    ↓
Gemini AI (結果 → 自然語言)
    ↓
前端顯示回答 + 結果表格
```

---

## 📁 實作檔案

### 後端檔案

1. **資料庫遷移**
   - 檔案: [packages/backend/src/db/migrations/012_create_chat_tables.sql](../../packages/backend/src/db/migrations/012_create_chat_tables.sql)
   - 內容: 建立 `conversations` 和 `messages` 表

2. **API 路由**
   - 檔案: [packages/backend/src/routes/chat.ts](../../packages/backend/src/routes/chat.ts)
   - 端點:
     - `POST /api/chat` - 發送訊息並取得 AI 回應
     - `GET /api/chat/conversations` - 列出使用者的對話
     - `GET /api/chat/conversations/:id` - 取得對話訊息
     - `DELETE /api/chat/conversations/:id` - 刪除對話

3. **後端註冊**
   - 檔案: [packages/backend/src/index.ts](../../packages/backend/src/index.ts)
   - 修改: 註冊 `/api/chat` 路由

### 前端檔案

1. **聊天頁面**
   - 檔案: [packages/frontend/src/app/chat/page.tsx](../../packages/frontend/src/app/chat/page.tsx)
   - 功能: 完整的聊天介面，包含對話列表和訊息顯示

2. **側邊欄更新**
   - 檔案: [packages/frontend/src/components/Sidebar.tsx](../../packages/frontend/src/components/Sidebar.tsx)
   - 修改: 新增 "🤖 AI 小幫手" 選單項目

3. **API 客戶端**
   - 檔案: [packages/frontend/src/lib/api.ts](../../packages/frontend/src/lib/api.ts)
   - 新增: `chatApi` 物件，包含聊天相關的 API 呼叫

### 設定檔案

1. **Docker Compose**
   - 檔案: [docker-compose.yml](../../docker-compose.yml)
   - 修改: 新增 `GOOGLE_AI_API_KEY` 環境變數

2. **後端環境變數**
   - 檔案: [packages/backend/.env](../../packages/backend/.env)
   - 新增: Google AI API Key 設定

---

## 🗄️ 資料庫結構

### conversations 表

| 欄位 | 型別 | 說明 |
|------|------|------|
| id | UUID | 主鍵 |
| user_id | UUID | 使用者 ID (外鍵) |
| title | VARCHAR(255) | 對話標題 |
| created_at | TIMESTAMP | 建立時間 |
| updated_at | TIMESTAMP | 更新時間 |

### messages 表

| 欄位 | 型別 | 說明 |
|------|------|------|
| id | UUID | 主鍵 |
| conversation_id | UUID | 對話 ID (外鍵) |
| role | VARCHAR(20) | 角色 (user/assistant/system) |
| content | TEXT | 訊息內容 |
| sql_query | TEXT | SQL 查詢語句 (可選) |
| query_result | JSONB | 查詢結果 (可選) |
| created_at | TIMESTAMP | 建立時間 |

---

## 🔒 安全機制

### SQL 注入防護

1. **只允許 SELECT**: 禁止 INSERT、UPDATE、DELETE、DROP 等操作
2. **關鍵字檢查**: 過濾危險的 SQL 關鍵字
3. **參數化查詢**: 使用 PostgreSQL 的參數化查詢
4. **結果限制**: 自動限制查詢結果最多 100 筆

### 資料隱私

- 不查詢敏感欄位 (password, salt, api_key, secret)
- 使用者只能查看自己的對話記錄
- 對話與使用者帳號綁定，自動過濾使用者 ID

---

## 🎯 使用範例

### 範例問題

1. "顯示所有進行中的 OKR"
2. "本月有哪些 KPI 未達標？"
3. "我有哪些待處理的任務？"
4. "顯示最近的緊急事件"
5. "查看所有高優先級的策略專案"

### API 呼叫範例

```typescript
// 發送訊息
const response = await chatApi.sendMessage({
  message: "顯示所有進行中的 OKR",
  conversationId: null // 新對話
});

// 回應內容
{
  conversationId: "uuid",
  response: "目前有 5 個進行中的 OKR...",
  sqlQuery: "SELECT * FROM okrs WHERE status = 'in_progress' LIMIT 100",
  queryResult: [...],
  resultCount: 5
}
```

---

## 📊 AI 提示詞設計

### 資料庫架構描述

系統向 Gemini AI 提供完整的資料庫架構說明，包括：

- 8 大功能模組的表結構
- 欄位說明和關聯關係
- 查詢規則和限制
- 範例問題與對應的 SQL

### 回應生成策略

AI 會：
- 總結查詢結果
- 提供有意義的分析
- 突出重點資訊
- 友善地告知無資料情況

---

## 🚀 部署說明

### 前置需求

- Google AI API Key (需在環境變數 GOOGLE_AI_API_KEY 中設定)
- PostgreSQL 資料庫
- Docker 和 Docker Compose

### 部署步驟

1. **資料庫遷移**
   ```bash
   # 自動執行 (透過 docker-compose)
   docker-compose up -d
   ```

2. **環境變數設定**
   - Docker: 已在 `docker-compose.yml` 配置
   - 本地開發: 在 `packages/backend/.env` 設定

3. **重建服務**
   ```bash
   cd /path/to/oga ai system
   docker-compose up -d --build backend frontend
   ```

### 驗證部署

1. 檢查後端健康狀態
   ```bash
   curl http://localhost:13001/health
   # 應回應: {"status":"ok","timestamp":"..."}
   ```

2. 訪問前端
   - URL: http://localhost:13000/chat
   - 應看到 AI 小幫手介面

---

## 🧪 測試指南

### 手動測試

1. **新對話測試**
   - 點擊左側邊欄 "🤖 AI 小幫手"
   - 點擊 "新對話" 按鈕
   - 輸入測試問題並發送

2. **查詢結果測試**
   - 點擊 "查看 SQL 查詢" 展開 SQL
   - 點擊 "查看查詢結果" 檢視表格
   - 確認資料正確顯示

3. **對話管理測試**
   - 建立多個對話
   - 切換不同對話
   - 刪除對話

### API 測試

```bash
# 取得認證 token (先登入)
TOKEN="your-jwt-token"

# 發送訊息
curl -X POST http://localhost:13001/api/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"顯示所有 KPI"}'

# 列出對話
curl http://localhost:13001/api/chat/conversations \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🐛 故障排除

### 常見問題

1. **API Key 錯誤**
   - 症狀: "Error generating SQL" 錯誤
   - 解決: 檢查 `GOOGLE_AI_API_KEY` 環境變數是否正確設定

2. **資料庫連線失敗**
   - 症狀: "ECONNREFUSED" 錯誤
   - 解決: 確認 PostgreSQL 服務正在運行

3. **未授權錯誤**
   - 症狀: 401 錯誤
   - 解決: 檢查使用者是否已登入，JWT token 是否有效

4. **查詢被拒絕**
   - 症狀: "不允許使用 XXX 操作"
   - 解決: 這是安全機制，只能使用 SELECT 查詢

### 除錯方法

1. **檢查後端日誌**
   ```bash
   docker logs oga-backend --tail 100
   ```

2. **檢查資料庫**
   ```bash
   docker exec -it oga-mcp-postgres psql -U postgres -d oga_ai_system
   # 查詢對話
   SELECT * FROM conversations;
   # 查詢訊息
   SELECT * FROM messages;
   ```

---

## 🔄 未來改進方向

### 短期 (1-2 週)

- [ ] 新增對話搜尋功能
- [ ] 支援匯出對話記錄
- [ ] 新增常見問題快捷按鈕
- [ ] 優化 SQL 生成準確度

### 中期 (1 個月)

- [ ] 新增多語言支援 (英文)
- [ ] 實作語音輸入
- [ ] 新增圖表生成功能
- [ ] 支援複雜的聚合查詢

### 長期 (3 個月+)

- [ ] 整合更多 AI 模型選擇
- [ ] 實作 RAG (Retrieval-Augmented Generation)
- [ ] 新增資料分析建議功能
- [ ] 支援自然語言生成報告

---

## 📝 變更日誌

### v1.0 (2025-12-25)

- ✅ 初始版本發布
- ✅ Google Gemini AI 整合
- ✅ 基礎對話功能
- ✅ SQL 查詢生成
- ✅ 對話歷史記錄
- ✅ 安全機制實作

---

## 📚 相關文檔

- [產品需求文件 (PRD)](../02-core/PRD.md)
- [部署指南](../05-deployment/DOCKER_DEPLOYMENT.md)
- [API 文檔](../07-api/README.md)
- [測試指南](../04-development/TESTING_GUIDE.md)

---

## 👥 貢獻者

- **開發**: Claude Sonnet 4.5 (AI Assistant)
- **需求提供**: 使用者 kuoyuming
- **部署環境**: Docker + PostgreSQL + Next.js

---

**最後更新**: 2025-12-25
**維護者**: 開發團隊
