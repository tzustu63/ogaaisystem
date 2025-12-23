-- 為 pdca_executions 表新增 check_point 欄位
-- 遷移檔案：010_add_pdca_execution_check_point.sql

BEGIN;

-- 為 pdca_executions 表新增 check_point 欄位
ALTER TABLE pdca_executions ADD COLUMN IF NOT EXISTS check_point TEXT;

-- 新增註解說明
COMMENT ON COLUMN pdca_executions.check_point IS '關聯的 Plan 檢核點';

COMMIT;

