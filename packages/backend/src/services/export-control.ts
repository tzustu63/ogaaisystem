import { pool } from '../config/database';
import { getUserRoles } from './rbac';
import { maskSensitiveFields } from './data-masking';

// 禁止匯出的欄位設定
export const RESTRICTED_EXPORT_FIELDS: Record<string, string[]> = {
  incidents: [
    'passport_number',
    'residence_permit_number',
    'emergency_contact_phone',
    'emergency_contact_name',
    'student_phone',
    'student_email',
  ],
  students: [
    'passport_number',
    'residence_permit_number',
    'emergency_contact_phone',
    'emergency_contact_name',
  ],
  default: [
    'passport_number',
    'residence_permit_number',
    'emergency_contact_phone',
  ],
};

// 檢查使用者是否有匯出權限
export const hasExportPermission = async (
  userId: string,
  resourceType: string
): Promise<boolean> => {
  const roles = await getUserRoles(userId);
  
  // 系統管理員有所有權限（支援 'admin' 和 'system_admin'）
  const isAdmin = roles.some((r) => r.roleName === 'system_admin' || r.roleName === 'admin');
  if (isAdmin) return true;

  // 檢查是否有匯出權限
  for (const role of roles) {
    if (role.permissions[`export_${resourceType}`] === true || 
        role.permissions['export_all'] === true) {
      return true;
    }
  }

  return false;
};

// 過濾禁止匯出的欄位
export const filterRestrictedFields = (
  data: Record<string, any>[],
  resourceType: string,
  requestedFields?: string[]
): { filteredData: Record<string, any>[]; excludedFields: string[] } => {
  const restrictedFields = RESTRICTED_EXPORT_FIELDS[resourceType] || 
                           RESTRICTED_EXPORT_FIELDS.default || [];

  const excludedFields: string[] = [];
  const filteredData = data.map((item) => {
    const filtered: Record<string, any> = {};
    const fieldsToInclude = requestedFields || Object.keys(item);

    for (const field of fieldsToInclude) {
      if (restrictedFields.includes(field)) {
        excludedFields.push(field);
        // 不包含此欄位
      } else {
        filtered[field] = item[field];
      }
    }

    return filtered;
  });

  return {
    filteredData,
    excludedFields: [...new Set(excludedFields)],
  };
};

// 記錄匯出操作
export const logExport = async (
  userId: string,
  resourceType: string,
  resourceIds: string[],
  fields: string[],
  ipAddress?: string
): Promise<void> => {
  try {
    await pool.query(
      `INSERT INTO audit_logs (
        user_id, action_type, resource_type, resource_id, 
        details, ip_address, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
      [
        userId,
        'export',
        resourceType,
        JSON.stringify(resourceIds),
        JSON.stringify({
          fields,
          count: resourceIds.length,
        }),
        ipAddress || null,
      ]
    );
  } catch (error) {
    console.error('Error logging export:', error);
    // 不拋出錯誤，避免影響匯出流程
  }
};

// 匯出資料（含權限檢查與遮罩）
export const exportData = async (
  userId: string,
  resourceType: string,
  data: Record<string, any>[],
  requestedFields?: string[],
  ipAddress?: string
): Promise<{
  data: Record<string, any>[];
  excludedFields: string[];
  logId?: string;
}> => {
  // 檢查匯出權限
  const hasPermission = await hasExportPermission(userId, resourceType);
  if (!hasPermission) {
    throw new Error('無匯出權限');
  }

  // 過濾禁止匯出的欄位
  const { filteredData, excludedFields } = filterRestrictedFields(
    data,
    resourceType,
    requestedFields
  );

  // 遮罩敏感欄位（即使有匯出權限，也要遮罩）
  const maskedData = await Promise.all(
    filteredData.map((item) => maskSensitiveFields(userId, item))
  );

  // 記錄匯出操作
  const resourceIds = data.map((item) => item.id || '').filter(Boolean);
  await logExport(
    userId,
    resourceType,
    resourceIds,
    requestedFields || Object.keys(data[0] || {}),
    ipAddress
  );

  return {
    data: maskedData,
    excludedFields,
  };
};

