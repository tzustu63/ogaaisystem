-- 檔案上傳記錄表
-- 用於追蹤檔案所有權，支援權限驗證

CREATE TABLE IF NOT EXISTS file_uploads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  object_name VARCHAR(255) UNIQUE NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(100) NOT NULL,
  file_size INTEGER,
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_file_uploads_object_name ON file_uploads(object_name);
CREATE INDEX IF NOT EXISTS idx_file_uploads_uploaded_by ON file_uploads(uploaded_by);

-- 添加註解
COMMENT ON TABLE file_uploads IS '檔案上傳記錄表';
COMMENT ON COLUMN file_uploads.object_name IS 'MinIO 物件名稱（唯一識別碼）';
COMMENT ON COLUMN file_uploads.file_name IS '原始檔案名稱';
COMMENT ON COLUMN file_uploads.file_type IS 'MIME 類型';
COMMENT ON COLUMN file_uploads.uploaded_by IS '上傳者 ID';
