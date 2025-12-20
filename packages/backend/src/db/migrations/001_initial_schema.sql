-- 建立擴充
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 使用者與角色表
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  full_name VARCHAR(255),
  department VARCHAR(255),
  position VARCHAR(255),
  sso_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  permissions JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_roles (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  scope_type VARCHAR(50), -- 'university', 'college', 'department', 'project', 'student_group'
  scope_value VARCHAR(255), -- 具體範圍值
  PRIMARY KEY (user_id, role_id, scope_type, scope_value)
);

-- KPI Registry 表
CREATE TABLE kpi_registry (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kpi_id VARCHAR(100) UNIQUE NOT NULL,
  name_zh VARCHAR(255) NOT NULL,
  name_en VARCHAR(255),
  bsc_perspective VARCHAR(50) NOT NULL, -- 'financial', 'customer', 'internal_process', 'learning_growth'
  definition TEXT NOT NULL,
  formula TEXT NOT NULL,
  data_source VARCHAR(255) NOT NULL,
  data_steward VARCHAR(255) NOT NULL,
  update_frequency VARCHAR(50) NOT NULL, -- 'monthly', 'quarterly', 'ad_hoc'
  target_value JSONB, -- {annual: 15, q1: 3, q2: 7, ...}
  thresholds JSONB NOT NULL, -- {mode: 'fixed', green: {...}, yellow: {...}, red: {...}}
  evidence_requirements TEXT[],
  applicable_programs VARCHAR(50)[], -- ['deepening', 'bilingual', 'southbound', 'sea']
  is_leading_indicator BOOLEAN DEFAULT FALSE, -- 領先指標標記
  is_lagging_indicator BOOLEAN DEFAULT FALSE, -- 落後指標標記
  weight NUMERIC DEFAULT 1.0, -- 權重
  current_version INTEGER DEFAULT 1,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE kpi_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kpi_id UUID REFERENCES kpi_registry(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  definition TEXT,
  formula TEXT,
  thresholds JSONB,
  changed_by UUID REFERENCES users(id),
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  change_reason TEXT,
  PRIMARY KEY (kpi_id, version)
);

CREATE TABLE kpi_values (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kpi_id UUID REFERENCES kpi_registry(id) ON DELETE CASCADE,
  period VARCHAR(50) NOT NULL, -- '2024-Q1', '2024-01', etc.
  value NUMERIC,
  target_value NUMERIC,
  status VARCHAR(20), -- 'green', 'yellow', 'red'
  version_used INTEGER,
  evidence_urls TEXT[],
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(kpi_id, period)
);

-- BSC 目標表
CREATE TABLE bsc_objectives (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name_zh VARCHAR(255) NOT NULL,
  name_en VARCHAR(255),
  perspective VARCHAR(50) NOT NULL, -- 'financial', 'customer', 'internal_process', 'learning_growth'
  description TEXT,
  responsible_user_id UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE bsc_objective_kpis (
  objective_id UUID REFERENCES bsc_objectives(id) ON DELETE CASCADE,
  kpi_id UUID REFERENCES kpi_registry(id) ON DELETE CASCADE,
  weight NUMERIC DEFAULT 1.0,
  PRIMARY KEY (objective_id, kpi_id)
);

CREATE TABLE bsc_causal_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_objective_id UUID REFERENCES bsc_objectives(id) ON DELETE CASCADE,
  to_objective_id UUID REFERENCES bsc_objectives(id) ON DELETE CASCADE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(from_objective_id, to_objective_id)
);

-- Initiatives 表
CREATE TABLE initiatives (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  initiative_id VARCHAR(100) UNIQUE NOT NULL,
  name_zh VARCHAR(255) NOT NULL,
  name_en VARCHAR(255),
  initiative_type VARCHAR(50) NOT NULL, -- 'policy_response', 'ranking_improvement', 'risk_control', 'innovation'
  status VARCHAR(50) NOT NULL, -- 'planning', 'in_progress', 'completed', 'cancelled'
  risk_level VARCHAR(20), -- 'high', 'medium', 'low'
  start_date DATE,
  end_date DATE,
  budget NUMERIC,
  responsible_unit VARCHAR(255) NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE initiative_bsc_objectives (
  initiative_id UUID REFERENCES initiatives(id) ON DELETE CASCADE,
  objective_id UUID REFERENCES bsc_objectives(id) ON DELETE CASCADE,
  PRIMARY KEY (initiative_id, objective_id)
);

CREATE TABLE initiative_kpis (
  initiative_id UUID REFERENCES initiatives(id) ON DELETE CASCADE,
  kpi_id UUID REFERENCES kpi_registry(id) ON DELETE CASCADE,
  expected_impact VARCHAR(20), -- 'positive', 'negative', 'neutral'
  actual_impact_description TEXT,
  actual_impact_evidence_urls TEXT[],
  PRIMARY KEY (initiative_id, kpi_id)
);

CREATE TABLE initiative_programs (
  initiative_id UUID REFERENCES initiatives(id) ON DELETE CASCADE,
  program VARCHAR(50), -- 'deepening', 'bilingual', 'southbound', 'sea'
  PRIMARY KEY (initiative_id, program)
);

-- OKR 表
CREATE TABLE okrs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  initiative_id UUID REFERENCES initiatives(id) ON DELETE CASCADE,
  quarter VARCHAR(10) NOT NULL, -- '2024-Q1'
  objective TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE key_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  okr_id UUID REFERENCES okrs(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  target_value NUMERIC,
  current_value NUMERIC DEFAULT 0,
  unit VARCHAR(50),
  progress_percentage NUMERIC DEFAULT 0,
  status VARCHAR(20) DEFAULT 'not_started', -- 'not_started', 'in_progress', 'completed'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- RACI 模板表
CREATE TABLE raci_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  scenario_type VARCHAR(100), -- 'dual_degree_contract', etc.
  raci_matrix JSONB NOT NULL, -- {R: [user_ids], A: [user_ids], C: [user_ids], I: [user_ids]}
  workflow_steps JSONB, -- [{step: 'draft', roles: {...}, sla: {...}, required_attachments: [...]}]
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID REFERENCES raci_templates(id),
  entity_type VARCHAR(50) NOT NULL, -- 'initiative', 'contract', etc.
  entity_id UUID NOT NULL,
  current_step VARCHAR(100),
  status VARCHAR(50) NOT NULL, -- 'draft', 'consultation', 'approval', 'archived'
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE workflow_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
  step VARCHAR(100) NOT NULL,
  action_type VARCHAR(50) NOT NULL, -- 'submit', 'consult', 'approve', 'reject', 'return'
  user_id UUID REFERENCES users(id),
  comment TEXT,
  attachments TEXT[],
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Kanban 任務表
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  task_type VARCHAR(50) NOT NULL, -- 'routine', 'project', 'incident'
  priority VARCHAR(20) NOT NULL, -- 'urgent', 'high', 'medium', 'low'
  status VARCHAR(50) NOT NULL DEFAULT 'todo', -- 'todo', 'in_progress', 'review', 'done'
  assignee_id UUID REFERENCES users(id),
  due_date DATE,
  initiative_id UUID REFERENCES initiatives(id),
  kr_id UUID REFERENCES key_results(id),
  kpi_id UUID REFERENCES kpi_registry(id),
  actual_impact_description TEXT,
  risk_markers VARCHAR(50)[],
  review_status VARCHAR(50), -- 'pending', 'approved', 'exempt'
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE task_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  file_url VARCHAR(500) NOT NULL,
  file_name VARCHAR(255),
  file_type VARCHAR(50),
  uploaded_by UUID REFERENCES users(id),
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE task_collaborators (
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, user_id)
);

-- Incident 管理表
CREATE TABLE incidents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_number VARCHAR(100) UNIQUE NOT NULL,
  incident_type VARCHAR(50) NOT NULL, -- 'campus_safety', 'medical', 'legal', 'visa', 'other'
  severity VARCHAR(20) NOT NULL, -- 'critical', 'high', 'medium', 'low'
  occurred_at TIMESTAMP NOT NULL,
  location VARCHAR(255),
  student_name VARCHAR(255),
  student_id VARCHAR(100),
  contact_info VARCHAR(255),
  emergency_contact_name VARCHAR(255),
  emergency_contact_phone VARCHAR(50),
  description TEXT NOT NULL,
  accountable_user_id UUID REFERENCES users(id),
  status VARCHAR(50) DEFAULT 'open', -- 'open', 'in_progress', 'resolved', 'closed'
  resolution_report TEXT,
  prevention_measures TEXT,
  closed_at TIMESTAMP,
  closed_by UUID REFERENCES users(id),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE incident_checklists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id UUID REFERENCES incidents(id) ON DELETE CASCADE,
  item_text TEXT NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_by UUID REFERENCES users(id),
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE incident_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id UUID REFERENCES incidents(id) ON DELETE CASCADE,
  notified_unit VARCHAR(255) NOT NULL,
  notified_at TIMESTAMP NOT NULL,
  notification_proof_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- PDCA 循環表
CREATE TABLE pdca_cycles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  initiative_id UUID REFERENCES initiatives(id),
  okr_id UUID REFERENCES okrs(id),
  cycle_name VARCHAR(255),
  check_frequency VARCHAR(50) NOT NULL, -- 'weekly', 'monthly', 'quarterly'
  responsible_user_id UUID REFERENCES users(id) NOT NULL,
  data_source VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE pdca_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pdca_cycle_id UUID REFERENCES pdca_cycles(id) ON DELETE CASCADE,
  plan_description TEXT NOT NULL,
  target_value NUMERIC,
  check_points JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE pdca_executions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pdca_cycle_id UUID REFERENCES pdca_cycles(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id),
  execution_date DATE NOT NULL,
  actual_value NUMERIC,
  evidence_urls TEXT[],
  executed_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE pdca_checks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pdca_cycle_id UUID REFERENCES pdca_cycles(id) ON DELETE CASCADE,
  check_date DATE NOT NULL,
  completeness_status VARCHAR(20), -- 'pass', 'warning', 'fail'
  timeliness_status VARCHAR(20),
  consistency_status VARCHAR(20),
  completeness_issues TEXT[],
  timeliness_issues TEXT[],
  consistency_issues TEXT[],
  variance_analysis TEXT,
  checked_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE pdca_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pdca_cycle_id UUID REFERENCES pdca_cycles(id) ON DELETE CASCADE,
  root_cause VARCHAR(50) NOT NULL, -- 'human', 'process', 'system', 'external_policy', 'partner'
  action_type VARCHAR(50) NOT NULL, -- 'corrective', 'preventive'
  action_items TEXT[] NOT NULL,
  expected_kpi_impacts UUID[], -- kpi_ids
  validation_method TEXT,
  responsible_user_id UUID REFERENCES users(id),
  due_date DATE,
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed'
  actual_kpi_impact TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 資料匯入表
CREATE TABLE data_imports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  import_type VARCHAR(50) NOT NULL, -- 'csv', 'excel', 'api'
  target_table VARCHAR(100) NOT NULL,
  file_name VARCHAR(255),
  file_url VARCHAR(500),
  field_mapping JSONB,
  total_rows INTEGER,
  success_rows INTEGER,
  error_rows INTEGER,
  errors JSONB,
  imported_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 稽核日誌表
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  action_type VARCHAR(50) NOT NULL, -- 'view', 'create', 'update', 'delete', 'export'
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID,
  field_name VARCHAR(100),
  old_value TEXT,
  new_value TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 建立索引
CREATE INDEX idx_kpi_values_kpi_period ON kpi_values(kpi_id, period);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX idx_tasks_initiative ON tasks(initiative_id);
CREATE INDEX idx_workflows_status ON workflows(status);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);

