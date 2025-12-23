-- 移除 Key Results 與 KPI 的整合功能
-- 遷移檔案：007_remove_kr_kpi_integration.sql

BEGIN;

-- 1. 刪除視圖
DROP VIEW IF EXISTS v_okr_kpi_integration CASCADE;

-- 2. 刪除觸發器和函數
DROP TRIGGER IF EXISTS trigger_validate_kr_kpi ON key_results;
DROP FUNCTION IF EXISTS validate_kr_kpi_reference() CASCADE;
DROP FUNCTION IF EXISTS sync_kr_progress_from_kpi(UUID) CASCADE;

-- 3. 刪除索引
DROP INDEX IF EXISTS idx_key_results_kpi_id;
DROP INDEX IF EXISTS idx_key_results_kr_type;

-- 4. 移除 KPI 相關欄位
ALTER TABLE key_results
  DROP COLUMN IF EXISTS kpi_id,
  DROP COLUMN IF EXISTS kr_type,
  DROP COLUMN IF EXISTS kpi_target_value,
  DROP COLUMN IF EXISTS kpi_baseline_value;

COMMIT;
