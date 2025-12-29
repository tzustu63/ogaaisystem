/**
 * 備份與還原服務
 * 提供資料庫完整備份（JSON/SQL 格式）和還原功能
 */

import { pool } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

// 資料表匯出順序（按外鍵依賴排序）
const TABLE_EXPORT_ORDER = [
  // 第1層：基礎表（無依賴）
  'roles',
  'users',

  // 第2層：依賴第1層
  'user_roles',
  'system_options',
  'ai_settings',
  'notification_settings',
  'data_collection_purposes',
  'data_retention_policies',
  'kpi_registry',
  'raci_templates',
  'form_definitions',

  // 第3層：依賴第2層
  'initiatives',
  'kpi_values',
  'kpi_versions',
  'bsc_objectives',
  'consent_forms',
  'data_deletion_requests',
  'system_integrations',
  'ranking_submissions',
  'file_uploads',
  'conversations',

  // 第4層：依賴第3層
  'okrs',
  'incidents',
  'bsc_objective_kpis',
  'bsc_causal_links',
  'initiative_bsc_objectives',
  'initiative_kpis',
  'initiative_programs',
  'workflows',
  'integration_sync_logs',
  'ranking_indicators',
  'messages',

  // 第5層：依賴第4層
  'key_results',
  'pdca_cycles',
  'workflow_actions',
  'incident_checklists',
  'incident_notifications',
  'ranking_evidence',

  // 第6層：依賴第5層
  'tasks',
  'pdca_plans',
  'pdca_executions',
  'pdca_checks',
  'pdca_actions',

  // 第7層：依賴第6層
  'task_attachments',
  'task_collaborators',
  'task_form_records',

  // 第8層：日誌類（最後匯出）
  'data_imports',
  'audit_logs',
  'backup_history',
];

// 排除的系統表
const EXCLUDED_TABLES = [
  'schema_migrations',
  'pg_stat_statements',
];

// 敏感欄位（可選擇排除）
const SENSITIVE_COLUMNS = {
  users: ['password_hash'],
};

interface BackupMetadata {
  version: string;
  created_at: string;
  created_by: string;
  system_name: string;
  tables_count: number;
  records_count: number;
}

interface BackupData {
  metadata: BackupMetadata;
  data: Record<string, any[]>;
}

interface ExportOptions {
  format: 'json' | 'sql';
  excludeSensitive?: boolean;
  userId: string;
  username: string;
}

interface RestoreOptions {
  mode: 'overwrite' | 'merge' | 'skip_conflicts';
  selectedTables?: string[];
}

/**
 * 取得所有存在的資料表
 */
async function getExistingTables(): Promise<string[]> {
  const result = await pool.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);
  return result.rows.map(row => row.table_name);
}

/**
 * 取得資料表的欄位資訊
 */
async function getTableColumns(tableName: string): Promise<string[]> {
  const result = await pool.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = $1
    ORDER BY ordinal_position
  `, [tableName]);
  return result.rows.map(row => row.column_name);
}

/**
 * 更新備份進度
 */
async function updateBackupProgress(
  backupId: string,
  progress: number,
  currentTable?: string,
  status?: string,
  result?: any,
  errorMessage?: string
): Promise<void> {
  const updates: string[] = ['progress = $2'];
  const values: any[] = [backupId, progress];
  let paramIndex = 3;

  if (currentTable !== undefined) {
    updates.push(`current_table = $${paramIndex}`);
    values.push(currentTable);
    paramIndex++;
  }

  if (status !== undefined) {
    updates.push(`status = $${paramIndex}`);
    values.push(status);
    paramIndex++;

    if (status === 'completed' || status === 'failed') {
      updates.push(`completed_at = CURRENT_TIMESTAMP`);
    }
  }

  if (result !== undefined) {
    updates.push(`result = $${paramIndex}`);
    values.push(JSON.stringify(result));
    paramIndex++;
  }

  if (errorMessage !== undefined) {
    updates.push(`error_message = $${paramIndex}`);
    values.push(errorMessage);
    paramIndex++;
  }

  await pool.query(
    `UPDATE backup_history SET ${updates.join(', ')} WHERE id = $1`,
    values
  );
}

/**
 * 匯出資料庫為 JSON 格式
 */
export async function exportToJson(options: ExportOptions): Promise<string> {
  const { userId, username, excludeSensitive = false } = options;

  // 建立備份記錄
  const backupId = uuidv4();
  await pool.query(`
    INSERT INTO backup_history (id, type, format, status, created_by)
    VALUES ($1, 'export', 'json', 'processing', $2)
  `, [backupId, userId]);

  try {
    const existingTables = await getExistingTables();
    const tablesToExport = TABLE_EXPORT_ORDER.filter(
      t => existingTables.includes(t) && !EXCLUDED_TABLES.includes(t)
    );

    const backupData: BackupData = {
      metadata: {
        version: '1.0',
        created_at: new Date().toISOString(),
        created_by: username,
        system_name: 'OGA AI System',
        tables_count: tablesToExport.length,
        records_count: 0,
      },
      data: {},
    };

    let totalRecords = 0;
    const tableResults: Record<string, number> = {};

    for (let i = 0; i < tablesToExport.length; i++) {
      const tableName = tablesToExport[i];
      const progress = Math.round((i / tablesToExport.length) * 100);
      await updateBackupProgress(backupId, progress, tableName);

      // 取得欄位，排除敏感欄位
      let columns = await getTableColumns(tableName);
      if (excludeSensitive && SENSITIVE_COLUMNS[tableName as keyof typeof SENSITIVE_COLUMNS]) {
        const sensitiveFields = SENSITIVE_COLUMNS[tableName as keyof typeof SENSITIVE_COLUMNS];
        columns = columns.filter(c => !sensitiveFields.includes(c));
      }

      // 查詢資料
      const columnList = columns.map(c => `"${c}"`).join(', ');
      const result = await pool.query(`SELECT ${columnList} FROM "${tableName}"`);

      backupData.data[tableName] = result.rows;
      totalRecords += result.rows.length;
      tableResults[tableName] = result.rows.length;
    }

    backupData.metadata.records_count = totalRecords;

    // 寫入檔案
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `oga-backup-${timestamp}.json`;
    const filePath = path.join('/tmp', fileName);

    fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2), 'utf8');
    const fileStats = fs.statSync(filePath);

    // 更新備份記錄
    await pool.query(`
      UPDATE backup_history
      SET status = 'completed',
          progress = 100,
          file_name = $2,
          file_path = $3,
          file_size = $4,
          tables_count = $5,
          records_count = $6,
          result = $7,
          completed_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [
      backupId,
      fileName,
      filePath,
      fileStats.size,
      tablesToExport.length,
      totalRecords,
      JSON.stringify({ tables: tableResults })
    ]);

    return backupId;
  } catch (error: any) {
    await updateBackupProgress(backupId, 0, undefined, 'failed', undefined, error.message);
    throw error;
  }
}

/**
 * 匯出資料庫為 SQL 格式
 */
export async function exportToSql(options: ExportOptions): Promise<string> {
  const { userId, username, excludeSensitive = false } = options;

  // 建立備份記錄
  const backupId = uuidv4();
  await pool.query(`
    INSERT INTO backup_history (id, type, format, status, created_by)
    VALUES ($1, 'export', 'sql', 'processing', $2)
  `, [backupId, userId]);

  try {
    const existingTables = await getExistingTables();
    const tablesToExport = TABLE_EXPORT_ORDER.filter(
      t => existingTables.includes(t) && !EXCLUDED_TABLES.includes(t)
    );

    let sqlContent = `-- OGA AI System Database Backup\n`;
    sqlContent += `-- Created: ${new Date().toISOString()}\n`;
    sqlContent += `-- Created by: ${username}\n`;
    sqlContent += `-- Tables: ${tablesToExport.length}\n\n`;

    // 停用外鍵約束
    sqlContent += `-- Disable foreign key checks\n`;
    sqlContent += `SET session_replication_role = 'replica';\n\n`;

    let totalRecords = 0;
    const tableResults: Record<string, number> = {};

    for (let i = 0; i < tablesToExport.length; i++) {
      const tableName = tablesToExport[i];
      const progress = Math.round((i / tablesToExport.length) * 100);
      await updateBackupProgress(backupId, progress, tableName);

      // 取得欄位
      let columns = await getTableColumns(tableName);
      if (excludeSensitive && SENSITIVE_COLUMNS[tableName as keyof typeof SENSITIVE_COLUMNS]) {
        const sensitiveFields = SENSITIVE_COLUMNS[tableName as keyof typeof SENSITIVE_COLUMNS];
        columns = columns.filter(c => !sensitiveFields.includes(c));
      }

      // 查詢資料
      const columnList = columns.map(c => `"${c}"`).join(', ');
      const result = await pool.query(`SELECT ${columnList} FROM "${tableName}"`);

      if (result.rows.length > 0) {
        sqlContent += `-- Table: ${tableName} (${result.rows.length} records)\n`;
        sqlContent += `TRUNCATE TABLE "${tableName}" CASCADE;\n`;

        for (const row of result.rows) {
          const values = columns.map(col => {
            const val = row[col];
            if (val === null) return 'NULL';
            if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
            if (typeof val === 'number') return val.toString();
            if (val instanceof Date) return `'${val.toISOString()}'`;
            if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
            return `'${String(val).replace(/'/g, "''")}'`;
          });

          sqlContent += `INSERT INTO "${tableName}" (${columnList}) VALUES (${values.join(', ')});\n`;
        }
        sqlContent += '\n';
      }

      totalRecords += result.rows.length;
      tableResults[tableName] = result.rows.length;
    }

    // 重新啟用外鍵約束
    sqlContent += `-- Re-enable foreign key checks\n`;
    sqlContent += `SET session_replication_role = 'origin';\n`;

    // 寫入檔案
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `oga-backup-${timestamp}.sql`;
    const filePath = path.join('/tmp', fileName);

    fs.writeFileSync(filePath, sqlContent, 'utf8');
    const fileStats = fs.statSync(filePath);

    // 更新備份記錄
    await pool.query(`
      UPDATE backup_history
      SET status = 'completed',
          progress = 100,
          file_name = $2,
          file_path = $3,
          file_size = $4,
          tables_count = $5,
          records_count = $6,
          result = $7,
          completed_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [
      backupId,
      fileName,
      filePath,
      fileStats.size,
      tablesToExport.length,
      totalRecords,
      JSON.stringify({ tables: tableResults })
    ]);

    return backupId;
  } catch (error: any) {
    await updateBackupProgress(backupId, 0, undefined, 'failed', undefined, error.message);
    throw error;
  }
}

/**
 * 取得備份狀態
 */
export async function getBackupStatus(backupId: string): Promise<any> {
  const result = await pool.query(`
    SELECT
      id, type, format, status, file_name, file_size,
      tables_count, records_count, progress, current_table,
      result, error_message, created_at, completed_at
    FROM backup_history
    WHERE id = $1
  `, [backupId]);

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}

/**
 * 取得備份檔案路徑
 */
export async function getBackupFilePath(backupId: string): Promise<{ filePath: string; fileName: string } | null> {
  const result = await pool.query(`
    SELECT file_path, file_name
    FROM backup_history
    WHERE id = $1 AND status = 'completed'
  `, [backupId]);

  if (result.rows.length === 0 || !result.rows[0].file_path) {
    return null;
  }

  return {
    filePath: result.rows[0].file_path,
    fileName: result.rows[0].file_name,
  };
}

/**
 * 驗證 JSON 備份檔案
 */
export async function validateJsonBackup(data: any): Promise<{
  isValid: boolean;
  tables: string[];
  recordCount: number;
  errors: string[];
  warnings: string[];
}> {
  const errors: string[] = [];
  const warnings: string[] = [];
  let tables: string[] = [];
  let recordCount = 0;

  // 檢查基本結構
  if (!data.metadata) {
    errors.push('缺少 metadata 區塊');
  }
  if (!data.data) {
    errors.push('缺少 data 區塊');
  }

  if (errors.length > 0) {
    return { isValid: false, tables, recordCount, errors, warnings };
  }

  // 檢查版本
  if (data.metadata.version !== '1.0') {
    warnings.push(`備份版本 ${data.metadata.version} 可能不完全相容`);
  }

  // 取得現有表
  const existingTables = await getExistingTables();

  // 檢查資料表
  tables = Object.keys(data.data);
  for (const tableName of tables) {
    if (!existingTables.includes(tableName)) {
      warnings.push(`資料表 ${tableName} 在目標資料庫中不存在`);
    }
    recordCount += Array.isArray(data.data[tableName]) ? data.data[tableName].length : 0;
  }

  return {
    isValid: errors.length === 0,
    tables,
    recordCount,
    errors,
    warnings,
  };
}

/**
 * 上傳並驗證還原檔案
 */
export async function uploadRestoreFile(
  fileContent: string,
  fileName: string,
  format: 'json' | 'sql',
  userId: string
): Promise<string> {
  const restoreId = uuidv4();

  // 儲存檔案
  const filePath = path.join('/tmp', `restore-${restoreId}-${fileName}`);
  fs.writeFileSync(filePath, fileContent, 'utf8');
  const fileStats = fs.statSync(filePath);

  let validation: any = {};
  let tablesCount = 0;
  let recordsCount = 0;

  if (format === 'json') {
    try {
      const data = JSON.parse(fileContent);
      const validationResult = await validateJsonBackup(data);
      validation = validationResult;
      tablesCount = validationResult.tables.length;
      recordsCount = validationResult.recordCount;
    } catch (e: any) {
      validation = {
        isValid: false,
        errors: [`JSON 解析失敗: ${e.message}`],
        warnings: [],
        tables: [],
        recordCount: 0,
      };
    }
  } else {
    // SQL 格式簡單驗證
    const hasInserts = fileContent.includes('INSERT INTO');
    const hasTruncate = fileContent.includes('TRUNCATE TABLE');
    validation = {
      isValid: hasInserts,
      errors: hasInserts ? [] : ['SQL 檔案中未找到 INSERT 語句'],
      warnings: hasTruncate ? [] : ['SQL 檔案中未找到 TRUNCATE 語句，可能導致資料重複'],
      tables: [],
      recordCount: 0,
    };

    // 嘗試計算表數量
    const tableMatches = fileContent.match(/INSERT INTO "?(\w+)"?/gi);
    if (tableMatches) {
      const uniqueTables = [...new Set(tableMatches.map(m => m.replace(/INSERT INTO "?/i, '').replace(/"?$/, '')))];
      validation.tables = uniqueTables;
      tablesCount = uniqueTables.length;
    }
  }

  // 建立還原記錄
  await pool.query(`
    INSERT INTO backup_history (id, type, format, status, file_name, file_path, file_size, tables_count, records_count, result, created_by)
    VALUES ($1, 'restore', $2, 'pending', $3, $4, $5, $6, $7, $8, $9)
  `, [
    restoreId,
    format,
    fileName,
    filePath,
    fileStats.size,
    tablesCount,
    recordsCount,
    JSON.stringify(validation),
    userId
  ]);

  return restoreId;
}

/**
 * 取得還原預覽
 */
export async function getRestorePreview(restoreId: string): Promise<any> {
  const result = await pool.query(`
    SELECT id, format, file_name, file_path, tables_count, records_count, result
    FROM backup_history
    WHERE id = $1 AND type = 'restore'
  `, [restoreId]);

  if (result.rows.length === 0) {
    return null;
  }

  const record = result.rows[0];
  const validation = record.result || {};

  // 如果是 JSON 格式，讀取檔案取得預覽資料
  let preview: any[] = [];
  if (record.format === 'json' && record.file_path && fs.existsSync(record.file_path)) {
    try {
      const content = fs.readFileSync(record.file_path, 'utf8');
      const data = JSON.parse(content);

      for (const tableName of Object.keys(data.data || {}).slice(0, 10)) {
        const tableData = data.data[tableName];
        preview.push({
          name: tableName,
          recordCount: Array.isArray(tableData) ? tableData.length : 0,
          sampleData: Array.isArray(tableData) ? tableData.slice(0, 3) : [],
        });
      }
    } catch (e) {
      // 忽略解析錯誤
    }
  }

  return {
    id: record.id,
    format: record.format,
    fileName: record.file_name,
    tablesCount: record.tables_count,
    recordsCount: record.records_count,
    validation,
    preview,
  };
}

/**
 * 執行 JSON 還原
 */
async function executeJsonRestore(
  restoreId: string,
  filePath: string,
  options: RestoreOptions
): Promise<void> {
  const content = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(content);

  const existingTables = await getExistingTables();
  let tablesToRestore = Object.keys(data.data).filter(t => existingTables.includes(t));

  if (options.selectedTables && options.selectedTables.length > 0) {
    tablesToRestore = tablesToRestore.filter(t => options.selectedTables!.includes(t));
  }

  // 按依賴順序排序
  tablesToRestore.sort((a, b) => {
    const indexA = TABLE_EXPORT_ORDER.indexOf(a);
    const indexB = TABLE_EXPORT_ORDER.indexOf(b);
    return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
  });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 停用外鍵約束
    await client.query("SET session_replication_role = 'replica'");

    let restoredRecords = 0;
    const tableResults: Record<string, { success: number; failed: number }> = {};

    for (let i = 0; i < tablesToRestore.length; i++) {
      const tableName = tablesToRestore[i];
      const progress = Math.round((i / tablesToRestore.length) * 100);
      await updateBackupProgress(restoreId, progress, tableName);

      const tableData = data.data[tableName];
      if (!Array.isArray(tableData) || tableData.length === 0) continue;

      tableResults[tableName] = { success: 0, failed: 0 };

      // 覆蓋模式：先清空表
      if (options.mode === 'overwrite') {
        await client.query(`TRUNCATE TABLE "${tableName}" CASCADE`);
      }

      // 取得表欄位
      const columns = await getTableColumns(tableName);

      for (const row of tableData) {
        try {
          const rowColumns = Object.keys(row).filter(c => columns.includes(c));
          const columnList = rowColumns.map(c => `"${c}"`).join(', ');
          const placeholders = rowColumns.map((_, i) => `$${i + 1}`).join(', ');
          const values = rowColumns.map(c => row[c]);

          if (options.mode === 'skip_conflicts') {
            await client.query(
              `INSERT INTO "${tableName}" (${columnList}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
              values
            );
          } else {
            await client.query(
              `INSERT INTO "${tableName}" (${columnList}) VALUES (${placeholders})`,
              values
            );
          }

          tableResults[tableName].success++;
          restoredRecords++;
        } catch (e: any) {
          tableResults[tableName].failed++;
          if (options.mode !== 'skip_conflicts') {
            throw e;
          }
        }
      }
    }

    // 重新啟用外鍵約束
    await client.query("SET session_replication_role = 'origin'");

    await client.query('COMMIT');

    await updateBackupProgress(restoreId, 100, undefined, 'completed', {
      tables: tableResults,
      totalRestored: restoredRecords,
    });

  } catch (error: any) {
    await client.query('ROLLBACK');
    await updateBackupProgress(restoreId, 0, undefined, 'failed', undefined, error.message);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * 執行 SQL 還原
 */
async function executeSqlRestore(restoreId: string, filePath: string): Promise<void> {
  const content = fs.readFileSync(filePath, 'utf8');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 分割 SQL 語句並執行
    const statements = content
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    let executedCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      const progress = Math.round((i / statements.length) * 100);

      // 更新進度
      if (i % 100 === 0) {
        await updateBackupProgress(restoreId, progress);
      }

      try {
        await client.query(statement);
        executedCount++;
      } catch (e: any) {
        // 忽略某些錯誤（如 TRUNCATE 不存在的表）
        if (!e.message.includes('does not exist')) {
          throw e;
        }
      }
    }

    await client.query('COMMIT');

    await updateBackupProgress(restoreId, 100, undefined, 'completed', {
      statementsExecuted: executedCount,
    });

  } catch (error: any) {
    await client.query('ROLLBACK');
    await updateBackupProgress(restoreId, 0, undefined, 'failed', undefined, error.message);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * 執行還原
 */
export async function executeRestore(restoreId: string, options: RestoreOptions): Promise<void> {
  const result = await pool.query(`
    SELECT format, file_path
    FROM backup_history
    WHERE id = $1 AND type = 'restore'
  `, [restoreId]);

  if (result.rows.length === 0) {
    throw new Error('找不到還原記錄');
  }

  const { format, file_path } = result.rows[0];

  if (!file_path || !fs.existsSync(file_path)) {
    throw new Error('備份檔案不存在');
  }

  // 更新狀態為處理中
  await pool.query(`
    UPDATE backup_history SET status = 'processing', progress = 0 WHERE id = $1
  `, [restoreId]);

  if (format === 'json') {
    await executeJsonRestore(restoreId, file_path, options);
  } else {
    await executeSqlRestore(restoreId, file_path);
  }
}

/**
 * 取得備份/還原歷史
 */
export async function getBackupHistory(
  type?: 'export' | 'restore',
  limit: number = 20
): Promise<any[]> {
  let query = `
    SELECT
      bh.id, bh.type, bh.format, bh.status, bh.file_name, bh.file_size,
      bh.tables_count, bh.records_count, bh.progress, bh.error_message,
      bh.created_at, bh.completed_at,
      u.username as created_by_name
    FROM backup_history bh
    LEFT JOIN users u ON bh.created_by = u.id
  `;

  const params: any[] = [];

  if (type) {
    query += ` WHERE bh.type = $1`;
    params.push(type);
  }

  query += ` ORDER BY bh.created_at DESC LIMIT $${params.length + 1}`;
  params.push(limit);

  const result = await pool.query(query, params);
  return result.rows;
}

/**
 * 清理過期的暫存檔案
 */
export async function cleanupOldBackups(daysOld: number = 7): Promise<number> {
  const result = await pool.query(`
    SELECT file_path FROM backup_history
    WHERE created_at < NOW() - INTERVAL '${daysOld} days'
    AND file_path IS NOT NULL
  `);

  let deletedCount = 0;
  for (const row of result.rows) {
    if (row.file_path && fs.existsSync(row.file_path)) {
      try {
        fs.unlinkSync(row.file_path);
        deletedCount++;
      } catch (e) {
        // 忽略刪除錯誤
      }
    }
  }

  // 刪除舊記錄
  await pool.query(`
    DELETE FROM backup_history
    WHERE created_at < NOW() - INTERVAL '${daysOld} days'
  `);

  return deletedCount;
}
