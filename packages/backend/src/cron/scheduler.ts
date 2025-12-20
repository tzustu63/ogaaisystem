import cron from 'node-cron';
import { checkWorkflowSLA, sendConsultationReminders } from '../services/workflow-automation';
import { checkPDCASchedule } from '../services/pdca-scheduler';

// 啟動所有排程任務
export const startSchedulers = () => {
  // 每小時檢查工作流 SLA
  cron.schedule('0 * * * *', async () => {
    console.log('Checking workflow SLA...');
    await checkWorkflowSLA();
  });

  // 每天上午 9 點發送會簽提醒
  cron.schedule('0 9 * * *', async () => {
    console.log('Sending consultation reminders...');
    await sendConsultationReminders();
  });

  // 每天檢查 PDCA 排程
  cron.schedule('0 8 * * *', async () => {
    console.log('Checking PDCA schedule...');
    await checkPDCASchedule();
  });

  console.log('Cron schedulers started');
};

