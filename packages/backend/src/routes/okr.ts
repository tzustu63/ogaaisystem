import { Router } from 'express';
import { pool } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

// KR 類型：kpi_based（引用 KPI）或 custom（自定義）
const keyResultSchema = z.object({
  description: z.string().min(1),
  kr_type: z.enum(['kpi_based', 'custom']).default('custom'),
  // 自定義 KR 的欄位
  target_value: z.number().optional(),
  unit: z.string().optional(),
  // KPI 類型 KR 的欄位
  kpi_id: z.string().uuid().optional(),
  kpi_baseline_value: z.number().optional(),
  kpi_target_value: z.number().optional(),
}).refine(
  (data) => {
    if (data.kr_type === 'kpi_based') {
      return data.kpi_id !== undefined && data.kpi_target_value !== undefined;
    }
    return data.target_value !== undefined;
  },
  {
    message: 'KPI 類型的 KR 需要 kpi_id 和 kpi_target_value；自定義 KR 需要 target_value',
  }
);

const createOKRSchema = z.object({
  initiative_id: z.string().uuid(),
  quarter: z.string().regex(/^\d{4}-Q[1-4]$/),
  objective: z.string().min(1),
  key_results: z.array(keyResultSchema).min(1).max(5),
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

// 取得單一 OKR（包含 KPI 資訊）
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const okrResult = await pool.query('SELECT * FROM okrs WHERE id = $1', [id]);
    if (okrResult.rows.length === 0) {
      return res.status(404).json({ error: 'OKR 不存在' });
    }

    // 取得 Key Results 並關聯 KPI 資訊
    const krResult = await pool.query(
      `SELECT kr.*, 
              k.kpi_id AS kpi_code, 
              k.name_zh AS kpi_name,
              k.bsc_perspective AS kpi_perspective
       FROM key_results kr
       LEFT JOIN kpi_registry k ON kr.kpi_id = k.id
       WHERE kr.okr_id = $1 
       ORDER BY kr.created_at`,
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
      `INSERT INTO okrs (initiative_id, quarter, objective)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [validated.initiative_id, validated.quarter, validated.objective]
    );

    const okrId = okrResult.rows[0].id;

    // 建立 Key Results（支援 KPI 類型和自定義類型）
    const krPromises = validated.key_results.map(async (kr) => {
      if (kr.kr_type === 'kpi_based') {
        // KPI 類型的 KR
        return client.query(
          `INSERT INTO key_results (
            okr_id, description, kr_type, kpi_id, 
            kpi_baseline_value, kpi_target_value, target_value
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING *`,
          [
            okrId, 
            kr.description, 
            'kpi_based', 
            kr.kpi_id,
            kr.kpi_baseline_value || 0,
            kr.kpi_target_value,
            kr.kpi_target_value, // target_value 設為 KPI 目標值
          ]
        );
      } else {
        // 自定義 KR
        return client.query(
          `INSERT INTO key_results (okr_id, description, kr_type, target_value, unit)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING *`,
          [okrId, kr.description, 'custom', kr.target_value, kr.unit || null]
        );
      }
    });

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

// 更新 Key Result 進度（自定義 KR）
router.put('/key-results/:id/progress', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { current_value } = req.body;

    // 取得 KR 資訊
    const krResult = await pool.query('SELECT * FROM key_results WHERE id = $1', [id]);
    if (krResult.rows.length === 0) {
      return res.status(404).json({ error: 'Key Result 不存在' });
    }

    const kr = krResult.rows[0];

    // 如果是 KPI 類型的 KR，不允許直接更新（應透過 KPI 同步）
    if (kr.kr_type === 'kpi_based') {
      return res.status(400).json({ 
        error: 'KPI 類型的 Key Result 請透過同步功能更新',
        suggestion: '請先更新對應的 KPI 數值，然後呼叫同步 API'
      });
    }

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

// 同步 KPI 類型 KR 的進度（從 KPI 最新數值計算）
router.post('/key-results/:id/sync-kpi', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    // 取得 KR 資訊
    const krResult = await pool.query('SELECT * FROM key_results WHERE id = $1', [id]);
    if (krResult.rows.length === 0) {
      return res.status(404).json({ error: 'Key Result 不存在' });
    }

    const kr = krResult.rows[0];

    if (kr.kr_type !== 'kpi_based' || !kr.kpi_id) {
      return res.status(400).json({ error: '此 Key Result 不是 KPI 類型' });
    }

    // 取得 KPI 最新數值
    const kpiValueResult = await pool.query(
      `SELECT value FROM kpi_values 
       WHERE kpi_id = $1 
       ORDER BY created_at DESC 
       LIMIT 1`,
      [kr.kpi_id]
    );

    if (kpiValueResult.rows.length === 0) {
      return res.status(404).json({ error: 'KPI 尚無數值記錄' });
    }

    const currentValue = parseFloat(kpiValueResult.rows[0].value);
    const baseline = parseFloat(kr.kpi_baseline_value) || 0;
    const target = parseFloat(kr.kpi_target_value);

    // 計算進度
    let progress = 0;
    if (target !== baseline) {
      progress = ((currentValue - baseline) / (target - baseline)) * 100;
      progress = Math.max(0, Math.min(100, progress));
    }

    const status = progress >= 100 ? 'completed' : progress > 0 ? 'in_progress' : 'not_started';

    // 更新 KR
    await pool.query(
      `UPDATE key_results 
       SET current_value = $1, progress_percentage = $2, status = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [currentValue, progress, status, id]
    );

    res.json({
      success: true,
      kpi_current_value: currentValue,
      kpi_baseline_value: baseline,
      kpi_target_value: target,
      progress,
      status,
    });
  } catch (error) {
    console.error('Error syncing KR from KPI:', error);
    res.status(500).json({ error: '同步 KPI 進度失敗' });
  }
});

// 同步所有 KPI 類型 KR 的進度
router.post('/sync-all-kpi-kr', authenticate, async (req: AuthRequest, res) => {
  try {
    // 取得所有 KPI 類型的 KR
    const krsResult = await pool.query(
      `SELECT kr.*, k.name_zh as kpi_name
       FROM key_results kr
       INNER JOIN kpi_registry k ON kr.kpi_id = k.id
       WHERE kr.kr_type = 'kpi_based'`
    );

    const results = [];

    for (const kr of krsResult.rows) {
      // 取得 KPI 最新數值
      const kpiValueResult = await pool.query(
        `SELECT value FROM kpi_values 
         WHERE kpi_id = $1 
         ORDER BY created_at DESC 
         LIMIT 1`,
        [kr.kpi_id]
      );

      if (kpiValueResult.rows.length === 0) {
        results.push({
          kr_id: kr.id,
          kpi_name: kr.kpi_name,
          status: 'skipped',
          reason: 'KPI 無數值記錄',
        });
        continue;
      }

      const currentValue = parseFloat(kpiValueResult.rows[0].value);
      const baseline = parseFloat(kr.kpi_baseline_value) || 0;
      const target = parseFloat(kr.kpi_target_value);

      let progress = 0;
      if (target !== baseline) {
        progress = ((currentValue - baseline) / (target - baseline)) * 100;
        progress = Math.max(0, Math.min(100, progress));
      }

      const status = progress >= 100 ? 'completed' : progress > 0 ? 'in_progress' : 'not_started';

      await pool.query(
        `UPDATE key_results 
         SET current_value = $1, progress_percentage = $2, status = $3, updated_at = CURRENT_TIMESTAMP
         WHERE id = $4`,
        [currentValue, progress, status, kr.id]
      );

      results.push({
        kr_id: kr.id,
        kpi_name: kr.kpi_name,
        status: 'synced',
        progress,
      });
    }

    res.json({
      success: true,
      synced_count: results.filter(r => r.status === 'synced').length,
      skipped_count: results.filter(r => r.status === 'skipped').length,
      details: results,
    });
  } catch (error) {
    console.error('Error syncing all KPI KRs:', error);
    res.status(500).json({ error: '同步 KPI 進度失敗' });
  }
});

// 取得 OKR 與 KPI 整合視圖
router.get('/integration/view', authenticate, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM v_okr_kpi_integration`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching OKR-KPI integration view:', error);
    res.status(500).json({ error: '取得整合視圖失敗' });
  }
});

export default router;

