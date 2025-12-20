import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { hasPermission, canAccessResource } from '../services/rbac';

// 權限檢查中間件
export const requirePermission = (permission: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: '未認證' });
    }

    const allowed = await hasPermission(req.user.id, permission);
    if (!allowed) {
      return res.status(403).json({ error: '權限不足' });
    }

    next();
  };
};

// 資源存取檢查中間件
export const requireResourceAccess = (
  resourceType: string,
  action: 'view' | 'edit' | 'delete' = 'view'
) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: '未認證' });
    }

    const resourceId = req.params.id;
    if (!resourceId) {
      return next(); // 沒有特定資源 ID，跳過檢查
    }

    const allowed = await canAccessResource(
      req.user.id,
      resourceType,
      resourceId,
      action
    );

    if (!allowed) {
      return res.status(403).json({ error: '無權存取此資源' });
    }

    next();
  };
};

