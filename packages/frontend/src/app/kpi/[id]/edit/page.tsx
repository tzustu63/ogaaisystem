'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { kpiApi, initiativeApi } from '@/lib/api';
import api from '@/lib/api';
import Link from 'next/link';

interface KPIFormData {
  kpi_id: string;
  name_zh: string;
  name_en: string;
  definition: string;
  formula: string;
  data_source: string;
  data_steward: string;
  update_frequency: string;
  target_value: {
    annual?: number;
  };
  thresholds: {
    mode: string;
    green?: any;
    yellow?: any;
    red?: any;
  };
}

interface Initiative {
  id: string;
  initiative_id: string;
  name_zh: string;
  status: string;
}


interface NewInitiativeForm {
  initiative_id: string;
  name_zh: string;
  initiative_type: string;
  responsible_unit: string;
  status: string;
}

interface SystemOption {
  id: string;
  value: string;
  label: string;
}

export default function EditKPIPage() {
  const router = useRouter();
  const params = useParams();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [allInitiatives, setAllInitiatives] = useState<Initiative[]>([]);
  const [selectedInitiativeIds, setSelectedInitiativeIds] = useState<string[]>([]);
  const [showNewInitiativeModal, setShowNewInitiativeModal] = useState(false);
  const [creatingInitiative, setCreatingInitiative] = useState(false);
  const [systemOptions, setSystemOptions] = useState<Record<string, SystemOption[]>>({});

  const [newInitiative, setNewInitiative] = useState<NewInitiativeForm>({
    initiative_id: '',
    name_zh: '',
    initiative_type: '',
    responsible_unit: '',
    status: 'planning',
  });

  const [formData, setFormData] = useState<KPIFormData>({
    kpi_id: '',
    name_zh: '',
    name_en: '',
    definition: '',
    formula: '',
    data_source: '',
    data_steward: '',
    update_frequency: 'monthly',
    target_value: {
      annual: 0,
    },
    thresholds: {
      mode: 'fixed',
      green: { min: 80, max: 100 },
      yellow: { min: 60, max: 79 },
      red: { min: 0, max: 59 },
    },
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [kpiRes, initiativesRes, optionsRes] = await Promise.all([
          kpiApi.getById(params.id as string),
          initiativeApi.getAll(),
          api.get('/system-options'),
        ]);

        const kpi = kpiRes.data;
        setFormData({
          kpi_id: kpi.kpi_id || '',
          name_zh: kpi.name_zh || '',
          name_en: kpi.name_en || '',
          definition: kpi.definition || '',
          formula: kpi.formula || '',
          data_source: kpi.data_source || '',
          data_steward: kpi.data_steward || '',
          update_frequency: kpi.update_frequency || 'monthly',
          target_value: kpi.target_value || { annual: 0 },
          thresholds: kpi.thresholds || {
            mode: 'fixed',
            green: { min: 80, max: 100 },
            yellow: { min: 60, max: 79 },
            red: { min: 0, max: 59 },
          },
        });

        // 已關聯的策略專案
        if (kpi.initiatives && Array.isArray(kpi.initiatives)) {
          setSelectedInitiativeIds(kpi.initiatives.map((i: Initiative) => i.id));
        }

        // 確保資料是陣列
        setAllInitiatives(Array.isArray(initiativesRes.data) ? initiativesRes.data : []);

        // 整理系統選項
        const opts: Record<string, SystemOption[]> = {};
        const optionsData = optionsRes.data;
        if (Array.isArray(optionsData)) {
          optionsData.forEach((opt: any) => {
            if (!opts[opt.category]) opts[opt.category] = [];
            if (opt.is_active) {
              opts[opt.category].push(opt);
            }
          });
        }
        setSystemOptions(opts);

        // 獲取新策略專案編號
        fetchNextInitiativeId();
      } catch (err) {
        console.error('Error fetching data:', err);
        alert('載入資料失敗');
      } finally {
        setFetching(false);
      }
    };

    if (params.id) {
      fetchData();
    }
  }, [params.id]);

  const fetchNextInitiativeId = async () => {
    try {
      const res = await api.get('/system-options/next-initiative-id');
      setNewInitiative(prev => ({ ...prev, initiative_id: res.data.next_id }));
    } catch (error) {
      console.error('Error fetching next initiative ID:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 更新 KPI 基本資料
      await kpiApi.update(params.id as string, formData);

      // 更新關聯策略專案
      await kpiApi.updateInitiatives(params.id as string, selectedInitiativeIds);

      alert('更新成功');
      router.push(`/kpi/${params.id}`);
    } catch (error: any) {
      console.error('Error updating KPI:', error);
      const errorMsg = error.response?.data?.errors?.join('\n') || 
                       error.response?.data?.error || 
                       '更新失敗';
      alert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleInitiativeSelect = (id: string) => {
    setSelectedInitiativeIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(i => i !== id);
      } else {
        return [...prev, id];
      }
    });
  };


  const handleCreateInitiative = async () => {
    if (!newInitiative.name_zh || !newInitiative.initiative_type || !newInitiative.responsible_unit) {
      alert('請填寫所有必填欄位');
      return;
    }

    setCreatingInitiative(true);
    try {
      const res = await initiativeApi.create(newInitiative);
      const created = res.data;

      // 將新建的策略專案加入列表和已選擇
      setAllInitiatives(prev => [...prev, created]);
      setSelectedInitiativeIds(prev => [...prev, created.id]);

      setShowNewInitiativeModal(false);
      // 重置表單並獲取新編號
      setNewInitiative({
        initiative_id: '',
        name_zh: '',
        initiative_type: '',
        responsible_unit: '',
        status: 'planning',
      });
      fetchNextInitiativeId();

      alert('策略專案已建立並關聯');
    } catch (error: any) {
      console.error('Error creating initiative:', error);
      alert(error.response?.data?.error || '建立策略專案失敗');
    } finally {
      setCreatingInitiative(false);
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      planning: '規劃中',
      in_progress: '進行中',
      completed: '已完成',
      cancelled: '已取消',
    };
    return labels[status] || status;
  };

  if (fetching) {
    return <div className="p-8">載入中...</div>;
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        {/* 麵包屑 */}
        <nav className="mb-6">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Link href="/kpi" className="hover:text-gray-900">
              KPI
            </Link>
            <span>/</span>
            <Link href={`/kpi/${params.id}`} className="hover:text-gray-900">
              {formData.name_zh}
            </Link>
            <span>/</span>
            <span className="text-gray-900">編輯</span>
          </div>
        </nav>

        <h1 className="text-2xl font-bold mb-6">編輯 KPI</h1>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
          {/* 基本資訊 */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold border-b pb-2">基本資訊</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ID
              </label>
              <input
                type="text"
                name="kpi_id"
                value={formData.kpi_id}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-700 cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-gray-500">ID 建立後無法修改</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  中文名稱 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name_zh"
                  value={formData.name_zh}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  英文名稱
                </label>
                <input
                  type="text"
                  name="name_en"
                  value={formData.name_en}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                更新頻率 <span className="text-red-500">*</span>
              </label>
              <select
                name="update_frequency"
                value={formData.update_frequency}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="monthly">每月</option>
                <option value="quarterly">每季</option>
                <option value="ad_hoc">不定期</option>
              </select>
            </div>
          </div>

          {/* 定義與公式 */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold border-b pb-2">定義與公式</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                定義 <span className="text-red-500">*</span>
              </label>
              <textarea
                name="definition"
                value={formData.definition}
                onChange={handleInputChange}
                required
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                計算公式 <span className="text-red-500">*</span>
              </label>
              <textarea
                name="formula"
                value={formData.formula}
                onChange={handleInputChange}
                required
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="例如: (實際值 / 目標值) * 100"
              />
            </div>
          </div>

          {/* 資料來源與負責人 */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold border-b pb-2">資料來源與負責人</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  資料來源 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="data_source"
                  value={formData.data_source}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  資料負責人 <span className="text-red-500">*</span>
                </label>
                <select
                  name="data_steward"
                  value={formData.data_steward}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">請選擇負責人</option>
                  {(systemOptions['person'] || []).map((person) => (
                    <option key={person.id} value={person.label}>
                      {person.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 目標值 */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold border-b pb-2">目標值</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                年度目標
              </label>
              <input
                type="number"
                value={formData.target_value.annual || ''}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    target_value: {
                      ...prev.target_value,
                      annual: parseFloat(e.target.value) || 0,
                    },
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* 閾值設定 */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold border-b pb-2">閾值設定（燈號）</h2>

            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-green-50 rounded-lg">
                <label className="block text-sm font-medium text-green-800 mb-2">
                  🟢 綠燈範圍
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    value={formData.thresholds.green?.min || 80}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        thresholds: {
                          ...prev.thresholds,
                          green: {
                            ...prev.thresholds.green,
                            min: parseFloat(e.target.value) || 0,
                          },
                        },
                      }))
                    }
                    className="w-20 px-2 py-1 border rounded text-sm"
                  />
                  <span>~</span>
                  <input
                    type="number"
                    value={formData.thresholds.green?.max || 100}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        thresholds: {
                          ...prev.thresholds,
                          green: {
                            ...prev.thresholds.green,
                            max: parseFloat(e.target.value) || 0,
                          },
                        },
                      }))
                    }
                    className="w-20 px-2 py-1 border rounded text-sm"
                  />
                </div>
              </div>

              <div className="p-4 bg-yellow-50 rounded-lg">
                <label className="block text-sm font-medium text-yellow-800 mb-2">
                  🟡 黃燈範圍
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    value={formData.thresholds.yellow?.min || 60}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        thresholds: {
                          ...prev.thresholds,
                          yellow: {
                            ...prev.thresholds.yellow,
                            min: parseFloat(e.target.value) || 0,
                          },
                        },
                      }))
                    }
                    className="w-20 px-2 py-1 border rounded text-sm"
                  />
                  <span>~</span>
                  <input
                    type="number"
                    value={formData.thresholds.yellow?.max || 79}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        thresholds: {
                          ...prev.thresholds,
                          yellow: {
                            ...prev.thresholds.yellow,
                            max: parseFloat(e.target.value) || 0,
                          },
                        },
                      }))
                    }
                    className="w-20 px-2 py-1 border rounded text-sm"
                  />
                </div>
              </div>

              <div className="p-4 bg-red-50 rounded-lg">
                <label className="block text-sm font-medium text-red-800 mb-2">
                  🔴 紅燈範圍
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    value={formData.thresholds.red?.min || 0}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        thresholds: {
                          ...prev.thresholds,
                          red: {
                            ...prev.thresholds.red,
                            min: parseFloat(e.target.value) || 0,
                          },
                        },
                      }))
                    }
                    className="w-20 px-2 py-1 border rounded text-sm"
                  />
                  <span>~</span>
                  <input
                    type="number"
                    value={formData.thresholds.red?.max || 59}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        thresholds: {
                          ...prev.thresholds,
                          red: {
                            ...prev.thresholds.red,
                            max: parseFloat(e.target.value) || 0,
                          },
                        },
                      }))
                    }
                    className="w-20 px-2 py-1 border rounded text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 策略專案關聯 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h2 className="text-lg font-semibold">關聯策略專案</h2>
              <button
                type="button"
                onClick={() => setShowNewInitiativeModal(true)}
                className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
              >
                ＋ 新增策略專案
              </button>
            </div>

            <div className="border rounded-lg max-h-60 overflow-y-auto">
              {allInitiatives.length === 0 ? (
                <p className="p-4 text-gray-500 text-center">尚無策略專案</p>
              ) : (
                <div className="divide-y">
                  {allInitiatives.map((initiative) => (
                    <label
                      key={initiative.id}
                      className="flex items-center p-3 hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedInitiativeIds.includes(initiative.id)}
                        onChange={() => handleInitiativeSelect(initiative.id)}
                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      <div className="ml-3 flex-1">
                        <span className="font-medium">{initiative.name_zh}</span>
                        <span className="ml-2 text-xs text-gray-500">
                          ({initiative.initiative_id})
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 text-xs rounded ${
                        initiative.status === 'completed' ? 'bg-green-100 text-green-800' :
                        initiative.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                        initiative.status === 'cancelled' ? 'bg-gray-100 text-gray-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {getStatusLabel(initiative.status)}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500">
              已選擇 {selectedInitiativeIds.length} 個策略專案
            </p>
          </div>

          {/* 操作按鈕 */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Link
              href={`/kpi/${params.id}`}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              取消
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '儲存中...' : '儲存變更'}
            </button>
          </div>
        </form>
      </div>

      {/* 新增策略專案 Modal */}
      {showNewInitiativeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">新增策略專案</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  專案編號
                </label>
                <input
                  type="text"
                  value={newInitiative.initiative_id}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  專案名稱 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newInitiative.name_zh}
                  onChange={(e) => setNewInitiative(prev => ({ ...prev, name_zh: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="輸入專案名稱"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  專案類型 <span className="text-red-500">*</span>
                </label>
                <select
                  value={newInitiative.initiative_type}
                  onChange={(e) => setNewInitiative(prev => ({ ...prev, initiative_type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">請選擇</option>
                  {(systemOptions['initiative_type'] || []).map(opt => (
                    <option key={opt.id} value={opt.value}>{opt.label}</option>
                  ))}
                  {(!systemOptions['initiative_type'] || systemOptions['initiative_type'].length === 0) && (
                    <>
                      <option value="strategic">策略性專案</option>
                      <option value="operational">營運專案</option>
                      <option value="improvement">改善專案</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  負責單位 <span className="text-red-500">*</span>
                </label>
                <select
                  value={newInitiative.responsible_unit}
                  onChange={(e) => setNewInitiative(prev => ({ ...prev, responsible_unit: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">請選擇</option>
                  {(systemOptions['department'] || []).map(opt => (
                    <option key={opt.id} value={opt.value}>{opt.label}</option>
                  ))}
                  {(!systemOptions['department'] || systemOptions['department'].length === 0) && (
                    <>
                      <option value="IT">資訊部</option>
                      <option value="HR">人力資源部</option>
                      <option value="Finance">財務部</option>
                      <option value="Operations">營運部</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  狀態
                </label>
                <select
                  value={newInitiative.status}
                  onChange={(e) => setNewInitiative(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="planning">規劃中</option>
                  <option value="in_progress">進行中</option>
                  <option value="completed">已完成</option>
                  <option value="cancelled">已取消</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={() => setShowNewInitiativeModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleCreateInitiative}
                disabled={creatingInitiative}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {creatingInitiative ? '建立中...' : '建立並關聯'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
