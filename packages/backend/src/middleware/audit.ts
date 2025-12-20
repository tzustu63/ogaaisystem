import { Request, Response, NextFunction } from 'express';
import { pool } from '../config/database';
import { AuthRequest } from './auth';

export const auditLog = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const originalSend = res.send;

  res.send = function (body: any) {
    // 記錄稽核日誌
    if (req.user && req.method !== 'GET') {
      const actionType = getActionType(req.method);
      const entityType = req.path.split('/')[2] || 'unknown';
      const entityId = req.params.id || null;

      pool.query(
        `INSERT INTO audit_logs (user_id, action_type, entity_type, entity_id, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          req.user.id,
          actionType,
          entityType,
          entityId,
          req.ip,
          req.get('user-agent'),
        ]
      ).catch(console.error);
    }

    return originalSend.call(this, body);
  };

  next();
};

const getActionType = (method: string): string => {
  switch (method) {
    case 'POST':
      return 'create';
    case 'PUT':
    case 'PATCH':
      return 'update';
    case 'DELETE':
      return 'delete';
    default:
      return 'view';
  }
};

