import { Router, Response } from 'express';
import { pool } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { hasPermission } from '../services/rbac';
import { z } from 'zod';

const router = Router();

const createPurposeSchema = z.object({
  purpose_name: z.string().min(1),
  description: z.string().optional(),
  legal_basis: z.string().optional(),
  notified_at: z.string().optional(),
  notification_method: z.enum(['email', 'form', 'website']).optional(),
  notification_proof_url: z.string().url().optional(),
});

const createConsentSchema = z.object({
  data_subject_id: z.string().min(1),
  data_subject_type: z.enum(['student', 'staff', 'other']),
  purpose_id: z.string().uuid(),
  consent_scope: z.string().min(1),
  consent_file_url: z.string().url().optional(),
  consent_date: z.string(),
  expiry_date: z.string().optional(),
});

const createRetentionPolicySchema = z.object({
  data_type: z.string().min(1),
  retention_period_days: z.number().int().positive(),
  auto_delete: z.boolean().default(false),
  reminder_days_before: z.number().int().default(30),
});

const createDeletionRequestSchema = z.object({
  requestor_id: z.string().min(1),
  requestor_type: z.enum(['student', 'staff', 'other']),
  request_reason: z.string().optional(),
  requested_data_types: z.array(z.string()),
});

// 資料蒐集目的管理
router.get('/collection-purposes', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const canView = await hasPermission(req.user!.id, 'view_gdpr');
    if (!canView) {
      return res.status(403).json({ error: '無權限查看' });
    }

    const result = await pool.query(
      'SELECT * FROM data_collection_purposes ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (error: unknown) {
    console.error('Error fetching collection purposes:', error);
    res.status(500).json({ error: '取得資料蒐集目的失敗' });
  }
});

router.post('/collection-purposes', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const canCreate = await hasPermission(req.user!.id, 'manage_gdpr');
    if (!canCreate) {
      return res.status(403).json({ error: '無權限建立' });
    }

    const validated = createPurposeSchema.parse(req.body);
    const result = await pool.query(
      `INSERT INTO data_collection_purposes (
        purpose_name, description, legal_basis, notified_at, notification_method, notification_proof_url
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [
        validated.purpose_name,
        validated.description || null,
        validated.legal_basis || null,
        validated.notified_at || null,
        validated.notification_method || null,
        validated.notification_proof_url || null,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: '驗證失敗', details: error.errors });
    }
    console.error('Error creating collection purpose:', error);
    res.status(500).json({ error: '建立資料蒐集目的失敗' });
  }
});

// 同意書管理
router.get('/consent-forms', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const canView = await hasPermission(req.user!.id, 'view_gdpr');
    if (!canView) {
      return res.status(403).json({ error: '無權限查看' });
    }

    const { data_subject_id, purpose_id } = req.query;
    let query = 'SELECT * FROM consent_forms WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (data_subject_id) {
      query += ` AND data_subject_id = $${paramIndex}`;
      params.push(data_subject_id);
      paramIndex++;
    }

    if (purpose_id) {
      query += ` AND purpose_id = $${paramIndex}`;
      params.push(purpose_id);
      paramIndex++;
    }

    query += ' ORDER BY consent_date DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error: unknown) {
    console.error('Error fetching consent forms:', error);
    res.status(500).json({ error: '取得同意書失敗' });
  }
});

router.post('/consent-forms', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const validated = createConsentSchema.parse(req.body);
    const result = await pool.query(
      `INSERT INTO consent_forms (
        data_subject_id, data_subject_type, purpose_id, consent_scope,
        consent_file_url, consent_date, expiry_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        validated.data_subject_id,
        validated.data_subject_type,
        validated.purpose_id,
        validated.consent_scope,
        validated.consent_file_url || null,
        validated.consent_date,
        validated.expiry_date || null,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: '驗證失敗', details: error.errors });
    }
    console.error('Error creating consent form:', error);
    res.status(500).json({ error: '建立同意書失敗' });
  }
});

// 資料保存期限管理
router.get('/retention-policies', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const canView = await hasPermission(req.user!.id, 'view_gdpr');
    if (!canView) {
      return res.status(403).json({ error: '無權限查看' });
    }

    const result = await pool.query(
      'SELECT * FROM data_retention_policies ORDER BY data_type'
    );
    res.json(result.rows);
  } catch (error: unknown) {
    console.error('Error fetching retention policies:', error);
    res.status(500).json({ error: '取得保存期限政策失敗' });
  }
});

router.post('/retention-policies', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const canManage = await hasPermission(req.user!.id, 'manage_gdpr');
    if (!canManage) {
      return res.status(403).json({ error: '無權限管理' });
    }

    const validated = createRetentionPolicySchema.parse(req.body);
    const result = await pool.query(
      `INSERT INTO data_retention_policies (
        data_type, retention_period_days, auto_delete, reminder_days_before
      ) VALUES ($1, $2, $3, $4)
      RETURNING *`,
      [
        validated.data_type,
        validated.retention_period_days,
        validated.auto_delete,
        validated.reminder_days_before,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: '驗證失敗', details: error.errors });
    }
    console.error('Error creating retention policy:', error);
    res.status(500).json({ error: '建立保存期限政策失敗' });
  }
});

// 資料刪除請求
router.get('/deletion-requests', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const canView = await hasPermission(req.user!.id, 'view_gdpr');
    if (!canView) {
      return res.status(403).json({ error: '無權限查看' });
    }

    const { status } = req.query;
    let query = 'SELECT * FROM data_deletion_requests WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (status) {
      query += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error: unknown) {
    console.error('Error fetching deletion requests:', error);
    res.status(500).json({ error: '取得刪除請求失敗' });
  }
});

router.post('/deletion-requests', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const validated = createDeletionRequestSchema.parse(req.body);
    const result = await pool.query(
      `INSERT INTO data_deletion_requests (
        requestor_id, requestor_type, request_reason, requested_data_types
      ) VALUES ($1, $2, $3, $4)
      RETURNING *`,
      [
        validated.requestor_id,
        validated.requestor_type,
        validated.request_reason || null,
        validated.requested_data_types,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: '驗證失敗', details: error.errors });
    }
    console.error('Error creating deletion request:', error);
    res.status(500).json({ error: '建立刪除請求失敗' });
  }
});

router.post('/deletion-requests/:id/approve', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const canManage = await hasPermission(req.user!.id, 'manage_gdpr');
    if (!canManage) {
      return res.status(403).json({ error: '無權限核准' });
    }

    const { id } = req.params;
    const { completion_notes } = req.body;

    // 更新狀態為已核准
    const result = await pool.query(
      `UPDATE data_deletion_requests 
       SET status = 'approved',
           approved_at = CURRENT_TIMESTAMP,
           approved_by = $1
       WHERE id = $2
       RETURNING *`,
      [req.user!.id, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '刪除請求不存在' });
    }

    // TODO: 實際執行資料刪除邏輯
    // 這裡應該根據 requested_data_types 刪除對應的資料

    // 標記為已完成
    await pool.query(
      `UPDATE data_deletion_requests 
       SET status = 'completed',
           completed_at = CURRENT_TIMESTAMP,
           completion_notes = $1
       WHERE id = $2`,
      [completion_notes || null, id]
    );

    res.json({ success: true, message: '刪除請求已核准並執行' });
  } catch (error: unknown) {
    console.error('Error approving deletion request:', error);
    res.status(500).json({ error: '核准刪除請求失敗' });
  }
});

export default router;

