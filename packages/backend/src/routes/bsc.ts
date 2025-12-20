import { Router } from 'express';
import { pool } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

const createBSCObjectiveSchema = z.object({
  name_zh: z.string().min(1),
  name_en: z.string().optional(),
  perspective: z.enum(['financial', 'customer', 'internal_process', 'learning_growth']),
  description: z.string().optional(),
  responsible_user_id: z.string().uuid(),
  collaborating_units: z.array(z.string()).optional(),
  kpi_ids: z.array(z.string().uuid()).min(1), // 至少關聯一個 KPI
});

const createCausalLinkSchema = z.object({
  from_objective_id: z.string().uuid(),
  to_objective_id: z.string().uuid(),
  description: z.string().optional(),
});

// 取得所有 BSC 目標
router.get('/objectives', authenticate, async (req: AuthRequest, res) => {
  try {
    const { perspective } = req.query;
    let query = `
      SELECT o.*, 
             u.full_name as responsible_name,
             (SELECT COUNT(*) FROM bsc_objective_kpis bok WHERE bok.objective_id = o.id) as kpi_count,
             (SELECT COUNT(*) FROM initiative_bsc_objectives ibo WHERE ibo.objective_id = o.id) as initiative_count
      FROM bsc_objectives o
      LEFT JOIN users u ON o.responsible_user_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (perspective) {
      query += ` AND o.perspective = $${paramIndex}`;
      params.push(perspective);
      paramIndex++;
    }

    query += ' ORDER BY o.perspective, o.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching BSC objectives:', error);
    res.status(500).json({ error: '取得 BSC 目標列表失敗' });
  }
});

// 取得單一 BSC 目標
router.get('/objectives/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const objectiveResult = await pool.query(
      `SELECT o.*, u.full_name as responsible_name
       FROM bsc_objectives o
       LEFT JOIN users u ON o.responsible_user_id = u.id
       WHERE o.id = $1`,
      [id]
    );

    if (objectiveResult.rows.length === 0) {
      return res.status(404).json({ error: 'BSC 目標不存在' });
    }

    // 取得關聯的 KPI
    const kpisResult = await pool.query(
      `SELECT k.*, bok.weight
       FROM kpi_registry k
       INNER JOIN bsc_objective_kpis bok ON k.id = bok.kpi_id
       WHERE bok.objective_id = $1`,
      [id]
    );

    // 取得關聯的 Initiatives
    const initiativesResult = await pool.query(
      `SELECT i.*
       FROM initiatives i
       INNER JOIN initiative_bsc_objectives ibo ON i.id = ibo.initiative_id
       WHERE ibo.objective_id = $1`,
      [id]
    );

    res.json({
      ...objectiveResult.rows[0],
      kpis: kpisResult.rows,
      initiatives: initiativesResult.rows,
    });
  } catch (error) {
    console.error('Error fetching BSC objective:', error);
    res.status(500).json({ error: '取得 BSC 目標失敗' });
  }
});

// 建立 BSC 目標
router.post('/objectives', authenticate, async (req: AuthRequest, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const validated = createBSCObjectiveSchema.parse(req.body);

    // 建立目標
    const objectiveResult = await client.query(
      `INSERT INTO bsc_objectives (
        name_zh, name_en, perspective, description, responsible_user_id, collaborating_units
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [
        validated.name_zh,
        validated.name_en || null,
        validated.perspective,
        validated.description || null,
        validated.responsible_user_id,
        validated.collaborating_units || [],
      ]
    );

    const objectiveId = objectiveResult.rows[0].id;

    // 關聯 KPI
    for (const kpiId of validated.kpi_ids) {
      await client.query(
        'INSERT INTO bsc_objective_kpis (objective_id, kpi_id) VALUES ($1, $2)',
        [objectiveId, kpiId]
      );
    }

    await client.query('COMMIT');
    res.status(201).json(objectiveResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: '驗證失敗', details: error.errors });
    }
    console.error('Error creating BSC objective:', error);
    res.status(500).json({ error: '建立 BSC 目標失敗' });
  } finally {
    client.release();
  }
});

// 取得所有因果鏈
router.get('/causal-links', authenticate, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `SELECT cl.*,
              fo.name_zh as from_objective_name,
              fo.perspective as from_perspective,
              to_obj.name_zh as to_objective_name,
              to_obj.perspective as to_perspective
       FROM bsc_causal_links cl
       INNER JOIN bsc_objectives fo ON cl.from_objective_id = fo.id
       INNER JOIN bsc_objectives to_obj ON cl.to_objective_id = to_obj.id
       ORDER BY cl.created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching causal links:', error);
    res.status(500).json({ error: '取得因果鏈列表失敗' });
  }
});

// 建立因果鏈
router.post('/causal-links', authenticate, async (req: AuthRequest, res) => {
  try {
    const validated = createCausalLinkSchema.parse(req.body);

    // 檢查是否已存在
    const existing = await pool.query(
      'SELECT id FROM bsc_causal_links WHERE from_objective_id = $1 AND to_objective_id = $2',
      [validated.from_objective_id, validated.to_objective_id]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: '因果鏈已存在' });
    }

    // 檢查不能自己連自己
    if (validated.from_objective_id === validated.to_objective_id) {
      return res.status(400).json({ error: '不能建立自己到自己的因果鏈' });
    }

    const result = await pool.query(
      `INSERT INTO bsc_causal_links (from_objective_id, to_objective_id, description)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [
        validated.from_objective_id,
        validated.to_objective_id,
        validated.description || null,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: '驗證失敗', details: error.errors });
    }
    console.error('Error creating causal link:', error);
    res.status(500).json({ error: '建立因果鏈失敗' });
  }
});

// 刪除因果鏈
router.delete('/causal-links/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM bsc_causal_links WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting causal link:', error);
    res.status(500).json({ error: '刪除因果鏈失敗' });
  }
});

// 取得儀表板資料（四構面達成率）
router.get('/dashboard/summary', authenticate, async (req: AuthRequest, res) => {
  try {
    // 計算各構面的達成率
    const perspectives = ['financial', 'customer', 'internal_process', 'learning_growth'];
    const perspectiveStats: any[] = [];

    for (const perspective of perspectives) {
      // 取得該構面下的所有 KPI
      const kpisResult = await pool.query(
        `SELECT k.id, k.name_zh, k.kpi_id, kv.value, kv.target_value, kv.status
         FROM kpi_registry k
         LEFT JOIN LATERAL (
           SELECT value, target_value, status
           FROM kpi_values
           WHERE kpi_id = k.id
           ORDER BY period DESC
           LIMIT 1
         ) kv ON true
         WHERE k.bsc_perspective = $1`,
        [perspective]
      );

      const kpis = kpisResult.rows;
      const totalKpis = kpis.length;
      const greenCount = kpis.filter((k) => k.status === 'green').length;
      const yellowCount = kpis.filter((k) => k.status === 'yellow').length;
      const redCount = kpis.filter((k) => k.status === 'red').length;

      // 計算達成率（基於目標值達成度）
      let totalAchievement = 0;
      let validKpis = 0;
      kpis.forEach((kpi) => {
        if (kpi.value && kpi.target_value && kpi.target_value > 0) {
          totalAchievement += (kpi.value / kpi.target_value) * 100;
          validKpis++;
        }
      });

      const achievementRate = validKpis > 0 ? totalAchievement / validKpis : 0;

      perspectiveStats.push({
        perspective,
        totalKpis,
        greenCount,
        yellowCount,
        redCount,
        achievementRate: Math.min(100, Math.max(0, achievementRate)),
      });
    }

    res.json({
      perspectives: perspectiveStats,
      summary: {
        totalKpis: perspectiveStats.reduce((sum, p) => sum + p.totalKpis, 0),
        totalGreen: perspectiveStats.reduce((sum, p) => sum + p.greenCount, 0),
        totalYellow: perspectiveStats.reduce((sum, p) => sum + p.yellowCount, 0),
        totalRed: perspectiveStats.reduce((sum, p) => sum + p.redCount, 0),
      },
    });
  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    res.status(500).json({ error: '取得儀表板資料失敗' });
  }
});

export default router;

