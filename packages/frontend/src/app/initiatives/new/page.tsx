'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { initiativeApi, bscApi, kpiApi } from '@/lib/api';
import Link from 'next/link';

interface InitiativeFormData {
  initiative_id: string;
  name_zh: string;
  name_en: string;
  initiative_type: 'policy_response' | 'ranking_improvement' | 'risk_control' | 'innovation';
  status: 'planning' | 'in_progress' | 'completed' | 'cancelled';
  risk_level?: 'high' | 'medium' | 'low';
  start_date: string;
  end_date: string;
  budget: number;
  responsible_unit: string;
  bsc_objective_ids: string[];
  kpi_ids: string[];
  program_tags: string[];
}

interface BscObjective {
  id: string;
  objective_id: string;
  name_zh: string;
  name_en?: string;
}

interface KPI {
  id: string;
  kpi_id: string;
  name_zh: string;
  name_en?: string;
}

export default function NewInitiativePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [bscObjectives, setBscObjectives] = useState<BscObjective[]>([]);
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  
  const [formData, setFormData] = useState<InitiativeFormData>({
    initiative_id: '',
    name_zh: '',
    name_en: '',
    initiative_type: 'policy_response',
    status: 'planning',
    risk_level: undefined,
    start_date: '',
    end_date: '',
    budget: 0,
    responsible_unit: '',
    bsc_objective_ids: [],
    kpi_ids: [],
    program_tags: [],
  });

  useEffect(() => {
    // 載入 BSC 目標和 KPI 列表
    Promise.all([
      bscApi.getObjectives().then((res) => setBscObjectives(res.data)),
      kpiApi.getAll().then((res) => setKpis(res.data)),
    ])
      .catch((err) => {
        console.error('Error loading options:', err);
        alert('載入選項失敗');
      })
      .finally(() => setLoadingOptions(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.bsc_objective_ids.length === 0) {
      alert('請至少選擇一個 BSC 目標');
      return;
    }

    setLoading(true);

    try {
      const submitData = {
        ...formData,
        budget: formData.budget || undefined,
        risk_level: formData.risk_level || undefined,
        start_date: formData.start_date || undefined,
        end_date: formData.end_date || undefined,
        name_en: formData.name_en || undefined,
        kpi_ids: formData.kpi_ids.length > 0 ? formData.kpi_ids : undefined,
        program_tags: formData.program_tags.length > 0 ? formData.program_tags : undefined,
      };
      
      const response = await initiativeApi.create(submitData);
      // 創建成功後重定向到 Initiative 詳情頁
      router.push(`/initiatives/${response.data.id}`);
    } catch (error: any) {
      console.error('Error creating initiative:', error);
      alert(error.response?.data?.error || '創建專案失敗');
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

  const handleCheckboxChange = (
    field: 'bsc_objective_ids' | 'kpi_ids',
    id: string,
    checked: boolean
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: checked
        ? [...prev[field], id]
        : prev[field].filter((item) => item !== id),
    }));
  };

  const handleProgramTagAdd = (tag: string) => {
    if (tag.trim() && !formData.program_tags.includes(tag.trim())) {
      setFormData((prev) => ({
        ...prev,
        program_tags: [...prev.program_tags, tag.trim()],
      }));
    }
  };

  const handleProgramTagRemove = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      program_tags: prev.program_tags.filter((t) => t !== tag),
    }));
  };

  if (loadingOptions) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">載入中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        {/* 麵包屑 */}
        <nav className="mb-6">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Link href="/initiatives" className="hover:text-gray-900">
              策略專案
            </Link>
            <span>/</span>
            <span className="text-gray-900">新增專案</span>
          </div>
        </nav>

        <h1 className="text-2xl font-bold mb-6">新增策略專案</h1>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
          {/* 基本資訊 */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold border-b pb-2">基本資訊</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                專案編號 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="initiative_id"
                value={formData.initiative_id}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="例如: INIT-001"
              />
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  專案類型 <span className="text-red-500">*</span>
                </label>
                <select
                  name="initiative_type"
                  value={formData.initiative_type}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="policy_response">政策回應</option>
                  <option value="ranking_improvement">排名改善</option>
                  <option value="risk_control">風險控制</option>
                  <option value="innovation">創新</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  狀態 <span className="text-red-500">*</span>
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="planning">規劃中</option>
                  <option value="in_progress">進行中</option>
                  <option value="completed">已完成</option>
                  <option value="cancelled">已取消</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  風險等級
                </label>
                <select
                  name="risk_level"
                  value={formData.risk_level || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      risk_level: e.target.value ? (e.target.value as any) : undefined,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">未設定</option>
                  <option value="low">低</option>
                  <option value="medium">中</option>
                  <option value="high">高</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  開始日期
                </label>
                <input
                  type="date"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  結束日期
                </label>
                <input
                  type="date"
                  name="end_date"
                  value={formData.end_date}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  預算
                </label>
                <input
                  type="number"
                  name="budget"
                  value={formData.budget || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      budget: parseFloat(e.target.value) || 0,
                    }))
                  }
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  負責單位 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="responsible_unit"
                  value={formData.responsible_unit}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* BSC 目標關聯 */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold border-b pb-2">
              BSC 目標關聯 <span className="text-red-500">*</span>
            </h2>
            <div className="max-h-60 overflow-y-auto border border-gray-200 rounded p-4">
              {bscObjectives.length === 0 ? (
                <p className="text-gray-500">沒有可用的 BSC 目標</p>
              ) : (
                bscObjectives.map((objective) => (
                  <label
                    key={objective.id}
                    className="flex items-center space-x-2 py-2 hover:bg-gray-50 px-2 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={formData.bsc_objective_ids.includes(objective.id)}
                      onChange={(e) =>
                        handleCheckboxChange('bsc_objective_ids', objective.id, e.target.checked)
                      }
                      className="rounded"
                    />
                    <span className="flex-1">
                      {objective.name_zh}
                      {objective.name_en && (
                        <span className="text-gray-500 ml-2">({objective.name_en})</span>
                      )}
                    </span>
                    <span className="text-xs text-gray-400">{objective.objective_id}</span>
                  </label>
                ))
              )}
            </div>
            {formData.bsc_objective_ids.length === 0 && (
              <p className="text-sm text-red-500">請至少選擇一個 BSC 目標</p>
            )}
          </div>

          {/* KPI 關聯 */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold border-b pb-2">KPI 關聯（選填）</h2>
            <div className="max-h-60 overflow-y-auto border border-gray-200 rounded p-4">
              {kpis.length === 0 ? (
                <p className="text-gray-500">沒有可用的 KPI</p>
              ) : (
                kpis.map((kpi) => (
                  <label
                    key={kpi.id}
                    className="flex items-center space-x-2 py-2 hover:bg-gray-50 px-2 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={formData.kpi_ids.includes(kpi.id)}
                      onChange={(e) =>
                        handleCheckboxChange('kpi_ids', kpi.id, e.target.checked)
                      }
                      className="rounded"
                    />
                    <span className="flex-1">
                      {kpi.name_zh}
                      {kpi.name_en && (
                        <span className="text-gray-500 ml-2">({kpi.name_en})</span>
                      )}
                    </span>
                    <span className="text-xs text-gray-400">{kpi.kpi_id}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* 適用計畫標籤 */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold border-b pb-2">適用計畫標籤（選填）</h2>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.program_tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleProgramTagRemove(tag)}
                    className="ml-2 text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="輸入計畫標籤並按 Enter"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleProgramTagAdd(e.currentTarget.value);
                    e.currentTarget.value = '';
                  }
                }}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* 操作按鈕 */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Link
              href="/initiatives"
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              取消
            </Link>
            <button
              type="submit"
              disabled={loading || formData.bsc_objective_ids.length === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '創建中...' : '創建專案'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
