-- 新增任務對 Key Result 的貢獻值欄位
-- 遷移檔案：009_add_task_kr_contribution.sql

BEGIN;

-- 1. 為 tasks 表新增 kr_contribution_value 欄位（任務對 KR 的貢獻數值）
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS kr_contribution_value NUMERIC DEFAULT 0;

-- 2. 新增註解說明
COMMENT ON COLUMN tasks.kr_contribution_value IS '任務對關聯 Key Result 的貢獻數值，所有相關任務的貢獻值會加總到 KR 的 current_value';

COMMIT;

