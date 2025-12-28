-- 通知設定表
-- 用於儲存系統層級的通知設定

CREATE TABLE IF NOT EXISTS notification_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  description VARCHAR(500),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_notification_settings_key ON notification_settings(setting_key);

-- 插入預設設定
INSERT INTO notification_settings (setting_key, setting_value, description)
VALUES (
  'global',
  '{
    "email_enabled": false,
    "line_notify_enabled": false,
    "line_notify_token": null,
    "kpi_status_change": true,
    "pdca_reminders": true,
    "incident_alerts": true
  }'::jsonb,
  '全局通知設定'
)
ON CONFLICT (setting_key) DO NOTHING;

-- 更新時間觸發器
CREATE OR REPLACE FUNCTION update_notification_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notification_settings_timestamp ON notification_settings;
CREATE TRIGGER trigger_notification_settings_timestamp
  BEFORE UPDATE ON notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_settings_timestamp();

-- 添加註解
COMMENT ON TABLE notification_settings IS '系統通知設定表';
COMMENT ON COLUMN notification_settings.setting_key IS '設定鍵值（如：global, email, line）';
COMMENT ON COLUMN notification_settings.setting_value IS '設定值（JSONB 格式）';
