import { Router, Response } from 'express';
import { pool } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { hasPermission } from '../services/rbac';
import { z } from 'zod';

const router = Router();

const createUserSchema = z.object({
  username: z.string().min(1),
  email: z.string().email(),
  full_name: z.string().min(1),
  department: z.string().optional(),
  password: z.string().min(6).optional(),
});

const updateUserSchema = createUserSchema.partial();

// 取得使用者列表
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const canView = await hasPermission(req.user!.id, 'view_users');
    if (!canView) {
      return res.status(403).json({ error: '無權限查看使用者' });
    }

    const { department, role } = req.query;
    let query = `
      SELECT u.*, 
             ARRAY_AGG(DISTINCT r.name) FILTER (WHERE r.name IS NOT NULL) as roles
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (department) {
      query += ` AND u.department = $${paramIndex}`;
      params.push(department);
      paramIndex++;
    }

    query += ' GROUP BY u.id';

    if (role) {
      query += ` HAVING $${paramIndex} = ANY(ARRAY_AGG(r.name))`;
      params.push(role);
      paramIndex++;
    }

    query += ' ORDER BY u.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error: unknown) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: '取得使用者列表失敗' });
  }
});

// 建立使用者
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const canCreate = await hasPermission(req.user!.id, 'create_users');
    if (!canCreate) {
      return res.status(403).json({ error: '無權限建立使用者' });
    }

    const validated = createUserSchema.parse(req.body);
    const bcrypt = await import('bcryptjs');

    const passwordHash = validated.password
      ? await bcrypt.hash(validated.password, 10)
      : null;

    const result = await pool.query(
      `INSERT INTO users (username, email, full_name, department, password_hash)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, username, email, full_name, department, created_at`,
      [
        validated.username,
        validated.email,
        validated.full_name,
        validated.department || null,
        passwordHash,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: '驗證失敗', details: error.errors });
    }
    console.error('Error creating user:', error);
    res.status(500).json({ error: '建立使用者失敗' });
  }
});

// 更新使用者
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // 只能更新自己，或有管理權限
    if (id !== req.user!.id) {
      const canUpdate = await hasPermission(req.user!.id, 'update_users');
      if (!canUpdate) {
        return res.status(403).json({ error: '無權限更新此使用者' });
      }
    }

    const validated = updateUserSchema.parse(req.body);
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (validated.username) {
      updates.push(`username = $${paramIndex}`);
      params.push(validated.username);
      paramIndex++;
    }

    if (validated.email) {
      updates.push(`email = $${paramIndex}`);
      params.push(validated.email);
      paramIndex++;
    }

    if (validated.full_name) {
      updates.push(`full_name = $${paramIndex}`);
      params.push(validated.full_name);
      paramIndex++;
    }

    if (validated.department !== undefined) {
      updates.push(`department = $${paramIndex}`);
      params.push(validated.department);
      paramIndex++;
    }

    if (validated.password) {
      const bcrypt = await import('bcryptjs');
      const passwordHash = await bcrypt.hash(validated.password, 10);
      updates.push(`password_hash = $${paramIndex}`);
      params.push(passwordHash);
      paramIndex++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: '沒有要更新的欄位' });
    }

    params.push(id);
    const result = await pool.query(
      `UPDATE users 
       SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramIndex}
       RETURNING id, username, email, full_name, department, updated_at`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '使用者不存在' });
    }

    res.json(result.rows[0]);
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: '驗證失敗', details: error.errors });
    }
    console.error('Error updating user:', error);
    res.status(500).json({ error: '更新使用者失敗' });
  }
});

export default router;

