import { Router, Response } from 'express';
import { pool } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { hasPermission } from '../services/rbac';
import { z } from 'zod';
import { executeSync, SyncResult } from '../services/integration-sync';

const router = Router();

const createIntegrationSchema = z.object({
  system_name: z.string().min(1),
  system_type: z.enum(['sis', 'finance', 'hr', 'api', 'etl']),
  connection_config: z.record(z.any()).optional(),
  sync_frequency: z.enum(['realtime', 'daily', 'weekly', 'manual']).optional(),
  is_active: z.boolean().default(true),
});

// 取得所有系統對接
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT 
        id, system_name, system_type, sync_frequency,
        last_sync_at, last_sync_status, last_sync_error,
        is_active, created_at, updated_at
       FROM system_integrations
       ORDER BY system_name`
    );
    res.json(result.rows);
  } catch (error: unknown) {
    console.error('Error fetching integrations:', error);
    res.status(500).json({ error: '取得系統對接列表失敗' });
  }
});

// 取得單一系統對接狀態
router.get('/:id/status', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const integrationResult = await pool.query(
      'SELECT * FROM system_integrations WHERE id = $1',
      [id]
    );

    if (integrationResult.rows.length === 0) {
      return res.status(404).json({ error: '系統對接不存在' });
    }

    const integration = integrationResult.rows[0];

    // 取得最近的同步記錄
    const syncLogsResult = await pool.query(
      `SELECT * FROM integration_sync_logs
       WHERE integration_id = $1
       ORDER BY started_at DESC
       LIMIT 10`,
      [id]
    );

    // 統計資訊
    const statsResult = await pool.query(
      `SELECT 
        COUNT(*) as total_syncs,
        COUNT(*) FILTER (WHERE status = 'success') as successful_syncs,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_syncs,
        SUM(records_synced) as total_records_synced
       FROM integration_sync_logs
       WHERE integration_id = $1`,
      [id]
    );

    res.json({
      integration: {
        id: integration.id,
        system_name: integration.system_name,
        system_type: integration.system_type,
        sync_frequency: integration.sync_frequency,
        last_sync_at: integration.last_sync_at,
        last_sync_status: integration.last_sync_status,
        last_sync_error: integration.last_sync_error,
        is_active: integration.is_active,
      },
      recent_logs: syncLogsResult.rows,
      stats: statsResult.rows[0],
    });
  } catch (error: unknown) {
    console.error('Error fetching integration status:', error);
    res.status(500).json({ error: '取得對接狀態失敗' });
  }
});

// 建立系統對接
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const canManage = await hasPermission(req.user!.id, 'manage_integrations');
    if (!canManage) {
      return res.status(403).json({ error: '無權限管理系統對接' });
    }

    const validated = createIntegrationSchema.parse(req.body);
    const result = await pool.query(
      `INSERT INTO system_integrations (
        system_name, system_type, connection_config, sync_frequency, is_active
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING id, system_name, system_type, sync_frequency, is_active, created_at`,
      [
        validated.system_name,
        validated.system_type,
        validated.connection_config ? JSON.stringify(validated.connection_config) : null,
        validated.sync_frequency || 'manual',
        validated.is_active,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: '驗證失敗', details: error.errors });
    }
    console.error('Error creating integration:', error);
    res.status(500).json({ error: '建立系統對接失敗' });
  }
});

// 手動觸發同步
router.post('/:id/sync', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const canManage = await hasPermission(req.user!.id, 'manage_integrations');
    if (!canManage) {
      return res.status(403).json({ error: '無權限觸發同步' });
    }

    const { id } = req.params;
    const { sync_type = 'incremental' } = req.body;

    const integrationResult = await pool.query(
      'SELECT * FROM system_integrations WHERE id = $1',
      [id]
    );

    if (integrationResult.rows.length === 0) {
      return res.status(404).json({ error: '系統對接不存在' });
    }

    // 建立同步記錄（狀態為 running）
    const logResult = await pool.query(
      `INSERT INTO integration_sync_logs (
        integration_id, sync_type, status, started_at, synced_by
      ) VALUES ($1, $2, 'running', CURRENT_TIMESTAMP, $3)
      RETURNING *`,
      [id, sync_type, req.user!.id]
    );

    const logId = logResult.rows[0].id;

    // 執行同步（非同步，避免請求超時）
    executeSync(id, sync_type as 'full' | 'incremental')
      .then(async (syncResult: SyncResult) => {
        // 更新同步記錄
        await pool.query(
          `UPDATE integration_sync_logs
           SET status = $1,
               completed_at = CURRENT_TIMESTAMP,
               records_synced = $2,
               records_failed = $3,
               error_message = $4
           WHERE id = $5`,
          [
            syncResult.success ? 'success' : 'failed',
            syncResult.recordsSynced,
            syncResult.recordsFailed,
            syncResult.errors.length > 0
              ? JSON.stringify(syncResult.errors.slice(0, 10))
              : null,
            logId,
          ]
        );

        // 更新系統對接的最後同步時間
        await pool.query(
          `UPDATE system_integrations
           SET last_sync_at = CURRENT_TIMESTAMP,
               last_sync_status = $1,
               last_sync_error = $2
           WHERE id = $3`,
          [
            syncResult.success ? 'success' : 'failed',
            syncResult.errors.length > 0 ? syncResult.errors[0].error : null,
            id,
          ]
        );
      })
      .catch(async (error) => {
        // 同步失敗時更新記錄
        await pool.query(
          `UPDATE integration_sync_logs
           SET status = 'failed',
               completed_at = CURRENT_TIMESTAMP,
               error_message = $1
           WHERE id = $2`,
          [error instanceof Error ? error.message : '同步失敗', logId]
        );

        await pool.query(
          `UPDATE system_integrations
           SET last_sync_status = 'failed',
               last_sync_error = $1
           WHERE id = $2`,
          [error instanceof Error ? error.message : '同步失敗', id]
        );
      });

    res.json({
      success: true,
      sync_log_id: logId,
      message: '同步已觸發，請稍後查詢同步狀態',
    });
  } catch (error: unknown) {
    console.error('Error triggering sync:', error);
    res.status(500).json({ error: '觸發同步失敗' });
  }
});

// 取得同步記錄
router.get('/:id/sync-logs', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { limit = 50 } = req.query;

    const result = await pool.query(
      `SELECT isl.*, u.full_name as synced_by_name
       FROM integration_sync_logs isl
       LEFT JOIN users u ON isl.synced_by = u.id
       WHERE isl.integration_id = $1
       ORDER BY isl.started_at DESC
       LIMIT $2`,
      [id, parseInt(limit as string)]
    );

    res.json(result.rows);
  } catch (error: unknown) {
    console.error('Error fetching sync logs:', error);
    res.status(500).json({ error: '取得同步記錄失敗' });
  }
});

export default router;

