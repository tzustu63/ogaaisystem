/**
 * 備份與還原 API 路由
 * 提供完整資料庫備份和還原功能
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import fs from 'fs';
import { authenticate, authorize } from '../middleware/auth';
import {
  exportToJson,
  exportToSql,
  getBackupStatus,
  getBackupFilePath,
  uploadRestoreFile,
  getRestorePreview,
  executeRestore,
  getBackupHistory,
} from '../services/backup';

const router = Router();

// 設定檔案上傳（最大 100MB）
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
  },
  fileFilter: (req, file, cb) => {
    // 只接受 .json 和 .sql 檔案
    const allowedExtensions = ['.json', '.sql'];
    const ext = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('只支援 .json 和 .sql 檔案格式'));
    }
  },
});

/**
 * POST /api/backup/export
 * 開始匯出備份
 */
router.post('/export', authenticate, authorize('admin'), async (req: Request, res: Response) => {
  try {
    const { format, excludeSensitive = false } = req.body;

    if (!format || !['json', 'sql'].includes(format)) {
      return res.status(400).json({ error: '請指定有效的格式 (json 或 sql)' });
    }

    const user = (req as any).user;
    const options = {
      format,
      excludeSensitive,
      userId: user.id,
      username: user.username,
    };

    let backupId: string;
    if (format === 'json') {
      backupId = await exportToJson(options);
    } else {
      backupId = await exportToSql(options);
    }

    res.json({
      success: true,
      backupId,
      message: '備份已開始，請使用 backupId 查詢進度',
    });
  } catch (error: any) {
    console.error('Export error:', error);
    res.status(500).json({ error: error.message || '匯出失敗' });
  }
});

/**
 * GET /api/backup/export/:id/status
 * 查詢匯出狀態
 */
router.get('/export/:id/status', authenticate, authorize('admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const status = await getBackupStatus(id);

    if (!status) {
      return res.status(404).json({ error: '找不到備份記錄' });
    }

    res.json(status);
  } catch (error: any) {
    console.error('Get status error:', error);
    res.status(500).json({ error: error.message || '查詢狀態失敗' });
  }
});

/**
 * GET /api/backup/export/:id/download
 * 下載備份檔案
 */
router.get('/export/:id/download', authenticate, authorize('admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const fileInfo = await getBackupFilePath(id);

    if (!fileInfo) {
      return res.status(404).json({ error: '找不到備份檔案或備份尚未完成' });
    }

    const { filePath, fileName } = fileInfo;

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: '備份檔案已被刪除' });
    }

    // 設定下載標頭
    const contentType = fileName.endsWith('.json')
      ? 'application/json'
      : 'application/sql';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    // 串流傳輸檔案
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error: any) {
    console.error('Download error:', error);
    res.status(500).json({ error: error.message || '下載失敗' });
  }
});

/**
 * POST /api/backup/restore/upload
 * 上傳還原檔案
 */
router.post('/restore/upload', authenticate, authorize('admin'), upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '請上傳備份檔案' });
    }

    const fileName = req.file.originalname;
    const fileContent = req.file.buffer.toString('utf8');
    const format = fileName.toLowerCase().endsWith('.json') ? 'json' : 'sql';
    const user = (req as any).user;

    const restoreId = await uploadRestoreFile(fileContent, fileName, format, user.id);

    // 取得驗證結果
    const preview = await getRestorePreview(restoreId);

    res.json({
      success: true,
      restoreId,
      fileName,
      format,
      validation: preview?.validation || {},
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message || '上傳失敗' });
  }
});

/**
 * GET /api/backup/restore/:id/preview
 * 預覽還原資料
 */
router.get('/restore/:id/preview', authenticate, authorize('admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const preview = await getRestorePreview(id);

    if (!preview) {
      return res.status(404).json({ error: '找不到還原記錄' });
    }

    res.json(preview);
  } catch (error: any) {
    console.error('Preview error:', error);
    res.status(500).json({ error: error.message || '預覽失敗' });
  }
});

/**
 * POST /api/backup/restore/:id/execute
 * 執行還原
 */
router.post('/restore/:id/execute', authenticate, authorize('admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { mode = 'overwrite', selectedTables } = req.body;

    if (!['overwrite', 'merge', 'skip_conflicts'].includes(mode)) {
      return res.status(400).json({ error: '無效的還原模式' });
    }

    // 非同步執行還原（不等待完成）
    executeRestore(id, { mode, selectedTables }).catch(error => {
      console.error('Restore execution error:', error);
    });

    res.json({
      success: true,
      message: '還原已開始執行，請使用 restoreId 查詢進度',
      restoreId: id,
    });
  } catch (error: any) {
    console.error('Execute restore error:', error);
    res.status(500).json({ error: error.message || '執行還原失敗' });
  }
});

/**
 * GET /api/backup/restore/:id/status
 * 查詢還原狀態
 */
router.get('/restore/:id/status', authenticate, authorize('admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const status = await getBackupStatus(id);

    if (!status) {
      return res.status(404).json({ error: '找不到還原記錄' });
    }

    res.json(status);
  } catch (error: any) {
    console.error('Get restore status error:', error);
    res.status(500).json({ error: error.message || '查詢狀態失敗' });
  }
});

/**
 * GET /api/backup/history
 * 取得備份/還原歷史
 */
router.get('/history', authenticate, authorize('admin'), async (req: Request, res: Response) => {
  try {
    const { type, limit = '20' } = req.query;

    const history = await getBackupHistory(
      type as 'export' | 'restore' | undefined,
      parseInt(limit as string, 10)
    );

    res.json(history);
  } catch (error: any) {
    console.error('Get history error:', error);
    res.status(500).json({ error: error.message || '查詢歷史失敗' });
  }
});

export default router;
