import { Router } from 'express';
import { pool } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

// 統一的函數：計算並更新 Key Result 進度（基於任務貢獻值加總）
async function updateKRProgressFromTasks(krId: string) {
  try {
    // 取得 KR 資訊（目標值和單位）
    const krResult = await pool.query(
      'SELECT target_value, unit FROM key_results WHERE id = $1',
      [krId]
    );
    if (krResult.rows.length === 0) {
      return;
    }

    const targetValue = parseFloat(krResult.rows[0].target_value) || 0;
    const unit = krResult.rows[0].unit || '';

    // 加總所有已完成任務的貢獻值
    const tasksResult = await pool.query(
      `SELECT COALESCE(SUM(kr_contribution_value), 0) as total_contribution
       FROM tasks 
       WHERE kr_id = $1 AND status = 'done' AND kr_contribution_value IS NOT NULL`,
      [krId]
    );

    const totalContribution = parseFloat(tasksResult.rows[0]?.total_contribution || 0) || 0;
    
    // 計算進度百分比（貢獻值總和 / 目標值 * 100）
    const progress = targetValue > 0 
      ? Math.round((totalContribution / targetValue) * 100)
      : 0;

    // 限制進度在 0-100 之間
    const finalProgress = Math.max(0, Math.min(100, progress));

    // 更新 Key Result
    await pool.query(
      `UPDATE key_results 
       SET current_value = $1, 
           progress_percentage = $2, 
           status = CASE 
             WHEN $2 >= 100 THEN 'completed'
             WHEN $2 > 0 THEN 'in_progress'
             ELSE 'not_started'
           END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [totalContribution, finalProgress, krId]
    );
  } catch (error) {
    console.error('Error updating KR progress from tasks:', error);
    // 不拋出錯誤，避免影響主要操作
  }
}

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
  kr_contribution_value: z.number().optional(),
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
        due_date, initiative_id, kr_id, kpi_id, risk_markers, kr_contribution_value, created_by
      ) VALUES ($1, $2, $3, $4, 'todo', $5, $6, $7, $8, $9, $10, $11, $12)
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
        validated.kr_contribution_value || 0,
        req.user?.id,
      ]
    );

    // 如果任務有關聯 KR，自動更新 KR 進度
    if (validated.kr_id) {
      await updateKRProgressFromTasks(validated.kr_id);
    }

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

    // 記錄舊的 kr_id（如果有的話）
    const oldKrId = task.kr_id;

    // 更新狀態
    await pool.query(
      'UPDATE tasks SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [status, id]
    );

    // 如果任務有關聯 KR，自動更新 KR 進度（無論狀態如何）
    // 特別注意：只有當任務狀態為 'done' 時，才會將貢獻值計入加總
    if (task.kr_id) {
      await updateKRProgressFromTasks(task.kr_id);
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

// 更新任務（包括 kr_id 變更）
const updateTaskSchema = createTaskSchema.partial();
router.put('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const validated = updateTaskSchema.parse(req.body);

    // 取得舊任務資訊
    const oldTaskResult = await pool.query('SELECT kr_id FROM tasks WHERE id = $1', [id]);
    if (oldTaskResult.rows.length === 0) {
      return res.status(404).json({ error: '任務不存在' });
    }
    const oldKrId = oldTaskResult.rows[0].kr_id;

    // 構建更新語句
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;

    if (validated.title !== undefined) {
      updateFields.push(`title = $${paramIndex}`);
      updateValues.push(validated.title);
      paramIndex++;
    }
    if (validated.description !== undefined) {
      updateFields.push(`description = $${paramIndex}`);
      updateValues.push(validated.description || null);
      paramIndex++;
    }
    if (validated.task_type !== undefined) {
      updateFields.push(`task_type = $${paramIndex}`);
      updateValues.push(validated.task_type);
      paramIndex++;
    }
    if (validated.priority !== undefined) {
      updateFields.push(`priority = $${paramIndex}`);
      updateValues.push(validated.priority);
      paramIndex++;
    }
    if (validated.assignee_id !== undefined) {
      updateFields.push(`assignee_id = $${paramIndex}`);
      updateValues.push(validated.assignee_id);
      paramIndex++;
    }
    if (validated.due_date !== undefined) {
      updateFields.push(`due_date = $${paramIndex}`);
      updateValues.push(validated.due_date || null);
      paramIndex++;
    }
    if (validated.initiative_id !== undefined) {
      updateFields.push(`initiative_id = $${paramIndex}`);
      updateValues.push(validated.initiative_id || null);
      paramIndex++;
    }
    if (validated.kr_id !== undefined) {
      updateFields.push(`kr_id = $${paramIndex}`);
      updateValues.push(validated.kr_id || null);
      paramIndex++;
    }
    if (validated.kpi_id !== undefined) {
      updateFields.push(`kpi_id = $${paramIndex}`);
      updateValues.push(validated.kpi_id || null);
      paramIndex++;
    }
    if (validated.risk_markers !== undefined) {
      updateFields.push(`risk_markers = $${paramIndex}`);
      updateValues.push(validated.risk_markers || []);
      paramIndex++;
    }
    if (validated.kr_contribution_value !== undefined) {
      updateFields.push(`kr_contribution_value = $${paramIndex}`);
      updateValues.push(validated.kr_contribution_value || 0);
      paramIndex++;
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: '沒有要更新的欄位' });
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    updateValues.push(id);

    await pool.query(
      `UPDATE tasks SET ${updateFields.join(', ')} WHERE id = $${paramIndex}`,
      updateValues
    );

    // 取得新任務資訊
    const newTaskResult = await pool.query('SELECT kr_id FROM tasks WHERE id = $1', [id]);
    const newKrId = newTaskResult.rows[0]?.kr_id;

    // 如果 kr_id 變更，更新相關的 KR 進度
    if (oldKrId && oldKrId !== newKrId) {
      await updateKRProgressFromTasks(oldKrId);
    }
    if (newKrId && newKrId !== oldKrId) {
      await updateKRProgressFromTasks(newKrId);
    }

    const result = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);
    res.json(result.rows[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: '驗證失敗', details: error.errors });
    }
    console.error('Error updating task:', error);
    res.status(500).json({ error: '更新任務失敗' });
  }
});

// 刪除任務
router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    // 取得任務資訊（特別是 kr_id）
    const taskResult = await pool.query('SELECT kr_id FROM tasks WHERE id = $1', [id]);
    if (taskResult.rows.length === 0) {
      return res.status(404).json({ error: '任務不存在' });
    }

    const krId = taskResult.rows[0].kr_id;

    // 刪除任務
    await pool.query('DELETE FROM tasks WHERE id = $1', [id]);

    // 如果任務有關聯 KR，更新 KR 進度
    if (krId) {
      await updateKRProgressFromTasks(krId);
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: '刪除任務失敗' });
  }
});

// 更新任務的 KR 貢獻值
router.patch('/:id/kr-contribution', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { kr_contribution_value } = req.body;

    if (kr_contribution_value === undefined || kr_contribution_value === null) {
      return res.status(400).json({ error: '請提供 KR 貢獻值' });
    }

    const value = parseFloat(kr_contribution_value);
    if (isNaN(value) || value < 0) {
      return res.status(400).json({ error: 'KR 貢獻值必須為非負數' });
    }

    // 取得任務資訊
    const taskResult = await pool.query('SELECT kr_id FROM tasks WHERE id = $1', [id]);
    if (taskResult.rows.length === 0) {
      return res.status(404).json({ error: '任務不存在' });
    }

    const krId = taskResult.rows[0].kr_id;
    if (!krId) {
      return res.status(400).json({ error: '此任務未關聯 Key Result' });
    }

    // 更新任務的貢獻值
    await pool.query(
      'UPDATE tasks SET kr_contribution_value = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [value, id]
    );

    // 更新 KR 進度
    await updateKRProgressFromTasks(krId);

    res.json({ success: true, kr_contribution_value: value });
  } catch (error) {
    console.error('Error updating task KR contribution:', error);
    res.status(500).json({ error: '更新 KR 貢獻值失敗' });
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
    const { initiative_id, assignee_id, groupBy } = req.query;

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

    if (assignee_id) {
      query += ` AND t.assignee_id = $${paramIndex}`;
      params.push(assignee_id);
      paramIndex++;
    }

    query += ' ORDER BY t.priority DESC, t.due_date ASC';

    const result = await pool.query(query, params);

    // 根據 groupBy 參數分組
    if (groupBy === 'initiative') {
      // 如果指定了 initiative_id，則按狀態分組顯示該專案的任務
      if (initiative_id) {
        const board = {
          todo: result.rows.filter((t) => t.status === 'todo'),
          in_progress: result.rows.filter((t) => t.status === 'in_progress'),
          review: result.rows.filter((t) => t.status === 'review'),
          done: result.rows.filter((t) => t.status === 'done'),
        };
        res.json(board);
      } else {
        // 依策略專案分組（顯示所有專案）
        const grouped: Record<string, any[]> = {};
        result.rows.forEach((task) => {
          const key = task.initiative_name || '未關聯專案';
          if (!grouped[key]) {
            grouped[key] = [];
          }
          grouped[key].push(task);
        });
        res.json(grouped);
      }
    } else if (groupBy === 'assignee') {
      // 如果指定了 assignee_id，則按狀態分組顯示該負責人的任務
      if (assignee_id) {
        const board = {
          todo: result.rows.filter((t) => t.status === 'todo'),
          in_progress: result.rows.filter((t) => t.status === 'in_progress'),
          review: result.rows.filter((t) => t.status === 'review'),
          done: result.rows.filter((t) => t.status === 'done'),
        };
        res.json(board);
      } else {
        // 依負責人分組（顯示所有負責人）
        const grouped: Record<string, any[]> = {};
        result.rows.forEach((task) => {
          const key = task.assignee_name || '未指定負責人';
          if (!grouped[key]) {
            grouped[key] = [];
          }
          grouped[key].push(task);
        });
        res.json(grouped);
      }
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

