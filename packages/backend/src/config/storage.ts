// @ts-ignore - minio 類型定義問題
import { Client } from 'minio';
import dotenv from 'dotenv';
import { getConfig } from './env-validator';

dotenv.config();

// 取得已驗證的環境設定
const config = getConfig();

// MinIO 客戶端設定
export const minioClient = new Client({
  endPoint: config.MINIO_ENDPOINT,
  port: config.MINIO_PORT,
  useSSL: config.MINIO_USE_SSL,
  accessKey: config.MINIO_ACCESS_KEY,
  secretKey: config.MINIO_SECRET_KEY,
});

export const BUCKET_NAME = config.MINIO_BUCKET;

// 初始化 bucket（如果不存在）
export const initBucket = async () => {
  try {
    const exists = await minioClient.bucketExists(BUCKET_NAME);
    if (!exists) {
      await minioClient.makeBucket(BUCKET_NAME, 'us-east-1');
      console.log(`✅ Bucket '${BUCKET_NAME}' created`);
    } else {
      console.log(`✅ Bucket '${BUCKET_NAME}' exists`);
    }
  } catch (error) {
    console.error('❌ Error initializing bucket:', error);
  }
};

// 上傳檔案
export const uploadFile = async (
  file: Buffer,
  fileName: string,
  contentType: string
): Promise<string> => {
  try {
    const objectName = `${Date.now()}-${fileName}`;
    await minioClient.putObject(BUCKET_NAME, objectName, file, file.length, {
      'Content-Type': contentType,
    });
    return objectName;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
};

// 取得檔案 URL
export const getFileUrl = (objectName: string): string => {
  const publicUrl =
    config.MINIO_PUBLIC_URL ||
    `http://${config.MINIO_ENDPOINT}:${config.MINIO_PORT}`;
  return `${publicUrl}/${BUCKET_NAME}/${objectName}`;
};

// 刪除檔案
export const deleteFile = async (objectName: string): Promise<void> => {
  try {
    await minioClient.removeObject(BUCKET_NAME, objectName);
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
};

