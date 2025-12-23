'use client';

import { useEffect, useState } from 'react';
import { auditApi } from '@/lib/api';
import Link from 'next/link';

interface AuditLog {
  id: string;
  user_id: string;
  username: string;
  full_name: string;
  action_type: string;
  entity_type: string;
  entity_id: string;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  ip_address: string | null;
  created_at: string;
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [diff, setDiff] = useState<any>(null);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const res = await auditApi.getAuditLogs({ limit: 100 });
      setLogs(res.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      setLoading(false);
    }
  };

  const handleViewDiff = async (logId: string) => {
    try {
      const res = await auditApi.getAuditDiff(logId);
      setDiff(res.data);
      setSelectedLog(logs.find((l) => l.id === logId) || null);
    } catch (error) {
      console.error('Error fetching diff:', error);
      alert('取得對比資料失敗');
    }
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      create: '建立',
      update: '更新',
      delete: '刪除',
      view: '查看',
      export: '匯出',
    };
    return labels[action] || action;
  };

  const getEntityTypeLabel = (entityType: string) => {
    const labels: Record<string, string> = {
      kpi: 'KPI',
      initiatives: '策略專案',
      okr: 'OKR',
      tasks: '任務',
      incidents: '事件',
      pdca: 'PDCA 循環',
      users: '用戶',
      roles: '角色',
      settings: '系統設定',
      notifications: '通知設定',
      audit: '稽核日誌',
      gdpr: '個資合規',
      integrations: '系統對接',
      'data-quality': '資料品質',
      'data-import': '資料匯入',
      export: '資料匯出',
      upload: '檔案上傳',
      trace: '追蹤',
      bsc: 'BSC 平衡計分卡',
    };
    return labels[entityType] || entityType || '未知';
  };

  if (loading) {
    return <div className="p-8">載入中...</div>;
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* 麵包屑 */}
        <nav className="mb-6">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Link href="/settings" className="hover:text-gray-900">
              系統設定
            </Link>
            <span>/</span>
            <span className="text-gray-900">稽核日誌</span>
          </div>
        </nav>

        <h1 className="text-2xl font-bold mb-6">稽核日誌</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 日誌列表 */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-4 border-b">
                <h2 className="font-semibold">操作記錄</h2>
              </div>
              <div className="divide-y max-h-[600px] overflow-y-auto">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="p-4 hover:bg-gray-50 cursor-pointer"
                    onClick={() => log.old_value && log.new_value && handleViewDiff(log.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{log.full_name || log.username}</span>
                          <span className="text-sm text-gray-600">
                            {getActionLabel(log.action_type)}
                          </span>
                          <span className="text-sm text-gray-500">
                            {getEntityTypeLabel(log.entity_type)}
                          </span>
                        </div>
                        {log.field_name && (
                          <p className="text-xs text-gray-500 mt-1">欄位：{log.field_name}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(log.created_at).toLocaleString('zh-TW')}
                        </p>
                      </div>
                      {log.old_value && log.new_value && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewDiff(log.id);
                          }}
                          className="text-blue-600 hover:text-blue-900 text-sm"
                        >
                          查看對比
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 對比面板 */}
          <div className="lg:col-span-1">
            {diff && selectedLog ? (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="font-semibold mb-4">修改對比</h2>
                <div className="space-y-4">
                  <div>
                    <div className="text-sm font-medium mb-2">操作人員</div>
                    <div className="text-sm text-gray-600">
                      {diff.changed_by.full_name} ({diff.changed_by.username})
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium mb-2">操作時間</div>
                    <div className="text-sm text-gray-600">
                      {new Date(diff.changed_at).toLocaleString('zh-TW')}
                    </div>
                  </div>
                  {diff.diff_summary && (
                    <div>
                      <div className="text-sm font-medium mb-2">修改內容</div>
                      <div className="space-y-2">
                        <div className="p-3 bg-red-50 rounded">
                          <div className="text-xs font-medium text-red-800 mb-1">修改前</div>
                          <div className="text-xs text-gray-700 whitespace-pre-wrap">
                            {diff.diff_summary.old_text}
                          </div>
                        </div>
                        <div className="p-3 bg-green-50 rounded">
                          <div className="text-xs font-medium text-green-800 mb-1">修改後</div>
                          <div className="text-xs text-gray-700 whitespace-pre-wrap">
                            {diff.diff_summary.new_text}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-sm text-gray-500">選擇一筆記錄查看對比</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

