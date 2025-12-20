import { Router } from 'express';
import { pool } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { maskSensitiveFields } from '../services/data-masking';
import { z } from 'zod';

const router = Router();

const createIncidentSchema = z.object({
  incident_type: z.enum(['campus_safety', 'medical', 'legal', 'visa', 'other']),
  severity: z.enum(['critical', 'high', 'medium', 'low']),
  occurred_at: z.string(),
  location: z.string().optional(),
  student_name: z.string().min(1),
  student_id: z.string().optional(),
  contact_info: z.string().optional(),
  emergency_contact_name: z.string().optional(),
  emergency_contact_phone: z.string().optional(),
  description: z.string().min(1),
  accountable_user_id: z.string().uuid(),
});

// 預設 Checklist 模板
const CHECKLIST_TEMPLATES: Record<string, string[]> = {
  campus_safety: [
    '確認傷勢並聯繫救護車（若需要）',
    '通知學生緊急聯絡人',
    '通報校安中心',
    '通報國際處',
    '陪同就醫並協助醫療翻譯',
    '申請保險理賠',
    '追蹤復原狀況',
    '評估是否需心理諮商',
    '完成事件報告',
    '檢討預防措施',
  ],
  medical: [
    '確認醫療需求',
    '聯繫醫療機構',
    '通知緊急聯絡人',
    '協助醫療翻譯',
    '申請保險理賠',
    '追蹤復原狀況',
  ],
  visa: [
    '確認簽證問題類型',
    '聯繫相關單位',
    '準備必要文件',
    '協助申請流程',
    '追蹤處理進度',
  ],
};

// 產生事件編號
const generateIncidentNumber = async (): Promise<string> => {
  const year = new Date().getFullYear();
  const countResult = await pool.query(
    `SELECT COUNT(*) as count FROM incidents 
     WHERE incident_number LIKE $1`,
    [`INC-${year}-%`]
  );
  const count = parseInt(countResult.rows[0].count) + 1;
  return `INC-${year}-${String(count).padStart(3, '0')}`;
};

// 取得所有 Incidents（含遮罩）
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { status, severity, incident_type } = req.query;
    let query = `
      SELECT i.*, 
             u.full_name as accountable_name,
             (SELECT COUNT(*) FROM incident_checklists ic WHERE ic.incident_id = i.id AND ic.is_completed = true) as completed_checklist_count,
             (SELECT COUNT(*) FROM incident_checklists ic WHERE ic.incident_id = i.id) as total_checklist_count
      FROM incidents i
      LEFT JOIN users u ON i.accountable_user_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (status) {
      query += ` AND i.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (severity) {
      query += ` AND i.severity = $${paramIndex}`;
      params.push(severity);
      paramIndex++;
    }

    if (incident_type) {
      query += ` AND i.incident_type = $${paramIndex}`;
      params.push(incident_type);
      paramIndex++;
    }

    query += ' ORDER BY i.occurred_at DESC';

    const result = await pool.query(query, params);
    
    // 遮罩敏感欄位
    const maskedData = await Promise.all(
      result.rows.map((incident) => maskSensitiveFields(req.user!.id, incident))
    );

    res.json(maskedData);
  } catch (error) {
    console.error('Error fetching incidents:', error);
    res.status(500).json({ error: '取得 Incidents 列表失敗' });
  }
});

// 取得單一 Incident（含遮罩）
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const incidentResult = await pool.query(
      `SELECT i.*, u.full_name as accountable_name
       FROM incidents i
       LEFT JOIN users u ON i.accountable_user_id = u.id
       WHERE i.id = $1`,
      [id]
    );

    if (incidentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Incident 不存在' });
    }

    // 取得 Checklist
    const checklistResult = await pool.query(
      `SELECT ic.*, u.full_name as completed_by_name
       FROM incident_checklists ic
       LEFT JOIN users u ON ic.completed_by = u.id
       WHERE ic.incident_id = $1
       ORDER BY ic.created_at`,
      [id]
    );

    // 取得通報紀錄
    const notificationsResult = await pool.query(
      'SELECT * FROM incident_notifications WHERE incident_id = $1 ORDER BY notified_at',
      [id]
    );

    // 遮罩敏感欄位
    const maskedIncident = await maskSensitiveFields(req.user!.id, incidentResult.rows[0]);

    res.json({
      ...maskedIncident,
      checklists: checklistResult.rows,
      notifications: notificationsResult.rows,
    });
  } catch (error) {
    console.error('Error fetching incident:', error);
    res.status(500).json({ error: '取得 Incident 失敗' });
  }
});

// 建立新 Incident
router.post('/', authenticate, async (req: AuthRequest, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const validated = createIncidentSchema.parse(req.body);

    // 產生事件編號
    const incidentNumber = await generateIncidentNumber();

    // 建立 Incident
    const incidentResult = await client.query(
      `INSERT INTO incidents (
        incident_number, incident_type, severity, occurred_at, location,
        student_name, student_id, contact_info, emergency_contact_name,
        emergency_contact_phone, description, accountable_user_id, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        incidentNumber,
        validated.incident_type,
        validated.severity,
        validated.occurred_at,
        validated.location || null,
        validated.student_name,
        validated.student_id || null,
        validated.contact_info || null,
        validated.emergency_contact_name || null,
        validated.emergency_contact_phone || null,
        validated.description,
        validated.accountable_user_id,
        req.user?.id,
      ]
    );

    const incidentId = incidentResult.rows[0].id;

    // 建立 Checklist（根據事件類型載入模板）
    const checklistItems = CHECKLIST_TEMPLATES[validated.incident_type] || [];
    for (const item of checklistItems) {
      await client.query(
        'INSERT INTO incident_checklists (incident_id, item_text) VALUES ($1, $2)',
        [incidentId, item]
      );
    }

    await client.query('COMMIT');

    // TODO: 通知 RACI 中所有角色

    res.status(201).json(incidentResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: '驗證失敗', details: error.errors });
    }
    console.error('Error creating incident:', error);
    res.status(500).json({ error: '建立 Incident 失敗' });
  } finally {
    client.release();
  }
});

// 完成 Checklist 項目
router.patch('/:id/checklist/:checklistId', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id, checklistId } = req.params;

    await pool.query(
      `UPDATE incident_checklists 
       SET is_completed = true, completed_by = $1, completed_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND incident_id = $3`,
      [req.user?.id, checklistId, id]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating checklist:', error);
    res.status(500).json({ error: '更新 Checklist 失敗' });
  }
});

// 記錄通報
router.post('/:id/notifications', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { notified_unit, notification_proof_url } = req.body;

    const result = await pool.query(
      `INSERT INTO incident_notifications (incident_id, notified_unit, notified_at, notification_proof_url)
       VALUES ($1, $2, CURRENT_TIMESTAMP, $3)
       RETURNING *`,
      [id, notified_unit, notification_proof_url || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error recording notification:', error);
    res.status(500).json({ error: '記錄通報失敗' });
  }
});

// 結案 Incident
router.post('/:id/close', authenticate, async (req: AuthRequest, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { id } = req.params;
    const { resolution_report, prevention_measures } = req.body;

    // 檢查是否所有 Checklist 都完成
    const checklistResult = await client.query(
      `SELECT COUNT(*) as total, 
              SUM(CASE WHEN is_completed = true THEN 1 ELSE 0 END) as completed
       FROM incident_checklists WHERE incident_id = $1`,
      [id]
    );

    const { total, completed } = checklistResult.rows[0];
    if (parseInt(completed) < parseInt(total)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: '尚未完成所有 Checklist 項目' });
    }

    // 檢查是否已填寫結案報告
    if (!resolution_report || !prevention_measures) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: '必須填寫追蹤與結案報告' });
    }

    // 更新 Incident 狀態
    await client.query(
      `UPDATE incidents 
       SET status = 'closed', resolution_report = $1, prevention_measures = $2,
           closed_at = CURRENT_TIMESTAMP, closed_by = $3
       WHERE id = $4`,
      [resolution_report, prevention_measures, req.user?.id, id]
    );

    await client.query('COMMIT');

    res.json({ success: true, message: 'Incident 已結案' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error closing incident:', error);
    res.status(500).json({ error: '結案失敗' });
  } finally {
    client.release();
  }
});

export default router;

