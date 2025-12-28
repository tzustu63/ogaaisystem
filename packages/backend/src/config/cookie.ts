import { CookieOptions } from 'express';
import { isProduction } from './env-validator';

/**
 * Cookie 設定
 * 用於 HttpOnly Cookie 認證
 */

// Cookie 名稱
export const AUTH_COOKIE_NAME = 'oga_access_token';
export const REFRESH_COOKIE_NAME = 'oga_refresh_token';

/**
 * 取得認證 Cookie 選項
 */
export const getAuthCookieOptions = (): CookieOptions => {
  const isProd = isProduction();

  return {
    httpOnly: true, // 防止 XSS 攻擊
    secure: isProd, // 生產環境強制 HTTPS
    sameSite: isProd ? 'strict' : 'lax', // 生產環境使用嚴格模式
    maxAge: 24 * 60 * 60 * 1000, // 24 小時，與 JWT 過期時間一致
    path: '/',
  };
};

/**
 * 取得清除 Cookie 選項
 */
export const getClearCookieOptions = (): CookieOptions => {
  const isProd = isProduction();

  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'strict' : 'lax',
    path: '/',
  };
};
