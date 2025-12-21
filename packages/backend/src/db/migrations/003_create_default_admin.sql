-- 創建默認管理員用戶
-- 用戶名: admin
-- 密碼: admin123 (請在生產環境中立即更改)

-- 檢查是否已存在 admin 用戶
DO $$
DECLARE
  admin_id UUID;
  admin_role_id UUID;
BEGIN
  -- 檢查用戶是否存在
  SELECT id INTO admin_id FROM users WHERE username = 'admin';
  
  IF admin_id IS NULL THEN
    -- 創建 admin 用戶（密碼: admin123）
    -- 警告：這是預設密碼，請在生產環境中立即更改！
    INSERT INTO users (username, email, full_name, password_hash)
    VALUES (
      'admin',
      'admin@oga-ai-system.local',
      '系統管理員',
      '$2a$10$u5Fi89P29lgkr/3c6mAfJOMbfH0x6y8AIz7DBWyJlMfeOAlP3rj5i' -- bcrypt hash for 'admin123'
    )
    RETURNING id INTO admin_id;
  END IF;
  
  -- 檢查 admin 角色是否存在
  SELECT id INTO admin_role_id FROM roles WHERE name = 'admin';
  
  IF admin_role_id IS NULL THEN
    -- 創建 admin 角色
    INSERT INTO roles (name, description, permissions)
    VALUES (
      'admin',
      '系統管理員',
      '{"view_users": true, "create_users": true, "update_users": true, "delete_users": true, "view_audit": true, "manage_roles": true, "manage_settings": true}'::jsonb
    )
    RETURNING id INTO admin_role_id;
  END IF;
  
  -- 將 admin 角色分配給 admin 用戶（如果尚未分配）
  INSERT INTO user_roles (user_id, role_id, scope_type, scope_value)
  VALUES (admin_id, admin_role_id, 'university', '*')
  ON CONFLICT DO NOTHING;
  
END $$;
