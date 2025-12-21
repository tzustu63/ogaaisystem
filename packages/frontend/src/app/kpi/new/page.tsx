'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { kpiApi } from '@/lib/api';
import Link from 'next/link';

interface KPIFormData {
  kpi_id: string;
  name_zh: string;
  name_en: string;
  bsc_perspective: string;
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
  evidence_requirements: string[];
  applicable_programs: string[];
}

export default function NewKPIPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<KPIFormData>({
    kpi_id: '',
    name_zh: '',
    name_en: '',
    bsc_perspective: 'financial',
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
      green: { min: 0, max: 100 },
      yellow: { min: 0, max: 80 },
      red: { min: 0, max: 60 },
    },
    evidence_requirements: [],
    applicable_programs: [],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await kpiApi.create(formData);
      // 創建成功後重定向到 KPI 詳情頁
      router.push(`/kpi/${response.data.id}`);
    } catch (error: any) {
      console.error('Error creating KPI:', error);
      alert(error.response?.data?.error || '創建 KPI 失敗');
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

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        {/* 麵包屑 */}
        <nav className="mb-6">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Link href="/kpi" className="hover:text-gray-900">
              KPI Registry
            </Link>
            <span>/</span>
            <span className="text-gray-900">新增 KPI</span>
          </div>
        </nav>

        <h1 className="text-2xl font-bold mb-6">新增 KPI</h1>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
          {/* 基本資訊 */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold border-b pb-2">基本資訊</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                KPI ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="kpi_id"
                value={formData.kpi_id}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="例如: KPI-001"
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
                  BSC 構面 <span className="text-red-500">*</span>
                </label>
                <select
                  name="bsc_perspective"
                  value={formData.bsc_perspective}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="financial">財務構面</option>
                  <option value="customer">客戶構面</option>
                  <option value="internal_process">內部流程構面</option>
                  <option value="learning_growth">學習成長構面</option>
                </select>
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
                <input
                  type="text"
                  name="data_steward"
                  value={formData.data_steward}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
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

          {/* 操作按鈕 */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Link
              href="/kpi"
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              取消
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '創建中...' : '創建 KPI'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
