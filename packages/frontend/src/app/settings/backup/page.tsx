'use client';

import { useState, useEffect, useCallback } from 'react';
import { backupApi } from '@/lib/api';

type TabType = 'export' | 'import';
type ExportFormat = 'json' | 'sql';
type ImportStep = 'upload' | 'validate' | 'preview' | 'execute' | 'result';
type RestoreMode = 'overwrite' | 'skip_conflicts';

interface BackupHistory {
  id: string;
  type: 'export' | 'restore';
  format: 'json' | 'sql';
  status: 'processing' | 'completed' | 'failed';
  file_name: string;
  file_size: number;
  tables_count: number;
  records_count: number;
  progress: number;
  error_message: string;
  created_at: string;
  completed_at: string;
  created_by_name: string;
}

interface ExportStatus {
  id: string;
  status: 'processing' | 'completed' | 'failed';
  progress: number;
  current_table: string;
  file_name: string;
  file_size: number;
  tables_count: number;
  records_count: number;
  error_message: string;
}

interface ValidationResult {
  isValid: boolean;
  tables: string[];
  recordCount: number;
  errors: string[];
  warnings: string[];
}

interface RestorePreview {
  id: string;
  format: string;
  fileName: string;
  tablesCount: number;
  recordsCount: number;
  validation: ValidationResult;
  preview: Array<{
    name: string;
    recordCount: number;
    sampleData: any[];
  }>;
}

export default function BackupPage() {
  const [activeTab, setActiveTab] = useState<TabType>('export');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<BackupHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  // 匯出狀態
  const [exportFormat, setExportFormat] = useState<ExportFormat>('json');
  const [excludeSensitive, setExcludeSensitive] = useState(false);
  const [exportStatus, setExportStatus] = useState<ExportStatus | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // 匯入狀態
  const [importStep, setImportStep] = useState<ImportStep>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [restoreId, setRestoreId] = useState<string | null>(null);
  const [restorePreview, setRestorePreview] = useState<RestorePreview | null>(null);
  const [restoreMode, setRestoreMode] = useState<RestoreMode>('overwrite');
  const [restoreStatus, setRestoreStatus] = useState<ExportStatus | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  // 載入歷史記錄
  const fetchHistory = useCallback(async () => {
    try {
      setHistoryLoading(true);
      const res = await backupApi.getHistory({ limit: 20 });
      setHistory(res.data);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // 輪詢匯出狀態
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isExporting && exportStatus?.id) {
      interval = setInterval(async () => {
        try {
          const res = await backupApi.getExportStatus(exportStatus.id);
          setExportStatus(res.data);
          if (res.data.status === 'completed' || res.data.status === 'failed') {
            setIsExporting(false);
            fetchHistory();
          }
        } catch (error) {
          console.error('Error polling export status:', error);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isExporting, exportStatus?.id, fetchHistory]);

  // 輪詢還原狀態
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRestoring && restoreId) {
      interval = setInterval(async () => {
        try {
          const res = await backupApi.getRestoreStatus(restoreId);
          setRestoreStatus(res.data);
          if (res.data.status === 'completed' || res.data.status === 'failed') {
            setIsRestoring(false);
            setImportStep('result');
            fetchHistory();
          }
        } catch (error) {
          console.error('Error polling restore status:', error);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRestoring, restoreId, fetchHistory]);

  // 開始匯出
  const handleExport = async () => {
    try {
      setLoading(true);
      const res = await backupApi.startExport({
        format: exportFormat,
        excludeSensitive,
      });
      setExportStatus({ id: res.data.backupId } as ExportStatus);
      setIsExporting(true);
    } catch (error: any) {
      alert(error.response?.data?.error || '匯出失敗');
    } finally {
      setLoading(false);
    }
  };

  // 下載備份
  const handleDownload = async (backupId: string, fileName: string) => {
    try {
      const res = await backupApi.downloadBackup(backupId);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      alert(error.response?.data?.error || '下載失敗');
    }
  };

  // 處理檔案選擇
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  // 上傳還原檔案
  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setLoading(true);
      const res = await backupApi.uploadRestore(selectedFile);
      setRestoreId(res.data.restoreId);

      // 取得預覽
      const previewRes = await backupApi.getRestorePreview(res.data.restoreId);
      setRestorePreview(previewRes.data);

      if (res.data.validation?.isValid === false) {
        setImportStep('validate');
      } else {
        setImportStep('preview');
      }
    } catch (error: any) {
      alert(error.response?.data?.error || '上傳失敗');
    } finally {
      setLoading(false);
    }
  };

  // 執行還原
  const handleRestore = async () => {
    if (!restoreId) return;

    try {
      setLoading(true);
      await backupApi.executeRestore(restoreId, { mode: restoreMode });
      setIsRestoring(true);
      setImportStep('execute');
    } catch (error: any) {
      alert(error.response?.data?.error || '還原失敗');
    } finally {
      setLoading(false);
    }
  };

  // 重置匯入流程
  const resetImport = () => {
    setImportStep('upload');
    setSelectedFile(null);
    setRestoreId(null);
    setRestorePreview(null);
    setRestoreStatus(null);
    setIsRestoring(false);
  };

  // 格式化檔案大小
  const formatFileSize = (bytes: number) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // 格式化時間
  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('zh-TW');
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* 頁面標題 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">資料備份</h1>
        <p className="mt-1 text-sm text-gray-500">
          匯出或匯入完整資料庫備份，用於系統遷移或資料還原
        </p>
      </div>

      {/* Tab 切換 */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('export')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'export'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            匯出備份
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'import'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            匯入還原
          </button>
        </nav>
      </div>

      {/* 匯出面板 */}
      {activeTab === 'export' && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">匯出設定</h2>

          {/* 格式選擇 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              匯出格式
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="format"
                  value="json"
                  checked={exportFormat === 'json'}
                  onChange={() => setExportFormat('json')}
                  className="mr-2"
                />
                <span className="text-sm">
                  JSON <span className="text-gray-500">（推薦，保留完整資料結構）</span>
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="format"
                  value="sql"
                  checked={exportFormat === 'sql'}
                  onChange={() => setExportFormat('sql')}
                  className="mr-2"
                />
                <span className="text-sm">
                  SQL <span className="text-gray-500">（可直接在資料庫執行）</span>
                </span>
              </label>
            </div>
          </div>

          {/* 選項 */}
          <div className="mb-6">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={excludeSensitive}
                onChange={(e) => setExcludeSensitive(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">
                排除敏感資料（密碼雜湊等）
              </span>
            </label>
          </div>

          {/* 匯出按鈕 */}
          <button
            onClick={handleExport}
            disabled={loading || isExporting}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading || isExporting ? '匯出中...' : '開始匯出'}
          </button>

          {/* 匯出進度 */}
          {isExporting && exportStatus && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-700">
                  正在匯出...
                </span>
                <span className="text-sm text-blue-600">
                  {exportStatus.progress || 0}%
                </span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${exportStatus.progress || 0}%` }}
                />
              </div>
              {exportStatus.current_table && (
                <p className="mt-2 text-xs text-blue-600">
                  正在處理: {exportStatus.current_table}
                </p>
              )}
            </div>
          )}

          {/* 匯出完成 */}
          {exportStatus?.status === 'completed' && (
            <div className="mt-6 p-4 bg-green-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-700">
                    匯出完成！
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    {exportStatus.tables_count} 個資料表，{exportStatus.records_count?.toLocaleString()} 筆記錄，
                    檔案大小 {formatFileSize(exportStatus.file_size)}
                  </p>
                </div>
                <button
                  onClick={() => handleDownload(exportStatus.id, exportStatus.file_name)}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  下載備份
                </button>
              </div>
            </div>
          )}

          {/* 匯出失敗 */}
          {exportStatus?.status === 'failed' && (
            <div className="mt-6 p-4 bg-red-50 rounded-lg">
              <p className="text-sm font-medium text-red-700">匯出失敗</p>
              <p className="text-xs text-red-600 mt-1">
                {exportStatus.error_message}
              </p>
            </div>
          )}
        </div>
      )}

      {/* 匯入面板 */}
      {activeTab === 'import' && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">匯入還原</h2>

          {/* 步驟指示器 */}
          <div className="flex items-center mb-6">
            {(['upload', 'preview', 'execute', 'result'] as ImportStep[]).map((step, index) => (
              <div key={step} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    importStep === step
                      ? 'bg-blue-600 text-white'
                      : ['upload', 'validate'].includes(importStep) && index > 0
                      ? 'bg-gray-200 text-gray-500'
                      : importStep === 'preview' && index > 1
                      ? 'bg-gray-200 text-gray-500'
                      : importStep === 'execute' && index > 2
                      ? 'bg-gray-200 text-gray-500'
                      : 'bg-green-500 text-white'
                  }`}
                >
                  {index + 1}
                </div>
                <span className="ml-2 text-sm text-gray-600">
                  {step === 'upload' && '上傳檔案'}
                  {step === 'preview' && '預覽確認'}
                  {step === 'execute' && '執行還原'}
                  {step === 'result' && '結果'}
                </span>
                {index < 3 && <div className="w-12 h-px bg-gray-300 mx-4" />}
              </div>
            ))}
          </div>

          {/* 步驟 1: 上傳 */}
          {importStep === 'upload' && (
            <div>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <input
                  type="file"
                  accept=".json,.sql"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="backup-file"
                />
                <label
                  htmlFor="backup-file"
                  className="cursor-pointer"
                >
                  <div className="text-gray-500">
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400"
                      stroke="currentColor"
                      fill="none"
                      viewBox="0 0 48 48"
                    >
                      <path
                        d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <p className="mt-2">
                      點擊選擇或拖放備份檔案
                    </p>
                    <p className="mt-1 text-sm">
                      支援 .json 或 .sql 格式，最大 100MB
                    </p>
                  </div>
                </label>
              </div>

              {selectedFile && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg flex items-center justify-between">
                  <div>
                    <p className="font-medium">{selectedFile.name}</p>
                    <p className="text-sm text-gray-500">
                      {formatFileSize(selectedFile.size)}
                    </p>
                  </div>
                  <button
                    onClick={handleUpload}
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? '上傳中...' : '上傳並驗證'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 步驟: 驗證失敗 */}
          {importStep === 'validate' && restorePreview && (
            <div>
              <div className="p-4 bg-red-50 rounded-lg mb-4">
                <p className="font-medium text-red-700">驗證失敗</p>
                {restorePreview.validation.errors.map((err, i) => (
                  <p key={i} className="text-sm text-red-600 mt-1">• {err}</p>
                ))}
              </div>
              <button
                onClick={resetImport}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                重新選擇檔案
              </button>
            </div>
          )}

          {/* 步驟 2: 預覽 */}
          {importStep === 'preview' && restorePreview && (
            <div>
              {/* 警告訊息 */}
              {restorePreview.validation.warnings?.length > 0 && (
                <div className="p-4 bg-yellow-50 rounded-lg mb-4">
                  <p className="font-medium text-yellow-700">注意事項</p>
                  {restorePreview.validation.warnings.map((warn, i) => (
                    <p key={i} className="text-sm text-yellow-600 mt-1">• {warn}</p>
                  ))}
                </div>
              )}

              {/* 備份資訊 */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">檔案名稱</p>
                  <p className="font-medium">{restorePreview.fileName}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">資料表數</p>
                  <p className="font-medium">{restorePreview.tablesCount}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">記錄數</p>
                  <p className="font-medium">{restorePreview.recordsCount?.toLocaleString()}</p>
                </div>
              </div>

              {/* 預覽資料表 */}
              {restorePreview.preview?.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-medium mb-2">資料表預覽</h3>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">資料表</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">記錄數</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {restorePreview.preview.map((table) => (
                          <tr key={table.name}>
                            <td className="px-4 py-2 text-sm">{table.name}</td>
                            <td className="px-4 py-2 text-sm">{table.recordCount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 還原模式選擇 */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  還原模式
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="restoreMode"
                      value="overwrite"
                      checked={restoreMode === 'overwrite'}
                      onChange={() => setRestoreMode('overwrite')}
                      className="mr-2"
                    />
                    <span className="text-sm">
                      覆蓋模式 <span className="text-gray-500">（清空現有資料後匯入）</span>
                    </span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="restoreMode"
                      value="skip_conflicts"
                      checked={restoreMode === 'skip_conflicts'}
                      onChange={() => setRestoreMode('skip_conflicts')}
                      className="mr-2"
                    />
                    <span className="text-sm">
                      跳過衝突 <span className="text-gray-500">（保留現有資料，只新增不存在的）</span>
                    </span>
                  </label>
                </div>
              </div>

              {/* 警告提示 */}
              <div className="p-4 bg-red-50 rounded-lg mb-6">
                <p className="text-sm text-red-700 font-medium">
                  警告：還原操作可能會覆蓋現有資料！
                </p>
                <p className="text-sm text-red-600 mt-1">
                  建議在還原前先匯出當前資料作為備份。
                </p>
              </div>

              {/* 操作按鈕 */}
              <div className="flex space-x-4">
                <button
                  onClick={resetImport}
                  className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  onClick={handleRestore}
                  disabled={loading}
                  className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                >
                  {loading ? '處理中...' : '確認還原'}
                </button>
              </div>
            </div>
          )}

          {/* 步驟 3: 執行中 */}
          {importStep === 'execute' && (
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-700">
                  正在還原...
                </span>
                <span className="text-sm text-blue-600">
                  {restoreStatus?.progress || 0}%
                </span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${restoreStatus?.progress || 0}%` }}
                />
              </div>
              {restoreStatus?.current_table && (
                <p className="mt-2 text-xs text-blue-600">
                  正在處理: {restoreStatus.current_table}
                </p>
              )}
            </div>
          )}

          {/* 步驟 4: 結果 */}
          {importStep === 'result' && (
            <div>
              {restoreStatus?.status === 'completed' ? (
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="font-medium text-green-700">還原完成！</p>
                  <p className="text-sm text-green-600 mt-1">
                    資料已成功還原到資料庫。
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-red-50 rounded-lg">
                  <p className="font-medium text-red-700">還原失敗</p>
                  <p className="text-sm text-red-600 mt-1">
                    {restoreStatus?.error_message}
                  </p>
                </div>
              )}
              <button
                onClick={resetImport}
                className="mt-4 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                返回
              </button>
            </div>
          )}
        </div>
      )}

      {/* 歷史記錄 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">操作歷史</h2>

        {historyLoading ? (
          <p className="text-gray-500">載入中...</p>
        ) : history.length === 0 ? (
          <p className="text-gray-500">尚無備份或還原記錄</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    類型
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    格式
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    狀態
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    檔案
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    大小
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    操作者
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    時間
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {history.map((record) => (
                  <tr key={record.id}>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          record.type === 'export'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}
                      >
                        {record.type === 'export' ? '匯出' : '還原'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm uppercase">{record.format}</td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          record.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : record.status === 'failed'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {record.status === 'completed'
                          ? '完成'
                          : record.status === 'failed'
                          ? '失敗'
                          : '處理中'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {record.file_name || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {formatFileSize(record.file_size)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {record.created_by_name || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {formatDateTime(record.created_at)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {record.type === 'export' && record.status === 'completed' && (
                        <button
                          onClick={() => handleDownload(record.id, record.file_name)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          下載
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
