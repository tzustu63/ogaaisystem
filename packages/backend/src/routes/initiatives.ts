import { Router } from 'express';
import { pool } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

const createInitiativeSchema = z.object({
  initiative_id: z.string().min(1),
  name_zh: z.string().min(1),
  name_en: z.string().optional(),
  initiative_type: z.string().min(1),
  status: z.enum(['planning', 'in_progress', 'completed', 'cancelled']),
  risk_level: z.enum(['high', 'medium', 'low']).optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  budget: z.number().optional(),
  responsible_unit: z.string().min(1),
  primary_owner: z.string().optional(),
  co_owners: z.array(z.string()).optional(),
  funding_sources: z.array(z.string()).optional(),
  related_indicators: z.array(z.string()).optional(),
  kpi_ids: z.array(z.string().uuid()).optional(),
  notes: z.string().optional(),
});

// 取得所有 Initiatives
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `SELECT i.*, 
              (SELECT COUNT(*) FROM okrs o WHERE o.initiative_id = i.id) as okr_count,
              (SELECT COUNT(*) FROM tasks t WHERE t.initiative_id = i.id) as task_count
       FROM initiatives i
       ORDER BY i.created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching initiatives:', error);
    res.status(500).json({ error: '取得 Initiatives 列表失敗' });
  }
});

// 取得單一 Initiative
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    
    const initiativeResult = await pool.query(
      'SELECT * FROM initiatives WHERE id = $1',
      [id]
    );

    if (initiativeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Initiative 不存在' });
    }

    const [kpis, programs, okrs] = await Promise.all([
      pool.query(
        `SELECT k.*, ik.expected_impact, ik.actual_impact_description
         FROM kpi_registry k
         INNER JOIN initiative_kpis ik ON k.id = ik.kpi_id
         WHERE ik.initiative_id = $1`,
        [id]
      ),
      pool.query(
        'SELECT program FROM initiative_programs WHERE initiative_id = $1',
        [id]
      ),
      pool.query(
        'SELECT * FROM okrs WHERE initiative_id = $1 ORDER BY quarter DESC',
        [id]
      ),
    ]);

    res.json({
      ...initiativeResult.rows[0],
      kpis: kpis.rows,
      programs: programs.rows.map((r) => r.program),
      okrs: okrs.rows,
    });
  } catch (error) {
    console.error('Error fetching initiative:', error);
    res.status(500).json({ error: '取得 Initiative 失敗' });
  }
});

// 建立新 Initiative
router.post('/', authenticate, async (req: AuthRequest, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const validated = createInitiativeSchema.parse(req.body);

    // 檢查 initiative_id 唯一性
    const existing = await client.query(
      'SELECT id FROM initiatives WHERE initiative_id = $1',
      [validated.initiative_id]
    );

    if (existing.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Initiative ID 已存在' });
    }

    const result = await client.query(
      `INSERT INTO initiatives (
        initiative_id, name_zh, name_en, initiative_type, status, risk_level,
        start_date, end_date, budget, responsible_unit, primary_owner, co_owners,
        funding_sources, related_indicators, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *`,
      [
        validated.initiative_id,
        validated.name_zh,
        validated.name_en || null,
        validated.initiative_type,
        validated.status,
        validated.risk_level || null,
        validated.start_date || null,
        validated.end_date || null,
        validated.budget || null,
        validated.responsible_unit,
        validated.primary_owner || null,
        validated.co_owners || null,
        validated.funding_sources || null,
        validated.related_indicators || null,
        validated.notes || null,
        req.user?.id,
      ]
    );

    const initiativeId = result.rows[0].id;

    // 關聯 KPI（如有）
    if (validated.kpi_ids && validated.kpi_ids.length > 0) {
      for (const kpiId of validated.kpi_ids) {
        await client.query(
          `INSERT INTO initiative_kpis (initiative_id, kpi_id, expected_impact)
           VALUES ($1, $2, 'positive')`,
          [initiativeId, kpiId]
        );
      }
    }

    // 備註已在 INSERT 中處理，不需額外操作

    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: '驗證失敗', details: error.errors });
    }
    console.error('Error creating initiative:', error);
    res.status(500).json({ error: '建立 Initiative 失敗' });
  } finally {
    client.release();
  }
});

// 更新 Initiative
router.put('/:id', authenticate, async (req: AuthRequest, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { id } = req.params;

    // 檢查 Initiative 是否存在
    const existing = await client.query(
      'SELECT id FROM initiatives WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: '策略專案不存在' });
    }

    // 使用相同的 schema，但所有欄位都是可選的
    const updateSchema = createInitiativeSchema.partial();
    const validated = updateSchema.parse(req.body);

    // 構建更新語句
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;

    if (validated.initiative_id !== undefined) {
      // 檢查 initiative_id 唯一性（排除自己）
      const duplicate = await client.query(
        'SELECT id FROM initiatives WHERE initiative_id = $1 AND id != $2',
        [validated.initiative_id, id]
      );
      if (duplicate.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Initiative ID 已存在' });
      }
      updateFields.push(`initiative_id = $${paramIndex}`);
      updateValues.push(validated.initiative_id);
      paramIndex++;
    }

    if (validated.name_zh !== undefined) {
      updateFields.push(`name_zh = $${paramIndex}`);
      updateValues.push(validated.name_zh);
      paramIndex++;
    }
    if (validated.name_en !== undefined) {
      updateFields.push(`name_en = $${paramIndex}`);
      updateValues.push(validated.name_en || null);
      paramIndex++;
    }
    if (validated.initiative_type !== undefined) {
      updateFields.push(`initiative_type = $${paramIndex}`);
      updateValues.push(validated.initiative_type);
      paramIndex++;
    }
    if (validated.status !== undefined) {
      updateFields.push(`status = $${paramIndex}`);
      updateValues.push(validated.status);
      paramIndex++;
    }
    if (validated.risk_level !== undefined) {
      updateFields.push(`risk_level = $${paramIndex}`);
      updateValues.push(validated.risk_level || null);
      paramIndex++;
    }
    if (validated.start_date !== undefined) {
      updateFields.push(`start_date = $${paramIndex}`);
      updateValues.push(validated.start_date || null);
      paramIndex++;
    }
    if (validated.end_date !== undefined) {
      updateFields.push(`end_date = $${paramIndex}`);
      updateValues.push(validated.end_date || null);
      paramIndex++;
    }
    if (validated.budget !== undefined) {
      updateFields.push(`budget = $${paramIndex}`);
      updateValues.push(validated.budget || null);
      paramIndex++;
    }
    if (validated.responsible_unit !== undefined) {
      updateFields.push(`responsible_unit = $${paramIndex}`);
      updateValues.push(validated.responsible_unit);
      paramIndex++;
    }
    if (validated.primary_owner !== undefined) {
      updateFields.push(`primary_owner = $${paramIndex}`);
      updateValues.push(validated.primary_owner || null);
      paramIndex++;
    }
    if (validated.co_owners !== undefined) {
      updateFields.push(`co_owners = $${paramIndex}`);
      updateValues.push(validated.co_owners || null);
      paramIndex++;
    }
    if (validated.funding_sources !== undefined) {
      updateFields.push(`funding_sources = $${paramIndex}`);
      updateValues.push(validated.funding_sources || null);
      paramIndex++;
    }
    if (validated.related_indicators !== undefined) {
      updateFields.push(`related_indicators = $${paramIndex}`);
      updateValues.push(validated.related_indicators || null);
      paramIndex++;
    }
    if (validated.notes !== undefined) {
      updateFields.push(`notes = $${paramIndex}`);
      updateValues.push(validated.notes || null);
      paramIndex++;
    }

    // 更新 KPI 關聯（如有提供）
    if (validated.kpi_ids !== undefined) {
      // 先刪除現有關聯
      await client.query('DELETE FROM initiative_kpis WHERE initiative_id = $1', [id]);
      // 再新增新關聯
      if (validated.kpi_ids.length > 0) {
        for (const kpiId of validated.kpi_ids) {
          await client.query(
            `INSERT INTO initiative_kpis (initiative_id, kpi_id, expected_impact)
             VALUES ($1, $2, 'positive')`,
            [id, kpiId]
          );
        }
      }
    }

    if (updateFields.length > 0) {
      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      updateValues.push(id);

      await client.query(
        `UPDATE initiatives SET ${updateFields.join(', ')} WHERE id = $${paramIndex}`,
        updateValues
      );
    }

    // 取得更新後的資料
    const result = await client.query('SELECT * FROM initiatives WHERE id = $1', [id]);

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: '驗證失敗', details: error.errors });
    }
    console.error('Error updating initiative:', error);
    res.status(500).json({ error: '更新策略專案失敗' });
  } finally {
    client.release();
  }
});

// 產生計畫清單報告
router.get('/:id/program-report', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const initiativeResult = await pool.query(
      'SELECT * FROM initiatives WHERE id = $1',
      [id]
    );

    if (initiativeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Initiative 不存在' });
    }

    const initiative = initiativeResult.rows[0];

    // 取得適用計畫
    const programsResult = await pool.query(
      'SELECT program FROM initiative_programs WHERE initiative_id = $1',
      [id]
    );

    const programs = programsResult.rows.map((r) => r.program);

    // 取得相關證據（任務附件、PDCA 證據等）
    const evidenceResult = await pool.query(
      `SELECT 
        'task' as evidence_type,
        t.id,
        t.title as evidence_name,
        ta.file_url as evidence_url,
        ta.uploaded_at as evidence_date
       FROM tasks t
       INNER JOIN task_attachments ta ON t.id = ta.task_id
       WHERE t.initiative_id = $1
       
       UNION ALL
       
       SELECT 
        'pdca' as evidence_type,
        pc.id,
        pc.cycle_name as evidence_name,
        pe.evidence_urls[1] as evidence_url,
        pe.created_at as evidence_date
       FROM pdca_cycles pc
       INNER JOIN pdca_executions pe ON pc.id = pe.pdca_cycle_id
       WHERE pc.initiative_id = $1 AND pe.evidence_urls IS NOT NULL
       
       ORDER BY evidence_date DESC`,
      [id]
    );

    res.json({
      initiative: {
        id: initiative.id,
        initiative_id: initiative.initiative_id,
        name_zh: initiative.name_zh,
        name_en: initiative.name_en,
        responsible_unit: initiative.responsible_unit,
        status: initiative.status,
      },
      programs,
      evidence: evidenceResult.rows,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error generating program report:', error);
    res.status(500).json({ error: '產生報告失敗' });
  }
});

// 刪除 Initiative
router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { id } = req.params;

    // 檢查 Initiative 是否存在
    const initiativeResult = await client.query(
      'SELECT id FROM initiatives WHERE id = $1',
      [id]
    );

    if (initiativeResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: '策略專案不存在' });
    }

    // 處理 tasks 中的引用（設為 NULL）
    await client.query(
      'UPDATE tasks SET initiative_id = NULL WHERE initiative_id = $1',
      [id]
    );

    // 處理 pdca_cycles 中的引用（設為 NULL）
    await client.query(
      'UPDATE pdca_cycles SET initiative_id = NULL WHERE initiative_id = $1',
      [id]
    );

    // 刪除 Initiative（CASCADE 會自動處理關聯表）
    await client.query('DELETE FROM initiatives WHERE id = $1', [id]);

    await client.query('COMMIT');
    res.status(204).send(); // No Content
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting initiative:', error);
    res.status(500).json({ error: '刪除策略專案失敗' });
  } finally {
    client.release();
  }
});

// 自動彙整執行證據
router.get('/:id/evidence-summary', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    // 取得所有相關證據
    const [tasks, pdca, okrs] = await Promise.all([
      pool.query(
        `SELECT t.*, 
                COUNT(ta.id) as attachment_count,
                ARRAY_AGG(ta.file_url) FILTER (WHERE ta.file_url IS NOT NULL) as attachment_urls
         FROM tasks t
         LEFT JOIN task_attachments ta ON t.id = ta.task_id
         WHERE t.initiative_id = $1
         GROUP BY t.id`,
        [id]
      ),
      pool.query(
        `SELECT pc.*, 
                COUNT(pe.id) as execution_count,
                ARRAY_AGG(DISTINCT pe.evidence_urls) FILTER (WHERE pe.evidence_urls IS NOT NULL) as evidence_urls
         FROM pdca_cycles pc
         LEFT JOIN pdca_executions pe ON pc.id = pe.pdca_cycle_id
         WHERE pc.initiative_id = $1
         GROUP BY pc.id`,
        [id]
      ),
      pool.query(
        `SELECT o.*, 
                COUNT(kr.id) as kr_count,
                AVG(kr.progress) as avg_progress
         FROM okrs o
         LEFT JOIN key_results kr ON o.id = kr.okr_id
         WHERE o.initiative_id = $1
         GROUP BY o.id`,
        [id]
      ),
    ]);

    res.json({
      tasks: {
        total: tasks.rows.length,
        completed: tasks.rows.filter((t) => t.status === 'done').length,
        with_attachments: tasks.rows.filter((t) => t.attachment_count > 0).length,
        details: tasks.rows,
      },
      pdca: {
        total: pdca.rows.length,
        with_evidence: pdca.rows.filter((p) => p.evidence_urls && p.evidence_urls.length > 0).length,
        details: pdca.rows,
      },
      okrs: {
        total: okrs.rows.length,
        avg_progress: okrs.rows.length > 0 
          ? okrs.rows.reduce((sum, o) => sum + (parseFloat(o.avg_progress) || 0), 0) / okrs.rows.length 
          : 0,
        details: okrs.rows,
      },
      summary: {
        total_evidence_items: tasks.rows.reduce((sum, t) => sum + (t.attachment_count || 0), 0) +
          pdca.rows.reduce((sum, p) => sum + (p.evidence_urls?.length || 0), 0),
        last_updated: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error generating evidence summary:', error);
    res.status(500).json({ error: '彙整證據失敗' });
  }
});

// 預算使用統計
router.get('/budget/usage', authenticate, async (req: AuthRequest, res) => {
  try {
    const { group_by, initiative_id, kpi_id } = req.query;
    
    if (group_by === 'initiative') {
      // 按策略專案分組
      let query = `
        SELECT 
          i.id,
          i.name_zh as initiative_name,
          i.budget as total_budget,
          COALESCE(SUM(t.amount), 0) as used_amount,
          t.funding_source,
          COUNT(t.id) as task_count
        FROM initiatives i
        LEFT JOIN tasks t ON t.initiative_id = i.id AND t.amount IS NOT NULL AND t.amount > 0
        WHERE 1=1
      `;
      
      const params: any[] = [];
      let paramIndex = 1;
      
      if (initiative_id) {
        query += ` AND i.id = $${paramIndex}`;
        params.push(initiative_id);
        paramIndex++;
      }
      
      query += `
        GROUP BY i.id, i.name_zh, i.budget, t.funding_source
        ORDER BY i.name_zh, t.funding_source
      `;
      
      const result = await pool.query(query, params);
      
      // 先取得所有策略專案（即使沒有預算或任務）
      const allInitiativesQuery = initiative_id 
        ? await pool.query('SELECT id, name_zh, budget FROM initiatives WHERE id = $1', [initiative_id])
        : await pool.query('SELECT id, name_zh, budget FROM initiatives ORDER BY name_zh', []);
      
      // 按策略專案分組，並按預算來源分類
      const grouped: Record<string, any> = {};
      
      // 先初始化所有策略專案
      allInitiativesQuery.rows.forEach((row) => {
        grouped[row.id] = {
          id: row.id,
          name: row.name_zh,
          total_budget: parseFloat(row.budget) || 0,
          used_by_source: {},
          total_used: 0,
        };
      });
      
      // 再填入預算使用資料
      result.rows.forEach((row) => {
        const key = row.id;
        if (!grouped[key]) {
          grouped[key] = {
            id: row.id,
            name: row.initiative_name,
            total_budget: parseFloat(row.total_budget) || 0,
            used_by_source: {},
            total_used: 0,
          };
        }
        
        if (row.funding_source) {
          if (!grouped[key].used_by_source[row.funding_source]) {
            grouped[key].used_by_source[row.funding_source] = 0;
          }
          grouped[key].used_by_source[row.funding_source] += parseFloat(row.used_amount) || 0;
        }
        grouped[key].total_used += parseFloat(row.used_amount) || 0;
      });
      
      res.json({ data: Object.values(grouped), type: 'initiative' });
      
    } else if (group_by === 'kpi') {
      // 按 KPI 分組
      let query = `
        SELECT 
          k.id,
          k.name_zh as kpi_name,
          COALESCE(SUM(t.amount), 0) as used_amount,
          t.funding_source,
          COUNT(t.id) as task_count
        FROM kpi_registry k
        LEFT JOIN tasks t ON t.kpi_id = k.id AND t.amount IS NOT NULL AND t.amount > 0
        WHERE 1=1
      `;
      
      const params: any[] = [];
      let paramIndex = 1;
      
      if (kpi_id) {
        query += ` AND k.id = $${paramIndex}`;
        params.push(kpi_id);
        paramIndex++;
      }
      
      query += `
        GROUP BY k.id, k.name_zh, t.funding_source
        ORDER BY k.name_zh, t.funding_source
      `;
      
      const result = await pool.query(query, params);
      
      // 先取得所有 KPI（即使沒有預算或任務）
      const allKPIsQuery = kpi_id 
        ? await pool.query('SELECT id, name_zh FROM kpi_registry WHERE id = $1', [kpi_id])
        : await pool.query('SELECT id, name_zh FROM kpi_registry ORDER BY name_zh', []);
      
      // 按 KPI 分組，並按預算來源分類
      const grouped: Record<string, any> = {};
      
      // 先初始化所有 KPI
      allKPIsQuery.rows.forEach((row) => {
        grouped[row.id] = {
          id: row.id,
          name: row.name_zh,
          used_by_source: {},
          total_used: 0,
        };
      });
      
      // 再填入預算使用資料
      result.rows.forEach((row) => {
        const key = row.id;
        if (!grouped[key]) {
          grouped[key] = {
            id: row.id,
            name: row.kpi_name,
            used_by_source: {},
            total_used: 0,
          };
        }
        
        if (row.funding_source) {
          if (!grouped[key].used_by_source[row.funding_source]) {
            grouped[key].used_by_source[row.funding_source] = 0;
          }
          grouped[key].used_by_source[row.funding_source] += parseFloat(row.used_amount) || 0;
        }
        grouped[key].total_used += parseFloat(row.used_amount) || 0;
      });
      
      res.json({ data: Object.values(grouped), type: 'kpi' });
    } else {
      res.status(400).json({ error: 'group_by 必須是 "initiative" 或 "kpi"' });
    }
  } catch (error) {
    console.error('Error fetching budget usage:', error);
    res.status(500).json({ error: '取得預算使用統計失敗' });
  }
});

export default router;

