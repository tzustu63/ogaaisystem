import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

// 載入環境變數（必須在其他 imports 之前）
dotenv.config();

// 驗證環境變數
import { validateEnv, getConfig } from './config/env-validator';
validateEnv();

// 錯誤處理中間件
import { errorHandler, notFoundHandler } from './middleware/error-handler';
// 速率限制中間件
import { globalRateLimiter } from './middleware/rate-limit';

const app = express();
const config = getConfig();
const PORT = config.PORT;

// Middleware
app.use(helmet());

// 全局速率限制
app.use(globalRateLimiter);

// CORS 配置：允許前端來源
const allowedOrigins = [
  'http://localhost:23000',     // MCP 前端
  'http://localhost:13000',     // 本機前端
  'http://localhost:3000',      // 開發環境
  'http://18.181.71.46:13000',  // Lightsail 生產環境 (IP)
  'https://oga.harvestwize.com', // 生產環境域名 (HTTPS)
  'http://oga.harvestwize.com',  // 生產環境域名 (HTTP)
];

// 支援環境變數覆蓋
if (process.env.CORS_ORIGINS) {
  const envOrigins = process.env.CORS_ORIGINS.split(',').map(o => o.trim());
  allowedOrigins.push(...envOrigins);
}

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));

// Cookie 解析（支援 HttpOnly Cookie 認證）
app.use(cookieParser());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
import kpiRoutes from './routes/kpi';
import initiativeRoutes from './routes/initiatives';
import okrRoutes from './routes/okr';
import taskRoutes from './routes/tasks';
import incidentRoutes from './routes/incidents';
import pdcaRoutes from './routes/pdca';
import dataImportRoutes from './routes/data-import';
import exportRoutes from './routes/export';
import roleRoutes from './routes/roles';
import auditRoutes from './routes/audit';
import traceRoutes from './routes/trace';
import gdprRoutes from './routes/gdpr';
import integrationRoutes from './routes/integrations';
import dataQualityRoutes from './routes/data-quality';
import userRoutes from './routes/users';
import settingsRoutes from './routes/settings';
import authRoutes from './routes/auth';
import uploadRoutes from './routes/upload';
import systemOptionsRoutes from './routes/system-options';
import chatRoutes from './routes/chat';
import aiSettingsRoutes from './routes/ai-settings';
import { startSchedulers } from './cron/scheduler';
import { pool } from './config/database';
import { auditLog } from './middleware/audit';
import { connectRedis } from './config/redis';

app.use(auditLog);

// 連線 Redis
connectRedis().catch(console.error);

app.use('/api/auth', authRoutes);
app.use('/api/kpi', kpiRoutes);
app.use('/api/initiatives', initiativeRoutes);
app.use('/api/okr', okrRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/pdca', pdcaRoutes);
app.use('/api/data-import', dataImportRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/trace', traceRoutes);
app.use('/api/gdpr', gdprRoutes);
app.use('/api/integrations', integrationRoutes);
app.use('/api/data-quality', dataQualityRoutes);
app.use('/api/users', userRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/system-options', systemOptionsRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/ai-settings', aiSettingsRoutes);


// 啟動排程任務
startSchedulers();

// 404 處理（放在所有路由之後）
app.use(notFoundHandler);

// 全局錯誤處理（必須放在最後）
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

