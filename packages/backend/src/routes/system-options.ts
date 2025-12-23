import { Router, Request, Response } from 'express';
import { pool } from '../config/database';
import { z } from 'zod';

const router = Router();

// 驗證 schema
const optionSchema = z.object({
  value: z.string().min(1),
  label: z.string().min(1),
  description: z.string().optional(),
  is_active: z.boolean().optional().default(true),
  sort_order: z.number().optional().default(0),
});

const categorySchema = z.enum([
  'initiative_type',
  'department',
  'person',
  'funding_source',
  'indicator',
  'academic_year',
]);

// 取得所有類別的選項
router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT * FROM system_options 
       WHERE is_active = true 
       ORDER BY category, sort_order, label`
    );
    
    // 按類別分組
    const grouped: Record<string, any[]> = {};
    result.rows.forEach((row) => {
      if (!grouped[row.category]) {
        grouped[row.category] = [];
      }
      grouped[row.category].push(row);
    });
    
    res.json(grouped);
  } catch (error) {
    console.error('Error fetching system options:', error);
    res.status(500).json({ error: 'Failed to fetch system options' });
  }
});

// 取得特定類別的選項
router.get('/category/:category', async (req: Request, res: Response) => {
  try {
    const { category } = req.params;
    const { includeInactive } = req.query;
    
    let query = 'SELECT * FROM system_options WHERE category = $1';
    if (!includeInactive) {
      query += ' AND is_active = true';
    }
    query += ' ORDER BY sort_order, label';
    
    const result = await pool.query(query, [category]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching options by category:', error);
    res.status(500).json({ error: 'Failed to fetch options' });
  }
});

// 新增選項
router.post('/category/:category', async (req: Request, res: Response) => {
  try {
    const { category } = req.params;
    
    // 驗證類別
    const categoryResult = categorySchema.safeParse(category);
    if (!categoryResult.success) {
      return res.status(400).json({ error: 'Invalid category' });
    }
    
    // 驗證輸入
    const validatedData = optionSchema.parse(req.body);
    
    const result = await pool.query(
      `INSERT INTO system_options (category, value, label, description, is_active, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        category,
        validatedData.value,
        validatedData.label,
        validatedData.description || null,
        validatedData.is_active,
        validatedData.sort_order,
      ]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Error creating option:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: '此選項值已存在' });
    }
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: 'Failed to create option' });
  }
});

// 更新選項
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    // 處理 description：將空字串轉為 undefined，以便通過驗證
    const body = { ...req.body };
    if (body.description === '') {
      body.description = undefined;
    }
    const validatedData = optionSchema.partial().parse(body);
    
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
    
    if (validatedData.value !== undefined) {
      updates.push(`value = $${paramIndex++}`);
      values.push(validatedData.value);
    }
    if (validatedData.label !== undefined) {
      updates.push(`label = $${paramIndex++}`);
      values.push(validatedData.label);
    }
    if (validatedData.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(validatedData.description || null);
    }
    if (validatedData.is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(validatedData.is_active);
    }
    if (validatedData.sort_order !== undefined) {
      updates.push(`sort_order = $${paramIndex++}`);
      values.push(validatedData.sort_order);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    values.push(id);
    
    const result = await pool.query(
      `UPDATE system_options SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Option not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error updating option:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: 'Failed to update option' });
  }
});

// 刪除選項（軟刪除）
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { permanent } = req.query;
    
    if (permanent === 'true') {
      // 永久刪除
      const result = await pool.query(
        'DELETE FROM system_options WHERE id = $1 RETURNING *',
        [id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Option not found' });
      }
      res.json({ message: 'Option permanently deleted', option: result.rows[0] });
    } else {
      // 軟刪除（設為非活躍）
      const result = await pool.query(
        'UPDATE system_options SET is_active = false WHERE id = $1 RETURNING *',
        [id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Option not found' });
      }
      res.json({ message: 'Option deactivated', option: result.rows[0] });
    }
  } catch (error) {
    console.error('Error deleting option:', error);
    res.status(500).json({ error: 'Failed to delete option' });
  }
});

// 批量更新排序
router.post('/reorder', async (req: Request, res: Response) => {
  try {
    const { items } = req.body;
    
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'items must be an array' });
    }
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      for (const item of items) {
        await client.query(
          'UPDATE system_options SET sort_order = $1 WHERE id = $2',
          [item.sort_order, item.id]
        );
      }
      
      await client.query('COMMIT');
      res.json({ message: 'Reorder successful' });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error reordering options:', error);
    res.status(500).json({ error: 'Failed to reorder options' });
  }
});

// 取得下一個專案編號
router.get('/next-initiative-id', async (req: Request, res: Response) => {
  try {
    // 查詢現有最大編號
    const result = await pool.query(
      `SELECT initiative_id FROM initiatives 
       WHERE initiative_id LIKE 'INIT-%' 
       ORDER BY initiative_id DESC LIMIT 1`
    );
    
    let nextNumber = 1;
    if (result.rows.length > 0) {
      const lastId = result.rows[0].initiative_id;
      const match = lastId.match(/INIT-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }
    
    const nextId = `INIT-${String(nextNumber).padStart(3, '0')}`;
    
    // 確認這個 ID 不存在
    const checkResult = await pool.query(
      'SELECT 1 FROM initiatives WHERE initiative_id = $1',
      [nextId]
    );
    
    if (checkResult.rows.length > 0) {
      // 如果存在，遞增查找
      let found = false;
      while (!found) {
        nextNumber++;
        const tryId = `INIT-${String(nextNumber).padStart(3, '0')}`;
        const tryResult = await pool.query(
          'SELECT 1 FROM initiatives WHERE initiative_id = $1',
          [tryId]
        );
        if (tryResult.rows.length === 0) {
          found = true;
          return res.json({ next_id: tryId });
        }
      }
    }
    
    res.json({ next_id: nextId });
  } catch (error) {
    console.error('Error getting next initiative ID:', error);
    res.status(500).json({ error: 'Failed to get next initiative ID' });
  }
});

// 檢查專案編號是否存在
router.get('/check-initiative-id/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT 1 FROM initiatives WHERE initiative_id = $1',
      [id]
    );
    res.json({ exists: result.rows.length > 0 });
  } catch (error) {
    console.error('Error checking initiative ID:', error);
    res.status(500).json({ error: 'Failed to check initiative ID' });
  }
});

export default router;
