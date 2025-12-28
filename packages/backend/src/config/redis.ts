import { createClient } from 'redis';
import dotenv from 'dotenv';
import { getConfig } from './env-validator';

dotenv.config();

// 取得已驗證的環境設定
const config = getConfig();

// 建立 Redis 連線 URL（支援密碼驗證）
const redisUrl = config.REDIS_PASSWORD
  ? `redis://:${config.REDIS_PASSWORD}@${config.REDIS_HOST}:${config.REDIS_PORT}`
  : `redis://${config.REDIS_HOST}:${config.REDIS_PORT}`;

const redisClient = createClient({
  url: redisUrl,
});

redisClient.on('error', (err) => console.error('❌ Redis Client Error', err));
redisClient.on('connect', () => console.log('✅ Redis connected'));

// 連線 Redis
export const connectRedis = async () => {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
  return redisClient;
};

// 快取操作
export const cache = {
  get: async (key: string): Promise<string | null> => {
    try {
      const client = await connectRedis();
      return await client.get(key);
    } catch (error) {
      console.error('Redis get error:', error);
      return null;
    }
  },

  set: async (key: string, value: string, ttl?: number): Promise<void> => {
    try {
      const client = await connectRedis();
      if (ttl) {
        await client.setEx(key, ttl, value);
      } else {
        await client.set(key, value);
      }
    } catch (error) {
      console.error('Redis set error:', error);
    }
  },

  del: async (key: string): Promise<void> => {
    try {
      const client = await connectRedis();
      await client.del(key);
    } catch (error) {
      console.error('Redis delete error:', error);
    }
  },

  getJSON: async <T>(key: string): Promise<T | null> => {
    const value = await cache.get(key);
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  },

  setJSON: async <T>(key: string, value: T, ttl?: number): Promise<void> => {
    await cache.set(key, JSON.stringify(value), ttl);
  },
};

export default redisClient;

