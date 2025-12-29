-- Migration: 020_create_backup_history.sql
-- Description: 建立備份歷史記錄表

CREATE TABLE IF NOT EXISTS backup_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type VARCHAR(20) NOT NULL CHECK (type IN ('export', 'restore')),
  format VARCHAR(10) NOT NULL CHECK (format IN ('json', 'sql')),
  status VARCHAR(20) NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  file_name VARCHAR(255),
  file_size BIGINT,
  file_path VARCHAR(500),
  tables_count INTEGER,
  records_count INTEGER,
  progress INTEGER DEFAULT 0,
  current_table VARCHAR(100),
  result JSONB,
  error_message TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_backup_history_type ON backup_history(type);
CREATE INDEX IF NOT EXISTS idx_backup_history_status ON backup_history(status);
CREATE INDEX IF NOT EXISTS idx_backup_history_created_by ON backup_history(created_by);
CREATE INDEX IF NOT EXISTS idx_backup_history_created_at ON backup_history(created_at DESC);

COMMENT ON TABLE backup_history IS '備份與還原操作歷史記錄';
COMMENT ON COLUMN backup_history.type IS '操作類型: export=匯出, restore=還原';
COMMENT ON COLUMN backup_history.format IS '檔案格式: json 或 sql';
COMMENT ON COLUMN backup_history.status IS '狀態: processing=處理中, completed=完成, failed=失敗';
COMMENT ON COLUMN backup_history.file_path IS '暫存檔案路徑（用於下載）';
COMMENT ON COLUMN backup_history.progress IS '進度百分比 0-100';
COMMENT ON COLUMN backup_history.current_table IS '當前處理的資料表';
COMMENT ON COLUMN backup_history.result IS '執行結果詳情（JSON格式）';
