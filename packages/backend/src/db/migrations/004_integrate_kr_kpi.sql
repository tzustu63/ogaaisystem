-- 整合 Key Results 與 KPI 系統
-- 讓 KR 可以引用現有的 KPI，避免重複定義指標

-- 1. 為 key_results 表添加 KPI 引用欄位
ALTER TABLE key_results ADD COLUMN IF NOT EXISTS kpi_id UUID REFERENCES kpi_registry(id) ON DELETE SET NULL;

-- 2. 添加 KR 類型欄位（kpi_based 或 custom）
ALTER TABLE key_results ADD COLUMN IF NOT EXISTS kr_type VARCHAR(20) DEFAULT 'custom';
-- 'kpi_based': 引用現有 KPI，進度從 KPI 自動同步
-- 'custom': 自定義的臨時指標，獨立追蹤

-- 3. 添加 KPI 目標值欄位（當引用 KPI 時，設定本季要達到的目標）
ALTER TABLE key_results ADD COLUMN IF NOT EXISTS kpi_target_value NUMERIC;

-- 4. 添加 KPI 基準值欄位（引用 KPI 時，記錄設定 OKR 時的起始值）
ALTER TABLE key_results ADD COLUMN IF NOT EXISTS kpi_baseline_value NUMERIC;

-- 5. 為 Task 表保留 kpi_id 但改為可選（主要透過 KR 連結）
-- Task.kpi_id 保留用於直接影響 KPI 但不屬於任何 OKR 的情況
COMMENT ON COLUMN tasks.kpi_id IS '直接影響的 KPI（可選，主要透過 KR 連結）';

-- 6. 建立索引以優化查詢
CREATE INDEX IF NOT EXISTS idx_key_results_kpi_id ON key_results(kpi_id);
CREATE INDEX IF NOT EXISTS idx_key_results_kr_type ON key_results(kr_type);

-- 7. 添加約束：如果 kr_type 是 kpi_based，則 kpi_id 不能為空
-- 使用觸發器來實現這個邏輯
CREATE OR REPLACE FUNCTION validate_kr_kpi_reference()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.kr_type = 'kpi_based' AND NEW.kpi_id IS NULL THEN
    RAISE EXCEPTION 'KPI 類型的 Key Result 必須引用一個 KPI';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_validate_kr_kpi ON key_results;
CREATE TRIGGER trigger_validate_kr_kpi
  BEFORE INSERT OR UPDATE ON key_results
  FOR EACH ROW
  EXECUTE FUNCTION validate_kr_kpi_reference();

-- 8. 建立函數：自動從 KPI 同步 Key Result 的進度
CREATE OR REPLACE FUNCTION sync_kr_progress_from_kpi(kr_uuid UUID)
RETURNS VOID AS $$
DECLARE
  v_kpi_id UUID;
  v_kpi_target NUMERIC;
  v_kpi_baseline NUMERIC;
  v_current_value NUMERIC;
  v_progress NUMERIC;
BEGIN
  -- 取得 KR 的 KPI 引用資訊
  SELECT kpi_id, kpi_target_value, kpi_baseline_value
  INTO v_kpi_id, v_kpi_target, v_kpi_baseline
  FROM key_results
  WHERE id = kr_uuid AND kr_type = 'kpi_based';
  
  IF v_kpi_id IS NULL THEN
    RETURN; -- 不是 KPI 類型的 KR，不處理
  END IF;
  
  -- 取得 KPI 最新數值
  SELECT value INTO v_current_value
  FROM kpi_values
  WHERE kpi_id = v_kpi_id
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_current_value IS NULL THEN
    RETURN; -- 沒有 KPI 數值
  END IF;
  
  -- 計算進度百分比
  IF v_kpi_target IS NOT NULL AND v_kpi_baseline IS NOT NULL AND v_kpi_target != v_kpi_baseline THEN
    v_progress := ((v_current_value - v_kpi_baseline) / (v_kpi_target - v_kpi_baseline)) * 100;
    v_progress := GREATEST(0, LEAST(100, v_progress)); -- 限制在 0-100
  ELSE
    v_progress := 0;
  END IF;
  
  -- 更新 Key Result
  UPDATE key_results
  SET current_value = v_current_value,
      progress_percentage = v_progress,
      status = CASE 
        WHEN v_progress >= 100 THEN 'completed'
        WHEN v_progress > 0 THEN 'in_progress'
        ELSE 'not_started'
      END,
      updated_at = CURRENT_TIMESTAMP
  WHERE id = kr_uuid;
END;
$$ LANGUAGE plpgsql;

-- 9. 建立視圖：顯示 OKR 與 KPI 的整合關係
CREATE OR REPLACE VIEW v_okr_kpi_integration AS
SELECT 
  o.id AS okr_id,
  o.quarter,
  o.objective,
  kr.id AS kr_id,
  kr.description AS kr_description,
  kr.kr_type,
  kr.target_value AS kr_target_value,
  kr.current_value AS kr_current_value,
  kr.progress_percentage,
  kr.status AS kr_status,
  k.id AS kpi_id,
  k.kpi_id AS kpi_code,
  k.name_zh AS kpi_name,
  k.bsc_perspective,
  kr.kpi_baseline_value,
  kr.kpi_target_value AS kpi_target_for_quarter,
  i.id AS initiative_id,
  i.name_zh AS initiative_name
FROM okrs o
LEFT JOIN key_results kr ON o.id = kr.okr_id
LEFT JOIN kpi_registry k ON kr.kpi_id = k.id
LEFT JOIN initiatives i ON o.initiative_id = i.id
ORDER BY o.quarter DESC, o.id, kr.id;

COMMENT ON VIEW v_okr_kpi_integration IS 'OKR 與 KPI 整合視圖，顯示 KR 引用 KPI 的關係';
