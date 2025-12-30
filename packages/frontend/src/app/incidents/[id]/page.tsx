'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import Link from 'next/link';

interface ChecklistItem {
  id: string;
  item_text: string;
  is_completed: boolean;
  completed_by?: string;
  completed_by_name?: string;
  completed_at?: string;
}

interface Notification {
  id: string;
  notified_unit: string;
  notified_at: string;
  notification_proof_url?: string;
}

interface Incident {
  id: string;
  incident_number: string;
  incident_type: string;
  severity: string;
  status: string;
  occurred_at: string;
  location?: string;
  student_name: string;
  student_id?: string;
  contact_info?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  description: string;
  accountable_user_id: string;
  accountable_name?: string;
  resolution_report?: string;
  prevention_measures?: string;
  closed_at?: string;
  created_at: string;
  checklists: ChecklistItem[];
  notifications: Notification[];
}

export default function IncidentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closeForm, setCloseForm] = useState({
    resolution_report: '',
    prevention_measures: '',
  });
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [notificationForm, setNotificationForm] = useState({
    notified_unit: '',
    notification_proof_url: '',
  });

  useEffect(() => {
    if (params.id) {
      fetchIncident();
    }
  }, [params.id]);

  const fetchIncident = async () => {
    try {
      const res = await api.get(`/incidents/${params.id}`);
      setIncident(res.data);
    } catch (error) {
      console.error('Error fetching incident:', error);
      alert('無法載入事件資料');
      router.push('/incidents');
    } finally {
      setLoading(false);
    }
  };

  const handleChecklistToggle = async (checklistId: string, isCompleted: boolean) => {
    if (isCompleted) return; // 已完成的項目不能取消

    setUpdating(checklistId);
    try {
      await api.patch(`/incidents/${params.id}/checklists/${checklistId}`, {
        is_completed: true,
      });
      await fetchIncident();
    } catch (error) {
      console.error('Error updating checklist:', error);
      alert('更新失敗');
    } finally {
      setUpdating(null);
    }
  };

  const handleAddNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post(`/incidents/${params.id}/notifications`, notificationForm);
      setShowNotificationModal(false);
      setNotificationForm({ notified_unit: '', notification_proof_url: '' });
      await fetchIncident();
    } catch (error) {
      console.error('Error adding notification:', error);
      alert('新增通報紀錄失敗');
    }
  };

  const handleCloseIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post(`/incidents/${params.id}/close`, closeForm);
      setShowCloseModal(false);
      await fetchIncident();
      alert('事件已成功結案');
    } catch (error: any) {
      console.error('Error closing incident:', error);
      alert(error.response?.data?.error || '結案失敗');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-600 text-white';
      case 'high':
        return 'bg-orange-500 text-white';
      case 'medium':
        return 'bg-yellow-500 text-white';
      case 'low':
        return 'bg-green-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'closed':
        return 'bg-green-100 text-green-800';
      case 'resolved':
        return 'bg-blue-100 text-blue-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'open':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      open: '開啟',
      in_progress: '處理中',
      resolved: '已解決',
      closed: '已結案',
    };
    return labels[status] || status;
  };

  const getSeverityLabel = (severity: string) => {
    const labels: Record<string, string> = {
      critical: '緊急',
      high: '高',
      medium: '中',
      low: '低',
    };
    return labels[severity] || severity;
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      campus_safety: '校園安全',
      medical: '醫療事件',
      legal: '法務問題',
      visa: '簽證問題',
      other: '其他',
    };
    return labels[type] || type;
  };

  if (loading) {
    return <div className="p-8">載入中...</div>;
  }

  if (!incident) {
    return <div className="p-8">找不到事件資料</div>;
  }

  const completedCount = incident.checklists.filter((c) => c.is_completed).length;
  const totalCount = incident.checklists.length;
  const canClose = completedCount === totalCount && totalCount > 0 && incident.status !== 'closed';

  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto">
        {/* 麵包屑 */}
        <nav className="mb-6">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Link href="/incidents" className="hover:text-gray-900">
              緊急事件管理
            </Link>
            <span>/</span>
            <span className="text-gray-900">{incident.incident_number}</span>
          </div>
        </nav>

        {/* 標題區 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <h1 className="text-2xl font-bold">{incident.incident_number}</h1>
                <span className={`px-3 py-1 rounded text-sm ${getSeverityColor(incident.severity)}`}>
                  {getSeverityLabel(incident.severity)}
                </span>
                <span className={`px-3 py-1 rounded text-sm ${getStatusColor(incident.status)}`}>
                  {getStatusLabel(incident.status)}
                </span>
              </div>
              <p className="text-gray-600">{getTypeLabel(incident.incident_type)}</p>
            </div>
            {canClose && (
              <button
                onClick={() => setShowCloseModal(true)}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                結案
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500">發生時間</span>
              <p className="font-medium">
                {new Date(incident.occurred_at).toLocaleString('zh-TW')}
              </p>
            </div>
            <div>
              <span className="text-gray-500">地點</span>
              <p className="font-medium">{incident.location || '未填寫'}</p>
            </div>
            <div>
              <span className="text-gray-500">負責人</span>
              <p className="font-medium">{incident.accountable_name || '未指定'}</p>
            </div>
            <div>
              <span className="text-gray-500">建立時間</span>
              <p className="font-medium">
                {new Date(incident.created_at).toLocaleString('zh-TW')}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左側：事件詳情 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 當事人資訊 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">當事人資訊</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">姓名</span>
                  <p className="font-medium">{incident.student_name}</p>
                </div>
                <div>
                  <span className="text-gray-500">學號</span>
                  <p className="font-medium">{incident.student_id || '未填寫'}</p>
                </div>
                <div>
                  <span className="text-gray-500">聯絡方式</span>
                  <p className="font-medium">{incident.contact_info || '未填寫'}</p>
                </div>
                <div>
                  <span className="text-gray-500">緊急聯絡人</span>
                  <p className="font-medium">
                    {incident.emergency_contact_name
                      ? `${incident.emergency_contact_name} (${incident.emergency_contact_phone || '無電話'})`
                      : '未填寫'}
                  </p>
                </div>
              </div>
            </div>

            {/* 事件描述 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">事件描述</h2>
              <p className="text-gray-700 whitespace-pre-wrap">{incident.description}</p>
            </div>

            {/* 結案報告（如果已結案） */}
            {incident.status === 'closed' && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold mb-4">結案報告</h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium text-gray-700 mb-2">處理結果</h3>
                    <p className="text-gray-600 whitespace-pre-wrap">
                      {incident.resolution_report || '無'}
                    </p>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-700 mb-2">預防措施</h3>
                    <p className="text-gray-600 whitespace-pre-wrap">
                      {incident.prevention_measures || '無'}
                    </p>
                  </div>
                  {incident.closed_at && (
                    <p className="text-sm text-gray-500">
                      結案時間：{new Date(incident.closed_at).toLocaleString('zh-TW')}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* 通報紀錄 */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">通報紀錄</h2>
                {incident.status !== 'closed' && (
                  <button
                    onClick={() => setShowNotificationModal(true)}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    新增通報
                  </button>
                )}
              </div>
              {incident.notifications.length === 0 ? (
                <p className="text-gray-500">尚無通報紀錄</p>
              ) : (
                <div className="space-y-3">
                  {incident.notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded"
                    >
                      <div>
                        <p className="font-medium">{notification.notified_unit}</p>
                        <p className="text-sm text-gray-500">
                          {new Date(notification.notified_at).toLocaleString('zh-TW')}
                        </p>
                      </div>
                      {notification.notification_proof_url && (
                        <a
                          href={notification.notification_proof_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline text-sm"
                        >
                          查看證明
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 右側：Checklist */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6 sticky top-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">處理進度</h2>
                <span className="text-sm text-gray-600">
                  {completedCount} / {totalCount}
                </span>
              </div>

              {/* 進度條 */}
              <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
                />
              </div>

              <div className="space-y-3">
                {incident.checklists.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3 rounded border ${
                      item.is_completed ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'
                    }`}
                  >
                    <label className="flex items-start space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={item.is_completed}
                        onChange={() => handleChecklistToggle(item.id, item.is_completed)}
                        disabled={item.is_completed || updating === item.id || incident.status === 'closed'}
                        className="mt-1 rounded"
                      />
                      <div className="flex-1">
                        <p
                          className={`text-sm ${
                            item.is_completed ? 'text-green-700 line-through' : 'text-gray-700'
                          }`}
                        >
                          {item.item_text}
                        </p>
                        {item.is_completed && item.completed_by_name && (
                          <p className="text-xs text-gray-500 mt-1">
                            {item.completed_by_name} 於{' '}
                            {item.completed_at
                              ? new Date(item.completed_at).toLocaleString('zh-TW')
                              : ''}
                          </p>
                        )}
                      </div>
                    </label>
                  </div>
                ))}
              </div>

              {incident.status !== 'closed' && completedCount === totalCount && totalCount > 0 && (
                <div className="mt-4 p-3 bg-green-100 rounded text-green-800 text-sm">
                  所有項目已完成，可以進行結案
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 結案 Modal */}
      {showCloseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg mx-4">
            <h2 className="text-xl font-bold mb-4">結案報告</h2>
            <form onSubmit={handleCloseIncident} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  處理結果 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={closeForm.resolution_report}
                  onChange={(e) =>
                    setCloseForm({ ...closeForm, resolution_report: e.target.value })
                  }
                  required
                  rows={4}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="請描述事件的處理結果..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  預防措施 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={closeForm.prevention_measures}
                  onChange={(e) =>
                    setCloseForm({ ...closeForm, prevention_measures: e.target.value })
                  }
                  required
                  rows={4}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="請描述未來如何預防類似事件..."
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCloseModal(false)}
                  className="px-4 py-2 border rounded hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  確認結案
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 新增通報 Modal */}
      {showNotificationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold mb-4">新增通報紀錄</h2>
            <form onSubmit={handleAddNotification} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  通報單位 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={notificationForm.notified_unit}
                  onChange={(e) =>
                    setNotificationForm({ ...notificationForm, notified_unit: e.target.value })
                  }
                  required
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例如：校安中心、國際處..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  證明連結（選填）
                </label>
                <input
                  type="url"
                  value={notificationForm.notification_proof_url}
                  onChange={(e) =>
                    setNotificationForm({
                      ...notificationForm,
                      notification_proof_url: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://..."
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowNotificationModal(false)}
                  className="px-4 py-2 border rounded hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  新增
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
