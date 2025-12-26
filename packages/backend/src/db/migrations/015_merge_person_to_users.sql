-- Migration: 整合人員名單到用戶表
-- Created: 2025-12-26
-- Description: 將 system_options 中的人員名單遷移到 users 表，實現統一管理

-- =============================================
-- 1. 擴充 users 表欄位
-- =============================================

-- 新增 Line ID 欄位（用於未來 Line 通知整合）
ALTER TABLE users ADD COLUMN IF NOT EXISTS line_id VARCHAR(100);

-- 新增啟用狀態欄位
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 新增電話欄位
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50);

-- 新增索引以提升查詢效能
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_full_name ON users(full_name);

-- =============================================
-- 2. 設定現有用戶為啟用狀態
-- =============================================

UPDATE users SET is_active = true WHERE is_active IS NULL;

-- =============================================
-- 3. 遷移 system_options.person 資料到 users
-- =============================================

-- 注意：預設密碼為 'changeme123'，bcrypt hash 如下
-- 使用 Node.js bcrypt 產生: bcrypt.hashSync('changeme123', 10)
INSERT INTO users (username, email, full_name, password_hash, is_active, created_at)
SELECT
  LOWER(REGEXP_REPLACE(value, '[^a-zA-Z0-9]', '_', 'g')) as username,
  LOWER(REGEXP_REPLACE(value, '[^a-zA-Z0-9]', '_', 'g')) || '@oga-ai-system.local' as email,
  label as full_name,
  '$2a$10$N9qo8uLOickgx2ZMRZoMy.Mq2rKQvHkJ4H3XbHJkSt9Q.V8Qz1Fzq' as password_hash,
  is_active,
  CURRENT_TIMESTAMP
FROM system_options
WHERE category = 'person'
ON CONFLICT (username) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  is_active = EXCLUDED.is_active;

-- =============================================
-- 4. 擴充 initiatives 表
-- =============================================

-- 新增主要負責人 ID 欄位（關聯 users 表）
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS primary_owner_id UUID REFERENCES users(id);

-- 新增共同負責人 ID 陣列欄位
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS co_owner_ids UUID[];

-- =============================================
-- 5. 遷移 initiatives.primary_owner 資料
-- =============================================

-- 將文字形式的負責人名稱轉換為 user_id
UPDATE initiatives i
SET primary_owner_id = u.id
FROM users u
WHERE i.primary_owner = u.full_name
  AND i.primary_owner_id IS NULL;

-- =============================================
-- 6. 擴充 kpi_registry 表
-- =============================================

-- 新增資料負責人 ID 欄位（關聯 users 表）
ALTER TABLE kpi_registry ADD COLUMN IF NOT EXISTS data_steward_id UUID REFERENCES users(id);

-- =============================================
-- 7. 遷移 kpi_registry.data_steward 資料
-- =============================================

-- 將文字形式的資料負責人名稱轉換為 user_id
UPDATE kpi_registry k
SET data_steward_id = u.id
FROM users u
WHERE k.data_steward = u.full_name
  AND k.data_steward_id IS NULL;

-- =============================================
-- 8. 清理 system_options 中的 person 類別
-- =============================================

-- 刪除已遷移的人員名單資料
DELETE FROM system_options WHERE category = 'person';

-- =============================================
-- 9. 更新 AI 設定中的資料庫架構說明
-- =============================================

-- 更新 database_schema_prompt，加入 users 表的新欄位說明
UPDATE ai_settings
SET setting_value = REPLACE(
  setting_value,
  '欄位: id(UUID), username, email, full_name, department, position, created_at',
  '欄位: id(UUID), username, email, full_name, department, position, line_id, phone, is_active, created_at'
)
WHERE setting_key = 'database_schema_prompt'
  AND setting_value LIKE '%欄位: id(UUID), username, email, full_name, department, position, created_at%';
