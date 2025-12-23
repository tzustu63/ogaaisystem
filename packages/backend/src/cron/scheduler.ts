import cron from 'node-cron';
import { checkPDCASchedule } from '../services/pdca-scheduler';

// 啟動所有排程任務
export const startSchedulers = () => {
  // 每天檢查 PDCA 排程
  cron.schedule('0 8 * * *', async () => {
    console.log('Checking PDCA schedule...');
    await checkPDCASchedule();
  });

  console.log('Cron schedulers started');
};

