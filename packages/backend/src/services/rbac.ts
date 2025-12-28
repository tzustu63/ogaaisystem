import { pool } from '../config/database';

// 安全性：允許查詢的資源類型白名單
const ALLOWED_RESOURCE_TYPES: Record<string, string> = {
  initiatives: 'initiatives',
  incidents: 'incidents',
  tasks: 'tasks',
  kpi_registry: 'kpi_registry',
  pdca_cycles: 'pdca_cycles',
  okrs: 'okrs',
};

// 驗證資源類型是否在白名單中
const getValidTableName = (resourceType: string): string | null => {
  return ALLOWED_RESOURCE_TYPES[resourceType] || null;
};

// 安全地解析 JSON，避免崩潰
const safeJsonParse = <T>(json: string | null, defaultValue: T): T => {
  if (!json) return defaultValue;
  try {
    return JSON.parse(json) as T;
  } catch {
    return defaultValue;
  }
};

export interface UserRole {
  roleId: string;
  roleName: string;
  scopeType: string;
  scopeValue: string;
  permissions: Record<string, any>;
}

// 取得使用者的角色與權限
export const getUserRoles = async (userId: string): Promise<UserRole[]> => {
  const result = await pool.query(
    `SELECT 
      r.id as role_id,
      r.name as role_name,
      r.permissions,
      ur.scope_type,
      ur.scope_value
    FROM user_roles ur
    INNER JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = $1`,
    [userId]
  );

  return result.rows.map((row) => ({
    roleId: row.role_id,
    roleName: row.role_name,
    scopeType: row.scope_type,
    scopeValue: row.scope_value,
    permissions: row.permissions || {},
  }));
};

// 檢查使用者是否有特定權限
export const hasPermission = async (
  userId: string,
  permission: string,
  resource?: string,
  resourceId?: string
): Promise<boolean> => {
  const roles = await getUserRoles(userId);

  // 檢查是否有系統管理員角色（支援 'admin' 和 'system_admin'）
  const isAdmin = roles.some((r) => r.roleName === 'system_admin' || r.roleName === 'admin');
  if (isAdmin) return true;

  // 檢查權限
  for (const role of roles) {
    // 檢查 Scope
    if (resource && resourceId) {
      // 這裡可以實作更複雜的 Scope 檢查邏輯
      // 例如：檢查 resource 是否在 scope 範圍內
    }

    // 檢查權限
    if (role.permissions[permission] === true) {
      return true;
    }
  }

  return false;
};

// 檢查使用者是否可以存取特定資源
export const canAccessResource = async (
  userId: string,
  resourceType: string,
  resourceId: string,
  action: 'view' | 'edit' | 'delete'
): Promise<boolean> => {
  const roles = await getUserRoles(userId);

  // 系統管理員可以存取所有資源（支援 'admin' 和 'system_admin'）
  const isAdmin = roles.some((r) => r.roleName === 'system_admin' || r.roleName === 'admin');
  if (isAdmin) return true;

  // 根據 resourceType 和 scope 檢查
  for (const role of roles) {
    if (role.scopeType === 'university') {
      // 全校範圍，可以存取所有資源
      return true;
    }

    if (role.scopeType === 'project' && role.scopeValue) {
      // 特定專案範圍
      if (resourceType === 'initiatives') {
        const result = await pool.query(
          'SELECT id FROM initiatives WHERE id = $1 AND (id::text = $2 OR initiative_id = $2)',
          [resourceId, role.scopeValue]
        );
        if (result.rows.length > 0) return true;
      }
    }

    if (role.scopeType === 'department' && role.scopeValue) {
      // 系所範圍
      if (resourceType === 'initiatives') {
        const result = await pool.query(
          'SELECT id FROM initiatives WHERE id = $1 AND responsible_unit = $2',
          [resourceId, role.scopeValue]
        );
        if (result.rows.length > 0) return true;
      }
    }

    if (role.scopeType === 'student_group' && role.scopeValue) {
      // 特定學生群組（用於 incidents 等）
      if (resourceType === 'incidents') {
        // 檢查 incident 的學生是否在群組內
        const result = await pool.query(
          `SELECT i.id FROM incidents i
           WHERE i.id = $1 AND i.student_id = ANY($2::text[])`,
          [resourceId, JSON.parse(role.scopeValue)]
        );
        if (result.rows.length > 0) return true;
      }
    }
  }

  return false;
};

// 取得使用者可存取的資源列表（根據 Scope）
export const getAccessibleResources = async (
  userId: string,
  resourceType: string
): Promise<string[]> => {
  // 安全性：驗證 resourceType 是否在白名單中
  const tableName = getValidTableName(resourceType);
  if (!tableName) {
    console.warn(`getAccessibleResources: 無效的資源類型 "${resourceType}"`);
    return [];
  }

  const roles = await getUserRoles(userId);

  // 系統管理員可以存取所有資源
  const isAdmin = roles.some((r) => r.roleName === 'system_admin' || r.roleName === 'admin');
  if (isAdmin) {
    // 使用白名單驗證後的表名
    const result = await pool.query(`SELECT id FROM ${tableName}`);
    return result.rows.map((r) => r.id);
  }

  // 根據 Scope 過濾資源
  const resourceIds: string[] = [];
  for (const role of roles) {
    if (role.scopeType === 'university') {
      // 全校範圍，取得所有資源（使用白名單驗證後的表名）
      const result = await pool.query(`SELECT id FROM ${tableName}`);
      resourceIds.push(...result.rows.map((r) => r.id));
    } else if (role.scopeType === 'project') {
      // 特定專案範圍
      if (resourceType === 'initiatives') {
        const result = await pool.query(
          'SELECT id FROM initiatives WHERE id::text = $1 OR initiative_id = $1',
          [role.scopeValue]
        );
        resourceIds.push(...result.rows.map((r) => r.id));
      }
    } else if (role.scopeType === 'department') {
      // 系所範圍
      if (resourceType === 'initiatives') {
        const result = await pool.query(
          'SELECT id FROM initiatives WHERE responsible_unit = $1',
          [role.scopeValue]
        );
        resourceIds.push(...result.rows.map((r) => r.id));
      }
    } else if (role.scopeType === 'student_group') {
      // 特定學生群組
      if (resourceType === 'incidents') {
        // 使用安全的 JSON 解析
        const studentIds = safeJsonParse<string[]>(role.scopeValue, []);
        if (studentIds.length > 0) {
          const result = await pool.query(
            'SELECT id FROM incidents WHERE student_id = ANY($1::text[])',
            [studentIds]
          );
          resourceIds.push(...result.rows.map((r) => r.id));
        }
      }
    }
  }

  return [...new Set(resourceIds)];
};

