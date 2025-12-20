import { Router } from 'express';
import { pool } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import multer from 'multer';
import * as XLSX from 'xlsx';
import { z } from 'zod';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

// 上傳並解析檔案
router.post('/upload', authenticate, upload.single('file'), async (req: AuthRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '未提供檔案' });
    }

    const fileBuffer = req.file.buffer;
    const fileName = req.file.originalname;
    const fileExtension = fileName.split('.').pop()?.toLowerCase();

    let data: any[] = [];

    if (fileExtension === 'csv') {
      // 解析 CSV（簡化版，實際應使用 csv-parser）
      const text = fileBuffer.toString('utf-8');
      const lines = text.split('\n');
      const headers = lines[0].split(',').map((h) => h.trim());
      data = lines.slice(1).map((line) => {
        const values = line.split(',');
        const row: any = {};
        headers.forEach((header, index) => {
          row[header] = values[index]?.trim();
        });
        return row;
      });
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      // 解析 Excel
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      data = XLSX.utils.sheet_to_json(worksheet);
    } else {
      return res.status(400).json({ error: '不支援的檔案格式' });
    }

    // 返回預覽（前 10 筆）
    res.json({
      success: true,
      totalRows: data.length,
      preview: data.slice(0, 10),
      headers: Object.keys(data[0] || {}),
    });
  } catch (error) {
    console.error('Error parsing file:', error);
    res.status(500).json({ error: '解析檔案失敗' });
  }
});

// 欄位映射與驗證
const importDataSchema = z.object({
  target_table: z.string().min(1),
  field_mapping: z.record(z.string()),
  data: z.array(z.record(z.any())),
  validation_rules: z.record(z.any()).optional(),
});

// 匯入資料
router.post('/import', authenticate, async (req: AuthRequest, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const validated = importDataSchema.parse(req.body);

    const { target_table, field_mapping, data, validation_rules } = validated;

    // 驗證資料
    const errors: any[] = [];
    const validatedData: any[] = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const mappedRow: any = {};

      // 映射欄位
      for (const [targetField, sourceField] of Object.entries(field_mapping)) {
        mappedRow[targetField] = row[sourceField];
      }

      // 驗證規則（簡化版）
      if (validation_rules) {
        for (const [field, rules] of Object.entries(validation_rules)) {
          const value = mappedRow[field];

          if (rules.required && !value) {
            errors.push({
              row: i + 1,
              field,
              error: '必填欄位',
            });
            continue;
          }

          if (rules.type === 'number' && isNaN(parseFloat(value))) {
            errors.push({
              row: i + 1,
              field,
              error: '必須為數字',
            });
            continue;
          }

          if (rules.min && parseFloat(value) < rules.min) {
            errors.push({
              row: i + 1,
              field,
              error: `必須大於等於 ${rules.min}`,
            });
            continue;
          }
        }
      }

      if (errors.filter((e) => e.row === i + 1).length === 0) {
        validatedData.push(mappedRow);
      }
    }

    if (errors.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: '資料驗證失敗',
        errors,
        validRows: validatedData.length,
        totalRows: data.length,
      });
    }

    // 插入資料（簡化版，實際應根據 target_table 動態建立 SQL）
    // 這裡假設是匯入到 kpi_values 表
    let successRows = 0;
    for (const row of validatedData) {
      try {
        // 動態建立 INSERT 語句
        const fields = Object.keys(row);
        const values = Object.values(row);
        const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');

        await client.query(
          `INSERT INTO ${target_table} (${fields.join(', ')}) 
           VALUES (${placeholders})
           ON CONFLICT DO NOTHING`,
          values
        );
        successRows++;
      } catch (err) {
        errors.push({
          row: validatedData.indexOf(row) + 1,
          error: (err as Error).message,
        });
      }
    }

    // 記錄匯入歷史
    await client.query(
      `INSERT INTO data_imports (
        import_type, target_table, file_name, field_mapping,
        total_rows, success_rows, error_rows, errors, imported_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        'file',
        target_table,
        req.body.file_name || 'import',
        JSON.stringify(field_mapping),
        data.length,
        successRows,
        errors.length,
        JSON.stringify(errors),
        req.user?.id,
      ]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      totalRows: data.length,
      successRows,
      errorRows: errors.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: '驗證失敗', details: error.errors });
    }
    console.error('Error importing data:', error);
    res.status(500).json({ error: '匯入資料失敗' });
  } finally {
    client.release();
  }
});

// 取得匯入歷史
router.get('/history', authenticate, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `SELECT di.*, u.full_name as imported_by_name
       FROM data_imports di
       LEFT JOIN users u ON di.imported_by = u.id
       ORDER BY di.created_at DESC
       LIMIT 50`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching import history:', error);
    res.status(500).json({ error: '取得匯入歷史失敗' });
  }
});

export default router;

