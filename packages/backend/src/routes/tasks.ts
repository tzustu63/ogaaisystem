import { Router } from 'express';
import { pool } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

const createTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  task_type: z.enum(['routine', 'project', 'incident']),
  priority: z.enum(['urgent', 'high', 'medium', 'low']),
  assignee_id: z.string().uuid(),
  due_date: z.string().optional(),
  initiative_id: z.string().uuid().optional(),
  kr_id: z.string().uuid().optional(),
  kpi_id: z.string().uuid().optional(),
  risk_markers: z.array(z.string()).optional(),
});

// 取得所有任務
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { status, initiative_id, assignee_id } = req.query;
    let query = `
      SELECT t.*, 
             u.full_name as assignee_name,
             i.name_zh as initiative_name
      FROM tasks t
      LEFT JOIN users u ON t.assignee_id = u.id
      LEFT JOIN initiatives i ON t.initiative_id = i.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (status) {
      query += ` AND t.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (initiative_id) {
      query += ` AND t.initiative_id = $${paramIndex}`;
      params.push(initiative_id);
      paramIndex++;
    }

    if (assignee_id) {
      query += ` AND t.assignee_id = $${paramIndex}`;
      params.push(assignee_id);
      paramIndex++;
    }

    query += ' ORDER BY t.due_date ASC, t.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: '取得任務列表失敗' });
  }
});

// 取得單一任務
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const taskResult = await pool.query(
      `SELECT t.*, 
              u.full_name as assignee_name,
              i.name_zh as initiative_name,
              kr.description as kr_description
       FROM tasks t
       LEFT JOIN users u ON t.assignee_id = u.id
       LEFT JOIN initiatives i ON t.initiative_id = i.id
       LEFT JOIN key_results kr ON t.kr_id = kr.id
       WHERE t.id = $1`,
      [id]
    );

    if (taskResult.rows.length === 0) {
      return res.status(404).json({ error: '任務不存在' });
    }

    // 取得附件
    const attachmentsResult = await pool.query(
      'SELECT * FROM task_attachments WHERE task_id = $1',
      [id]
    );

    // 取得協作者
    const collaboratorsResult = await pool.query(
      `SELECT u.id, u.full_name, u.email
       FROM task_collaborators tc
       INNER JOIN users u ON tc.user_id = u.id
       WHERE tc.task_id = $1`,
      [id]
    );

    res.json({
      ...taskResult.rows[0],
      attachments: attachmentsResult.rows,
      collaborators: collaboratorsResult.rows,
    });
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({ error: '取得任務失敗' });
  }
});

// 建立新任務
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const validated = createTaskSchema.parse(req.body);

    // 戰略對齊強制規則驗證：專案類型任務必須關聯 Initiative 或 KR
    if (validated.task_type === 'project') {
      if (!validated.initiative_id && !validated.kr_id) {
        return res.status(400).json({
          error: '專案類型任務必須關聯至少一個 Initiative 或 Key Result',
        });
      }
    }

    const result = await pool.query(
      `INSERT INTO tasks (
        title, description, task_type, priority, status, assignee_id,
        due_date, initiative_id, kr_id, kpi_id, risk_markers, created_by
      ) VALUES ($1, $2, $3, $4, 'todo', $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        validated.title,
        validated.description || null,
        validated.task_type,
        validated.priority,
        validated.assignee_id,
        validated.due_date || null,
        validated.initiative_id || null,
        validated.kr_id || null,
        validated.kpi_id || null,
        validated.risk_markers || [],
        req.user?.id,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: '驗證失敗', details: error.errors });
    }
    console.error('Error creating task:', error);
    res.status(500).json({ error: '建立任務失敗' });
  }
});

// 更新任務狀態
router.patch('/:id/status', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['todo', 'in_progress', 'review', 'done'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: '無效的狀態' });
    }

    // 取得任務資訊
    const taskResult = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);
    if (taskResult.rows.length === 0) {
      return res.status(404).json({ error: '任務不存在' });
    }

    const task = taskResult.rows[0];

    // 更新狀態
    await pool.query(
      'UPDATE tasks SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [status, id]
    );

    // 如果任務完成且有關聯 KR，自動更新 KR 進度
    if (status === 'done' && task.kr_id) {
      // 計算該 KR 下已完成任務的比例
      const tasksResult = await pool.query(
        `SELECT COUNT(*) as total, 
                SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as completed
         FROM tasks WHERE kr_id = $1`,
        [task.kr_id]
      );

      if (tasksResult.rows.length > 0) {
        const { total, completed } = tasksResult.rows[0];
        const progress = total > 0 ? (parseInt(completed) / parseInt(total)) * 100 : 0;

        await pool.query(
          `UPDATE key_results 
           SET current_value = $1, progress_percentage = $2, 
               status = CASE WHEN $2 >= 100 THEN 'completed' ELSE 'in_progress' END,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $3`,
          [completed, progress, task.kr_id]
        );
      }
    }

    // 如果任務標記為影響 KPI 且完成，要求填寫實際影響說明
    if (status === 'done' && task.kpi_id) {
      // 檢查是否已填寫實際影響說明
      const updatedTask = await pool.query('SELECT actual_impact_description FROM tasks WHERE id = $1', [id]);
      if (!updatedTask.rows[0].actual_impact_description) {
        return res.json({
          success: true,
          requires_impact_description: true,
          message: '任務完成，請填寫實際影響說明',
        });
      }
    }

    res.json({ success: true, status });
  } catch (error) {
    console.error('Error updating task status:', error);
    res.status(500).json({ error: '更新任務狀態失敗' });
  }
});

// 更新任務實際影響說明
router.patch('/:id/impact', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { actual_impact_description, evidence_urls } = req.body;

    if (!actual_impact_description) {
      return res.status(400).json({ error: '實際影響說明為必填' });
    }

    await pool.query(
      `UPDATE tasks 
       SET actual_impact_description = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [actual_impact_description, id]
    );

    // 如果有證據 URL，更新到 initiative_kpis 表
    if (evidence_urls && evidence_urls.length > 0) {
      const task = await pool.query(
        'SELECT initiative_id, kpi_id FROM tasks WHERE id = $1',
        [id]
      );

      if (task.rows.length > 0 && task.rows[0].initiative_id && task.rows[0].kpi_id) {
        await pool.query(
          `UPDATE initiative_kpis 
           SET actual_impact_description = $1, actual_impact_evidence_urls = $2
           WHERE initiative_id = $3 AND kpi_id = $4`,
          [
            actual_impact_description,
            evidence_urls,
            task.rows[0].initiative_id,
            task.rows[0].kpi_id,
          ]
        );
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating task impact:', error);
    res.status(500).json({ error: '更新影響說明失敗' });
  }
});

// 看板視圖 API（支援自訂分組）
router.get('/kanban/board', authenticate, async (req: AuthRequest, res) => {
  try {
    const { initiative_id, groupBy } = req.query;

    let query = `
      SELECT t.*, 
             u.full_name as assignee_name,
             u.department as assignee_department,
             i.name_zh as initiative_name,
             i.responsible_unit as initiative_unit
      FROM tasks t
      LEFT JOIN users u ON t.assignee_id = u.id
      LEFT JOIN initiatives i ON t.initiative_id = i.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (initiative_id) {
      query += ` AND t.initiative_id = $${paramIndex}`;
      params.push(initiative_id);
      paramIndex++;
    }

    query += ' ORDER BY t.priority DESC, t.due_date ASC';

    const result = await pool.query(query, params);

    // 根據 groupBy 參數分組
    if (groupBy === 'department') {
      // 依單位分組
      const grouped: Record<string, any[]> = {};
      result.rows.forEach((task) => {
        const key = task.assignee_department || task.initiative_unit || '未指定';
        if (!grouped[key]) {
          grouped[key] = [];
        }
        grouped[key].push(task);
      });
      res.json(grouped);
    } else if (groupBy === 'project') {
      // 依專案分組
      const grouped: Record<string, any[]> = {};
      result.rows.forEach((task) => {
        const key = task.initiative_name || '未關聯專案';
        if (!grouped[key]) {
          grouped[key] = [];
        }
        grouped[key].push(task);
      });
      res.json(grouped);
    } else if (groupBy === 'priority') {
      // 依優先級分組
      const grouped: Record<string, any[]> = {
        urgent: [],
        high: [],
        medium: [],
        low: [],
      };
      result.rows.forEach((task) => {
        const priority = task.priority || 'medium';
        if (grouped[priority]) {
          grouped[priority].push(task);
        }
      });
      res.json(grouped);
    } else {
      // 預設：依狀態分組
      const board = {
        todo: result.rows.filter((t) => t.status === 'todo'),
        in_progress: result.rows.filter((t) => t.status === 'in_progress'),
        review: result.rows.filter((t) => t.status === 'review'),
        done: result.rows.filter((t) => t.status === 'done'),
      };
      res.json(board);
    }
  } catch (error) {
    console.error('Error fetching kanban board:', error);
    res.status(500).json({ error: '取得看板資料失敗' });
  }
});

// 表單定義管理
router.get('/forms/definitions', authenticate, async (req: AuthRequest, res) => {
  try {
    const { task_type } = req.query;
    let query = 'SELECT * FROM form_definitions WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (task_type) {
      query += ` AND task_type = $${paramIndex}`;
      params.push(task_type);
      paramIndex++;
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching form definitions:', error);
    res.status(500).json({ error: '取得表單定義失敗' });
  }
});

// 取得任務的表單紀錄
router.get('/:id/forms', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT tfr.*, fd.name as form_name, fd.form_schema
       FROM task_form_records tfr
       INNER JOIN form_definitions fd ON tfr.form_definition_id = fd.id
       WHERE tfr.task_id = $1
       ORDER BY tfr.submitted_at DESC`,
      [id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching task forms:', error);
    res.status(500).json({ error: '取得表單紀錄失敗' });
  }
});

// 提交表單紀錄
router.post('/:id/forms', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { form_definition_id, form_data } = req.body;

    if (!form_definition_id || !form_data) {
      return res.status(400).json({ error: '必須提供表單定義 ID 和表單資料' });
    }

    const result = await pool.query(
      `INSERT INTO task_form_records (task_id, form_definition_id, form_data, submitted_by)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (task_id, form_definition_id)
       DO UPDATE SET form_data = $3, submitted_by = $4, submitted_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [id, form_definition_id, JSON.stringify(form_data), req.user!.id]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error submitting form:', error);
    res.status(500).json({ error: '提交表單失敗' });
  }
});

export default router;

