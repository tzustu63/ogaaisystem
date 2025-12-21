-- Migration: 005_system_settings.sql
-- 系統設定選項表 - 用於管理各類下拉選單選項

-- 系統設定選項表（通用結構）
CREATE TABLE IF NOT EXISTS system_options (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category VARCHAR(50) NOT NULL, -- 'initiative_type', 'department', 'person', 'funding_source', 'indicator'
  value VARCHAR(255) NOT NULL,
  label VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(category, value)
);

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_system_options_category ON system_options(category);
CREATE INDEX IF NOT EXISTS idx_system_options_active ON system_options(is_active);

-- 新增 initiatives 表欄位
ALTER TABLE initiatives 
  ADD COLUMN IF NOT EXISTS primary_owner VARCHAR(255),
  ADD COLUMN IF NOT EXISTS co_owners TEXT[],
  ADD COLUMN IF NOT EXISTS funding_sources TEXT[],
  ADD COLUMN IF NOT EXISTS related_indicators TEXT[],
  ADD COLUMN IF NOT EXISTS bsc_perspective VARCHAR(50),
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- 如果 program_tags 存在，可以保留或移除（這裡將其重命名為 notes 的概念已在 notes 欄位處理）

-- 插入預設專案類型選項
INSERT INTO system_options (category, value, label, sort_order) VALUES
  ('initiative_type', 'policy_response', '政策回應', 1),
  ('initiative_type', 'ranking_improvement', '排名改善', 2),
  ('initiative_type', 'risk_control', '風險控制', 3),
  ('initiative_type', 'innovation', '創新專案', 4),
  ('initiative_type', 'digital_transformation', '數位轉型', 5),
  ('initiative_type', 'quality_improvement', '品質提升', 6)
ON CONFLICT (category, value) DO NOTHING;

-- 插入預設負責單位選項
INSERT INTO system_options (category, value, label, sort_order) VALUES
  ('department', 'academic_affairs', '教務處', 1),
  ('department', 'student_affairs', '學生事務處', 2),
  ('department', 'general_affairs', '總務處', 3),
  ('department', 'research_development', '研發處', 4),
  ('department', 'international_affairs', '國際事務處', 5),
  ('department', 'library', '圖書館', 6),
  ('department', 'computer_center', '電算中心', 7),
  ('department', 'secretariat', '秘書室', 8),
  ('department', 'personnel', '人事室', 9),
  ('department', 'accounting', '會計室', 10)
ON CONFLICT (category, value) DO NOTHING;

-- 插入預設人員選項
INSERT INTO system_options (category, value, label, sort_order) VALUES
  ('person', 'person_001', '王大明', 1),
  ('person', 'person_002', '李小華', 2),
  ('person', 'person_003', '張美玲', 3),
  ('person', 'person_004', '陳志偉', 4),
  ('person', 'person_005', '林淑芬', 5)
ON CONFLICT (category, value) DO NOTHING;

-- 插入預設經費來源選項
INSERT INTO system_options (category, value, label, sort_order) VALUES
  ('funding_source', 'ministry_education', '教育部補助', 1),
  ('funding_source', 'ministry_science', '科技部計畫', 2),
  ('funding_source', 'school_budget', '校務基金', 3),
  ('funding_source', 'industry_cooperation', '產學合作', 4),
  ('funding_source', 'donation', '捐款', 5),
  ('funding_source', 'self_funding', '自籌經費', 6)
ON CONFLICT (category, value) DO NOTHING;

-- 插入預設對應指標選項
INSERT INTO system_options (category, value, label, sort_order) VALUES
  ('indicator', 'student_satisfaction', '學生滿意度', 1),
  ('indicator', 'graduation_rate', '畢業率', 2),
  ('indicator', 'employment_rate', '就業率', 3),
  ('indicator', 'research_output', '研究產出', 4),
  ('indicator', 'international_ratio', '國際化比例', 5),
  ('indicator', 'industry_income', '產學合作收入', 6)
ON CONFLICT (category, value) DO NOTHING;

-- 更新時間觸發器
CREATE OR REPLACE FUNCTION update_system_options_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_system_options_updated_at ON system_options;
CREATE TRIGGER trigger_system_options_updated_at
  BEFORE UPDATE ON system_options
  FOR EACH ROW
  EXECUTE FUNCTION update_system_options_updated_at();

-- 新增 initiative_id 的序列（用於自動編號）
CREATE SEQUENCE IF NOT EXISTS initiative_id_seq START 1;
