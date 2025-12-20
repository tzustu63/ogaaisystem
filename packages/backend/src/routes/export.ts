import { Router } from 'express';
import { pool } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { exportData } from '../services/export-control';
import { z } from 'zod';

const router = Router();

const exportSchema = z.object({
  resource_type: z.string().min(1),
  resource_ids: z.array(z.string().uuid()).optional(),
  fields: z.array(z.string()).optional(),
  filters: z.record(z.any()).optional(),
});

// 匯出資料
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const validated = exportSchema.parse(req.body);
    const userId = req.user!.id;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] as string;

    const { resource_type, resource_ids, fields, filters } = validated;

    // 根據 resource_type 查詢資料
    let query = '';
    const params: any[] = [];
    let paramIndex = 1;

    switch (resource_type) {
      case 'incidents':
        query = 'SELECT * FROM incidents WHERE 1=1';
        if (resource_ids && resource_ids.length > 0) {
          query += ` AND id = ANY($${paramIndex})`;
          params.push(resource_ids);
          paramIndex++;
        }
        if (filters?.status) {
          query += ` AND status = $${paramIndex}`;
          params.push(filters.status);
          paramIndex++;
        }
        break;

      case 'kpis':
        query = 'SELECT * FROM kpi_registry WHERE 1=1';
        if (resource_ids && resource_ids.length > 0) {
          query += ` AND id = ANY($${paramIndex})`;
          params.push(resource_ids);
          paramIndex++;
        }
        break;

      case 'initiatives':
        query = 'SELECT * FROM initiatives WHERE 1=1';
        if (resource_ids && resource_ids.length > 0) {
          query += ` AND id = ANY($${paramIndex})`;
          params.push(resource_ids);
          paramIndex++;
        }
        break;

      case 'tasks':
        query = 'SELECT * FROM tasks WHERE 1=1';
        if (resource_ids && resource_ids.length > 0) {
          query += ` AND id = ANY($${paramIndex})`;
          params.push(resource_ids);
          paramIndex++;
        }
        break;

      default:
        return res.status(400).json({ error: '不支援的資源類型' });
    }

    query += ' ORDER BY created_at DESC LIMIT 1000'; // 限制最多匯出1000筆

    const result = await pool.query(query, params);
    const rawData = result.rows;

    // 使用匯出控管服務
    const exportResult = await exportData(
      userId,
      resource_type,
      rawData,
      fields,
      ipAddress
    );

    res.json({
      data: exportResult.data,
      excludedFields: exportResult.excludedFields,
      message: exportResult.excludedFields.length > 0
        ? `已排除 ${exportResult.excludedFields.length} 個禁止匯出的欄位`
        : '匯出成功',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: '驗證失敗', details: error.errors });
    }
    if (error instanceof Error && error.message === '無匯出權限') {
      return res.status(403).json({ error: error.message });
    }
    console.error('Error exporting data:', error);
    res.status(500).json({ error: '匯出資料失敗' });
  }
});

export default router;

