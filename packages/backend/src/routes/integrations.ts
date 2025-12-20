import { Router, Response } from 'express';
import { pool } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { hasPermission } from '../services/rbac';
import { z } from 'zod';

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

    // 建立同步記錄
    const logResult = await pool.query(
      `INSERT INTO integration_sync_logs (
        integration_id, sync_type, status, started_at, synced_by
      ) VALUES ($1, $2, 'pending', CURRENT_TIMESTAMP, $3)
      RETURNING *`,
      [id, sync_type, req.user!.id]
    );

    // TODO: 實際執行同步邏輯
    // 這裡應該根據 system_type 和 connection_config 執行對應的同步邏輯

    // 更新同步記錄為成功（簡化處理）
    await pool.query(
      `UPDATE integration_sync_logs 
       SET status = 'success',
           completed_at = CURRENT_TIMESTAMP,
           records_synced = 0
       WHERE id = $1`,
      [logResult.rows[0].id]
    );

    // 更新系統對接的最後同步時間
    await pool.query(
      `UPDATE system_integrations 
       SET last_sync_at = CURRENT_TIMESTAMP,
           last_sync_status = 'success',
           last_sync_error = NULL
       WHERE id = $1`,
      [id]
    );

    res.json({
      success: true,
      sync_log_id: logResult.rows[0].id,
      message: '同步已觸發',
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

