import { Router } from 'express';
import multer from 'multer';
import { authenticate, AuthRequest } from '../middleware/auth';
import { uploadFile, getFileUrl, initBucket, deleteFile } from '../config/storage';
import { pool } from '../config/database';
import { hasPermission } from '../services/rbac';

const router = Router();

// 初始化 bucket
initBucket();

// 允許的檔案類型（安全性：防止惡意檔案上傳）
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
];

// 設定 multer（記憶體儲存）
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (_req, file, cb) => {
    // 安全性：驗證檔案類型
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`不允許的檔案類型: ${file.mimetype}`));
    }
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

    // 記錄到資料庫（用於追蹤檔案所有權）
    await pool.query(
      `INSERT INTO file_uploads (object_name, file_name, file_type, file_size, uploaded_by)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (object_name) DO NOTHING`,
      [objectName, req.file.originalname, req.file.mimetype, req.file.size, req.user?.id]
    );

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

// 刪除檔案（需要驗證所有權或管理員權限）
router.delete('/:objectName', authenticate, async (req: AuthRequest, res) => {
  try {
    const { objectName } = req.params;

    // 安全性：驗證檔案名稱格式（防止路徑遍歷）
    if (!/^[\w.-]+$/.test(objectName)) {
      return res.status(400).json({ error: '無效的檔案名稱' });
    }

    // 檢查檔案所有權
    const fileResult = await pool.query(
      'SELECT uploaded_by FROM file_uploads WHERE object_name = $1',
      [objectName]
    );

    if (fileResult.rows.length > 0) {
      const uploadedBy = fileResult.rows[0].uploaded_by;

      // 只有上傳者本人或管理員可以刪除
      if (uploadedBy !== req.user!.id) {
        const canDelete = await hasPermission(req.user!.id, 'delete_files');
        if (!canDelete) {
          return res.status(403).json({ error: '無權限刪除此檔案' });
        }
      }
    }

    await deleteFile(objectName);

    // 從資料庫中移除記錄
    await pool.query(
      'DELETE FROM file_uploads WHERE object_name = $1',
      [objectName]
    );

    res.json({ success: true, message: '檔案已刪除' });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: '刪除檔案失敗' });
  }
});

export default router;

