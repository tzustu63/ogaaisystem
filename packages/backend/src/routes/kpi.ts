import { Router } from 'express';
import { pool } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { z } from 'zod';
import { validateKPIDefinition } from '../services/kpi-validation';
import { notifyKPIStatusChange } from '../services/notification';

const router = Router();

// KPI 建立驗證 schema
const createKPISchema = z.object({
  kpi_id: z.string().min(1),
  name_zh: z.string().min(1),
  name_en: z.string().optional(),
  bsc_perspective: z.string().optional(),
  definition: z.string().min(1),
  formula: z.string().min(1),
  data_source: z.string().min(1),
  data_steward: z.string().optional(),           // 保留向後相容
  data_steward_id: z.string().uuid().optional(), // 新欄位：關聯 users 表
  update_frequency: z.enum(['monthly', 'quarterly', 'ad_hoc']),
  target_value: z.record(z.any()),
  thresholds: z.object({
    mode: z.enum(['fixed', 'relative', 'predictive']),
    green: z.any(),
    yellow: z.any(),
    red: z.any(),
  }),
  evidence_requirements: z.array(z.string()).optional(),
  applicable_programs: z.array(z.string()).optional(),
});

// 取得所有 KPI
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `SELECT k.*,
              u.full_name as data_steward_name,
              (SELECT COUNT(*) FROM kpi_versions kv WHERE kv.kpi_id = k.id) as version_count,
              (SELECT kv.status
               FROM kpi_values kv
               WHERE kv.kpi_id = k.id
               ORDER BY kv.period DESC
               LIMIT 1) as status,
              (SELECT kv.value
               FROM kpi_values kv
               WHERE kv.kpi_id = k.id
               ORDER BY kv.period DESC
               LIMIT 1) as latest_value,
              (SELECT kv.target_value
               FROM kpi_values kv
               WHERE kv.kpi_id = k.id
               ORDER BY kv.period DESC
               LIMIT 1) as latest_target_value
       FROM kpi_registry k
       LEFT JOIN users u ON k.data_steward_id = u.id
       ORDER BY k.created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching KPIs:', error);
    res.status(500).json({ error: '取得 KPI 列表失敗' });
  }
});

// 取得單一 KPI
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const kpiResult = await pool.query(
      `SELECT k.*, u.full_name as data_steward_name
       FROM kpi_registry k
       LEFT JOIN users u ON k.data_steward_id = u.id
       WHERE k.id = $1`,
      [id]
    );

    if (kpiResult.rows.length === 0) {
      return res.status(404).json({ error: 'KPI 不存在' });
    }

    const [versionsResult, valuesResult, initiativesResult] = await Promise.all([
      pool.query(
        'SELECT * FROM kpi_versions WHERE kpi_id = $1 ORDER BY version DESC',
        [id]
      ),
      pool.query(
        'SELECT * FROM kpi_values WHERE kpi_id = $1 ORDER BY period DESC LIMIT 12',
        [id]
      ),
      pool.query(
        `SELECT i.id, i.initiative_id, i.name_zh, i.status, ik.expected_impact
         FROM initiatives i
         INNER JOIN initiative_kpis ik ON i.id = ik.initiative_id
         WHERE ik.kpi_id = $1
         ORDER BY i.name_zh`,
        [id]
      ),
    ]);

    res.json({
      ...kpiResult.rows[0],
      versions: versionsResult.rows,
      recent_values: valuesResult.rows,
      initiatives: initiativesResult.rows,
    });
  } catch (error) {
    console.error('Error fetching KPI:', error);
    res.status(500).json({ error: '取得 KPI 失敗' });
  }
});

// 建立新 KPI
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const validated = createKPISchema.parse(req.body);

    // 驗證 KPI 定義
    const validation = validateKPIDefinition(validated);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'KPI 定義驗證失敗',
        errors: validation.errors,
        warnings: validation.warnings,
      });
    }

    // 檢查 KPI_ID 唯一性
    const existing = await pool.query(
      'SELECT id FROM kpi_registry WHERE kpi_id = $1',
      [validated.kpi_id]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'KPI_ID 已存在' });
    }

    const result = await pool.query(
      `INSERT INTO kpi_registry (
        kpi_id, name_zh, name_en, bsc_perspective, definition, formula,
        data_source, data_steward, data_steward_id, update_frequency, target_value, thresholds,
        evidence_requirements, applicable_programs, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        validated.kpi_id,
        validated.name_zh,
        validated.name_en || null,
        validated.bsc_perspective || null,
        validated.definition,
        validated.formula,
        validated.data_source,
        validated.data_steward || null,
        validated.data_steward_id || null,
        validated.update_frequency,
        JSON.stringify(validated.target_value),
        JSON.stringify(validated.thresholds),
        validated.evidence_requirements || [],
        validated.applicable_programs || [],
        req.user?.id,
      ]
    );

    // 建立初始版本
    await pool.query(
      `INSERT INTO kpi_versions (kpi_id, version, definition, formula, thresholds, changed_by)
       VALUES ($1, 1, $2, $3, $4, $5)`,
      [
        result.rows[0].id,
        validated.definition,
        validated.formula,
        JSON.stringify(validated.thresholds),
        req.user?.id,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: '驗證失敗', details: error.errors });
    }
    console.error('Error creating KPI:', error);
    res.status(500).json({ error: '建立 KPI 失敗' });
  }
});

// 更新 KPI（會建立新版本）
router.put('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const validated = createKPISchema.partial().parse(req.body);

    // 取得當前版本
    const current = await pool.query(
      'SELECT * FROM kpi_registry WHERE id = $1',
      [id]
    );

    if (current.rows.length === 0) {
      return res.status(404).json({ error: 'KPI 不存在' });
    }

    const currentKPI = current.rows[0];
    const newVersion = currentKPI.current_version + 1;

    // 更新 KPI
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;

    Object.entries(validated).forEach(([key, value]) => {
      if (value !== undefined) {
        updateFields.push(`${key} = $${paramIndex}`);
        updateValues.push(
          ['target_value', 'thresholds'].includes(key) ? JSON.stringify(value) : value
        );
        paramIndex++;
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({ error: '沒有要更新的欄位' });
    }

    updateFields.push(`current_version = $${paramIndex}`);
    updateValues.push(newVersion);
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    updateValues.push(id);

    await pool.query(
      `UPDATE kpi_registry SET ${updateFields.join(', ')} WHERE id = $${paramIndex + 1}`,
      updateValues
    );

    // 建立新版本記錄
    await pool.query(
      `INSERT INTO kpi_versions (kpi_id, version, definition, formula, thresholds, changed_by, change_reason)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        id,
        newVersion,
        validated.definition || currentKPI.definition,
        validated.formula || currentKPI.formula,
        JSON.stringify(validated.thresholds || currentKPI.thresholds),
        req.user?.id,
        req.body.change_reason || null,
      ]
    );

    const updated = await pool.query(
      'SELECT * FROM kpi_registry WHERE id = $1',
      [id]
    );

    res.json(updated.rows[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: '驗證失敗', details: error.errors });
    }
    console.error('Error updating KPI:', error);
    res.status(500).json({ error: '更新 KPI 失敗' });
  }
});

// 更新 KPI 數值
router.post('/:id/values', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { period, value, target_value, evidence_urls } = req.body;

    // 取得當前 KPI 與閾值
    const kpiResult = await pool.query(
      'SELECT * FROM kpi_registry WHERE id = $1',
      [id]
    );

    if (kpiResult.rows.length === 0) {
      return res.status(404).json({ error: 'KPI 不存在' });
    }

    const kpi = kpiResult.rows[0];
    const thresholds = kpi.thresholds;

    // 計算燈號
    let status = 'red';
    if (thresholds.mode === 'fixed') {
      const greenMin = thresholds.green?.min ?? thresholds.green?.value ?? Infinity;
      const yellowMin = thresholds.yellow?.min ?? thresholds.yellow?.value ?? Infinity;
      
      if (value >= greenMin) {
        status = 'green';
      } else if (value >= yellowMin) {
        status = 'yellow';
      }
    } else if (thresholds.mode === 'relative') {
      // 相對值模式：需要取得基準值進行比較
      const baseline = thresholds.baseline || 'previous_period'; // 'previous_period' | 'same_period_last_year'
      
      let baselineValue: number | null = null;
      
      if (baseline === 'previous_period') {
        // 取得上一期的值
        const periodParts = period.split('-');
        let previousPeriod = '';
        
        if (periodParts.length === 2 && periodParts[1].startsWith('Q')) {
          // 季度：2024-Q1 -> 2023-Q4
          const year = parseInt(periodParts[0]);
          const quarter = parseInt(periodParts[1].substring(1));
          if (quarter === 1) {
            previousPeriod = `${year - 1}-Q4`;
          } else {
            previousPeriod = `${year}-Q${quarter - 1}`;
          }
        } else if (periodParts.length === 2) {
          // 月度：2024-01 -> 2023-12
          const year = parseInt(periodParts[0]);
          const month = parseInt(periodParts[1]);
          if (month === 1) {
            previousPeriod = `${year - 1}-12`;
          } else {
            previousPeriod = `${year}-${String(month - 1).padStart(2, '0')}`;
          }
        }
        
        if (previousPeriod) {
          const baselineResult = await pool.query(
            'SELECT value FROM kpi_values WHERE kpi_id = $1 AND period = $2',
            [id, previousPeriod]
          );
          if (baselineResult.rows.length > 0) {
            baselineValue = parseFloat(baselineResult.rows[0].value) || 0;
          }
        }
      } else if (baseline === 'same_period_last_year') {
        // 取得去年同期值
        const periodParts = period.split('-');
        let lastYearPeriod = '';
        
        if (periodParts.length === 2) {
          const year = parseInt(periodParts[0]);
          lastYearPeriod = `${year - 1}-${periodParts[1]}`;
        }
        
        if (lastYearPeriod) {
          const baselineResult = await pool.query(
            'SELECT value FROM kpi_values WHERE kpi_id = $1 AND period = $2',
            [id, lastYearPeriod]
          );
          if (baselineResult.rows.length > 0) {
            baselineValue = parseFloat(baselineResult.rows[0].value) || 0;
          }
        }
      }
      
      if (baselineValue !== null && baselineValue > 0) {
        // 計算相對百分比
        const relativePercentage = ((value - baselineValue) / baselineValue) * 100;
        
        // 根據閾值判斷燈號
        const greenThreshold = thresholds.green?.min || thresholds.green?.value || 0;
        const yellowThreshold = thresholds.yellow?.min || thresholds.yellow?.value || 0;
        
        if (relativePercentage >= greenThreshold) {
          status = 'green';
        } else if (relativePercentage >= yellowThreshold) {
          status = 'yellow';
        } else {
          status = 'red';
        }
      } else {
        // 無基準值，預設為紅燈
        status = 'red';
      }
    }

    // 檢查燈號是否變更並發送通知
    const existingValue = await pool.query(
      'SELECT status FROM kpi_values WHERE kpi_id = $1 AND period = $2',
      [id, period]
    );

    if (existingValue.rows.length > 0 && existingValue.rows[0].status !== status) {
      // 燈號變更，發送通知
      const kpiInfo = await pool.query(
        `SELECT k.name_zh, k.data_steward, k.data_steward_id, u.email, u.full_name
         FROM kpi_registry k
         LEFT JOIN users u ON k.data_steward_id = u.id
         WHERE k.id = $1`,
        [id]
      );
      if (kpiInfo.rows.length > 0) {
        let stewardEmail = kpiInfo.rows[0].email;

        // 如果沒有 data_steward_id，嘗試用 data_steward 文字查詢
        if (!stewardEmail && kpiInfo.rows[0].data_steward) {
          const stewardResult = await pool.query(
            `SELECT u.email, u.full_name
             FROM users u
             WHERE u.full_name LIKE $1 OR u.username = $2`,
            [`%${kpiInfo.rows[0].data_steward}%`, kpiInfo.rows[0].data_steward]
          );
          if (stewardResult.rows.length > 0) {
            stewardEmail = stewardResult.rows[0].email;
          }
        }

        if (stewardEmail) {
          await notifyKPIStatusChange(
            kpiInfo.rows[0].name_zh,
            existingValue.rows[0].status,
            status,
            stewardEmail
          );
        }
      }
    }

    const result = await pool.query(
      `INSERT INTO kpi_values (kpi_id, period, value, target_value, status, version_used, evidence_urls)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (kpi_id, period) 
       DO UPDATE SET value = $3, target_value = $4, status = $5, version_used = $6, evidence_urls = $7
       RETURNING *`,
      [
        id,
        period,
        value,
        target_value,
        status,
        kpi.current_version,
        evidence_urls || [],
      ]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating KPI value:', error);
    res.status(500).json({ error: '更新 KPI 數值失敗' });
  }
});

// 手動標記例外
router.post('/:id/values/:period/exception', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id, period } = req.params;
    const { reason } = req.body;

    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({ error: '必須填寫例外原因' });
    }

    // 檢查 KPI 數值是否存在
    const valueResult = await pool.query(
      'SELECT * FROM kpi_values WHERE kpi_id = $1 AND period = $2',
      [id, period]
    );

    if (valueResult.rows.length === 0) {
      return res.status(404).json({ error: 'KPI 數值不存在' });
    }

    // 更新例外標記
    const result = await pool.query(
      `UPDATE kpi_values 
       SET is_manual_exception = TRUE,
           exception_reason = $1,
           exception_marked_by = $2,
           exception_marked_at = CURRENT_TIMESTAMP
       WHERE kpi_id = $3 AND period = $4
       RETURNING *`,
      [reason, req.user!.id, id, period]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error marking exception:', error);
    res.status(500).json({ error: '標記例外失敗' });
  }
});

// 取消例外標記
router.delete('/:id/values/:period/exception', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id, period } = req.params;

    const result = await pool.query(
      `UPDATE kpi_values 
       SET is_manual_exception = FALSE,
           exception_reason = NULL,
           exception_marked_by = NULL,
           exception_marked_at = NULL
       WHERE kpi_id = $1 AND period = $2
       RETURNING *`,
      [id, period]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'KPI 數值不存在' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error removing exception:', error);
    res.status(500).json({ error: '取消例外標記失敗' });
  }
});

// 刪除 KPI
router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    await client.query('BEGIN');

    // 檢查 KPI 是否存在
    const kpiResult = await client.query(
      'SELECT * FROM kpi_registry WHERE id = $1',
      [id]
    );

    if (kpiResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'KPI 不存在' });
    }

    // 檢查是否有任務關聯（tasks.kpi_id 沒有 CASCADE，需要手動處理）
    const tasksResult = await client.query(
      'SELECT COUNT(*) as count FROM tasks WHERE kpi_id = $1',
      [id]
    );
    const taskCount = parseInt(tasksResult.rows[0].count);

    if (taskCount > 0) {
      // 將任務的 kpi_id 設為 NULL
      await client.query(
        'UPDATE tasks SET kpi_id = NULL WHERE kpi_id = $1',
        [id]
      );
    }

    // 刪除 KPI（CASCADE 會自動刪除 kpi_versions, kpi_values, initiative_kpis）
    await client.query('DELETE FROM kpi_registry WHERE id = $1', [id]);

    await client.query('COMMIT');

    res.json({ 
      success: true, 
      message: 'KPI 已刪除',
      affected_tasks: taskCount 
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting KPI:', error);
    res.status(500).json({ error: '刪除 KPI 失敗' });
  } finally {
    client.release();
  }
});

// 更新 KPI 關聯的策略專案
router.put('/:id/initiatives', authenticate, async (req: AuthRequest, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { initiative_ids } = req.body;

    if (!Array.isArray(initiative_ids)) {
      return res.status(400).json({ error: 'initiative_ids 必須是陣列' });
    }

    await client.query('BEGIN');

    // 刪除現有關聯
    await client.query('DELETE FROM initiative_kpis WHERE kpi_id = $1', [id]);

    // 新增關聯
    for (const initiativeId of initiative_ids) {
      await client.query(
        `INSERT INTO initiative_kpis (initiative_id, kpi_id, expected_impact)
         VALUES ($1, $2, 'positive')`,
        [initiativeId, id]
      );
    }

    await client.query('COMMIT');

    // 回傳更新後的關聯
    const result = await pool.query(
      `SELECT i.id, i.initiative_id, i.name_zh, i.status
       FROM initiatives i
       INNER JOIN initiative_kpis ik ON i.id = ik.initiative_id
       WHERE ik.kpi_id = $1
       ORDER BY i.name_zh`,
      [id]
    );

    res.json(result.rows);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating KPI initiatives:', error);
    res.status(500).json({ error: '更新關聯策略專案失敗' });
  } finally {
    client.release();
  }
});


export default router;

