import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { pool } from '../config/database';
import { getUserRoles } from '../services/rbac';
import { z } from 'zod';
import { getJwtSecret, getJwtExpiresIn } from '../config/jwt';
import { loginRateLimiter } from '../middleware/rate-limit';
import {
  AUTH_COOKIE_NAME,
  getAuthCookieOptions,
  getClearCookieOptions,
} from '../config/cookie';

const router = Router();

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

// 登入（簡化版，實際應整合 SSO）
router.post('/login', loginRateLimiter, async (req, res) => {
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

    // 檢查帳號是否啟用
    if (!user.is_active) {
      return res.status(401).json({ error: '帳號已被停用' });
    }

    // 安全性：必須有密碼才能登入（防止無密碼帳號被任意存取）
    if (!user.password_hash) {
      console.warn(`使用者 ${user.username} 嘗試登入但沒有設定密碼`);
      return res.status(401).json({ error: '帳號尚未設定密碼，請聯繫管理員' });
    }

    // 驗證密碼
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: '使用者名稱或密碼錯誤' });
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
      getJwtSecret(),
      { expiresIn: getJwtExpiresIn() }
    );

    // 設置 HttpOnly Cookie
    res.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions());

    // 同時返回 token（向後相容 localStorage 方案）
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.full_name,
        roles: roleNames,
        mustChangePassword: user.must_change_password || false,
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

// 登出
router.post('/logout', (req, res) => {
  res.clearCookie(AUTH_COOKIE_NAME, getClearCookieOptions());
  res.json({
    success: true,
    message: '已成功登出',
  });
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
    // 支援 Cookie 和 Bearer Token 雙重認證
    const cookieToken = req.cookies?.[AUTH_COOKIE_NAME];
    const bearerToken = req.headers.authorization?.replace('Bearer ', '');
    const token = cookieToken || bearerToken;

    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: '未提供 token',
        },
      });
    }

    const decoded = jwt.verify(token, getJwtSecret()) as {
      id: string;
      username: string;
    };

    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [
      decoded.id,
    ]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '使用者不存在',
        },
      });
    }

    const roles = await getUserRoles(decoded.id);

    res.json({
      success: true,
      user: {
        ...userResult.rows[0],
        roles: roles.map((r) => r.roleName),
      },
    });
  } catch (error) {
    res.clearCookie(AUTH_COOKIE_NAME, getClearCookieOptions());
    res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: '無效的 token',
      },
    });
  }
});

export default router;

