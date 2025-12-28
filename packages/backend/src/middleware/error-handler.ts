import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError, ValidationError, DatabaseError } from '../utils/errors';
import { isProduction } from '../config/env-validator';

// 錯誤日誌結構
interface ErrorLog {
  timestamp: string;
  requestId?: string;
  method: string;
  path: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
  error: {
    name: string;
    message: string;
    code?: string;
    statusCode: number;
    stack?: string;
    details?: unknown;
  };
}

// 生成請求 ID
const generateRequestId = (): string => {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// 錯誤日誌記錄
const logError = (errorLog: ErrorLog): void => {
  if (isProduction()) {
    // 生產環境使用 JSON 格式（方便日誌收集）
    console.error(JSON.stringify(errorLog));
  } else {
    // 開發環境使用可讀格式
    console.error('='.repeat(60));
    console.error(
      `[${errorLog.timestamp}] Error in ${errorLog.method} ${errorLog.path}`
    );
    console.error(`Request ID: ${errorLog.requestId}`);
    console.error(`User ID: ${errorLog.userId || 'anonymous'}`);
    console.error(
      `Error: ${errorLog.error.name} - ${errorLog.error.message}`
    );
    if (errorLog.error.stack) {
      console.error(`Stack:\n${errorLog.error.stack}`);
    }
    console.error('='.repeat(60));
  }
};

// 將 Zod 錯誤轉換為 ValidationError
const handleZodError = (error: ZodError): ValidationError => {
  const details = error.errors.map((e) => ({
    field: e.path.join('.'),
    message: e.message,
    code: e.code,
  }));

  return new ValidationError('驗證失敗', details);
};

// 處理 PostgreSQL 錯誤
const handlePostgresError = (error: unknown): AppError => {
  const pgError = error as { code?: string; message?: string };

  // 唯一約束違反
  if (pgError.code === '23505') {
    return new AppError('資料已存在', 409, 'DUPLICATE_ENTRY', true);
  }

  // 外鍵約束違反
  if (pgError.code === '23503') {
    return new AppError('關聯資料不存在', 400, 'FOREIGN_KEY_VIOLATION', true);
  }

  // 檢查約束違反
  if (pgError.code === '23514') {
    return new AppError('資料不符合約束條件', 400, 'CHECK_VIOLATION', true);
  }

  // 其他資料庫錯誤
  return new DatabaseError(
    '資料庫操作失敗',
    error instanceof Error ? error : undefined
  );
};

// 檢查是否為 PostgreSQL 錯誤
const isPostgresError = (error: unknown): boolean => {
  const pgError = error as { code?: string };
  return typeof pgError.code === 'string' && /^[0-9]{5}$/.test(pgError.code);
};

/**
 * 404 處理中間件
 * 用於處理未匹配的路由
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `找不到路徑: ${req.method} ${req.path}`,
    },
  });
};

/**
 * 全局錯誤處理中間件
 * 必須放在所有路由之後
 */
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const requestId =
    (req.headers['x-request-id'] as string) || generateRequestId();
  const isProd = isProduction();

  // 轉換特定錯誤類型
  let appError: AppError;

  if (error instanceof AppError) {
    appError = error;
  } else if (error instanceof ZodError) {
    appError = handleZodError(error);
  } else if (isPostgresError(error)) {
    appError = handlePostgresError(error);
  } else {
    // 未知錯誤
    appError = new AppError(
      isProd ? '伺服器內部錯誤' : error.message,
      500,
      'INTERNAL_ERROR',
      false
    );
  }

  // 記錄錯誤
  const errorLog: ErrorLog = {
    timestamp: new Date().toISOString(),
    requestId,
    method: req.method,
    path: req.path,
    userId: (req as { user?: { id: string } }).user?.id,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    error: {
      name: error.name,
      message: error.message,
      code: appError.code,
      statusCode: appError.statusCode,
      stack: isProd ? undefined : error.stack,
      details: appError.details,
    },
  };

  // 只記錄非操作性錯誤或 500 錯誤
  if (!appError.isOperational || appError.statusCode >= 500) {
    logError(errorLog);
  }

  // 建立錯誤響應
  const responseBody: {
    success: false;
    error: {
      code: string;
      message: string;
      requestId: string;
      details?: unknown;
      stack?: string;
    };
  } = {
    success: false,
    error: {
      code: appError.code,
      message: appError.message,
      requestId,
    },
  };

  // 開發環境顯示更多資訊
  if (!isProd && error.stack) {
    responseBody.error.stack = error.stack;
  }

  // 驗證錯誤顯示詳細資訊
  if (appError instanceof ValidationError && appError.details) {
    responseBody.error.details = appError.details;
  }

  res.status(appError.statusCode).json(responseBody);
};

/**
 * Async 路由包裝器
 * 自動捕獲 async 函數中的錯誤並傳遞給錯誤處理中間件
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
