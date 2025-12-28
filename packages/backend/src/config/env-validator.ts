import { z } from 'zod';

// 定義環境變數 schema
const envSchema = z.object({
  // 資料庫設定
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.string().default('5432').transform(Number),
  DB_NAME: z.string().default('oga_ai_system'),
  DB_USER: z.string().default('postgres'),
  DB_PASSWORD: z.string().min(1, '資料庫密碼必須設定'),

  // Redis 設定
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().default('6379').transform(Number),
  REDIS_PASSWORD: z.string().optional(),

  // MinIO 設定
  MINIO_ENDPOINT: z.string().default('localhost'),
  MINIO_PORT: z.string().default('9000').transform(Number),
  MINIO_USE_SSL: z
    .string()
    .transform((v) => v === 'true')
    .default('false'),
  MINIO_ACCESS_KEY: z.string().min(1, 'MinIO Access Key 必須設定'),
  MINIO_SECRET_KEY: z.string().min(1, 'MinIO Secret Key 必須設定'),
  MINIO_BUCKET: z.string().default('oga-ai-system'),
  MINIO_PUBLIC_URL: z.string().optional(),

  // JWT 設定
  JWT_SECRET: z.string().min(32, 'JWT Secret 必須至少 32 個字元'),
  JWT_EXPIRES_IN: z.string().default('24h'),

  // Server 設定
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.string().default('3001').transform(Number),

  // CORS 設定
  CORS_ORIGINS: z.string().optional(),

  // Google AI 設定
  GOOGLE_AI_API_KEY: z.string().optional(),

  // SMTP 設定
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),

  // LINE Notify 設定
  LINE_NOTIFY_TOKEN: z.string().optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

let cachedConfig: EnvConfig | null = null;

/**
 * 驗證環境變數
 * 在生產環境中，缺少必要的環境變數將導致應用程式終止
 * 在開發環境中，會顯示警告但允許使用開發用預設值
 */
export const validateEnv = (): EnvConfig => {
  if (cachedConfig) return cachedConfig;

  const isDevelopment = process.env.NODE_ENV !== 'production';

  // 開發環境提供預設值
  if (isDevelopment) {
    const devDefaults: Record<string, string> = {
      DB_PASSWORD: process.env.DB_PASSWORD || 'postgres',
      JWT_SECRET:
        process.env.JWT_SECRET ||
        'dev-secret-key-minimum-32-characters-long',
      MINIO_ACCESS_KEY: process.env.MINIO_ACCESS_KEY || 'minioadmin',
      MINIO_SECRET_KEY: process.env.MINIO_SECRET_KEY || 'minioadmin',
    };

    // 設定開發環境預設值
    for (const [key, value] of Object.entries(devDefaults)) {
      if (!process.env[key]) {
        process.env[key] = value;
        console.warn(
          `⚠️  環境變數 ${key} 未設定，使用開發環境預設值`
        );
      }
    }
  }

  try {
    cachedConfig = envSchema.parse(process.env);
    console.log('✅ 環境變數驗證通過');
    return cachedConfig;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map(
        (e) => `  - ${e.path.join('.')}: ${e.message}`
      );
      console.error('❌ 環境變數驗證失敗:');
      console.error(missingVars.join('\n'));
      console.error(
        '\n請確認 .env 檔案已正確設定所有必要的環境變數。'
      );
      console.error('參考 .env.example 取得設定範例。');

      if (!isDevelopment) {
        process.exit(1);
      }
    }
    throw error;
  }
};

/**
 * 取得已驗證的環境設定
 */
export const getConfig = (): EnvConfig => {
  if (!cachedConfig) {
    return validateEnv();
  }
  return cachedConfig;
};

/**
 * 檢查是否為生產環境
 */
export const isProduction = (): boolean => {
  return getConfig().NODE_ENV === 'production';
};

/**
 * 檢查是否為開發環境
 */
export const isDevelopment = (): boolean => {
  return getConfig().NODE_ENV === 'development';
};
