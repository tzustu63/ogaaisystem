'use client';

import { useState } from 'react';
import api from '@/lib/api';

export default function DataImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [targetTable, setTargetTable] = useState('kpi_values');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const res = await api.post('/data-import/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPreview(res.data);

      // 自動映射（簡化版）
      if (res.data.headers) {
        const autoMapping: Record<string, string> = {};
        res.data.headers.forEach((header: string) => {
          // 嘗試自動匹配
          if (header.toLowerCase().includes('kpi')) {
            autoMapping['kpi_id'] = header;
          } else if (header.toLowerCase().includes('period')) {
            autoMapping['period'] = header;
          } else if (header.toLowerCase().includes('value')) {
            autoMapping['value'] = header;
          }
        });
        setMapping(autoMapping);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('上傳檔案失敗');
    }
  };

  const handleImport = async () => {
    if (!file || !preview) return;

    setImporting(true);
    try {
      const res = await api.post('/data-import/import', {
        target_table: targetTable,
        field_mapping: mapping,
        data: preview.preview,
        file_name: file.name,
      });
      setResult(res.data);
    } catch (error: any) {
      console.error('Error importing data:', error);
      if (error.response?.data?.errors) {
        setResult({ error: true, errors: error.response.data.errors });
      } else {
        alert('匯入資料失敗');
      }
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">資料匯入</h1>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">步驟 1: 上傳檔案</h2>
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileUpload}
            className="mb-4"
          />
          {file && <p className="text-sm text-gray-600">已選擇：{file.name}</p>}
        </div>

        {preview && (
          <>
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">步驟 2: 資料預覽</h2>
              <p className="text-sm text-gray-600 mb-4">
                總共 {preview.totalRows} 筆資料，顯示前 10 筆預覽
              </p>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {preview.headers.map((header: string) => (
                        <th
                          key={header}
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {preview.preview.map((row: any, idx: number) => (
                      <tr key={idx}>
                        {preview.headers.map((header: string) => (
                          <td key={header} className="px-6 py-4 whitespace-nowrap text-sm">
                            {row[header]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">步驟 3: 欄位映射</h2>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">目標資料表</label>
                <select
                  value={targetTable}
                  onChange={(e) => setTargetTable(e.target.value)}
                  className="px-4 py-2 border rounded"
                >
                  <option value="kpi_values">KPI 數值</option>
                  <option value="tasks">任務</option>
                  <option value="incidents">事件</option>
                </select>
              </div>

              <div className="space-y-3">
                {['kpi_id', 'period', 'value', 'target_value'].map((targetField) => (
                  <div key={targetField} className="flex items-center space-x-4">
                    <label className="w-32 text-sm font-medium">{targetField}</label>
                    <select
                      value={mapping[targetField] || ''}
                      onChange={(e) =>
                        setMapping({ ...mapping, [targetField]: e.target.value })
                      }
                      className="flex-1 px-4 py-2 border rounded"
                    >
                      <option value="">-- 選擇來源欄位 --</option>
                      {preview.headers.map((header: string) => (
                        <option key={header} value={header}>
                          {header}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">步驟 4: 匯入資料</h2>
              <button
                onClick={handleImport}
                disabled={importing}
                className="px-6 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50"
              >
                {importing ? '匯入中...' : '開始匯入'}
              </button>
            </div>
          </>
        )}

        {result && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">匯入結果</h2>
            {result.error ? (
              <div>
                <p className="text-red-600 mb-2">匯入失敗</p>
                {result.errors && (
                  <div className="space-y-2">
                    {result.errors.slice(0, 10).map((err: any, idx: number) => (
                      <p key={idx} className="text-sm text-red-600">
                        第 {err.row} 行：{err.error}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <p className="text-green-600 mb-2">匯入成功！</p>
                <p className="text-sm">
                  總筆數：{result.totalRows}，成功：{result.successRows}，失敗：
                  {result.errorRows}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

