import { Router } from 'express';
import { pool } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

// Key Result Schema（僅支援自定義類型）
const keyResultSchema = z.object({
  description: z.string().min(1),
  target_value: z.coerce.number().positive(),
  unit: z.string().optional(),
});

const createOKRSchema = z.object({
  initiative_id: z.string().uuid(),
  quarter: z.string().regex(/^\d+$/), // 學年度為數值，例如：114
  objective: z.string().min(1),
  key_results: z.array(keyResultSchema).min(1).max(5),
});

const updateOKRSchema = z.object({
  initiative_id: z.string().uuid().optional(),
  quarter: z.string().optional(), // 學年度（更新時允許舊格式和新格式）
  objective: z.string().min(1).optional(),
  key_results: z.array(keyResultSchema).min(1).max(5).optional(),
}).refine(
  (data) => {
    // 如果提供了 quarter，驗證格式（允許數值或舊格式）
    if (data.quarter !== undefined) {
      return /^\d+$/.test(data.quarter) || /^\d{4}-Q[1-4]$/.test(data.quarter);
    }
    return true;
  },
  {
    message: '學年度格式錯誤，請使用數值格式（例如：114）',
    path: ['quarter'],
  }
);

// 取得所有 OKR
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { initiative_id } = req.query;
    let query = `
      SELECT o.*,
             i.name_zh as initiative_name,
             i.initiative_id as initiative_code,
             (SELECT COUNT(*) FROM key_results kr WHERE kr.okr_id = o.id) as kr_count
      FROM okrs o
      LEFT JOIN initiatives i ON o.initiative_id = i.id
    `;
    const params: any[] = [];

    if (initiative_id) {
      query += ' WHERE o.initiative_id = $1';
      params.push(initiative_id);
    }

    query += ' ORDER BY i.name_zh, o.quarter DESC, o.created_at DESC';

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
    console.log("=== PUT OKR Request ===" );
    console.log("Request body:", JSON.stringify(req.body, null, 2));

    const okrResult = await pool.query('SELECT * FROM okrs WHERE id = $1', [id]);
    if (okrResult.rows.length === 0) {
      return res.status(404).json({ error: 'OKR 不存在' });
    }

    // 取得 Key Results
    const krResult = await pool.query(
      `SELECT kr.*
       FROM key_results kr
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

    // 建立 Key Results
    const krPromises = validated.key_results.map(async (kr) => {
      return client.query(
        `INSERT INTO key_results (okr_id, description, target_value, unit)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [okrId, kr.description, kr.target_value, kr.unit || null]
      );
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

// 更新 OKR
router.put('/:id', authenticate, async (req: AuthRequest, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    console.log("=== PUT OKR Request ===" );
    console.log("Request body:", JSON.stringify(req.body, null, 2));
    await client.query('BEGIN');
    
    // 檢查 OKR 是否存在
    const okrCheck = await client.query('SELECT * FROM okrs WHERE id = $1', [id]);
    if (okrCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'OKR 不存在' });
    }

    const validated = updateOKRSchema.parse(req.body);

    // 更新 OKR 基本資訊
    if (validated.initiative_id || validated.quarter || validated.objective) {
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramIndex = 1;

      if (validated.initiative_id) {
        updateFields.push(`initiative_id = $${paramIndex}`);
        updateValues.push(validated.initiative_id);
        paramIndex++;
      }
      if (validated.quarter) {
        // 如果 quarter 是舊格式（2024-Q1），保持原樣；如果是新格式（114），正常更新
        updateFields.push(`quarter = $${paramIndex}`);
        updateValues.push(validated.quarter);
        paramIndex++;
      }
      if (validated.objective) {
        updateFields.push(`objective = $${paramIndex}`);
        updateValues.push(validated.objective);
        paramIndex++;
      }

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      updateValues.push(id);

      await client.query(
        `UPDATE okrs SET ${updateFields.join(', ')} WHERE id = $${paramIndex}`,
        updateValues
      );
    }

    // 如果提供了 key_results，則更新它們
    if (validated.key_results) {
      // 刪除現有的 Key Results
      await client.query('DELETE FROM key_results WHERE okr_id = $1', [id]);

      // 新增新的 Key Results
      for (const kr of validated.key_results) {
        await client.query(
          `INSERT INTO key_results (okr_id, description, target_value, unit)
           VALUES ($1, $2, $3, $4)`,
          [id, kr.description, kr.target_value, kr.unit || null]
        );
      }
    }

    await client.query('COMMIT');

    // 取得更新後的 OKR
    const updatedOkr = await pool.query('SELECT * FROM okrs WHERE id = $1', [id]);
    const krResult = await pool.query(
      `SELECT kr.*
       FROM key_results kr
       WHERE kr.okr_id = $1 
       ORDER BY kr.created_at`,
      [id]
    );

    res.json({
      ...updatedOkr.rows[0],
      key_results: krResult.rows,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: '驗證失敗', details: error.errors });
    }
    console.error('Error updating OKR:', error);
    res.status(500).json({ error: '更新 OKR 失敗' });
  } finally {
    client.release();
  }
});

// 新增 Key Result
router.post('/:id/key-results', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    console.log("=== PUT OKR Request ===" );
    console.log("Request body:", JSON.stringify(req.body, null, 2));
    const validated = keyResultSchema.parse(req.body);

    // 檢查 OKR 是否存在
    const okrCheck = await pool.query('SELECT * FROM okrs WHERE id = $1', [id]);
    if (okrCheck.rows.length === 0) {
      return res.status(404).json({ error: 'OKR 不存在' });
    }

    // 檢查該 OKR 的 KR 數量（限制最多 5 個）
    const krCountResult = await pool.query(
      'SELECT COUNT(*) as count FROM key_results WHERE okr_id = $1',
      [id]
    );
    const krCount = parseInt(krCountResult.rows[0].count);
    if (krCount >= 5) {
      return res.status(400).json({ error: '每個 OKR 最多只能有 5 個 Key Result' });
    }

    // 新增 Key Result
    const result = await pool.query(
      `INSERT INTO key_results (okr_id, description, target_value, unit)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, validated.description, validated.target_value, validated.unit || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: '驗證失敗', details: error.errors });
    }
    console.error('Error creating Key Result:', error);
    res.status(500).json({ error: '新增 Key Result 失敗' });
  }
});

// 更新 Key Result 進度（已禁用 - 進度現在由任務自動計算）
// 此端點保留以維持向後兼容性，但會返回錯誤提示
router.put('/key-results/:id/progress', authenticate, async (req: AuthRequest, res) => {
  res.status(400).json({ 
    error: 'Key Result 進度已改為自動計算，無法手動更新。請透過關聯的任務來更新進度。',
    message: '進度會根據關聯任務的完成情況自動計算：已完成任務數 / 總任務數 * 100'
  });
});


export default router;

