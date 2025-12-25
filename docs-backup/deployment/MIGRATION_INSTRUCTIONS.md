# 資料庫遷移說明

## 遷移檔案
`packages/backend/src/db/migrations/002_add_missing_features.sql`

## 執行方式

### 方法 1：使用 psql 直接執行（推薦）
```bash
# 確認資料庫連線資訊
psql -h localhost -p 5432 -U postgres -d oga_ai_system -f packages/backend/src/db/migrations/002_add_missing_features.sql
```

### 方法 2：使用遷移腳本
```bash
cd packages/backend
npm run migrate 002_add_missing_features.sql
```

**注意**：使用遷移腳本前需確認：
1. 資料庫已建立（`oga_ai_system`）
2. 環境變數已設定（`.env` 檔案）
3. 已執行初始遷移（`001_initial_schema.sql`）

## 遷移內容

### 新增欄位
1. **kpi_values 表**
   - `is_manual_exception` (BOOLEAN)
   - `exception_reason` (TEXT)
   - `exception_marked_by` (UUID)
   - `exception_marked_at` (TIMESTAMP)

2. **bsc_objectives 表**
   - `collaborating_units` (VARCHAR(255)[])

### 新增資料表
1. **form_definitions** - 表單定義
2. **task_form_records** - 表單紀錄
3. **system_integrations** - 系統對接
4. **integration_sync_logs** - 同步記錄
5. **data_collection_purposes** - 資料蒐集目的
6. **consent_forms** - 同意書
7. **data_retention_policies** - 保存期限政策
8. **data_deletion_requests** - 刪除請求
9. **ranking_submissions** - 排名填報（Level 3）
10. **ranking_indicators** - 排名指標
11. **ranking_evidence** - 排名證據

### 新增索引
- `idx_kpi_values_exception`
- `idx_task_form_records_task`
- `idx_integration_sync_logs_integration`
- `idx_consent_forms_subject`
- `idx_deletion_requests_status`
- `idx_ranking_indicators_submission`

## 驗證遷移

執行以下 SQL 查詢驗證：

```sql
-- 檢查 KPI 例外欄位
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'kpi_values' 
AND column_name LIKE '%exception%';

-- 檢查 BSC 協作單位欄位
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'bsc_objectives' 
AND column_name = 'collaborating_units';

-- 檢查新資料表
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'form_definitions',
  'task_form_records',
  'system_integrations',
  'integration_sync_logs',
  'data_collection_purposes',
  'consent_forms',
  'data_retention_policies',
  'data_deletion_requests'
)
ORDER BY table_name;
```

## 回滾（如需要）

如果需要回滾，執行以下 SQL：

```sql
-- 刪除新資料表
DROP TABLE IF EXISTS ranking_evidence CASCADE;
DROP TABLE IF EXISTS ranking_indicators CASCADE;
DROP TABLE IF EXISTS ranking_submissions CASCADE;
DROP TABLE IF EXISTS data_deletion_requests CASCADE;
DROP TABLE IF EXISTS data_retention_policies CASCADE;
DROP TABLE IF EXISTS consent_forms CASCADE;
DROP TABLE IF EXISTS data_collection_purposes CASCADE;
DROP TABLE IF EXISTS integration_sync_logs CASCADE;
DROP TABLE IF EXISTS system_integrations CASCADE;
DROP TABLE IF EXISTS task_form_records CASCADE;
DROP TABLE IF EXISTS form_definitions CASCADE;

-- 刪除新欄位（PostgreSQL 不支援直接刪除，需重建表或使用其他方法）
-- 建議保留欄位，設為 NULL 即可
```

