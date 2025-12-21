import { getUserRoles } from './rbac';

// 敏感欄位定義
export const SENSITIVE_FIELDS = {
  passport_number: {
    maskLength: 4, // 顯示末4碼
    permission: 'view_passport_number',
  },
  residence_permit_number: {
    maskLength: 6, // 顯示末6碼
    permission: 'view_residence_permit',
  },
  emergency_contact_phone: {
    maskLength: 4, // 顯示末4碼
    permission: 'view_emergency_contact',
  },
  emergency_contact_name: {
    maskLength: 0, // 完全遮罩
    permission: 'view_emergency_contact',
  },
  student_phone: {
    maskLength: 4,
    permission: 'view_student_contact',
  },
  student_email: {
    maskLength: 0, // 完全遮罩或部分遮罩
    permission: 'view_student_contact',
  },
} as const;

// 遮罩字串
export const maskString = (value: string | null | undefined, showLast: number = 0): string => {
  if (!value) return '';
  if (showLast === 0) return '****';
  if (value.length <= showLast) return value;
  return '*'.repeat(value.length - showLast) + value.slice(-showLast);
};

// 遮罩郵件
export const maskEmail = (email: string | null | undefined): string => {
  if (!email) return '';
  const [local, domain] = email.split('@');
  if (!domain) return maskString(email, 0);
  const maskedLocal = maskString(local, 2);
  return `${maskedLocal}@${domain}`;
};

// 檢查使用者是否有權限查看完整資料
export const hasFieldPermission = async (
  userId: string,
  fieldName: keyof typeof SENSITIVE_FIELDS
): Promise<boolean> => {
  const roles = await getUserRoles(userId);
  
  // 系統管理員有所有權限（支援 'admin' 和 'system_admin'）
  const isAdmin = roles.some((r) => r.roleName === 'system_admin' || r.roleName === 'admin');
  if (isAdmin) return true;

  const fieldConfig = SENSITIVE_FIELDS[fieldName];
  if (!fieldConfig) return true; // 非敏感欄位

  // 檢查是否有對應權限
  for (const role of roles) {
    if (role.permissions[fieldConfig.permission] === true) {
      return true;
    }
  }

  return false;
};

// 遮罩物件中的敏感欄位
export const maskSensitiveFields = async (
  userId: string,
  data: Record<string, any>
): Promise<Record<string, any>> => {
  const masked = { ...data };

  for (const [fieldName, config] of Object.entries(SENSITIVE_FIELDS)) {
    if (fieldName in masked) {
      const hasPermission = await hasFieldPermission(userId, fieldName as keyof typeof SENSITIVE_FIELDS);
      
      if (!hasPermission) {
        if (fieldName.includes('email')) {
          masked[fieldName] = maskEmail(masked[fieldName]);
        } else {
          masked[fieldName] = maskString(masked[fieldName], config.maskLength);
        }
      }
    }
  }

  return masked;
};

// 遮罩陣列中的敏感欄位
export const maskSensitiveFieldsInArray = async (
  userId: string,
  dataArray: Record<string, any>[]
): Promise<Record<string, any>[]> => {
  return Promise.all(dataArray.map((item) => maskSensitiveFields(userId, item)));
};

