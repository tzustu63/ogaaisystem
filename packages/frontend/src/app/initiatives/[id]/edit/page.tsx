'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { initiativeApi, kpiApi } from '@/lib/api';
import api from '@/lib/api';
import Link from 'next/link';

interface InitiativeFormData {
  initiative_id: string;
  name_zh: string;
  name_en: string;
  initiative_type: string;
  status: 'planning' | 'in_progress' | 'completed' | 'cancelled';
  risk_level?: 'high' | 'medium' | 'low';
  start_date: string;
  end_date: string;
  budget: number;
  responsible_unit: string;
  primary_owner: string;
  co_owners: string[];
  funding_sources: string[];
  related_indicators: string[];
  kpi_ids: string[];
  notes: string;
}

interface KPI {
  id: string;
  kpi_id: string;
  name_zh: string;
  name_en?: string;
}

interface SystemOption {
  id: string;
  value: string;
  label: string;
}

export default function EditInitiativePage() {
  const router = useRouter();
  const params = useParams();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  
  // 系統選項
  const [initiativeTypes, setInitiativeTypes] = useState<SystemOption[]>([]);
  const [departments, setDepartments] = useState<SystemOption[]>([]);
  const [persons, setPersons] = useState<SystemOption[]>([]);
  const [fundingSources, setFundingSources] = useState<SystemOption[]>([]);
  const [indicators, setIndicators] = useState<SystemOption[]>([]);
  
  const [formData, setFormData] = useState<InitiativeFormData>({
    initiative_id: '',
    name_zh: '',
    name_en: '',
    initiative_type: '',
    status: 'planning',
    risk_level: undefined,
    start_date: '',
    end_date: '',
    budget: 0,
    responsible_unit: '',
    primary_owner: '',
    co_owners: [],
    funding_sources: [],
    related_indicators: [],
    kpi_ids: [],
    notes: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 載入所有選項
        const [kpisRes, typesRes, deptsRes, personsRes, sourcesRes, indicatorsRes, initiativeRes] = await Promise.all([
          kpiApi.getAll(),
          api.get('/system-options/category/initiative_type'),
          api.get('/system-options/category/department'),
          api.get('/system-options/category/person'),
          api.get('/system-options/category/funding_source'),
          api.get('/system-options/category/indicator'),
          initiativeApi.getById(params.id as string),
        ]);

        setKpis(kpisRes.data);
        setInitiativeTypes(typesRes.data);
        setDepartments(deptsRes.data);
        setPersons(personsRes.data);
        setFundingSources(sourcesRes.data);
        setIndicators(indicatorsRes.data);

        // 載入策略專案資料
        const initiative = initiativeRes.data;
        
        // 格式化日期（從 YYYY-MM-DD 或 Date 物件）
        const formatDate = (date: any) => {
          if (!date) return '';
          if (typeof date === 'string') {
            return date.split('T')[0]; // 取日期部分
          }
          return '';
        };

        setFormData({
          initiative_id: initiative.initiative_id || '',
          name_zh: initiative.name_zh || '',
          name_en: initiative.name_en || '',
          initiative_type: initiative.initiative_type || '',
          status: initiative.status || 'planning',
          risk_level: initiative.risk_level || undefined,
          start_date: formatDate(initiative.start_date),
          end_date: formatDate(initiative.end_date),
          budget: initiative.budget || 0,
          responsible_unit: initiative.responsible_unit || '',
          primary_owner: initiative.primary_owner || '',
          co_owners: initiative.co_owners || [],
          funding_sources: initiative.funding_sources || [],
          related_indicators: initiative.related_indicators || [],
          kpi_ids: initiative.kpis?.map((k: any) => k.id) || [],
          notes: initiative.notes || '',
        });
      } catch (error) {
        console.error('Error fetching data:', error);
        alert('載入資料失敗');
      } finally {
        setFetching(false);
        setLoadingOptions(false);
      }
    };

    if (params.id) {
      fetchData();
    }
  }, [params.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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
        co_owners: formData.co_owners.length > 0 ? formData.co_owners : undefined,
        funding_sources: formData.funding_sources.length > 0 ? formData.funding_sources : undefined,
        related_indicators: formData.related_indicators.length > 0 ? formData.related_indicators : undefined,
        notes: formData.notes || undefined,
      };
      
      await initiativeApi.update(params.id as string, submitData);
      router.push(`/initiatives/${params.id}`);
    } catch (error: any) {
      console.error('Error updating initiative:', error);
      alert(error.response?.data?.error || '更新專案失敗');
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

  const handleMultiSelectChange = (
    field: 'co_owners' | 'funding_sources' | 'related_indicators' | 'kpi_ids',
    value: string,
    checked: boolean
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: checked
        ? [...prev[field], value]
        : prev[field].filter((item) => item !== value),
    }));
  };

  if (fetching || loadingOptions) {
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
            <Link href={`/initiatives/${params.id}`} className="hover:text-gray-900">
              詳情
            </Link>
            <span>/</span>
            <span className="text-gray-900">編輯</span>
          </div>
        </nav>

        <h1 className="text-2xl font-bold mb-6">編輯策略專案</h1>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
          {/* 基本資訊 */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold border-b pb-2">基本資訊</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  專案編號
                </label>
                <input
                  type="text"
                  name="initiative_id"
                  value={formData.initiative_id}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

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
                  <option value="">請選擇</option>
                  {initiativeTypes.map((type) => (
                    <option key={type.id} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
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
            </div>

            <div className="grid grid-cols-3 gap-4">
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
            </div>
          </div>

          {/* 負責單位與人員 */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold border-b pb-2">負責單位與人員</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  負責單位 <span className="text-red-500">*</span>
                </label>
                <select
                  name="responsible_unit"
                  value={formData.responsible_unit}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">請選擇</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.value}>
                      {dept.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  主要負責人
                </label>
                <select
                  name="primary_owner"
                  value={formData.primary_owner}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">請選擇</option>
                  {persons.map((person) => (
                    <option key={person.id} value={person.value}>
                      {person.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                共同負責人（可多選）
              </label>
              <div className="max-h-40 overflow-y-auto border border-gray-200 rounded p-3 grid grid-cols-3 gap-2">
                {persons.map((person) => (
                  <label key={person.id} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.co_owners.includes(person.value)}
                      onChange={(e) =>
                        handleMultiSelectChange('co_owners', person.value, e.target.checked)
                      }
                      className="rounded"
                    />
                    <span className="text-sm">{person.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* 經費與指標 */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold border-b pb-2">經費來源與對應指標</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                經費來源（可多選）
              </label>
              <div className="max-h-40 overflow-y-auto border border-gray-200 rounded p-3 grid grid-cols-3 gap-2">
                {fundingSources.map((source) => (
                  <label key={source.id} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.funding_sources.includes(source.value)}
                      onChange={(e) =>
                        handleMultiSelectChange('funding_sources', source.value, e.target.checked)
                      }
                      className="rounded"
                    />
                    <span className="text-sm">{source.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                對應指標（可多選）
              </label>
              <div className="max-h-40 overflow-y-auto border border-gray-200 rounded p-3 grid grid-cols-3 gap-2">
                {indicators.map((indicator) => (
                  <label key={indicator.id} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.related_indicators.includes(indicator.value)}
                      onChange={(e) =>
                        handleMultiSelectChange('related_indicators', indicator.value, e.target.checked)
                      }
                      className="rounded"
                    />
                    <span className="text-sm">{indicator.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* KPI 關聯 */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold border-b pb-2">KPI 關聯（選填）</h2>
            <p className="text-sm text-gray-500">可在此處設定，或在「持續且重要目標」中設定關聯到策略專案</p>
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
                        handleMultiSelectChange('kpi_ids', kpi.id, e.target.checked)
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

          {/* 備註 */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold border-b pb-2">備註（選填）</h2>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="輸入備註..."
            />
          </div>

          {/* 操作按鈕 */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Link
              href={`/initiatives/${params.id}`}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              取消
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '更新中...' : '更新專案'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

