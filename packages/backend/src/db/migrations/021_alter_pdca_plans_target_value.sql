-- 將 pdca_plans.target_value 從 numeric 改為 text，以支援包含單位的目標值
ALTER TABLE pdca_plans
ALTER COLUMN target_value TYPE TEXT;

-- 同樣修改 pdca_executions.actual_value 以保持一致性
ALTER TABLE pdca_executions
ALTER COLUMN actual_value TYPE TEXT;
