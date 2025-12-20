'use client';

import { useEffect, useState } from 'react';
import { gdprApi } from '@/lib/api';
import Link from 'next/link';

interface CollectionPurpose {
  id: string;
  purpose_name: string;
  description: string;
  legal_basis: string;
  notified_at: string;
  notification_method: string;
}

interface ConsentForm {
  id: string;
  data_subject_id: string;
  data_subject_type: string;
  consent_scope: string;
  consent_date: string;
  expiry_date: string | null;
  is_active: boolean;
}

interface RetentionPolicy {
  id: string;
  data_type: string;
  retention_period_days: number;
  auto_delete: boolean;
  reminder_days_before: number;
}

interface DeletionRequest {
  id: string;
  requestor_id: string;
  requestor_type: string;
  request_reason: string;
  status: string;
  created_at: string;
}

export default function GDPRPage() {
  const [activeTab, setActiveTab] = useState<'purposes' | 'consents' | 'retention' | 'deletion'>('purposes');
  const [purposes, setPurposes] = useState<CollectionPurpose[]>([]);
  const [consents, setConsents] = useState<ConsentForm[]>([]);
  const [policies, setPolicies] = useState<RetentionPolicy[]>([]);
  const [requests, setRequests] = useState<DeletionRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case 'purposes':
          const purposesRes = await gdprApi.getCollectionPurposes();
          setPurposes(purposesRes.data);
          break;
        case 'consents':
          const consentsRes = await gdprApi.getConsentForms();
          setConsents(consentsRes.data);
          break;
        case 'retention':
          const policiesRes = await gdprApi.getRetentionPolicies();
          setPolicies(policiesRes.data);
          break;
        case 'deletion':
          const requestsRes = await gdprApi.getDeletionRequests();
          setRequests(requestsRes.data);
          break;
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

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
            <span className="text-gray-900">個資合規</span>
          </div>
        </nav>

        <h1 className="text-2xl font-bold mb-6">個資合規管理</h1>

        {/* 標籤頁 */}
        <div className="border-b mb-6">
          <div className="flex space-x-4">
            {[
              { id: 'purposes', label: '資料蒐集目的' },
              { id: 'consents', label: '同意書管理' },
              { id: 'retention', label: '保存期限政策' },
              { id: 'deletion', label: '刪除請求' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 border-b-2 ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center">載入中...</div>
        ) : (
          <>
            {activeTab === 'purposes' && (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="p-4 border-b flex justify-between items-center">
                  <h2 className="font-semibold">資料蒐集目的</h2>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded text-sm">
                    新增目的
                  </button>
                </div>
                <div className="divide-y">
                  {purposes.map((purpose) => (
                    <div key={purpose.id} className="p-4">
                      <h3 className="font-medium">{purpose.purpose_name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{purpose.description}</p>
                      <div className="text-xs text-gray-500 mt-2">
                        法源依據：{purpose.legal_basis || '未指定'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'consents' && (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="p-4 border-b">
                  <h2 className="font-semibold">同意書管理</h2>
                </div>
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">當事人</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">同意範圍</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">同意日期</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">到期日</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">狀態</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {consents.map((consent) => (
                      <tr key={consent.id}>
                        <td className="px-6 py-4 text-sm">{consent.data_subject_id}</td>
                        <td className="px-6 py-4 text-sm">{consent.consent_scope}</td>
                        <td className="px-6 py-4 text-sm">
                          {new Date(consent.consent_date).toLocaleDateString('zh-TW')}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {consent.expiry_date
                            ? new Date(consent.expiry_date).toLocaleDateString('zh-TW')
                            : '無限期'}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2 py-1 rounded text-xs ${
                              consent.is_active
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {consent.is_active ? '有效' : '已失效'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'retention' && (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="p-4 border-b flex justify-between items-center">
                  <h2 className="font-semibold">資料保存期限政策</h2>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded text-sm">
                    新增政策
                  </button>
                </div>
                <div className="divide-y">
                  {policies.map((policy) => (
                    <div key={policy.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium">{policy.data_type}</h3>
                          <p className="text-sm text-gray-600 mt-1">
                            保存期限：{policy.retention_period_days} 天
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            到期前 {policy.reminder_days_before} 天提醒 |{' '}
                            {policy.auto_delete ? '自動刪除' : '手動刪除'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'deletion' && (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="p-4 border-b">
                  <h2 className="font-semibold">資料刪除請求</h2>
                </div>
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">請求人</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">請求原因</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">狀態</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">建立時間</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {requests.map((request) => (
                      <tr key={request.id}>
                        <td className="px-6 py-4 text-sm">{request.requestor_id}</td>
                        <td className="px-6 py-4 text-sm">{request.request_reason || '-'}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-xs ${getStatusColor(request.status)}`}>
                            {request.status === 'pending' && '待處理'}
                            {request.status === 'approved' && '已核准'}
                            {request.status === 'rejected' && '已拒絕'}
                            {request.status === 'completed' && '已完成'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {new Date(request.created_at).toLocaleDateString('zh-TW')}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {request.status === 'pending' && (
                            <button
                              onClick={async () => {
                                if (confirm('確定核准此刪除請求？')) {
                                  try {
                                    await gdprApi.approveDeletionRequest(request.id);
                                    alert('已核准');
                                    fetchData();
                                  } catch (error) {
                                    alert('核准失敗');
                                  }
                                }
                              }}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              核准
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

