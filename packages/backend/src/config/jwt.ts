import { getConfig } from './env-validator';

/**
 * JWT 設定
 * 集中管理 JWT 相關設定，避免在多個檔案中重複定義
 */

let _jwtSecret: string | null = null;
let _jwtExpiresIn: string | null = null;

/**
 * 取得 JWT Secret
 * 使用延遲載入以確保環境變數已被驗證
 */
export const getJwtSecret = (): string => {
  if (!_jwtSecret) {
    _jwtSecret = getConfig().JWT_SECRET;
  }
  return _jwtSecret;
};

/**
 * 取得 JWT 過期時間（秒數）
 * 將 "24h" 格式轉換為秒數
 */
export const getJwtExpiresIn = (): number => {
  if (!_jwtExpiresIn) {
    _jwtExpiresIn = getConfig().JWT_EXPIRES_IN;
  }

  // 解析時間字串為秒數
  const match = _jwtExpiresIn.match(/^(\d+)([smhd])$/);
  if (match) {
    const value = parseInt(match[1], 10);
    const unit = match[2];
    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 60 * 60;
      case 'd':
        return value * 24 * 60 * 60;
    }
  }

  // 預設 24 小時
  return 24 * 60 * 60;
};

// 為了向後相容，也導出常數存取方式
// 注意：這些會在模組載入時立即執行，可能在環境變數驗證之前
export const JWT_SECRET = (() => {
  try {
    return getConfig().JWT_SECRET;
  } catch {
    // 如果環境變數尚未驗證，返回臨時值（開發環境）
    return (
      process.env.JWT_SECRET ||
      'dev-secret-key-minimum-32-characters-long'
    );
  }
})();

export const JWT_EXPIRES_IN = (() => {
  try {
    return getConfig().JWT_EXPIRES_IN;
  } catch {
    return process.env.JWT_EXPIRES_IN || '24h';
  }
})();
