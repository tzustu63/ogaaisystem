import { Router } from 'express';
import { pool } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { hasPermission } from '../services/rbac';
import { z } from 'zod';

const router = Router();

const createRoleSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  permissions: z.record(z.any()),
});

const assignRoleSchema = z.object({
  user_id: z.string().uuid(),
  role_id: z.string().uuid(),
  scope_type: z.enum(['university', 'college', 'department', 'project', 'student_group']),
  scope_value: z.string().optional(),
});

// 取得所有角色
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    // 檢查權限
    const canView = await hasPermission(req.user!.id, 'view_roles');
    if (!canView) {
      return res.status(403).json({ error: '無權限查看角色' });
    }

    const result = await pool.query(
      'SELECT * FROM roles ORDER BY name'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({ error: '取得角色列表失敗' });
  }
});

// 建立角色
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    // 檢查權限
    const canCreate = await hasPermission(req.user!.id, 'create_roles');
    if (!canCreate) {
      return res.status(403).json({ error: '無權限建立角色' });
    }

    const validated = createRoleSchema.parse(req.body);
    const result = await pool.query(
      `INSERT INTO roles (name, description, permissions)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [
        validated.name,
        validated.description || null,
        JSON.stringify(validated.permissions),
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: '驗證失敗', details: error.errors });
    }
    console.error('Error creating role:', error);
    res.status(500).json({ error: '建立角色失敗' });
  }
});

// 指派角色給使用者
router.post('/assign', authenticate, async (req: AuthRequest, res) => {
  try {
    // 檢查權限
    const canAssign = await hasPermission(req.user!.id, 'assign_roles');
    if (!canAssign) {
      return res.status(403).json({ error: '無權限指派角色' });
    }

    const validated = assignRoleSchema.parse(req.body);

    // 檢查是否已存在
    const existing = await pool.query(
      'SELECT id FROM user_roles WHERE user_id = $1 AND role_id = $2',
      [validated.user_id, validated.role_id]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: '角色已指派' });
    }

    const result = await pool.query(
      `INSERT INTO user_roles (user_id, role_id, scope_type, scope_value)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [
        validated.user_id,
        validated.role_id,
        validated.scope_type,
        validated.scope_value || null,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: '驗證失敗', details: error.errors });
    }
    console.error('Error assigning role:', error);
    res.status(500).json({ error: '指派角色失敗' });
  }
});

// 取得使用者的角色
router.get('/user/:userId', authenticate, async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params;

    // 檢查權限（只能查看自己的角色，或是有 view_users 權限）
    if (userId !== req.user!.id) {
      const canView = await hasPermission(req.user!.id, 'view_users');
      if (!canView) {
        return res.status(403).json({ error: '無權限查看其他使用者的角色' });
      }
    }

    const result = await pool.query(
      `SELECT r.*, ur.scope_type, ur.scope_value
       FROM user_roles ur
       INNER JOIN roles r ON ur.role_id = r.id
       WHERE ur.user_id = $1`,
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching user roles:', error);
    res.status(500).json({ error: '取得使用者角色失敗' });
  }
});

export default router;

