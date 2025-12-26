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
  position: z.string().optional(),
  password: z.string().min(6).optional(),
  line_id: z.string().optional(),
  phone: z.string().optional(),
  is_active: z.boolean().default(true),
  roles: z.array(z.string()).optional(),
});

const updateUserSchema = createUserSchema.partial();

// 取得使用者列表
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const canView = await hasPermission(req.user!.id, 'view_users');
    if (!canView) {
      return res.status(403).json({ error: '無權限查看使用者' });
    }

    const { department, role, is_active } = req.query;
    let query = `
      SELECT u.id, u.username, u.email, u.full_name, u.department, u.position,
             u.line_id, u.phone, u.is_active, u.created_at, u.updated_at,
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

    // 篩選啟用狀態
    if (is_active !== undefined) {
      query += ` AND u.is_active = $${paramIndex}`;
      params.push(is_active === 'true');
      paramIndex++;
    }

    query += ' GROUP BY u.id';

    if (role) {
      query += ` HAVING $${paramIndex} = ANY(ARRAY_AGG(r.name))`;
      params.push(role);
      paramIndex++;
    }

    query += ' ORDER BY u.is_active DESC, u.full_name ASC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error: unknown) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: '取得使用者列表失敗' });
  }
});

// 取得啟用的使用者列表（供下拉選單使用）
router.get('/active', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT id, username, full_name, department, position, email
      FROM users
      WHERE is_active = true
      ORDER BY full_name ASC
    `);
    res.json(result.rows);
  } catch (error: unknown) {
    console.error('Error fetching active users:', error);
    res.status(500).json({ error: '取得啟用使用者列表失敗' });
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
      `INSERT INTO users (username, email, full_name, department, position, password_hash, line_id, phone, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, username, email, full_name, department, position, line_id, phone, is_active, created_at`,
      [
        validated.username,
        validated.email,
        validated.full_name,
        validated.department || null,
        validated.position || null,
        passwordHash,
        validated.line_id || null,
        validated.phone || null,
        validated.is_active ?? true,
      ]
    );

    // 如果有指定角色，則指派角色
    if (validated.roles && validated.roles.length > 0) {
      const userId = result.rows[0].id;
      for (const roleName of validated.roles) {
        await pool.query(
          `INSERT INTO user_roles (user_id, role_id, scope_type, scope_value)
           SELECT $1, id, 'university', '*' FROM roles WHERE name = $2
           ON CONFLICT DO NOTHING`,
          [userId, roleName]
        );
      }
    }

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

    if (validated.position !== undefined) {
      updates.push(`position = $${paramIndex}`);
      params.push(validated.position);
      paramIndex++;
    }

    if (validated.line_id !== undefined) {
      updates.push(`line_id = $${paramIndex}`);
      params.push(validated.line_id);
      paramIndex++;
    }

    if (validated.phone !== undefined) {
      updates.push(`phone = $${paramIndex}`);
      params.push(validated.phone);
      paramIndex++;
    }

    if (validated.is_active !== undefined) {
      updates.push(`is_active = $${paramIndex}`);
      params.push(validated.is_active);
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
       RETURNING id, username, email, full_name, department, position, line_id, phone, is_active, updated_at`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '使用者不存在' });
    }

    // 更新角色（如果有指定）
    if (validated.roles !== undefined) {
      // 先刪除現有角色
      await pool.query('DELETE FROM user_roles WHERE user_id = $1', [id]);
      // 再新增新角色
      for (const roleName of validated.roles) {
        await pool.query(
          `INSERT INTO user_roles (user_id, role_id, scope_type, scope_value)
           SELECT $1, id, 'university', '*' FROM roles WHERE name = $2
           ON CONFLICT DO NOTHING`,
          [id, roleName]
        );
      }
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

// 切換使用者啟用狀態
router.put('/:id/toggle-active', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const canUpdate = await hasPermission(req.user!.id, 'update_users');
    if (!canUpdate) {
      return res.status(403).json({ error: '無權限更新使用者狀態' });
    }

    const result = await pool.query(
      `UPDATE users
       SET is_active = NOT is_active, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, username, full_name, is_active`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '使用者不存在' });
    }

    res.json(result.rows[0]);
  } catch (error: unknown) {
    console.error('Error toggling user active status:', error);
    res.status(500).json({ error: '切換使用者狀態失敗' });
  }
});

// 重設使用者密碼
router.put('/:id/reset-password', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    const canUpdate = await hasPermission(req.user!.id, 'update_users');
    if (!canUpdate) {
      return res.status(403).json({ error: '無權限重設密碼' });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({ error: '密碼長度至少需要6個字元' });
    }

    const bcrypt = await import('bcryptjs');
    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `UPDATE users
       SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, username, full_name`,
      [passwordHash, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '使用者不存在' });
    }

    res.json({ message: '密碼已重設', user: result.rows[0] });
  } catch (error: unknown) {
    console.error('Error resetting password:', error);
    res.status(500).json({ error: '重設密碼失敗' });
  }
});

// 取得單一使用者資料
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // 只能查看自己，或有查看權限
    if (id !== req.user!.id) {
      const canView = await hasPermission(req.user!.id, 'view_users');
      if (!canView) {
        return res.status(403).json({ error: '無權限查看此使用者' });
      }
    }

    const result = await pool.query(`
      SELECT u.id, u.username, u.email, u.full_name, u.department, u.position,
             u.line_id, u.phone, u.is_active, u.created_at, u.updated_at,
             ARRAY_AGG(DISTINCT r.name) FILTER (WHERE r.name IS NOT NULL) as roles
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      WHERE u.id = $1
      GROUP BY u.id
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '使用者不存在' });
    }

    res.json(result.rows[0]);
  } catch (error: unknown) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: '取得使用者資料失敗' });
  }
});

// 刪除使用者（軟刪除，設為停用）
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const canDelete = await hasPermission(req.user!.id, 'delete_users');
    if (!canDelete) {
      return res.status(403).json({ error: '無權限刪除使用者' });
    }

    // 軟刪除：設定為停用
    const result = await pool.query(
      `UPDATE users
       SET is_active = false, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, username, full_name, is_active`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '使用者不存在' });
    }

    res.json({ message: '使用者已停用', user: result.rows[0] });
  } catch (error: unknown) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: '刪除使用者失敗' });
  }
});

export default router;

