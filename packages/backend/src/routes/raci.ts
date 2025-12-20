import { Router, Response } from 'express';
import { pool } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { z } from 'zod';
import { notifyWorkflowAction } from '../services/notification';

const router = Router();

const createRACITemplateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  scenario_type: z.string().optional(),
  raci_matrix: z.object({
    R: z.array(z.string().uuid()),
    A: z.array(z.string().uuid()).min(1), // 至少一個 A
    C: z.array(z.string().uuid()).optional(),
    I: z.array(z.string().uuid()).optional(),
  }),
  workflow_steps: z.array(
    z.object({
      step: z.string(),
      roles: z.record(z.any()),
      sla: z.object({
        days: z.number(),
        escalation: z.string().uuid().optional(),
      }).optional(),
      required_attachments: z.array(z.string()).optional(),
    })
  ).optional(),
});

// 取得所有 RACI 模板
router.get('/templates', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM raci_templates ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (error: unknown) {
    console.error('Error fetching RACI templates:', error);
    res.status(500).json({ error: '取得 RACI 模板失敗' });
  }
});

// 建立 RACI 模板
router.post('/templates', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const validated = createRACITemplateSchema.parse(req.body);

    const result = await pool.query(
      `INSERT INTO raci_templates (name, description, scenario_type, raci_matrix, workflow_steps)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        validated.name,
        validated.description || null,
        validated.scenario_type || null,
        JSON.stringify(validated.raci_matrix),
        validated.workflow_steps ? JSON.stringify(validated.workflow_steps) : null,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: '驗證失敗', details: error.errors });
    }
    console.error('Error creating RACI template:', error);
    res.status(500).json({ error: '建立 RACI 模板失敗' });
  }
});

// 建立工作流實例
router.post('/workflows', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { template_id, entity_type, entity_id } = req.body;

    // 取得模板
    const templateResult = await pool.query(
      'SELECT * FROM raci_templates WHERE id = $1',
      [template_id]
    );

    if (templateResult.rows.length === 0) {
      return res.status(404).json({ error: '模板不存在' });
    }

    const template = templateResult.rows[0];
    const workflowSteps = template.workflow_steps || [];
    const currentStep = workflowSteps.length > 0 ? workflowSteps[0].step : 'draft';

    // 建立工作流
    const workflowResult = await pool.query(
      `INSERT INTO workflows (template_id, entity_type, entity_id, current_step, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [template_id, entity_type, entity_id, currentStep, 'draft', req.user?.id]
    );

    const workflow = workflowResult.rows[0];

    // 通知所有相關角色
    const raciMatrix = template.raci_matrix;
    const allUsers = [
      ...(raciMatrix.R || []),
      ...(raciMatrix.A || []),
      ...(raciMatrix.C || []),
      ...(raciMatrix.I || []),
    ];

    // TODO: 發送通知給所有相關使用者

    res.status(201).json(workflow);
  } catch (error: unknown) {
    console.error('Error creating workflow:', error);
    res.status(500).json({ error: '建立工作流失敗' });
  }
});

// 取得工作流詳情
router.get('/workflows/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const workflowResult = await pool.query(
      `SELECT w.*, rt.name as template_name, rt.raci_matrix, rt.workflow_steps
       FROM workflows w
       INNER JOIN raci_templates rt ON w.template_id = rt.id
       WHERE w.id = $1`,
      [id]
    );

    if (workflowResult.rows.length === 0) {
      return res.status(404).json({ error: '工作流不存在' });
    }

    // 取得操作歷史
    const actionsResult = await pool.query(
      `SELECT wa.*, u.full_name as user_name
       FROM workflow_actions wa
       LEFT JOIN users u ON wa.user_id = u.id
       WHERE wa.workflow_id = $1
       ORDER BY wa.created_at ASC`,
      [id]
    );

    res.json({
      ...workflowResult.rows[0],
      actions: actionsResult.rows,
    });
  } catch (error: unknown) {
    console.error('Error fetching workflow:', error);
    res.status(500).json({ error: '取得工作流失敗' });
  }
});

// 執行工作流動作（會簽、核定、退回等）
router.post('/workflows/:id/actions', authenticate, async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { id } = req.params;
    const { action_type, comment, attachments } = req.body;

    // 取得工作流
    const workflowResult = await client.query('SELECT * FROM workflows WHERE id = $1', [id]);
    if (workflowResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: '工作流不存在' });
    }

    const workflow = workflowResult.rows[0];

    // 取得模板資訊
    const templateResult = await client.query(
      'SELECT * FROM raci_templates WHERE id = $1',
      [workflow.template_id]
    );
    const template = templateResult.rows[0];
    const workflowSteps = template.workflow_steps || [];

    // 檢查權限（簡化版，實際應檢查使用者在 RACI 矩陣中的角色）
    // TODO: 實作完整的權限檢查

    // 記錄動作
    await client.query(
      `INSERT INTO workflow_actions (workflow_id, step, action_type, user_id, comment, attachments, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        id,
        workflow.current_step,
        action_type,
        req.user?.id,
        comment || null,
        attachments || [],
        req.ip,
      ]
    );

    // 根據動作類型更新工作流狀態
    let newStatus = workflow.status;
    let nextStep = workflow.current_step;

    if (action_type === 'submit' && workflow.status === 'draft') {
      newStatus = 'consultation';
      // 找到下一個步驟
      const currentStepIndex = workflowSteps.findIndex((s: any) => s.step === workflow.current_step);
      if (currentStepIndex < workflowSteps.length - 1) {
        nextStep = workflowSteps[currentStepIndex + 1].step;
      }
    } else if (action_type === 'approve') {
      // 檢查是否所有 C 都已完成會簽
      const raciMatrix = template.raci_matrix;
      const cUsers = raciMatrix.C || [];
      
      if (cUsers.length > 0) {
        const consultActions = await client.query(
          `SELECT DISTINCT user_id FROM workflow_actions 
           WHERE workflow_id = $1 AND action_type = 'consult'`,
          [id]
        );
        
        if (consultActions.rows.length < cUsers.length) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: '尚未完成所有會簽' });
        }
      }

      newStatus = 'archived';
      nextStep = 'archived';
    } else if (action_type === 'reject' || action_type === 'return') {
      newStatus = 'draft';
      nextStep = 'draft';
    }

    // 更新工作流
    await client.query(
      `UPDATE workflows 
       SET status = $1, current_step = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [newStatus, nextStep, id]
    );

    await client.query('COMMIT');

    // 發送通知
    // TODO: 實作通知邏輯

    res.json({ success: true, status: newStatus, current_step: nextStep });
  } catch (error: unknown) {
    await client.query('ROLLBACK');
    console.error('Error executing workflow action:', error);
    res.status(500).json({ error: '執行工作流動作失敗' });
  } finally {
    client.release();
  }
});

// 取得會簽進度儀表板
router.get('/workflows/:id/consultation-progress', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // 取得工作流資訊
    const workflowResult = await pool.query(
      `SELECT w.*, wt.name as template_name, wt.workflow_steps, wt.raci_matrix
       FROM workflows w
       INNER JOIN raci_templates wt ON w.template_id = wt.id
       WHERE w.id = $1`,
      [id]
    );

    if (workflowResult.rows.length === 0) {
      return res.status(404).json({ error: '工作流不存在' });
    }

    const workflow = workflowResult.rows[0];
    const raciMatrix = workflow.raci_matrix || {};
    const cUsers = raciMatrix.C || [];
    const workflowSteps = workflow.workflow_steps || [];
    const currentStep = workflowSteps.find((s: any) => s.step === workflow.current_step);
    const slaDays = currentStep?.sla_days;

    // 取得所有會簽動作
    const consultationResult = await pool.query(
      `SELECT wa.*, u.full_name as user_name, u.email as user_email
       FROM workflow_actions wa
       LEFT JOIN users u ON wa.user_id = u.id
       WHERE wa.workflow_id = $1 AND wa.action_type = 'consult'
       ORDER BY wa.created_at DESC`,
      [id]
    );

    const consultations = consultationResult.rows;

    // 計算每個 C 角色的狀態
    const progress = cUsers.map((userId: string) => {
      const consultation = consultations.find((c) => c.user_id === userId);
      const userInfo = consultation ? {
        name: consultation.user_name,
        email: consultation.user_email,
      } : null;

      let status = 'pending';
      let daysElapsed = 0;
      let isOverdue = false;

      if (consultation) {
        status = 'completed';
      } else if (workflow.status === 'consultation') {
        // 計算已過天數
        const stepStartTime = new Date(workflow.updated_at);
        const now = new Date();
        daysElapsed = Math.floor(
          (now.getTime() - stepStartTime.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (slaDays && daysElapsed > slaDays) {
          isOverdue = true;
          status = 'overdue';
        } else {
          status = 'in_progress';
        }
      }

      return {
        user_id: userId,
        user_info: userInfo,
        status,
        days_elapsed: daysElapsed,
        is_overdue: isOverdue,
        consultation: consultation ? {
          comment: consultation.comment,
          created_at: consultation.created_at,
        } : null,
      };
    });

    // 統計
    const stats = {
      total: cUsers.length,
      completed: progress.filter((p: { status: string }) => p.status === 'completed').length,
      in_progress: progress.filter((p: { status: string }) => p.status === 'in_progress').length,
      overdue: progress.filter((p: { status: string }) => p.status === 'overdue').length,
      pending: progress.filter((p: { status: string }) => p.status === 'pending').length,
    };

    res.json({
      workflow: {
        id: workflow.id,
        template_name: workflow.template_name,
        current_step: workflow.current_step,
        status: workflow.status,
        sla_days: slaDays,
      },
      progress,
      stats,
    });
  } catch (error: unknown) {
    console.error('Error fetching consultation progress:', error);
    res.status(500).json({ error: '取得會簽進度失敗' });
  }
});

export default router;

