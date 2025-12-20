import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

const redisClient = createClient({
  url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`,
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

