/**
 * GDPR 資料刪除服務
 * 處理使用者資料刪除請求
 */

import { pool } from '../config/database';

// 資料類型對應的表格和使用者欄位配置
interface DataTypeConfig {
  table: string;
  userIdColumn: string;
  description: string;
  // 是否使用匿名化而非刪除
  anonymize?: boolean;
}

// 支援的資料類型配置
const DATA_TYPE_CONFIGS: Record<string, DataTypeConfig> = {
  // 任務相關
  tasks: {
    table: 'tasks',
    userIdColumn: 'assignee_id',
    description: '任務記錄',
  },
  task_comments: {
    table: 'task_comments',
    userIdColumn: 'user_id',
    description: '任務評論',
  },

  // 事件相關
  incidents: {
    table: 'incidents',
    userIdColumn: 'accountable_user_id',
    description: '事件記錄',
  },
  incident_actions: {
    table: 'incident_actions',
    userIdColumn: 'assignee_id',
    description: '事件處理記錄',
  },

  // 稽核日誌
  audit_logs: {
    table: 'audit_logs',
    userIdColumn: 'user_id',
    description: '稽核日誌',
  },

  // PDCA 相關
  pdca_cycles: {
    table: 'pdca_cycles',
    userIdColumn: 'responsible_user_id',
    description: 'PDCA 循環記錄',
  },

  // AI 對話
  conversations: {
    table: 'conversations',
    userIdColumn: 'user_id',
    description: 'AI 對話記錄',
  },
  conversation_messages: {
    table: 'conversation_messages',
    userIdColumn: 'user_id',
    description: 'AI 對話訊息',
  },

  // KPI 相關
  kpi_values: {
    table: 'kpi_values',
    userIdColumn: 'updated_by',
    description: 'KPI 數值記錄',
  },

  // 使用者帳號（使用匿名化）
  user_account: {
    table: 'users',
    userIdColumn: 'id',
    description: '使用者帳號',
    anonymize: true,
  },

  // 同意書
  consent_forms: {
    table: 'consent_forms',
    userIdColumn: 'data_subject_id',
    description: '同意書記錄',
  },
};

// 刪除結果
export interface DeletionResult {
  success: boolean;
  dataType: string;
  recordsDeleted: number;
  errors: string[];
}

// 總體刪除結果
export interface GDPRDeletionResult {
  success: boolean;
  results: DeletionResult[];
  totalRecordsDeleted: number;
  errors: string[];
}

/**
 * 執行單一資料類型的刪除
 */
async function deleteDataType(
  config: DataTypeConfig,
  dataType: string,
  requestorId: string
): Promise<DeletionResult> {
  const result: DeletionResult = {
    success: false,
    dataType,
    recordsDeleted: 0,
    errors: [],
  };

  try {
    if (config.anonymize) {
      // 使用匿名化處理（適用於需要保留記錄但去除個人識別資訊的情況）
      const anonymizedUsername = `deleted_user_${Date.now()}`;
      const updateResult = await pool.query(
        `UPDATE ${config.table}
         SET username = $1,
             full_name = '已刪除使用者',
             email = NULL,
             department = NULL,
             avatar_url = NULL,
             is_active = false,
             updated_at = CURRENT_TIMESTAMP
         WHERE ${config.userIdColumn} = $2
         RETURNING id`,
        [anonymizedUsername, requestorId]
      );
      result.recordsDeleted = updateResult.rowCount || 0;
    } else {
      // 直接刪除記錄
      const deleteResult = await pool.query(
        `DELETE FROM ${config.table}
         WHERE ${config.userIdColumn} = $1
         RETURNING id`,
        [requestorId]
      );
      result.recordsDeleted = deleteResult.rowCount || 0;
    }

    result.success = true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知錯誤';
    result.errors.push(`刪除 ${dataType} 失敗: ${errorMessage}`);
    console.error(`GDPR deletion error for ${dataType}:`, error);
  }

  return result;
}

/**
 * 執行 GDPR 資料刪除
 * @param requestorId 請求者 ID
 * @param requestedDataTypes 要刪除的資料類型列表
 */
export async function executeGDPRDeletion(
  requestorId: string,
  requestedDataTypes: string[]
): Promise<GDPRDeletionResult> {
  const overallResult: GDPRDeletionResult = {
    success: true,
    results: [],
    totalRecordsDeleted: 0,
    errors: [],
  };

  // 驗證所有資料類型是否有效
  const invalidTypes = requestedDataTypes.filter(
    (type) => !DATA_TYPE_CONFIGS[type]
  );
  if (invalidTypes.length > 0) {
    overallResult.success = false;
    overallResult.errors.push(`無效的資料類型: ${invalidTypes.join(', ')}`);
    return overallResult;
  }

  // 開始交易
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 處理每個資料類型
    for (const dataType of requestedDataTypes) {
      const config = DATA_TYPE_CONFIGS[dataType];

      // 檢查表格是否存在
      const tableExists = await client.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = $1
        )`,
        [config.table]
      );

      if (!tableExists.rows[0].exists) {
        overallResult.results.push({
          success: true,
          dataType,
          recordsDeleted: 0,
          errors: [],
        });
        continue;
      }

      // 執行刪除或匿名化
      let result: DeletionResult;

      if (config.anonymize) {
        // 匿名化處理
        const anonymizedUsername = `deleted_user_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        const updateResult = await client.query(
          `UPDATE ${config.table}
           SET username = $1,
               full_name = '已刪除使用者',
               email = NULL,
               department = NULL,
               avatar_url = NULL,
               is_active = false,
               updated_at = CURRENT_TIMESTAMP
           WHERE ${config.userIdColumn} = $2
           RETURNING id`,
          [anonymizedUsername, requestorId]
        );

        result = {
          success: true,
          dataType,
          recordsDeleted: updateResult.rowCount || 0,
          errors: [],
        };
      } else {
        // 刪除處理
        const deleteResult = await client.query(
          `DELETE FROM ${config.table}
           WHERE ${config.userIdColumn} = $1
           RETURNING id`,
          [requestorId]
        );

        result = {
          success: true,
          dataType,
          recordsDeleted: deleteResult.rowCount || 0,
          errors: [],
        };
      }

      overallResult.results.push(result);
      overallResult.totalRecordsDeleted += result.recordsDeleted;
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    overallResult.success = false;
    const errorMessage = error instanceof Error ? error.message : '未知錯誤';
    overallResult.errors.push(`GDPR 刪除交易失敗: ${errorMessage}`);
    console.error('GDPR deletion transaction error:', error);
  } finally {
    client.release();
  }

  // 如果任何單一刪除失敗，整體標記為失敗
  if (overallResult.results.some((r) => !r.success)) {
    overallResult.success = false;
  }

  return overallResult;
}

/**
 * 取得支援的資料類型清單
 */
export function getSupportedDataTypes(): Array<{
  type: string;
  description: string;
  isAnonymize: boolean;
}> {
  return Object.entries(DATA_TYPE_CONFIGS).map(([type, config]) => ({
    type,
    description: config.description,
    isAnonymize: config.anonymize || false,
  }));
}

/**
 * 預覽刪除影響（不實際刪除）
 * @param requestorId 請求者 ID
 * @param requestedDataTypes 要刪除的資料類型列表
 */
export async function previewGDPRDeletion(
  requestorId: string,
  requestedDataTypes: string[]
): Promise<{
  dataType: string;
  recordCount: number;
  description: string;
}[]> {
  const preview: Array<{
    dataType: string;
    recordCount: number;
    description: string;
  }> = [];

  for (const dataType of requestedDataTypes) {
    const config = DATA_TYPE_CONFIGS[dataType];
    if (!config) continue;

    try {
      // 檢查表格是否存在
      const tableExists = await pool.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = $1
        )`,
        [config.table]
      );

      if (!tableExists.rows[0].exists) {
        preview.push({
          dataType,
          recordCount: 0,
          description: config.description,
        });
        continue;
      }

      const countResult = await pool.query(
        `SELECT COUNT(*) as count FROM ${config.table} WHERE ${config.userIdColumn} = $1`,
        [requestorId]
      );

      preview.push({
        dataType,
        recordCount: parseInt(countResult.rows[0].count, 10),
        description: config.description,
      });
    } catch (error) {
      console.error(`Error previewing ${dataType}:`, error);
      preview.push({
        dataType,
        recordCount: -1, // 表示無法計算
        description: config.description,
      });
    }
  }

  return preview;
}
