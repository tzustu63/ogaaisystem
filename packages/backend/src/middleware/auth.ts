import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    roles: string[];
  };
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: '未提供認證 token' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string;
      username: string;
      roles: string[];
    };
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: '無效的 token' });
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

