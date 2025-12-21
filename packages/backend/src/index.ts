import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
// CORS 配置：允許前端來源
app.use(cors({
  origin: [
    'http://localhost:23000',  // MCP 前端
    'http://localhost:13000',  // 原有前端
    'http://localhost:3000',   // 開發環境
  ],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
import kpiRoutes from './routes/kpi';
import bscRoutes from './routes/bsc';
import initiativeRoutes from './routes/initiatives';
import okrRoutes from './routes/okr';
import taskRoutes from './routes/tasks';
import raciRoutes from './routes/raci';
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
import { startSchedulers } from './cron/scheduler';
import { initializeDefaultTemplates } from './services/raci-templates';
import { pool } from './config/database';
import { auditLog } from './middleware/audit';
import { connectRedis } from './config/redis';

app.use(auditLog);

// 連線 Redis
connectRedis().catch(console.error);

app.use('/api/auth', authRoutes);
app.use('/api/kpi', kpiRoutes);
app.use('/api/bsc', bscRoutes);
app.use('/api/initiatives', initiativeRoutes);
app.use('/api/okr', okrRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/raci', raciRoutes);
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

// 初始化預設 RACI 模板
initializeDefaultTemplates(pool).catch(console.error);

// 啟動排程任務
startSchedulers();

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

