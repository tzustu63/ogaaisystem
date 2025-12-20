// @ts-ignore - minio 類型定義問題
import { Client } from 'minio';
import dotenv from 'dotenv';

dotenv.config();

// MinIO 客戶端設定
export const minioClient = new Client({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT || '9000'),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
});

export const BUCKET_NAME = process.env.MINIO_BUCKET || 'oga-ai-system';

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
    await minioClient.putObject(BUCKET_NAME, objectName, file, {
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
  return `${process.env.MINIO_PUBLIC_URL || `http://${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT}`}/${BUCKET_NAME}/${objectName}`;
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

