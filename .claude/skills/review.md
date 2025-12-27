# /review - 程式碼審查

執行程式碼審查，檢查程式碼品質、安全性和最佳實踐。

## 審查流程

### 1. 取得待審查的變更

```bash
# 查看目前分支與 main 的差異
git diff main...HEAD

# 或查看最近的提交
git log --oneline -10
git show HEAD
```

### 2. 審查項目

#### 程式碼品質
- [ ] 程式碼邏輯是否正確
- [ ] 變數和函數命名是否清楚
- [ ] 是否有不必要的複雜度
- [ ] 是否符合專案的程式碼風格

#### 安全性檢查
- [ ] 是否有 SQL Injection 風險
- [ ] 是否有 XSS 風險
- [ ] 是否有敏感資訊外洩
- [ ] API 端點是否有適當的權限控制
- [ ] 輸入驗證是否完整

#### 效能考量
- [ ] 是否有不必要的資料庫查詢
- [ ] 是否有 N+1 查詢問題
- [ ] 是否有記憶體洩漏風險

#### TypeScript 特定
- [ ] 類型定義是否正確
- [ ] 是否避免使用 `any`
- [ ] 是否正確處理 null/undefined

#### React/Next.js 特定
- [ ] 元件是否正確使用 hooks
- [ ] 是否有適當的錯誤邊界
- [ ] 是否正確處理 loading 狀態

### 3. 輸出審查報告

格式：
```markdown
## 審查摘要

**審查檔案：** [檔案列表]
**審查結果：** ✅ 通過 / ⚠️ 需要修改 / ❌ 需要重大修改

### 發現的問題

#### 🔴 重要問題
- [問題描述及建議修復方式]

#### 🟡 建議改進
- [改進建議]

#### 🟢 優點
- [做得好的地方]

### 建議
[總結性建議]
```

## 專案特定規範

### 後端 (Express + TypeScript)
- 使用 Zod 進行輸入驗證
- 使用 pool.query 執行資料庫操作
- 錯誤訊息使用繁體中文
- 所有 API 端點需要 `authenticate` middleware

### 前端 (Next.js + TypeScript)
- 使用 App Router
- 使用 Tailwind CSS 進行樣式設計
- 使用 ShadcnUI 元件庫
- 狀態管理使用 React hooks

### 資料庫
- PostgreSQL
- 使用 UUID 作為主鍵
- 時間欄位使用 `TIMESTAMP WITH TIME ZONE`
