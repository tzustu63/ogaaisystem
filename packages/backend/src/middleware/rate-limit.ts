import { Request, Response, NextFunction } from 'express';
import { connectRedis } from '../config/redis';

/**
 * 速率限制中間件
 * 使用 Redis 實現分散式速率限制
 */

export interface RateLimitOptions {
  windowMs: number; // 時間窗口（毫秒）
  max: number; // 最大請求數
  keyPrefix?: string; // Redis key 前綴
  skipFailedRequests?: boolean; // 是否跳過失敗請求的計數
  message?: string | object; // 超限訊息
  standardHeaders?: boolean; // 是否添加標準的 RateLimit headers
}

// 預設錯誤訊息
const DEFAULT_MESSAGE = { error: '請求過於頻繁，請稍後再試' };

// 取得客戶端 IP
const getClientIp = (req: Request): string => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0].trim();
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
};

/**
 * 建立速率限制中間件
 */
export const createRateLimiter = (options: RateLimitOptions) => {
  const {
    windowMs,
    max,
    keyPrefix = 'rl',
    skipFailedRequests = false,
    message = DEFAULT_MESSAGE,
    standardHeaders = true,
  } = options;

  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const clientIp = getClientIp(req);
    const key = `${keyPrefix}:${clientIp}`;
    const windowSec = Math.ceil(windowMs / 1000);

    try {
      const redis = await connectRedis();

      // 使用 Redis MULTI 確保原子操作
      const multi = redis.multi();
      multi.incr(key);
      multi.expire(key, windowSec);
      const results = await multi.exec();

      const current = (results?.[0] as number) || 1;
      const remaining = Math.max(0, max - current);
      const resetTime = new Date(Date.now() + windowMs);

      // 設定標準 RateLimit headers
      if (standardHeaders) {
        res.setHeader('RateLimit-Limit', max);
        res.setHeader('RateLimit-Remaining', remaining);
        res.setHeader('RateLimit-Reset', Math.ceil(resetTime.getTime() / 1000));
      }

      // 檢查是否超過限制
      if (current > max) {
        res.setHeader('Retry-After', windowSec);
        res.status(429).json(message);
        return;
      }

      // 如果設定為跳過失敗請求，在響應完成後減少計數
      if (skipFailedRequests) {
        res.on('finish', async () => {
          if (res.statusCode >= 400) {
            try {
              await redis.decr(key);
            } catch (err) {
              console.error('Rate limit decrement error:', err);
            }
          }
        });
      }

      next();
    } catch (error) {
      // Redis 連線失敗時允許請求通過（故障安全）
      console.error('Rate limit Redis error:', error);
      next();
    }
  };
};

/**
 * 全局速率限制器
 * 100 requests per minute per IP
 */
export const globalRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 分鐘
  max: 100, // 100 requests per minute
  keyPrefix: 'rl:global',
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: '請求過於頻繁，請稍後再試（限制：100 次/分鐘）',
    },
  },
});

/**
 * 登入速率限制器（更嚴格）
 * 5 requests per minute per IP
 */
export const loginRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 分鐘
  max: 5, // 5 requests per minute
  keyPrefix: 'rl:login',
  skipFailedRequests: false, // 失敗的登入也要計數
  message: {
    success: false,
    error: {
      code: 'LOGIN_RATE_LIMIT_EXCEEDED',
      message: '登入嘗試過於頻繁，請等待 1 分鐘後再試',
    },
  },
});

/**
 * 敏感操作速率限制器
 * 10 requests per minute per IP
 */
export const sensitiveOperationRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 分鐘
  max: 10, // 10 requests per minute
  keyPrefix: 'rl:sensitive',
  message: {
    success: false,
    error: {
      code: 'SENSITIVE_OP_RATE_LIMIT_EXCEEDED',
      message: '敏感操作過於頻繁，請稍後再試',
    },
  },
});

/**
 * AI API 速率限制器
 * 20 requests per minute per IP (配合 Gemini 免費配額)
 */
export const aiApiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 分鐘
  max: 20, // 20 requests per minute
  keyPrefix: 'rl:ai',
  message: {
    success: false,
    error: {
      code: 'AI_API_RATE_LIMIT_EXCEEDED',
      message: 'AI API 請求過於頻繁，請稍後再試',
    },
  },
});
