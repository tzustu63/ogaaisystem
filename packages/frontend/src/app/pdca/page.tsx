'use client';

import { useEffect, useState } from 'react';
import api, { pdcaApi } from '@/lib/api';
import Link from 'next/link';

interface PDCACycle {
  id: string;
  cycle_name: string;
  check_frequency: string;
  responsible_name?: string;
  initiative_name?: string;
}

interface PDCAAction {
  id: string;
  root_cause: string;
  action_type: string;
  action_items: string[];
  status: string;
  due_date?: string;
  responsible_user_id?: string;
  responsible_name?: string;
  cycle_name?: string;
  expected_kpi_impacts?: string[];
  validation_method?: string;
}

interface User {
  id: string;
  full_name: string;
}

interface KPI {
  id: string;
  name_zh: string;
}

export default function PDCAPage() {
  const [cycles, setCycles] = useState<PDCACycle[]>([]);
  const [actions, setActions] = useState<PDCAAction[]>([]);
  const [activeTab] = useState<'cycles' | 'actions'>('cycles'); // 固定為 cycles，改善行動追蹤已隱藏
  const [loading, setLoading] = useState(true);
  const [showEditActionModal, setShowEditActionModal] = useState(false);
  const [editingAction, setEditingAction] = useState<PDCAAction | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [submitting, setSubmitting] = useState(false);
  
  const [actionForm, setActionForm] = useState({
    root_cause: '',
    action_type: '',
    action_items: [''],
    expected_kpi_impacts: [] as string[],
    validation_method: '',
    responsible_user_id: '',
    due_date: '',
  });

  useEffect(() => {
    fetchData();
    fetchOptions();
  }, []);

  const fetchData = async () => {
    try {
      // 只獲取 PDCA 循環，改善行動追蹤已隱藏
      const cyclesRes = await api.get('/pdca');
      setCycles(cyclesRes.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching PDCA data:', error);
      setLoading(false);
    }
  };

  const fetchOptions = async () => {
    try {
      const [usersRes, kpisRes] = await Promise.all([
        api.get('/users'),
        api.get('/kpi'),
      ]);
      setUsers(usersRes.data || []);
      setKpis(kpisRes.data || []);
    } catch (error) {
      console.error('Error fetching options:', error);
    }
  };

  const handleEditAction = (action: PDCAAction) => {
    setEditingAction(action);
    setActionForm({
      root_cause: action.root_cause || '',
      action_type: action.action_type || '',
      action_items: action.action_items && Array.isArray(action.action_items) && action.action_items.length > 0
        ? action.action_items
        : [''],
      expected_kpi_impacts: action.expected_kpi_impacts && Array.isArray(action.expected_kpi_impacts)
        ? action.expected_kpi_impacts
        : [],
      validation_method: action.validation_method || '',
      responsible_user_id: action.responsible_user_id || '',
      due_date: action.due_date || '',
    });
    setShowEditActionModal(true);
  };

  const handleUpdateAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAction) return;
    setSubmitting(true);
    try {
      await pdcaApi.updateAction(editingAction.id, {
        root_cause: actionForm.root_cause,
        action_type: actionForm.action_type,
        action_items: actionForm.action_items.filter((item) => item.trim() !== ''),
        expected_kpi_impacts: actionForm.expected_kpi_impacts,
        validation_method: actionForm.validation_method || undefined,
        responsible_user_id: actionForm.responsible_user_id,
        due_date: actionForm.due_date || undefined,
        status: editingAction.status || 'pending',
      });
      setShowEditActionModal(false);
      setEditingAction(null);
      setActionForm({
        root_cause: '',
        action_type: '',
        action_items: [''],
        expected_kpi_impacts: [],
        validation_method: '',
        responsible_user_id: '',
        due_date: '',
      });
      await fetchData();
    } catch (error: any) {
      alert(error.response?.data?.error || '更新 Action 失敗');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAction = async (actionId: string) => {
    if (!confirm('確定要刪除此改善行動嗎？')) return;
    setSubmitting(true);
    try {
      await pdcaApi.deleteAction(actionId);
      await fetchData();
    } catch (error: any) {
      alert(error.response?.data?.error || '刪除 Action 失敗');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRootCauseLabel = (cause: string) => {
    const labels: Record<string, string> = {
      human: '人力',
      process: '流程',
      system: '系統',
      external_policy: '外部政策',
      partner: '合作方',
    };
    return labels[cause] || cause;
  };

  if (loading) {
    return <div className="p-8">載入中...</div>;
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">PDCA 循環管理</h1>
          <Link
            href="/pdca/new"
            className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
          >
            新增循環
          </Link>
        </div>

        {/* 標籤切換 - 改善行動追蹤已隱藏，功能與 PDCA 循環重疊 */}
        {/* <div className="mb-6 border-b">
          <div className="flex space-x-4">
            <button
              onClick={() => setActiveTab('cycles')}
              className={`px-4 py-2 font-medium ${
                activeTab === 'cycles'
                  ? 'border-b-2 border-primary-600 text-primary-600'
                  : 'text-gray-600'
              }`}
            >
              PDCA 循環
            </button>
            <button
              onClick={() => setActiveTab('actions')}
              className={`px-4 py-2 font-medium ${
                activeTab === 'actions'
                  ? 'border-b-2 border-primary-600 text-primary-600'
                  : 'text-gray-600'
              }`}
            >
              改善行動追蹤
            </button>
          </div>
        </div> */}

        {/* PDCA 循環列表 */}
        {activeTab === 'cycles' && (
          <div className="space-y-4">
            {cycles.map((cycle) => (
              <div key={cycle.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold mb-2">{cycle.cycle_name}</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">檢核頻率</span>
                        <p className="font-medium">{cycle.check_frequency}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">負責人</span>
                        <p className="font-medium">{cycle.responsible_name || '未指定'}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">關聯專案</span>
                        <p className="font-medium">{cycle.initiative_name || '無'}</p>
                      </div>
                    </div>
                  </div>

                  <Link
                    href={`/pdca/${cycle.id}`}
                    className="ml-4 px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
                  >
                    查看詳情
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 改善行動列表 - 已隱藏，功能與 PDCA 循環重疊 */}
        {false && activeTab === 'actions' && (
          <div className="space-y-4">
            {actions.map((action) => (
              <div key={action.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h2 className="text-xl font-semibold">改善行動</h2>
                      <span
                        className={`px-2 py-1 rounded text-xs ${getStatusColor(
                          action.status
                        )}`}
                      >
                        {action.status}
                      </span>
                      <span className="text-sm text-gray-600">
                        {getRootCauseLabel(action.root_cause)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                      <div>
                        <span className="text-gray-600">對策類型</span>
                        <p className="font-medium">{action.action_type}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">負責人</span>
                        <p className="font-medium">{action.responsible_name || '未指定'}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">截止日期</span>
                        <p className="font-medium">
                          {action.due_date
                            ? new Date(action.due_date).toLocaleDateString('zh-TW')
                            : '未設定'}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-600">PDCA 循環</span>
                        <p className="font-medium">{action.cycle_name || '無'}</p>
                      </div>
                    </div>

                    {action.action_items && action.action_items.length > 0 && (
                      <div>
                        <h3 className="font-medium mb-2">具體行動</h3>
                        <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                          {action.action_items.map((item, idx) => (
                            <li key={idx}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleEditAction(action)}
                      className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                      disabled={submitting}
                    >
                      編輯
                    </button>
                    <button
                      onClick={() => handleDeleteAction(action.id)}
                      className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                      disabled={submitting}
                    >
                      刪除
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 編輯 Action 模態框 */}
      {showEditActionModal && editingAction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">編輯改善行動</h3>
            <form onSubmit={handleUpdateAction} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  根本原因 <span className="text-red-500">*</span>
                </label>
                <select
                  value={actionForm.root_cause}
                  onChange={(e) =>
                    setActionForm({ ...actionForm, root_cause: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">請選擇</option>
                  <option value="human">人力</option>
                  <option value="process">流程</option>
                  <option value="system">系統</option>
                  <option value="external_policy">外部政策</option>
                  <option value="partner">合作方</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  對策類型 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={actionForm.action_type}
                  onChange={(e) =>
                    setActionForm({ ...actionForm, action_type: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                  placeholder="例如：流程優化、系統改善等"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  具體行動 <span className="text-red-500">*</span>
                </label>
                {actionForm.action_items.map((item, idx) => (
                  <div key={idx} className="mb-2 flex gap-2">
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => {
                        const newItems = [...actionForm.action_items];
                        newItems[idx] = e.target.value;
                        setActionForm({ ...actionForm, action_items: newItems });
                      }}
                      className="flex-1 px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                      placeholder={`行動項目 ${idx + 1}`}
                      required
                    />
                    {actionForm.action_items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const newItems = actionForm.action_items.filter((_, i) => i !== idx);
                          setActionForm({ ...actionForm, action_items: newItems });
                        }}
                        className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                      >
                        刪除
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setActionForm({
                      ...actionForm,
                      action_items: [...actionForm.action_items, ''],
                    })
                  }
                  className="mt-2 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
                >
                  + 新增行動項目
                </button>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  預期影響的 KPI
                </label>
                <div className="max-h-40 overflow-y-auto border rounded p-3">
                  {kpis.map((kpi) => (
                    <label key={kpi.id} className="flex items-center space-x-2 mb-2">
                      <input
                        type="checkbox"
                        checked={actionForm.expected_kpi_impacts.includes(kpi.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setActionForm({
                              ...actionForm,
                              expected_kpi_impacts: [...actionForm.expected_kpi_impacts, kpi.id],
                            });
                          } else {
                            setActionForm({
                              ...actionForm,
                              expected_kpi_impacts: actionForm.expected_kpi_impacts.filter(
                                (id) => id !== kpi.id
                              ),
                            });
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm">{kpi.name_zh}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">驗證方法</label>
                <textarea
                  value={actionForm.validation_method}
                  onChange={(e) =>
                    setActionForm({ ...actionForm, validation_method: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="描述如何驗證改善行動的效果"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  負責人 <span className="text-red-500">*</span>
                </label>
                <select
                  value={actionForm.responsible_user_id}
                  onChange={(e) =>
                    setActionForm({ ...actionForm, responsible_user_id: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">請選擇</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.full_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">截止日期</label>
                <input
                  type="date"
                  value={actionForm.due_date}
                  onChange={(e) =>
                    setActionForm({ ...actionForm, due_date: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditActionModal(false);
                    setEditingAction(null);
                    setActionForm({
                      root_cause: '',
                      action_type: '',
                      action_items: [''],
                      expected_kpi_impacts: [],
                      validation_method: '',
                      responsible_user_id: '',
                      due_date: '',
                    });
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? '更新中...' : '更新改善行動'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

