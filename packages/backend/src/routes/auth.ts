import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { pool } from '../config/database';
import { getUserRoles } from '../services/rbac';
import { z } from 'zod';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

// 登入（簡化版，實際應整合 SSO）
router.post('/login', async (req, res) => {
  try {
    const validated = loginSchema.parse(req.body);
    const { username, password } = validated;

    // 查詢使用者
    const userResult = await pool.query(
      'SELECT * FROM users WHERE username = $1 OR email = $1',
      [username]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: '使用者名稱或密碼錯誤' });
    }

    const user = userResult.rows[0];

    // 驗證密碼（如果有密碼）
    if (user.password_hash) {
      const validPassword = await bcrypt.compare(password, user.password_hash);
      if (!validPassword) {
        return res.status(401).json({ error: '使用者名稱或密碼錯誤' });
      }
    }

    // 取得使用者角色
    const roles = await getUserRoles(user.id);
    const roleNames = roles.map((r) => r.roleName);

    // 產生 JWT token
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        roles: roleNames,
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.full_name,
        roles: roleNames,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: '驗證失敗', details: error.errors });
    }
    console.error('Error during login:', error);
    res.status(500).json({ error: '登入失敗' });
  }
});

// SSO 回調（簡化版，實際應整合真實 SSO）
router.post('/sso/callback', async (req, res) => {
  try {
    // 這裡應該驗證 SSO token 並取得使用者資訊
    // 目前簡化為直接查詢使用者
    const { sso_token } = req.body;

    // 驗證 SSO token（實際應呼叫 SSO 服務）
    // const ssoUser = await validateSSOToken(sso_token);

    // 查詢或建立使用者
    // const user = await findOrCreateUser(ssoUser);

    res.json({ message: 'SSO callback (not implemented)' });
  } catch (error) {
    console.error('Error during SSO callback:', error);
    res.status(500).json({ error: 'SSO 認證失敗' });
  }
});

// 取得當前使用者資訊
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: '未提供 token' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string;
      username: string;
    };

    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [
      decoded.id,
    ]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: '使用者不存在' });
    }

    const roles = await getUserRoles(decoded.id);

    res.json({
      user: {
        ...userResult.rows[0],
        roles: roles.map((r) => r.roleName),
      },
    });
  } catch (error) {
    res.status(401).json({ error: '無效的 token' });
  }
});

export default router;

