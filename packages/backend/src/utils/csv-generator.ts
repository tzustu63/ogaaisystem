/**
 * CSV 生成工具
 * 支援中文欄位名稱和 Excel 相容格式
 */

export interface CSVOptions {
  delimiter?: string;
  includeHeaders?: boolean;
  dateFormat?: string;
}

// BOM 標記（讓 Excel 正確識別 UTF-8）
const UTF8_BOM = '\uFEFF';

/**
 * 生成 CSV 內容
 */
export const generateCSV = (
  data: Record<string, unknown>[],
  options: CSVOptions = {}
): string => {
  const { delimiter = ',', includeHeaders = true } = options;

  if (data.length === 0) {
    return UTF8_BOM;
  }

  const headers = Object.keys(data[0]);
  const lines: string[] = [];

  // 標題行
  if (includeHeaders) {
    lines.push(
      headers.map((h) => escapeCSVValue(h, delimiter)).join(delimiter)
    );
  }

  // 資料行
  for (const row of data) {
    const values = headers.map((header) => {
      const value = row[header];
      return escapeCSVValue(formatValue(value), delimiter);
    });
    lines.push(values.join(delimiter));
  }

  return UTF8_BOM + lines.join('\r\n');
};

/**
 * 轉義 CSV 特殊字元
 */
const escapeCSVValue = (value: string, delimiter: string): string => {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = String(value);

  // 如果包含特殊字元，需要用引號包裹
  if (
    stringValue.includes(delimiter) ||
    stringValue.includes('"') ||
    stringValue.includes('\n') ||
    stringValue.includes('\r')
  ) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
};

/**
 * 格式化值
 */
const formatValue = (value: unknown): string => {
  if (value === null || value === undefined) {
    return '';
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.join('; ');
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
};

/**
 * 資料品質報告欄位翻譯
 */
export const DATA_QUALITY_TRANSLATIONS: Record<string, string> = {
  id: 'ID',
  check_date: '檢查日期',
  completeness_status: '完整性狀態',
  timeliness_status: '及時性狀態',
  consistency_status: '一致性狀態',
  completeness_issues: '完整性問題',
  timeliness_issues: '及時性問題',
  consistency_issues: '一致性問題',
  variance_analysis: '差異分析',
  checked_by_name: '檢查人員',
  cycle_name: '循環名稱',
  created_at: '建立時間',
};

/**
 * 翻譯欄位名稱
 */
export const translateHeaders = (
  data: Record<string, unknown>[],
  translations: Record<string, string> = DATA_QUALITY_TRANSLATIONS
): Record<string, unknown>[] => {
  return data.map((row) => {
    const translated: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      const translatedKey = translations[key] || key;
      translated[translatedKey] = value;
    }
    return translated;
  });
};

/**
 * 狀態值翻譯
 */
export const translateStatus = (status: string): string => {
  const statusMap: Record<string, string> = {
    pass: '通過',
    warning: '警告',
    fail: '失敗',
    pending: '待處理',
    completed: '已完成',
    in_progress: '進行中',
  };
  return statusMap[status] || status;
};

/**
 * 轉換資料品質報告為 CSV 格式
 */
export const formatDataQualityForCSV = (
  data: Record<string, unknown>[]
): Record<string, unknown>[] => {
  return data.map((row) => ({
    ...row,
    // 翻譯狀態值
    completeness_status: translateStatus(row.completeness_status as string),
    timeliness_status: translateStatus(row.timeliness_status as string),
    consistency_status: translateStatus(row.consistency_status as string),
    // 格式化日期
    check_date: row.check_date
      ? new Date(row.check_date as string).toLocaleDateString('zh-TW')
      : '',
    created_at: row.created_at
      ? new Date(row.created_at as string).toLocaleString('zh-TW')
      : '',
  }));
};
