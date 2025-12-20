import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Email 設定
const emailTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

// Line Notify Token（可從環境變數或資料庫取得）
const LINE_NOTIFY_TOKEN = process.env.LINE_NOTIFY_TOKEN;

export interface NotificationOptions {
  to: string | string[];
  subject?: string;
  message: string;
  type?: 'email' | 'line' | 'both';
}

// 發送 Email
export const sendEmail = async (
  to: string | string[],
  subject: string,
  html: string
): Promise<void> => {
  try {
    const recipients = Array.isArray(to) ? to.join(', ') : to;
    await emailTransporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: recipients,
      subject,
      html,
    });
    console.log(`✅ Email sent to ${recipients}`);
  } catch (error) {
    console.error('❌ Error sending email:', error);
    throw error;
  }
};

// 發送 Line Notify
export const sendLineNotify = async (message: string): Promise<void> => {
  if (!LINE_NOTIFY_TOKEN) {
    console.warn('⚠️ LINE_NOTIFY_TOKEN not configured');
    return;
  }

  try {
    const response = await fetch('https://notify-api.line.me/api/notify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Bearer ${LINE_NOTIFY_TOKEN}`,
      },
      body: new URLSearchParams({ message }),
    });

    if (!response.ok) {
      throw new Error(`Line Notify API error: ${response.statusText}`);
    }

    console.log('✅ Line Notify sent');
  } catch (error) {
    console.error('❌ Error sending Line Notify:', error);
    throw error;
  }
};

// 統一通知介面
export const sendNotification = async (
  options: NotificationOptions
): Promise<void> => {
  const { to, subject, message, type = 'email' } = options;

  const promises: Promise<void>[] = [];

  if (type === 'email' || type === 'both') {
    promises.push(sendEmail(to, subject || '系統通知', message));
  }

  if (type === 'line' || type === 'both') {
    promises.push(sendLineNotify(message));
  }

  await Promise.allSettled(promises);
};

// KPI 燈號變更通知
export const notifyKPIStatusChange = async (
  kpiName: string,
  oldStatus: string,
  newStatus: string,
  recipientEmail: string
): Promise<void> => {
  const message = `
    <h2>KPI 狀態變更通知</h2>
    <p><strong>KPI 名稱：</strong>${kpiName}</p>
    <p><strong>變更前：</strong>${oldStatus}</p>
    <p><strong>變更後：</strong>${newStatus}</p>
    <p>請登入系統查看詳細資訊。</p>
  `;

  await sendEmail(recipientEmail, `KPI 狀態變更：${kpiName}`, message);
};

// 工作流通知
export const notifyWorkflowAction = async (
  workflowName: string,
  action: string,
  recipientEmail: string,
  message?: string
): Promise<void> => {
  const emailMessage = `
    <h2>工作流通知</h2>
    <p><strong>工作流：</strong>${workflowName}</p>
    <p><strong>動作：</strong>${action}</p>
    ${message ? `<p>${message}</p>` : ''}
    <p>請登入系統處理。</p>
  `;

  await sendEmail(recipientEmail, `工作流通知：${workflowName}`, emailMessage);
};

