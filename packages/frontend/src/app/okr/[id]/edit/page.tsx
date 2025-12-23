'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import api from '@/lib/api';
import Link from 'next/link';

interface Initiative {
  id: string;
  name_zh: string;
  initiative_id: string;
}

interface KeyResultInput {
  id: string;
  description: string;
  target_value: number;
  unit?: string;
}

export default function EditOKRPage() {
  const router = useRouter();
  const params = useParams();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [academicYearOptions, setAcademicYearOptions] = useState<Array<{value: string, label: string}>>([]);
  
  const [formData, setFormData] = useState({
    initiative_id: '',
    quarter: '',
    objective: '',
  });

  const [keyResults, setKeyResults] = useState<KeyResultInput[]>([
    { id: '1', description: '', target_value: 0, unit: '' },
  ]);

  // 載入資料
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [okrRes, initRes, academicYearRes] = await Promise.all([
          api.get(`/okr/${params.id}`),
          api.get('/initiatives'),
          api.get('/system-options/category/academic_year').catch(() => ({ data: [] })),
        ]);

        const okr = okrRes.data;
        setFormData({
          initiative_id: okr.initiative_id,
          quarter: okr.quarter,
          objective: okr.objective,
        });

        // 轉換 Key Results
        if (okr.key_results && okr.key_results.length > 0) {
          const convertedKRs = okr.key_results.map((kr: any, index: number) => ({
            id: kr.id || `existing-${index}`,
            description: kr.description || '',
            target_value: kr.target_value,
            unit: kr.unit || '',
          }));
          setKeyResults(convertedKRs);
        }

        setInitiatives(initRes.data);
        
        // 載入學年度選項
        if (academicYearRes.data && academicYearRes.data.length > 0) {
          const options = academicYearRes.data
            .filter((opt: any) => opt.is_active)
            .map((opt: any) => ({ value: opt.value, label: opt.label || opt.value }))
            .sort((a: any, b: any) => a.value.localeCompare(b.value));
          setAcademicYearOptions(options);
        }
      } catch (err: any) {
        console.error('Error fetching data:', err);
        if (err.response?.status === 404) {
          alert('OKR 不存在');
          router.push('/okr');
        } else {
          alert('載入資料失敗');
        }
      } finally {
        setFetching(false);
      }
    };

    if (params.id) {
      fetchData();
    }
  }, [params.id, router]);

  // 新增 Key Result
  const addKeyResult = () => {
    if (keyResults.length >= 5) {
      alert('最多只能有 5 個 Key Result');
      return;
    }
    setKeyResults([
      ...keyResults,
      { id: Date.now().toString(), description: '', target_value: 0, unit: '' },
    ]);
  };

  // 移除 Key Result
  const removeKeyResult = (id: string) => {
    if (keyResults.length <= 1) {
      alert('至少需要 1 個 Key Result');
      return;
    }
    setKeyResults(keyResults.filter((kr) => kr.id !== id));
  };

  // 更新 Key Result
  const updateKeyResult = (id: string, field: string, value: any) => {
    setKeyResults(
      keyResults.map((kr) => {
        if (kr.id !== id) return kr;
        return { ...kr, [field]: value };
      })
    );
  };

  // 提交表單
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 驗證
      if (!formData.initiative_id) {
        alert('請選擇關聯的策略專案');
        setLoading(false);
        return;
      }

      if (!formData.quarter) {
        alert('請選擇學年度');
        setLoading(false);
        return;
      }

      if (!formData.objective.trim()) {
        alert('請輸入目標描述');
        setLoading(false);
        return;
      }

      // 驗證 Key Results
      for (const kr of keyResults) {
        if (!kr.description.trim()) {
          alert('請填寫所有 Key Result 的描述');
          setLoading(false);
          return;
        }
        if (kr.target_value === undefined || kr.target_value <= 0) {
          alert('Key Result 必須設定目標值');
          setLoading(false);
          return;
        }
      }

      const payload = {
        ...formData,
        key_results: keyResults.map((kr) => ({
          description: kr.description,
          target_value: kr.target_value,
          unit: kr.unit,
        })),
      };

      await api.put(`/okr/${params.id}`, payload);
      alert('更新成功');
      router.push(`/okr/${params.id}`);
    } catch (error: any) {
      console.error('Error updating OKR:', error);
      let errorMsg = '更新失敗';
      if (error.response?.data?.error) {
        errorMsg = error.response.data.error;
      }
      if (error.response?.data?.details) {
        const details = Array.isArray(error.response.data.details) 
          ? error.response.data.details.map((d: any) => `${d.path?.join('.') || ''}: ${d.message || ''}`).join('\n')
          : JSON.stringify(error.response.data.details);
        errorMsg += '\n詳細資訊：' + details;
      }
      alert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return <div className="p-8">載入中...</div>;
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <nav className="mb-6">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Link href="/okr" className="hover:text-gray-900">
              OKR 管理
            </Link>
            <span>/</span>
            <Link href={`/okr/${params.id}`} className="hover:text-gray-900">
              OKR 詳情
            </Link>
            <span>/</span>
            <span className="text-gray-900">編輯</span>
          </div>
        </nav>

        <h1 className="text-2xl font-bold mb-6">編輯 OKR</h1>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
          {/* 基本資訊 */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold border-b pb-2">基本資訊</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                關聯策略專案 <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.initiative_id}
                onChange={(e) => setFormData({ ...formData, initiative_id: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">請選擇策略專案</option>
                {initiatives.map((init) => (
                  <option key={init.id} value={init.id}>
                    {init.name_zh} ({init.initiative_id})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                學年度 <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.quarter}
                onChange={(e) => setFormData({ ...formData, quarter: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">請選擇學年度</option>
                {academicYearOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                目標（Objective） <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.objective}
                onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
                required
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="輸入 OKR 目標描述..."
              />
            </div>
          </div>

          {/* Key Results */}
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h2 className="text-lg font-semibold">Key Results</h2>
              <button
                type="button"
                onClick={addKeyResult}
                disabled={keyResults.length >= 5}
                className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
              >
                ＋ 新增 Key Result
              </button>
            </div>

            {keyResults.map((kr, index) => (
              <div key={kr.id} className="border rounded-lg p-4 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium">KR {index + 1}</h3>
                  <button
                    type="button"
                    onClick={() => removeKeyResult(kr.id)}
                    disabled={keyResults.length <= 1}
                    className="text-red-600 hover:text-red-800 text-sm disabled:opacity-50"
                  >
                    刪除
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    描述 <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={kr.description}
                    onChange={(e) => updateKeyResult(kr.id, 'description', e.target.value)}
                    required
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="輸入 Key Result 描述..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      目標值 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={kr.target_value || ''}
                      onChange={(e) => updateKeyResult(kr.id, 'target_value', parseFloat(e.target.value))}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      單位
                    </label>
                    <input
                      type="text"
                      value={kr.unit || ''}
                      onChange={(e) => updateKeyResult(kr.id, 'unit', e.target.value)}
                      placeholder="例如：件、%"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 操作按鈕 */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Link
              href={`/okr/${params.id}`}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              取消
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '更新中...' : '更新 OKR'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
