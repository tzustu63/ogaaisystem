/**
 * 整合同步服務
 * 處理不同系統類型的資料同步
 */

import { pool } from '../config/database';
import { URL } from 'url';

// SSRF 防護：禁止的 IP 範圍
const BLOCKED_IP_RANGES = [
  /^127\./, // 127.0.0.0/8 (localhost)
  /^10\./, // 10.0.0.0/8 (private)
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12 (private)
  /^192\.168\./, // 192.168.0.0/16 (private)
  /^169\.254\./, // 169.254.0.0/16 (link-local)
  /^0\./, // 0.0.0.0/8
  /^100\.(6[4-9]|[7-9][0-9]|1[0-1][0-9]|12[0-7])\./, // 100.64.0.0/10 (carrier-grade NAT)
];

const BLOCKED_HOSTNAMES = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  'metadata.google.internal', // GCP metadata
  '169.254.169.254', // AWS/Azure metadata
];

/**
 * 驗證 URL 是否安全（SSRF 防護）
 */
const isUrlSafe = (urlString: string): { safe: boolean; reason?: string } => {
  try {
    const url = new URL(urlString);

    // 只允許 HTTP/HTTPS
    if (!['http:', 'https:'].includes(url.protocol)) {
      return { safe: false, reason: `不支援的協定: ${url.protocol}` };
    }

    // 檢查是否為禁止的主機名
    const hostname = url.hostname.toLowerCase();
    if (BLOCKED_HOSTNAMES.includes(hostname)) {
      return { safe: false, reason: `禁止的主機名: ${hostname}` };
    }

    // 檢查是否為禁止的 IP 範圍
    for (const pattern of BLOCKED_IP_RANGES) {
      if (pattern.test(hostname)) {
        return { safe: false, reason: `禁止的 IP 範圍: ${hostname}` };
      }
    }

    // 禁止使用 IP 位址（只允許域名）
    const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    const ipv6Pattern = /^\[.*\]$/;
    if (ipv4Pattern.test(hostname) || ipv6Pattern.test(hostname)) {
      // 檢查是否為公開 IP（額外檢查）
      const parts = hostname.split('.').map(Number);
      if (parts.length === 4 && parts.every((p) => p >= 0 && p <= 255)) {
        // 這是 IPv4，檢查是否為私有 IP
        for (const pattern of BLOCKED_IP_RANGES) {
          if (pattern.test(hostname)) {
            return { safe: false, reason: `禁止的內部 IP: ${hostname}` };
          }
        }
      }
    }

    return { safe: true };
  } catch {
    return { safe: false, reason: '無效的 URL 格式' };
  }
};

export interface SyncResult {
  success: boolean;
  recordsProcessed: number;
  recordsSynced: number;
  recordsFailed: number;
  errors: Array<{ record: unknown; error: string }>;
  duration: number;
}

export interface IntegrationConfig {
  id: string;
  systemName: string;
  systemType: 'sis' | 'finance' | 'hr' | 'api' | 'etl';
  connectionConfig: Record<string, unknown>;
  syncType: 'full' | 'incremental';
}

/**
 * 基礎同步處理器
 */
abstract class BaseSyncHandler {
  abstract sync(config: IntegrationConfig): Promise<SyncResult>;

  protected async logProgress(
    integrationId: string,
    message: string,
    progress: number
  ): Promise<void> {
    console.log(`[${integrationId}] ${progress}% - ${message}`);
  }

  protected createEmptyResult(startTime: number): SyncResult {
    return {
      success: true,
      recordsProcessed: 0,
      recordsSynced: 0,
      recordsFailed: 0,
      errors: [],
      duration: Date.now() - startTime,
    };
  }

  protected createErrorResult(
    startTime: number,
    error: unknown
  ): SyncResult {
    return {
      success: false,
      recordsProcessed: 0,
      recordsSynced: 0,
      recordsFailed: 0,
      errors: [
        {
          record: null,
          error: error instanceof Error ? error.message : '同步失敗',
        },
      ],
      duration: Date.now() - startTime,
    };
  }
}

/**
 * SIS（學生資訊系統）同步處理器
 */
class SISSyncHandler extends BaseSyncHandler {
  async sync(config: IntegrationConfig): Promise<SyncResult> {
    const startTime = Date.now();
    const errors: Array<{ record: unknown; error: string }> = [];
    let recordsProcessed = 0;
    let recordsSynced = 0;

    try {
      await this.logProgress(config.id, '開始同步學生資訊系統', 0);

      // 模擬從 SIS 取得資料
      // 實際實作時應使用 config.connectionConfig 中的連線資訊
      const sisData = await this.fetchFromSIS(config.connectionConfig);
      recordsProcessed = sisData.length;

      await this.logProgress(
        config.id,
        `取得 ${recordsProcessed} 筆資料`,
        30
      );

      // 處理每筆資料
      for (const record of sisData) {
        try {
          await this.processRecord(record);
          recordsSynced++;
        } catch (error) {
          errors.push({
            record,
            error: error instanceof Error ? error.message : '處理失敗',
          });
        }
      }

      await this.logProgress(config.id, '同步完成', 100);

      return {
        success: errors.length === 0,
        recordsProcessed,
        recordsSynced,
        recordsFailed: errors.length,
        errors,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return this.createErrorResult(startTime, error);
    }
  }

  private async fetchFromSIS(
    _config: Record<string, unknown>
  ): Promise<unknown[]> {
    // TODO: 實際實作時，使用 config 中的連線資訊連接 SIS
    console.log('Fetching from SIS...');
    return [];
  }

  private async processRecord(_record: unknown): Promise<void> {
    // TODO: 處理單筆記錄的邏輯
    console.log('Processing SIS record...');
  }
}

/**
 * 財務系統同步處理器
 */
class FinanceSyncHandler extends BaseSyncHandler {
  async sync(config: IntegrationConfig): Promise<SyncResult> {
    const startTime = Date.now();

    try {
      await this.logProgress(config.id, '開始同步財務系統', 0);

      // TODO: 實作財務資料同步邏輯
      // 例如：同步預算、支出記錄等

      await this.logProgress(config.id, '同步完成', 100);

      return this.createEmptyResult(startTime);
    } catch (error) {
      return this.createErrorResult(startTime, error);
    }
  }
}

/**
 * HR 系統同步處理器
 */
class HRSyncHandler extends BaseSyncHandler {
  async sync(config: IntegrationConfig): Promise<SyncResult> {
    const startTime = Date.now();
    const errors: Array<{ record: unknown; error: string }> = [];
    let recordsSynced = 0;

    try {
      await this.logProgress(config.id, '開始同步人事系統', 0);

      // 取得 HR 資料
      const hrData = await this.fetchFromHR(config.connectionConfig);

      await this.logProgress(
        config.id,
        `取得 ${hrData.length} 筆人員資料`,
        30
      );

      // 更新 users 表
      for (const employee of hrData) {
        try {
          await pool.query(
            `INSERT INTO users (username, email, full_name, department, position)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (username) DO UPDATE SET
               full_name = EXCLUDED.full_name,
               department = EXCLUDED.department,
               position = EXCLUDED.position,
               updated_at = CURRENT_TIMESTAMP`,
            [
              employee.username,
              employee.email,
              employee.fullName,
              employee.department,
              employee.position,
            ]
          );
          recordsSynced++;
        } catch (error) {
          errors.push({
            record: employee,
            error: error instanceof Error ? error.message : '更新失敗',
          });
        }
      }

      await this.logProgress(config.id, '同步完成', 100);

      return {
        success: errors.length === 0,
        recordsProcessed: hrData.length,
        recordsSynced,
        recordsFailed: errors.length,
        errors,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return this.createErrorResult(startTime, error);
    }
  }

  private async fetchFromHR(
    _config: Record<string, unknown>
  ): Promise<
    Array<{
      username: string;
      email: string;
      fullName: string;
      department: string;
      position: string;
    }>
  > {
    // TODO: 實際實作
    console.log('Fetching from HR...');
    return [];
  }
}

/**
 * API 同步處理器
 */
class APISyncHandler extends BaseSyncHandler {
  async sync(config: IntegrationConfig): Promise<SyncResult> {
    const startTime = Date.now();

    try {
      const { endpoint, method = 'GET', headers = {} } =
        config.connectionConfig as {
          endpoint?: string;
          method?: string;
          headers?: Record<string, string>;
        };

      if (!endpoint) {
        throw new Error('API endpoint 未設定');
      }

      // SSRF 防護：驗證 URL 安全性
      const urlValidation = isUrlSafe(endpoint);
      if (!urlValidation.safe) {
        throw new Error(`不安全的 URL: ${urlValidation.reason}`);
      }

      await this.logProgress(config.id, `呼叫 API: ${endpoint}`, 0);

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        // 設定請求超時
        signal: AbortSignal.timeout(30000), // 30 秒超時
      });

      if (!response.ok) {
        throw new Error(
          `API 呼叫失敗: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      const records = Array.isArray(data) ? data : [data];

      await this.logProgress(config.id, '同步完成', 100);

      return {
        success: true,
        recordsProcessed: records.length,
        recordsSynced: records.length,
        recordsFailed: 0,
        errors: [],
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return this.createErrorResult(startTime, error);
    }
  }
}

/**
 * ETL 同步處理器
 */
class ETLSyncHandler extends BaseSyncHandler {
  async sync(config: IntegrationConfig): Promise<SyncResult> {
    const startTime = Date.now();

    try {
      await this.logProgress(config.id, '開始 ETL 處理', 0);

      // Extract
      await this.logProgress(config.id, '擷取資料', 20);
      const extractedData = await this.extract(config);

      // Transform
      await this.logProgress(config.id, '轉換資料', 50);
      const transformedData = await this.transform(extractedData);

      // Load
      await this.logProgress(config.id, '載入資料', 80);
      const loadResult = await this.load(transformedData);

      await this.logProgress(config.id, 'ETL 完成', 100);

      return {
        success: true,
        recordsProcessed: transformedData.length,
        recordsSynced: loadResult.loaded,
        recordsFailed: loadResult.failed,
        errors: loadResult.errors,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return this.createErrorResult(startTime, error);
    }
  }

  private async extract(_config: IntegrationConfig): Promise<unknown[]> {
    // TODO: 實作資料擷取邏輯
    return [];
  }

  private async transform(data: unknown[]): Promise<unknown[]> {
    // TODO: 實作資料轉換邏輯
    return data;
  }

  private async load(
    _data: unknown[]
  ): Promise<{
    loaded: number;
    failed: number;
    errors: Array<{ record: unknown; error: string }>;
  }> {
    // TODO: 實作資料載入邏輯
    return { loaded: 0, failed: 0, errors: [] };
  }
}

/**
 * 同步處理器工廠
 */
class SyncHandlerFactory {
  static getHandler(systemType: string): BaseSyncHandler {
    switch (systemType) {
      case 'sis':
        return new SISSyncHandler();
      case 'finance':
        return new FinanceSyncHandler();
      case 'hr':
        return new HRSyncHandler();
      case 'api':
        return new APISyncHandler();
      case 'etl':
        return new ETLSyncHandler();
      default:
        throw new Error(`不支援的系統類型: ${systemType}`);
    }
  }
}

/**
 * 執行同步
 */
export const executeSync = async (
  integrationId: string,
  syncType: 'full' | 'incremental' = 'incremental'
): Promise<SyncResult> => {
  // 取得整合設定
  const result = await pool.query(
    'SELECT * FROM system_integrations WHERE id = $1',
    [integrationId]
  );

  if (result.rows.length === 0) {
    throw new Error('系統對接不存在');
  }

  const integration = result.rows[0];
  const config: IntegrationConfig = {
    id: integration.id,
    systemName: integration.system_name,
    systemType: integration.system_type,
    connectionConfig: integration.connection_config || {},
    syncType,
  };

  // 取得對應的處理器並執行同步
  const handler = SyncHandlerFactory.getHandler(config.systemType);
  return handler.sync(config);
};
