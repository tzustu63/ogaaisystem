'use client';

import { useEffect, useState } from 'react';
import { integrationApi } from '@/lib/api';
import Link from 'next/link';

interface Integration {
  id: string;
  system_name: string;
  system_type: string;
  sync_frequency: string;
  last_sync_at: string | null;
  last_sync_status: string | null;
  last_sync_error: string | null;
  is_active: boolean;
}

export default function IntegrationStatusPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
    try {
      const res = await integrationApi.getIntegrations();
      setIntegrations(res.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching integrations:', error);
      setLoading(false);
    }
  };

  const handleSync = async (id: string) => {
    try {
      await integrationApi.triggerSync(id);
      alert('同步已觸發');
      fetchIntegrations();
    } catch (error) {
      console.error('Error triggering sync:', error);
      alert('觸發同步失敗');
    }
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getSystemTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      sis: '學籍系統',
      finance: '財務系統',
      hr: '人資系統',
      api: 'API 對接',
      etl: 'ETL 同步',
    };
    return labels[type] || type;
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
            <Link href="/data" className="hover:text-gray-900">
              數據管理
            </Link>
            <span>/</span>
            <span className="text-gray-900">系統對接狀態</span>
          </div>
        </nav>

        <h1 className="text-2xl font-bold mb-6">系統對接狀態</h1>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">系統名稱</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">對接類型</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">同步頻率</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">最後同步</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">狀態</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {integrations.map((integration) => (
                <tr key={integration.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium">{integration.system_name}</div>
                    {!integration.is_active && (
                      <div className="text-xs text-gray-500">已停用</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {getSystemTypeLabel(integration.system_type)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {integration.sync_frequency || '手動'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {integration.last_sync_at
                      ? new Date(integration.last_sync_at).toLocaleString('zh-TW')
                      : '尚未同步'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded text-xs ${getStatusColor(integration.last_sync_status)}`}>
                      {integration.last_sync_status || '未知'}
                    </span>
                    {integration.last_sync_error && (
                      <div className="text-xs text-red-600 mt-1">{integration.last_sync_error}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => handleSync(integration.id)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      手動同步
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

