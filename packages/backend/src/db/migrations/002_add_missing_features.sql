-- 遷移 002：新增缺失功能所需的資料表與欄位

-- 1. KPI 手動標記例外
ALTER TABLE kpi_values 
ADD COLUMN IF NOT EXISTS is_manual_exception BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS exception_reason TEXT,
ADD COLUMN IF NOT EXISTS exception_marked_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS exception_marked_at TIMESTAMP;

-- 2. BSC 目標協作單位
ALTER TABLE bsc_objectives 
ADD COLUMN IF NOT EXISTS collaborating_units VARCHAR(255)[];

-- 3. 表單定義表
CREATE TABLE IF NOT EXISTS form_definitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  task_type VARCHAR(50) NOT NULL, -- 'routine', 'project', 'incident'
  form_schema JSONB NOT NULL, -- 表單結構定義
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. 表單紀錄表
CREATE TABLE IF NOT EXISTS task_form_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  form_definition_id UUID REFERENCES form_definitions(id),
  form_data JSONB NOT NULL, -- 表單填寫的資料
  submitted_by UUID REFERENCES users(id),
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(task_id, form_definition_id)
);

-- 5. 系統對接表
CREATE TABLE IF NOT EXISTS system_integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  system_name VARCHAR(255) NOT NULL,
  system_type VARCHAR(50) NOT NULL, -- 'sis', 'finance', 'hr', 'api', 'etl'
  connection_config JSONB, -- 連線設定（加密儲存）
  sync_frequency VARCHAR(50), -- 'realtime', 'daily', 'weekly', 'manual'
  last_sync_at TIMESTAMP,
  last_sync_status VARCHAR(50), -- 'success', 'failed', 'pending'
  last_sync_error TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. 同步記錄表
CREATE TABLE IF NOT EXISTS integration_sync_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  integration_id UUID REFERENCES system_integrations(id) ON DELETE CASCADE,
  sync_type VARCHAR(50) NOT NULL, -- 'full', 'incremental'
  records_synced INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  status VARCHAR(50) NOT NULL,
  error_message TEXT,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  synced_by UUID REFERENCES users(id)
);

-- 7. 個資合規相關表
CREATE TABLE IF NOT EXISTS data_collection_purposes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purpose_name VARCHAR(255) NOT NULL,
  description TEXT,
  legal_basis VARCHAR(255), -- 法源依據
  notified_at TIMESTAMP,
  notification_method VARCHAR(50), -- 'email', 'form', 'website'
  notification_proof_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS consent_forms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  data_subject_id VARCHAR(255) NOT NULL, -- 當事人識別
  data_subject_type VARCHAR(50) NOT NULL, -- 'student', 'staff', 'other'
  purpose_id UUID REFERENCES data_collection_purposes(id),
  consent_scope TEXT NOT NULL, -- 同意範圍
  consent_file_url VARCHAR(500), -- 同意書檔案
  consent_date DATE NOT NULL,
  expiry_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS data_retention_policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  data_type VARCHAR(100) NOT NULL, -- 'student_data', 'financial_data', etc.
  retention_period_days INTEGER NOT NULL,
  auto_delete BOOLEAN DEFAULT FALSE,
  reminder_days_before INTEGER DEFAULT 30, -- 到期前幾天提醒
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS data_deletion_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requestor_id VARCHAR(255) NOT NULL, -- 請求人識別
  requestor_type VARCHAR(50) NOT NULL,
  request_reason TEXT,
  requested_data_types TEXT[], -- 請求刪除的資料類型
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'completed'
  verified_at TIMESTAMP,
  verified_by UUID REFERENCES users(id),
  approved_at TIMESTAMP,
  approved_by UUID REFERENCES users(id),
  completed_at TIMESTAMP,
  completion_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. 排名填報相關表（Level 3）
CREATE TABLE IF NOT EXISTS ranking_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ranking_type VARCHAR(50) NOT NULL, -- 'QS', 'THE'
  submission_year INTEGER NOT NULL,
  deadline DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'in_progress', 'submitted'
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ranking_indicators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID REFERENCES ranking_submissions(id) ON DELETE CASCADE,
  indicator_name VARCHAR(255) NOT NULL,
  data_source VARCHAR(255),
  responsible_user_id UUID REFERENCES users(id),
  status VARCHAR(50) DEFAULT 'not_started', -- 'not_started', 'in_progress', 'completed'
  completion_rate NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ranking_evidence (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  indicator_id UUID REFERENCES ranking_indicators(id) ON DELETE CASCADE,
  evidence_type VARCHAR(50) NOT NULL, -- 'document', 'data', 'link'
  evidence_url VARCHAR(500),
  evidence_data JSONB,
  uploaded_by UUID REFERENCES users(id),
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_kpi_values_exception ON kpi_values(is_manual_exception);
CREATE INDEX IF NOT EXISTS idx_task_form_records_task ON task_form_records(task_id);
CREATE INDEX IF NOT EXISTS idx_integration_sync_logs_integration ON integration_sync_logs(integration_id);
CREATE INDEX IF NOT EXISTS idx_consent_forms_subject ON consent_forms(data_subject_id, data_subject_type);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_status ON data_deletion_requests(status);
CREATE INDEX IF NOT EXISTS idx_ranking_indicators_submission ON ranking_indicators(submission_id);

