import { Router } from 'express';
import multer from 'multer';
import { authenticate, AuthRequest } from '../middleware/auth';
import { uploadFile, getFileUrl, initBucket } from '../config/storage';
import { pool } from '../config/database';

const router = Router();

// 初始化 bucket
initBucket();

// 設定 multer（記憶體儲存）
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

// 上傳檔案
router.post('/', authenticate, upload.single('file'), async (req: AuthRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '未提供檔案' });
    }

    const objectName = await uploadFile(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );

    const fileUrl = getFileUrl(objectName);

    // 記錄到資料庫（可選）
    // await pool.query(
    //   'INSERT INTO file_uploads (object_name, file_name, file_type, uploaded_by) VALUES ($1, $2, $3, $4)',
    //   [objectName, req.file.originalname, req.file.mimetype, req.user?.id]
    // );

    res.json({
      success: true,
      objectName,
      url: fileUrl,
      fileName: req.file.originalname,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ error: '上傳檔案失敗' });
  }
});

// 刪除檔案
router.delete('/:objectName', authenticate, async (req: AuthRequest, res) => {
  try {
    const { objectName } = req.params;
    const { deleteFile } = await import('../config/storage');
    await deleteFile(objectName);
    res.json({ success: true, message: '檔案已刪除' });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: '刪除檔案失敗' });
  }
});

export default router;

