import { Router } from 'express';
import { pool } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

const createOKRSchema = z.object({
  initiative_id: z.string().uuid(),
  quarter: z.string().regex(/^\d{4}-Q[1-4]$/),
  objective: z.string().min(1),
  key_results: z.array(
    z.object({
      description: z.string().min(1),
      target_value: z.number(),
      unit: z.string().optional(),
    })
  ).min(1).max(5),
});

// 取得所有 OKR
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { initiative_id } = req.query;
    let query = `
      SELECT o.*, 
             (SELECT COUNT(*) FROM key_results kr WHERE kr.okr_id = o.id) as kr_count
      FROM okrs o
    `;
    const params: any[] = [];

    if (initiative_id) {
      query += ' WHERE o.initiative_id = $1';
      params.push(initiative_id);
    }

    query += ' ORDER BY o.quarter DESC, o.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching OKRs:', error);
    res.status(500).json({ error: '取得 OKR 列表失敗' });
  }
});

// 取得單一 OKR
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const okrResult = await pool.query('SELECT * FROM okrs WHERE id = $1', [id]);
    if (okrResult.rows.length === 0) {
      return res.status(404).json({ error: 'OKR 不存在' });
    }

    const krResult = await pool.query(
      'SELECT * FROM key_results WHERE okr_id = $1 ORDER BY created_at',
      [id]
    );

    res.json({
      ...okrResult.rows[0],
      key_results: krResult.rows,
    });
  } catch (error) {
    console.error('Error fetching OKR:', error);
    res.status(500).json({ error: '取得 OKR 失敗' });
  }
});

// 建立新 OKR
router.post('/', authenticate, async (req: AuthRequest, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const validated = createOKRSchema.parse(req.body);

    // 建立 OKR
    const okrResult = await client.query(
      `INSERT INTO okrs (initiative_id, quarter, objective, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [validated.initiative_id, validated.quarter, validated.objective, req.user?.id]
    );

    const okrId = okrResult.rows[0].id;

    // 建立 Key Results
    const krPromises = validated.key_results.map((kr) =>
      client.query(
        `INSERT INTO key_results (okr_id, description, target_value, unit)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [okrId, kr.description, kr.target_value, kr.unit || null]
      )
    );

    const krResults = await Promise.all(krPromises);
    const keyResults = krResults.map((r) => r.rows[0]);

    await client.query('COMMIT');

    res.status(201).json({
      ...okrResult.rows[0],
      key_results: keyResults,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: '驗證失敗', details: error.errors });
    }
    console.error('Error creating OKR:', error);
    res.status(500).json({ error: '建立 OKR 失敗' });
  } finally {
    client.release();
  }
});

// 更新 Key Result 進度
router.put('/key-results/:id/progress', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { current_value } = req.body;

    // 取得目標值
    const krResult = await pool.query('SELECT * FROM key_results WHERE id = $1', [id]);
    if (krResult.rows.length === 0) {
      return res.status(404).json({ error: 'Key Result 不存在' });
    }

    const kr = krResult.rows[0];
    const progress = kr.target_value > 0 
      ? Math.min(100, (current_value / kr.target_value) * 100)
      : 0;

    const status = progress >= 100 ? 'completed' : progress > 0 ? 'in_progress' : 'not_started';

    await pool.query(
      `UPDATE key_results 
       SET current_value = $1, progress_percentage = $2, status = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [current_value, progress, status, id]
    );

    // 更新 OKR 整體進度（計算所有 KR 的平均進度）
    const allKRs = await pool.query(
      'SELECT progress_percentage FROM key_results WHERE okr_id = $1',
      [kr.okr_id]
    );

    const avgProgress = allKRs.rows.length > 0
      ? allKRs.rows.reduce((sum, r) => sum + parseFloat(r.progress_percentage || 0), 0) / allKRs.rows.length
      : 0;

    res.json({
      success: true,
      progress,
      status,
      okr_avg_progress: avgProgress,
    });
  } catch (error) {
    console.error('Error updating KR progress:', error);
    res.status(500).json({ error: '更新進度失敗' });
  }
});

export default router;

