/**
 * 自定義錯誤類別
 * 提供統一的錯誤處理機制
 */

// 基礎應用程式錯誤
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    isOperational: boolean = true,
    details?: unknown
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

// 驗證錯誤 (400)
export class ValidationError extends AppError {
  constructor(message: string = '驗證失敗', details?: unknown) {
    super(message, 400, 'VALIDATION_ERROR', true, details);
  }
}

// 認證錯誤 (401)
export class AuthenticationError extends AppError {
  constructor(message: string = '未認證') {
    super(message, 401, 'AUTHENTICATION_ERROR', true);
  }
}

// 授權錯誤 (403)
export class AuthorizationError extends AppError {
  constructor(message: string = '權限不足') {
    super(message, 403, 'AUTHORIZATION_ERROR', true);
  }
}

// 找不到資源錯誤 (404)
export class NotFoundError extends AppError {
  constructor(resource: string = '資源') {
    super(`${resource}不存在`, 404, 'NOT_FOUND', true);
  }
}

// 衝突錯誤 (409)
export class ConflictError extends AppError {
  constructor(message: string = '資料衝突') {
    super(message, 409, 'CONFLICT', true);
  }
}

// 速率限制錯誤 (429)
export class RateLimitError extends AppError {
  constructor(message: string = '請求過於頻繁，請稍後再試') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED', true);
  }
}

// 資料庫錯誤 (500)
export class DatabaseError extends AppError {
  constructor(message: string = '資料庫操作失敗', originalError?: Error) {
    super(message, 500, 'DATABASE_ERROR', false, {
      originalError: originalError?.message,
    });
  }
}

// 外部服務錯誤 (502)
export class ExternalServiceError extends AppError {
  constructor(service: string, message: string) {
    super(
      `外部服務 ${service} 錯誤: ${message}`,
      502,
      'EXTERNAL_SERVICE_ERROR',
      true
    );
  }
}

// 服務不可用錯誤 (503)
export class ServiceUnavailableError extends AppError {
  constructor(message: string = '服務暫時無法使用') {
    super(message, 503, 'SERVICE_UNAVAILABLE', true);
  }
}
