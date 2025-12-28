import { Router, Response } from 'express';
import { pool } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { hasPermission } from '../services/rbac';
import { z } from 'zod';

const router = Router();

const notificationSettingsSchema = z.object({
  email_enabled: z.boolean().default(true),
  line_notify_enabled: z.boolean().default(false),
  line_notify_token: z.string().nullable().optional(),
  kpi_status_change: z.boolean().default(true),
  pdca_reminders: z.boolean().default(true),
  incident_alerts: z.boolean().default(true),
});

// 預設設定值
const DEFAULT_SETTINGS = {
  email_enabled: false,
  line_notify_enabled: false,
  line_notify_token: null,
  kpi_status_change: true,
  pdca_reminders: true,
  incident_alerts: true,
};

// 取得通知設定
router.get(
  '/notifications',
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      // 從資料庫讀取設定
      const result = await pool.query(
        `SELECT setting_value FROM notification_settings WHERE setting_key = 'global'`
      );

      if (result.rows.length === 0) {
        // 返回預設值（合併環境變數狀態）
        return res.json({
          success: true,
          data: {
            ...DEFAULT_SETTINGS,
            email_enabled: !!process.env.SMTP_HOST,
            line_notify_enabled: !!process.env.LINE_NOTIFY_TOKEN,
          },
        });
      }

      const settings = result.rows[0].setting_value;

      // 合併環境變數狀態（環境變數優先）
      res.json({
        success: true,
        data: {
          ...settings,
          // 如果環境變數未設定，則強制禁用
          email_enabled: settings.email_enabled && !!process.env.SMTP_HOST,
          line_notify_enabled:
            settings.line_notify_enabled && !!process.env.LINE_NOTIFY_TOKEN,
        },
      });
    } catch (error: unknown) {
      console.error('Error fetching notification settings:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: '取得通知設定失敗',
        },
      });
    }
  }
);

// 更新通知設定
router.put(
  '/notifications',
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const canManage = await hasPermission(req.user!.id, 'manage_settings');
      if (!canManage) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'AUTHORIZATION_ERROR',
            message: '無權限管理設定',
          },
        });
      }

      const validated = notificationSettingsSchema.partial().parse(req.body);

      // 儲存到資料庫（使用 UPSERT）
      const result = await pool.query(
        `INSERT INTO notification_settings (setting_key, setting_value, updated_by)
       VALUES ('global', $1, $2)
       ON CONFLICT (setting_key) DO UPDATE SET
         setting_value = notification_settings.setting_value || $1,
         updated_by = $2,
         updated_at = CURRENT_TIMESTAMP
       RETURNING setting_value`,
        [JSON.stringify(validated), req.user!.id]
      );

      res.json({
        success: true,
        message: '通知設定已更新',
        data: result.rows[0].setting_value,
      });
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '驗證失敗',
            details: error.errors,
          },
        });
      }
      console.error('Error updating notification settings:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: '更新通知設定失敗',
        },
      });
    }
  }
);

// 重設通知設定為預設值
router.post(
  '/notifications/reset',
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const canManage = await hasPermission(req.user!.id, 'manage_settings');
      if (!canManage) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'AUTHORIZATION_ERROR',
            message: '無權限管理設定',
          },
        });
      }

      // 重設為預設值
      const result = await pool.query(
        `UPDATE notification_settings
       SET setting_value = $1,
           updated_by = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE setting_key = 'global'
       RETURNING setting_value`,
        [JSON.stringify(DEFAULT_SETTINGS), req.user!.id]
      );

      res.json({
        success: true,
        message: '通知設定已重設為預設值',
        data: result.rows[0]?.setting_value || DEFAULT_SETTINGS,
      });
    } catch (error: unknown) {
      console.error('Error resetting notification settings:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: '重設通知設定失敗',
        },
      });
    }
  }
);

export default router;
