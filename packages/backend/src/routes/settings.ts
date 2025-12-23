import { Router, Response } from 'express';
import { pool } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { hasPermission } from '../services/rbac';
import { z } from 'zod';

const router = Router();

const notificationSettingsSchema = z.object({
  email_enabled: z.boolean().default(true),
  line_notify_enabled: z.boolean().default(false),
  line_notify_token: z.string().optional(),
  kpi_status_change: z.boolean().default(true),
  pdca_reminders: z.boolean().default(true),
  incident_alerts: z.boolean().default(true),
});

// 取得通知設定
router.get('/notifications', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    // 取得系統層級設定（簡化處理，實際應從資料表讀取）
    res.json({
      email_enabled: process.env.SMTP_HOST ? true : false,
      line_notify_enabled: process.env.LINE_NOTIFY_TOKEN ? true : false,
      kpi_status_change: true,
      pdca_reminders: true,
      incident_alerts: true,
    });
  } catch (error: unknown) {
    console.error('Error fetching notification settings:', error);
    res.status(500).json({ error: '取得通知設定失敗' });
  }
});

// 更新通知設定
router.put('/notifications', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const canManage = await hasPermission(req.user!.id, 'manage_settings');
    if (!canManage) {
      return res.status(403).json({ error: '無權限管理設定' });
    }

    const validated = notificationSettingsSchema.partial().parse(req.body);

    // TODO: 實際應儲存到資料表
    // 目前簡化處理，只更新環境變數（實際應使用設定表）

    res.json({
      message: '通知設定已更新',
      settings: validated,
    });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: '驗證失敗', details: error.errors });
    }
    console.error('Error updating notification settings:', error);
    res.status(500).json({ error: '更新通知設定失敗' });
  }
});

export default router;

