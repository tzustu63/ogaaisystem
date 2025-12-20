import { pool } from '../config/database';
import { sendNotification } from './notification';

// 檢查工作流逾期並發送升級通知
export const checkWorkflowSLA = async () => {
  try {
    // 查詢所有進行中的工作流
    const workflows = await pool.query(
      `SELECT w.*, wt.name as template_name, wt.workflow_steps
       FROM raci_workflows w
       INNER JOIN raci_templates wt ON w.template_id = wt.id
       WHERE w.status NOT IN ('archived', 'cancelled')`
    );

    for (const workflow of workflows.rows) {
      const steps = workflow.workflow_steps || [];
      const currentStepIndex = steps.findIndex(
        (s: any) => s.step === workflow.current_step
      );

      if (currentStepIndex === -1) continue;

      const currentStep = steps[currentStepIndex];
      const slaDays = currentStep.sla_days;

      if (!slaDays) continue;

      // 計算已過天數
      const stepStartTime = new Date(workflow.updated_at);
      const now = new Date();
      const daysElapsed = Math.floor(
        (now.getTime() - stepStartTime.getTime()) / (1000 * 60 * 60 * 24)
      );

      // 檢查是否逾期
      if (daysElapsed > slaDays) {
        // 發送升級通知
        const escalationTargets = currentStep.escalation_targets || [];
        
        for (const target of escalationTargets) {
          // 查詢目標使用者的 email
          const userResult = await pool.query(
            'SELECT email, full_name FROM users WHERE id = $1',
            [target]
          );

          if (userResult.rows.length > 0) {
            await sendNotification({
              to: userResult.rows[0].email,
              subject: `工作流逾期升級通知：${workflow.template_name}`,
              message: `
                工作流 ${workflow.template_name} 在步驟「${currentStep.step_name}」已逾期 ${daysElapsed - slaDays} 天。
                
                工作流編號：${workflow.id}
                當前步驟：${currentStep.step_name}
                SLA 期限：${slaDays} 天
                已過天數：${daysElapsed} 天
                
                請盡快處理。
              `,
            });
          }
        }

        // 記錄升級事件
        await pool.query(
          `INSERT INTO audit_logs (
            user_id, action_type, resource_type, resource_id, details, created_at
          ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
          [
            null, // 系統自動觸發
            'workflow_escalation',
            'raci_workflow',
            workflow.id,
            JSON.stringify({
              step: workflow.current_step,
              days_elapsed: daysElapsed,
              sla_days: slaDays,
            }),
          ]
        );
      }
    }
  } catch (error) {
    console.error('Error checking workflow SLA:', error);
  }
};

// 發送會簽提醒
export const sendConsultationReminders = async () => {
  try {
    // 查詢所有需要會簽的工作流
    const workflows = await pool.query(
      `SELECT w.*, wt.name as template_name, wt.workflow_steps, wt.raci_matrix
       FROM raci_workflows w
       INNER JOIN raci_templates wt ON w.template_id = wt.id
       WHERE w.status = 'consultation' 
       AND w.current_step = 'Consultation'`
    );

    for (const workflow of workflows.rows) {
      const steps = workflow.workflow_steps || [];
      const currentStep = steps.find((s: any) => s.step === 'Consultation');
      
      if (!currentStep) continue;

      const raciMatrix = workflow.raci_matrix || {};
      const cUsers = raciMatrix.C || [];

      // 檢查哪些 C 使用者尚未會簽
      const consultationResult = await pool.query(
        `SELECT DISTINCT user_id FROM workflow_consultations 
         WHERE workflow_id = $1 AND status IS NOT NULL`,
        [workflow.id]
      );

      const completedUsers = consultationResult.rows.map((r) => r.user_id);
      const pendingUsers = cUsers.filter((uid: string) => !completedUsers.includes(uid));

      // 發送提醒給未完成的使用者
      for (const userId of pendingUsers) {
        const userResult = await pool.query(
          'SELECT email, full_name FROM users WHERE id = $1',
          [userId]
        );

        if (userResult.rows.length > 0) {
          await sendNotification({
            to: userResult.rows[0].email,
            subject: `會簽提醒：${workflow.template_name}`,
            message: `
             您有一個工作流需要會簽：
             
             工作流：${workflow.template_name}
             工作流編號：${workflow.id}
             
             請盡快完成會簽。
           `,
          });
        }
      }
    }
  } catch (error) {
    console.error('Error sending consultation reminders:', error);
  }
};

