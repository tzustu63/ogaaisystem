-- 移除 RACI 工作流管理相關的資料庫結構
-- 遷移檔案：008_remove_raci_workflows.sql

BEGIN;

-- 1. 刪除工作流操作記錄表（先刪除依賴表）
DROP TABLE IF EXISTS workflow_actions CASCADE;

-- 2. 刪除工作流表
DROP TABLE IF EXISTS workflows CASCADE;

-- 3. 刪除 RACI 模板表
DROP TABLE IF EXISTS raci_templates CASCADE;

-- 4. 刪除相關索引
DROP INDEX IF EXISTS idx_workflows_status;

COMMIT;

