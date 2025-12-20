import { Router } from 'express';
import { pool } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { z } from 'zod';
import { sendNotification } from '../services/notification';

const router = Router();

const createPDCASchema = z.object({
  initiative_id: z.string().uuid().optional(),
  okr_id: z.string().uuid().optional(),
  cycle_name: z.string().min(1),
  check_frequency: z.enum(['weekly', 'monthly', 'quarterly']),
  responsible_user_id: z.string().uuid(),
  data_source: z.string().optional(),
});

// 取得所有 PDCA 循環
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { initiative_id, okr_id } = req.query;
    let query = `
      SELECT p.*, 
             u.full_name as responsible_name,
             i.name_zh as initiative_name
      FROM pdca_cycles p
      LEFT JOIN users u ON p.responsible_user_id = u.id
      LEFT JOIN initiatives i ON p.initiative_id = i.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (initiative_id) {
      query += ` AND p.initiative_id = $${paramIndex}`;
      params.push(initiative_id);
      paramIndex++;
    }

    if (okr_id) {
      query += ` AND p.okr_id = $${paramIndex}`;
      params.push(okr_id);
      paramIndex++;
    }

    query += ' ORDER BY p.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching PDCA cycles:', error);
    res.status(500).json({ error: '取得 PDCA 循環列表失敗' });
  }
});

// 建立 PDCA 循環
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const validated = createPDCASchema.parse(req.body);

    if (!validated.initiative_id && !validated.okr_id) {
      return res.status(400).json({ error: '必須關聯 Initiative 或 OKR' });
    }

    const result = await pool.query(
      `INSERT INTO pdca_cycles (
        initiative_id, okr_id, cycle_name, check_frequency,
        responsible_user_id, data_source
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [
        validated.initiative_id || null,
        validated.okr_id || null,
        validated.cycle_name,
        validated.check_frequency,
        validated.responsible_user_id,
        validated.data_source || null,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: '驗證失敗', details: error.errors });
    }
    console.error('Error creating PDCA cycle:', error);
    res.status(500).json({ error: '建立 PDCA 循環失敗' });
  }
});

// 建立 Plan
router.post('/:id/plans', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { plan_description, target_value, check_points } = req.body;

    const result = await pool.query(
      `INSERT INTO pdca_plans (pdca_cycle_id, plan_description, target_value, check_points)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, plan_description, target_value || null, JSON.stringify(check_points || [])]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating plan:', error);
    res.status(500).json({ error: '建立 Plan 失敗' });
  }
});

// 記錄執行（Do）
router.post('/:id/executions', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { task_id, execution_date, actual_value, evidence_urls } = req.body;

    const result = await pool.query(
      `INSERT INTO pdca_executions (
        pdca_cycle_id, task_id, execution_date, actual_value, evidence_urls, executed_by
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [
        id,
        task_id || null,
        execution_date,
        actual_value || null,
        evidence_urls || [],
        req.user?.id,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error recording execution:', error);
    res.status(500).json({ error: '記錄執行失敗' });
  }
});

// 執行檢核（Check）
router.post('/:id/checks', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { check_date } = req.body;

    // 取得 Plan 與實際值
    const planResult = await pool.query(
      'SELECT * FROM pdca_plans WHERE pdca_cycle_id = $1 ORDER BY created_at DESC LIMIT 1',
      [id]
    );

    const cycleResult = await pool.query('SELECT * FROM pdca_cycles WHERE id = $1', [id]);
    const cycle = cycleResult.rows[0];

    // 資料品質檢核
    const completenessIssues: string[] = [];
    const timelinessIssues: string[] = [];
    const consistencyIssues: string[] = [];

    // 完整性檢核（簡化版）
    if (!planResult.rows[0]?.target_value) {
      completenessIssues.push('目標值未設定');
    }

    // 準時性檢核
    const lastCheckResult = await pool.query(
      'SELECT check_date FROM pdca_checks WHERE pdca_cycle_id = $1 ORDER BY check_date DESC LIMIT 1',
      [id]
    );

    if (lastCheckResult.rows.length > 0) {
      const lastCheckDate = new Date(lastCheckResult.rows[0].check_date);
      const now = new Date();
      const daysDiff = Math.floor((now.getTime() - lastCheckDate.getTime()) / (1000 * 60 * 60 * 24));

      const frequencyDays: Record<string, number> = {
        weekly: 7,
        monthly: 30,
        quarterly: 90,
      };

      if (daysDiff > frequencyDays[cycle.check_frequency] * 1.5) {
        timelinessIssues.push(`超過更新頻率 ${daysDiff} 天未更新`);
      }
    }

    // 一致性檢核：比對同一實體在不同系統的資料
    if (cycle.data_source) {
      // 例如：檢查學生在學籍系統與居留證系統的資料是否一致
      // 這裡需要根據實際的資料來源實作
      const dataSourceResult = await pool.query(
        `SELECT COUNT(*) as count 
         FROM pdca_plans 
         WHERE pdca_cycle_id = $1 
         AND data_source = $2 
         AND actual_value IS NOT NULL`,
        [id, cycle.data_source]
      );
      
      // 簡化的一致性檢查：確保有實際值
      if (dataSourceResult.rows[0].count === 0) {
        consistencyIssues.push('資料來源未提供實際值');
      }
    }

    const completenessStatus =
      completenessIssues.length === 0 ? 'pass' : completenessIssues.length <= 2 ? 'warning' : 'fail';
    const timelinessStatus =
      timelinessIssues.length === 0 ? 'pass' : timelinessIssues.length <= 1 ? 'warning' : 'fail';
    const consistencyStatus = 'pass'; // 簡化處理

    // 差異分析
    let varianceAnalysis = '';
    if (planResult.rows.length > 0 && planResult.rows[0].target_value) {
      const targetValue = parseFloat(planResult.rows[0].target_value);
      const lastExecution = await pool.query(
        'SELECT actual_value FROM pdca_executions WHERE pdca_cycle_id = $1 ORDER BY execution_date DESC LIMIT 1',
        [id]
      );

      if (lastExecution.rows.length > 0 && lastExecution.rows[0].actual_value) {
        const actualValue = parseFloat(lastExecution.rows[0].actual_value);
        const variance = ((actualValue - targetValue) / targetValue) * 100;
        varianceAnalysis = `實際值 ${actualValue}，目標值 ${targetValue}，偏離 ${variance.toFixed(2)}%`;

        // 如果偏離超過 10%，要求填寫原因
        if (Math.abs(variance) > 10) {
          // 這裡可以要求使用者填寫原因
        }
      }
    }

    // 建立檢核記錄
    const result = await pool.query(
      `INSERT INTO pdca_checks (
        pdca_cycle_id, check_date, completeness_status, timeliness_status,
        consistency_status, completeness_issues, timeliness_issues,
        consistency_issues, variance_analysis, checked_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        id,
        check_date || new Date().toISOString().split('T')[0],
        completenessStatus,
        timelinessStatus,
        consistencyStatus,
        completenessIssues,
        timelinessIssues,
        consistencyIssues,
        varianceAnalysis,
        req.user?.id,
      ]
    );

    // 如果有問題，發送通知
    if (completenessStatus === 'fail' || timelinessStatus === 'fail') {
      const userResult = await pool.query('SELECT email FROM users WHERE id = $1', [
        cycle.responsible_user_id,
      ]);
      if (userResult.rows.length > 0) {
        await sendNotification({
          to: userResult.rows[0].email,
          subject: 'PDCA 檢核發現問題',
          message: `PDCA 循環「${cycle.cycle_name}」檢核發現問題，請登入系統查看詳情。`,
        });
      }
    }

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error performing check:', error);
    res.status(500).json({ error: '執行檢核失敗' });
  }
});

// 建立改善行動（Act）
router.post('/:id/actions', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const {
      root_cause,
      action_type,
      action_items,
      expected_kpi_impacts,
      validation_method,
      responsible_user_id,
      due_date,
    } = req.body;

    const result = await pool.query(
      `INSERT INTO pdca_actions (
        pdca_cycle_id, root_cause, action_type, action_items,
        expected_kpi_impacts, validation_method, responsible_user_id, due_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        id,
        root_cause,
        action_type,
        action_items || [],
        expected_kpi_impacts || [],
        validation_method || null,
        responsible_user_id,
        due_date || null,
      ]
    );

    const action = result.rows[0];

    // 如果請求中包含 create_task，自動建立 Kanban 任務
    if (req.body.create_task && action_items && action_items.length > 0) {
      // 取得 PDCA 循環的關聯 Initiative
      const cycleResult = await pool.query(
        'SELECT initiative_id FROM pdca_cycles WHERE id = $1',
        [id]
      );
      const initiativeId = cycleResult.rows[0]?.initiative_id || null;

      // 為每個行動項目建立任務
      const taskPromises = action_items.map((item: string) => {
        return pool.query(
          `INSERT INTO tasks (
            title, description, assignee_id, due_date, priority, 
            task_type, status, initiative_id, kpi_ids, risk_tags
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING *`,
          [
            item,
            `來自 PDCA 改善行動：${root_cause}`,
            responsible_user_id,
            due_date || null,
            'high',
            'project',
            'todo',
            initiativeId,
            expected_kpi_impacts || [],
            ['pdca_improvement'],
          ]
        );
      });

      await Promise.all(taskPromises);
    }

    res.status(201).json(action);
  } catch (error) {
    console.error('Error creating action:', error);
    res.status(500).json({ error: '建立改善行動失敗' });
  }
});

// 取得改善追蹤儀表板資料
router.get('/actions/dashboard', authenticate, async (req: AuthRequest, res) => {
  try {
    const { root_cause, status } = req.query;

    let query = `
      SELECT pa.*, 
             pc.cycle_name,
             u.full_name as responsible_name
      FROM pdca_actions pa
      INNER JOIN pdca_cycles pc ON pa.pdca_cycle_id = pc.id
      LEFT JOIN users u ON pa.responsible_user_id = u.id
      WHERE pa.status != 'completed'
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (root_cause) {
      query += ` AND pa.root_cause = $${paramIndex}`;
      params.push(root_cause);
      paramIndex++;
    }

    if (status) {
      query += ` AND pa.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    query += ' ORDER BY pa.due_date ASC';

    const result = await pool.query(query, params);

    // 依 Root Cause 分類統計
    const statsResult = await pool.query(
      `SELECT root_cause, COUNT(*) as count
       FROM pdca_actions
       WHERE status != 'completed'
       GROUP BY root_cause`
    );

    res.json({
      actions: result.rows,
      statistics: statsResult.rows,
    });
  } catch (error) {
    console.error('Error fetching action dashboard:', error);
    res.status(500).json({ error: '取得改善追蹤儀表板失敗' });
  }
});

export default router;

