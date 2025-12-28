import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../config/jwt';
import { AUTH_COOKIE_NAME } from '../config/cookie';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    roles: string[];
  };
}

/**
 * 從請求中提取 token
 * 支援 HttpOnly Cookie 和 Authorization header 雙重認證
 * 優先從 Cookie 讀取（更安全）
 */
const extractToken = (req: Request): string | null => {
  // 優先從 HttpOnly Cookie 讀取
  const cookieToken = req.cookies?.[AUTH_COOKIE_NAME];
  if (cookieToken) {
    return cookieToken;
  }

  // 向後相容：從 Authorization header 讀取
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return null;
};

export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'AUTHENTICATION_ERROR',
        message: '未提供認證 token',
      },
    });
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret()) as {
      id: string;
      username: string;
      roles: string[];
    };
    req.user = decoded;
    next();
  } catch (error) {
    // Token 無效或過期時清除 cookie
    res.clearCookie(AUTH_COOKIE_NAME);
    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: '無效的 token',
      },
    });
  }
};

export const authorize = (...allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: '未認證' });
    }

    const hasRole = req.user.roles.some((role) => allowedRoles.includes(role));
    if (!hasRole) {
      return res.status(403).json({ error: '權限不足' });
    }

    next();
  };
};

