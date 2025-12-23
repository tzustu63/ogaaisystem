-- 移除 BSC 相關功能和資料庫結構
-- 遷移檔案：006_remove_bsc.sql

BEGIN;

-- 1. 刪除 BSC 相關的關聯表（先刪除外鍵依賴）
DROP TABLE IF EXISTS bsc_causal_links CASCADE;
DROP TABLE IF EXISTS bsc_objective_kpis CASCADE;
DROP TABLE IF EXISTS initiative_bsc_objectives CASCADE;

-- 2. 刪除 BSC 目標表
DROP TABLE IF EXISTS bsc_objectives CASCADE;

-- 3. 從 kpi_registry 表中移除 bsc_perspective 欄位（改為可選）
ALTER TABLE kpi_registry 
  DROP COLUMN IF EXISTS bsc_perspective;

-- 4. 從 initiatives 表中移除 bsc_perspective 欄位（如果存在）
ALTER TABLE initiatives 
  DROP COLUMN IF EXISTS bsc_perspective;

-- 5. 從 system_options 表中移除 bsc_perspective 欄位（如果存在）
ALTER TABLE system_options 
  DROP COLUMN IF EXISTS bsc_perspective;

COMMIT;
