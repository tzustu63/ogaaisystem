import { pool } from '../config/database';
import { sendNotification } from './notification';

// PDCA 自動回報排程檢查
export const checkPDCASchedule = async () => {
  try {
    // 查詢所有需要檢核的 PDCA 循環
    const cycles = await pool.query(
      `SELECT pc.*, u.email, u.full_name as responsible_name
       FROM pdca_cycles pc
       LEFT JOIN users u ON pc.responsible_user_id = u.id
       WHERE pc.status = 'active'`
    );

    for (const cycle of cycles.rows) {
      const frequency = cycle.check_frequency; // 'weekly', 'monthly', 'quarterly'
      
      // 取得最後一次檢核時間
      const lastCheckResult = await pool.query(
        `SELECT check_date FROM pdca_checks 
         WHERE pdca_cycle_id = $1 
         ORDER BY check_date DESC 
         LIMIT 1`,
        [cycle.id]
      );

      let shouldNotify = false;
      let daysOverdue = 0;

      if (lastCheckResult.rows.length === 0) {
        // 從未檢核過，檢查是否已超過一個週期
        const cycleStart = new Date(cycle.created_at);
        const now = new Date();
        const daysSinceStart = Math.floor(
          (now.getTime() - cycleStart.getTime()) / (1000 * 60 * 60 * 24)
        );

        const frequencyDays: Record<string, number> = {
          weekly: 7,
          monthly: 30,
          quarterly: 90,
        };

        if (daysSinceStart >= frequencyDays[frequency]) {
          shouldNotify = true;
          daysOverdue = daysSinceStart - frequencyDays[frequency];
        }
      } else {
        // 有檢核記錄，檢查是否超過週期
        const lastCheckDate = new Date(lastCheckResult.rows[0].check_date);
        const now = new Date();
        const daysSinceLastCheck = Math.floor(
          (now.getTime() - lastCheckDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        const frequencyDays: Record<string, number> = {
          weekly: 7,
          monthly: 30,
          quarterly: 90,
        };

        if (daysSinceLastCheck >= frequencyDays[frequency]) {
          shouldNotify = true;
          daysOverdue = daysSinceLastCheck - frequencyDays[frequency];
        }
      }

      if (shouldNotify && cycle.responsible_user_id && cycle.email) {
        // 發送檢核提醒
        await sendNotification({
          to: cycle.email,
          subject: `PDCA 檢核提醒：${cycle.cycle_name}`,
          message: `
            您的 PDCA 循環需要進行檢核：
            
            循環名稱：${cycle.cycle_name}
            檢核頻率：${frequency}
            ${daysOverdue > 0 ? `已逾期：${daysOverdue} 天` : ''}
            
            請盡快完成檢核。
          `,
        });

        // 如果逾期超過一定天數，發送升級通知
        if (daysOverdue > 7) {
          // 查詢上級主管
          const supervisorResult = await pool.query(
            `SELECT u.email, u.full_name 
             FROM users u
             INNER JOIN user_roles ur ON u.id = ur.user_id
             INNER JOIN roles r ON ur.role_id = r.id
             WHERE r.name IN ('director', 'vice_president')
             LIMIT 1`
          );

          if (supervisorResult.rows.length > 0) {
            await sendNotification({
              to: supervisorResult.rows[0].email,
              subject: `PDCA 檢核逾期升級：${cycle.cycle_name}`,
              message: `
                PDCA 循環 ${cycle.cycle_name} 已逾期 ${daysOverdue} 天未檢核。
                
                負責人：${cycle.responsible_name}
                請督促盡快完成檢核。
              `,
            });
          }
        }
      }
    }
  } catch (error) {
    console.error('Error checking PDCA schedule:', error);
  }
};

