'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api, { kpiApi } from '@/lib/api';
import Link from 'next/link';

interface Initiative {
  id: string;
  name_zh: string;
  initiative_id: string;
}

interface KPI {
  id: string;
  kpi_id: string;
  name_zh: string;
  bsc_perspective: string;
}

interface KeyResultInput {
  id: string;
  kr_type: 'kpi_based' | 'custom';
  description: string;
  // 自定義 KR
  target_value?: number;
  unit?: string;
  // KPI 類型 KR
  kpi_id?: string;
  kpi_baseline_value?: number;
  kpi_target_value?: number;
}

const perspectiveLabels: Record<string, string> = {
  financial: '財務',
  customer: '客戶',
  internal_process: '內部流程',
  learning_growth: '學習成長',
};

export default function NewOKRPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [kpis, setKpis] = useState<KPI[]>([]);
  
  const [formData, setFormData] = useState({
    initiative_id: '',
    quarter: '',
    objective: '',
  });

  const [keyResults, setKeyResults] = useState<KeyResultInput[]>([
    { id: '1', kr_type: 'custom', description: '', target_value: 0, unit: '' },
  ]);

  // 載入 Initiatives 和 KPIs
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [initRes, kpiRes] = await Promise.all([
          api.get('/initiatives'),
          kpiApi.getAll(),
        ]);
        setInitiatives(initRes.data);
        setKpis(kpiRes.data);
      } catch (err) {
        console.error('Error fetching data:', err);
      }
    };
    fetchData();
  }, []);

  // 生成當前季度選項
  const getQuarterOptions = () => {
    const now = new Date();
    const year = now.getFullYear();
    const options = [];
    for (let y = year; y <= year + 1; y++) {
      for (let q = 1; q <= 4; q++) {
        options.push(`${y}-Q${q}`);
      }
    }
    return options;
  };

  // 新增 Key Result
  const addKeyResult = () => {
    if (keyResults.length >= 5) {
      alert('最多只能有 5 個 Key Result');
      return;
    }
    setKeyResults([
      ...keyResults,
      { id: Date.now().toString(), kr_type: 'custom', description: '', target_value: 0, unit: '' },
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
        
        // 如果切換類型，重置相關欄位
        if (field === 'kr_type') {
          if (value === 'kpi_based') {
            return {
              ...kr,
              kr_type: 'kpi_based',
              kpi_id: '',
              kpi_baseline_value: 0,
              kpi_target_value: 0,
              target_value: undefined,
              unit: undefined,
            };
          } else {
            return {
              ...kr,
              kr_type: 'custom',
              target_value: 0,
              unit: '',
              kpi_id: undefined,
              kpi_baseline_value: undefined,
              kpi_target_value: undefined,
            };
          }
        }
        
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
        alert('請選擇季度');
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
        if (kr.kr_type === 'kpi_based' && !kr.kpi_id) {
          alert('KPI 類型的 Key Result 必須選擇對應的 KPI');
          setLoading(false);
          return;
        }
        if (kr.kr_type === 'custom' && (kr.target_value === undefined || kr.target_value <= 0)) {
          alert('自定義 Key Result 必須設定目標值');
          setLoading(false);
          return;
        }
      }

      const payload = {
        ...formData,
        key_results: keyResults.map((kr) => ({
          description: kr.description,
          kr_type: kr.kr_type,
          ...(kr.kr_type === 'kpi_based'
            ? {
                kpi_id: kr.kpi_id,
                kpi_baseline_value: kr.kpi_baseline_value || 0,
                kpi_target_value: kr.kpi_target_value,
              }
            : {
                target_value: kr.target_value,
                unit: kr.unit,
              }),
        })),
      };

      await api.post('/okr', payload);
      router.push('/okr');
    } catch (error: any) {
      console.error('Error creating OKR:', error);
      alert(error.response?.data?.error || '創建 OKR 失敗');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        {/* 麵包屑 */}
        <nav className="mb-6">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Link href="/okr" className="hover:text-gray-900">
              OKR 管理
            </Link>
            <span>/</span>
            <span className="text-gray-900">新增 OKR</span>
          </div>
        </nav>

        <h1 className="text-2xl font-bold mb-6">新增 OKR</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 基本資訊 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold border-b pb-2 mb-4">基本資訊</h2>

            <div className="grid grid-cols-2 gap-4 mb-4">
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
                  <option value="">請選擇...</option>
                  {initiatives.map((init) => (
                    <option key={init.id} value={init.id}>
                      {init.initiative_id}: {init.name_zh}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  季度 <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.quarter}
                  onChange={(e) => setFormData({ ...formData, quarter: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">請選擇...</option>
                  {getQuarterOptions().map((q) => (
                    <option key={q} value={q}>
                      {q}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                目標 (Objective) <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.objective}
                onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
                required
                rows={3}
                placeholder="用激勵人心的語言描述本季要達成的目標..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                💡 好的 O 應該是定性、激勵人心的，例如：「讓國際學生愛上我們的校園」
              </p>
            </div>
          </div>

          {/* Key Results */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center border-b pb-2 mb-4">
              <h2 className="text-lg font-semibold">關鍵結果 (Key Results)</h2>
              <button
                type="button"
                onClick={addKeyResult}
                className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
              >
                + 新增 KR
              </button>
            </div>

            <div className="space-y-4">
              {keyResults.map((kr, index) => (
                <div key={kr.id} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-medium">KR {index + 1}</h3>
                    {keyResults.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeKeyResult(kr.id)}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        移除
                      </button>
                    )}
                  </div>

                  {/* KR 類型選擇 */}
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      KR 類型
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name={`kr_type_${kr.id}`}
                          value="custom"
                          checked={kr.kr_type === 'custom'}
                          onChange={() => updateKeyResult(kr.id, 'kr_type', 'custom')}
                          className="mr-2"
                        />
                        <span className="text-sm">自定義指標</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name={`kr_type_${kr.id}`}
                          value="kpi_based"
                          checked={kr.kr_type === 'kpi_based'}
                          onChange={() => updateKeyResult(kr.id, 'kr_type', 'kpi_based')}
                          className="mr-2"
                        />
                        <span className="text-sm">引用現有 KPI</span>
                        <span className="ml-1 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded">
                          推薦
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* KR 描述 */}
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      描述 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={kr.description}
                      onChange={(e) => updateKeyResult(kr.id, 'description', e.target.value)}
                      placeholder="例如：國際學生人數從 400 增加到 500"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* 根據類型顯示不同欄位 */}
                  {kr.kr_type === 'kpi_based' ? (
                    <div className="grid grid-cols-3 gap-3 bg-purple-50 p-3 rounded">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          選擇 KPI <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={kr.kpi_id || ''}
                          onChange={(e) => updateKeyResult(kr.id, 'kpi_id', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                          <option value="">請選擇...</option>
                          {kpis.map((kpi) => (
                            <option key={kpi.id} value={kpi.id}>
                              [{perspectiveLabels[kpi.bsc_perspective]}] {kpi.kpi_id}: {kpi.name_zh}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          基準值（起始）
                        </label>
                        <input
                          type="number"
                          value={kr.kpi_baseline_value || 0}
                          onChange={(e) =>
                            updateKeyResult(kr.id, 'kpi_baseline_value', parseFloat(e.target.value) || 0)
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          目標值 <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          value={kr.kpi_target_value || ''}
                          onChange={(e) =>
                            updateKeyResult(kr.id, 'kpi_target_value', parseFloat(e.target.value) || 0)
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 bg-blue-50 p-3 rounded">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          目標值 <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          value={kr.target_value || ''}
                          onChange={(e) =>
                            updateKeyResult(kr.id, 'target_value', parseFloat(e.target.value) || 0)
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          單位
                        </label>
                        <input
                          type="text"
                          value={kr.unit || ''}
                          onChange={(e) => updateKeyResult(kr.id, 'unit', e.target.value)}
                          placeholder="例如：人、%、場"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <p className="mt-4 text-sm text-gray-500">
              💡 建議 KR 數量為 3-5 個。選擇「引用現有 KPI」可自動同步進度。
            </p>
          </div>

          {/* 操作按鈕 */}
          <div className="flex justify-end space-x-3">
            <Link
              href="/okr"
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              取消
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '創建中...' : '創建 OKR'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
