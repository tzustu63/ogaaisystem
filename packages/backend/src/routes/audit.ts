import { Router, Response } from 'express';
import { pool } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { hasPermission } from '../services/rbac';
import { z } from 'zod';

const router = Router();

// 取得稽核日誌
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    // 檢查權限
    const canView = await hasPermission(req.user!.id, 'view_audit_logs');
    if (!canView) {
      return res.status(403).json({ error: '無權限查看稽核日誌' });
    }

    const { entity_type, entity_id, action_type, user_id, start_date, end_date, limit = 100 } = req.query;

    let query = `
      SELECT al.*, u.username, u.full_name
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (entity_type) {
      query += ` AND al.entity_type = $${paramIndex}`;
      params.push(entity_type);
      paramIndex++;
    }

    if (entity_id) {
      query += ` AND al.entity_id = $${paramIndex}`;
      params.push(entity_id);
      paramIndex++;
    }

    if (action_type) {
      query += ` AND al.action_type = $${paramIndex}`;
      params.push(action_type);
      paramIndex++;
    }

    if (user_id) {
      query += ` AND al.user_id = $${paramIndex}`;
      params.push(user_id);
      paramIndex++;
    }

    if (start_date) {
      query += ` AND al.created_at >= $${paramIndex}`;
      params.push(start_date);
      paramIndex++;
    }

    if (end_date) {
      query += ` AND al.created_at <= $${paramIndex}`;
      params.push(end_date);
      paramIndex++;
    }

    query += ` ORDER BY al.created_at DESC LIMIT $${paramIndex}`;
    params.push(parseInt(limit as string));

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error: unknown) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: '取得稽核日誌失敗' });
  }
});

// 取得修改前後對比
router.get('/:id/diff', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // 檢查權限
    const canView = await hasPermission(req.user!.id, 'view_audit_logs');
    if (!canView) {
      return res.status(403).json({ error: '無權限查看稽核日誌' });
    }

    const result = await pool.query(
      `SELECT al.*, u.username, u.full_name
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       WHERE al.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '稽核記錄不存在' });
    }

    const log = result.rows[0];

    // 生成對比資料
    const diff = {
      id: log.id,
      entity_type: log.entity_type,
      entity_id: log.entity_id,
      field_name: log.field_name,
      old_value: log.old_value,
      new_value: log.new_value,
      changed_by: {
        id: log.user_id,
        username: log.username,
        full_name: log.full_name,
      },
      changed_at: log.created_at,
      action_type: log.action_type,
      ip_address: log.ip_address,
      // 簡單的文字對比（可擴展為更複雜的 diff 算法）
      diff_summary: log.old_value && log.new_value
        ? {
            type: typeof log.old_value === 'object' ? 'object' : 'text',
            old_text: typeof log.old_value === 'object' ? JSON.stringify(log.old_value, null, 2) : log.old_value,
            new_text: typeof log.new_value === 'object' ? JSON.stringify(log.new_value, null, 2) : log.new_value,
          }
        : null,
    };

    res.json(diff);
  } catch (error: unknown) {
    console.error('Error fetching audit diff:', error);
    res.status(500).json({ error: '取得對比資料失敗' });
  }
});

export default router;

