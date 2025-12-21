'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import Link from 'next/link';

interface KeyResult {
  id: string;
  description: string;
  kr_type: 'kpi_based' | 'custom';
  target_value: number;
  current_value: number;
  progress_percentage: number;
  status: string;
  unit?: string;
  kpi_id?: string;
  kpi_code?: string;
  kpi_name?: string;
  kpi_baseline_value?: number;
  kpi_target_value?: number;
}

interface OKR {
  id: string;
  initiative_id: string;
  quarter: string;
  objective: string;
  key_results?: KeyResult[];
  kr_count?: number;
}

export default function OKRPage() {
  const [okrs, setOkrs] = useState<OKR[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const fetchOKRs = async () => {
    try {
      const res = await api.get('/okr');
      // 取得每個 OKR 的 Key Results 詳情
      const okrsWithKRs = await Promise.all(
        res.data.map(async (okr: OKR) => {
          try {
            const detailRes = await api.get(`/okr/${okr.id}`);
            return detailRes.data;
          } catch {
            return okr;
          }
        })
      );
      setOkrs(okrsWithKRs);
    } catch (err) {
      console.error('Error fetching OKRs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOKRs();
  }, []);

  // 同步所有 KPI 類型 KR 的進度
  const handleSyncAllKPI = async () => {
    setSyncing(true);
    try {
      const res = await api.post('/okr/sync-all-kpi-kr');
      alert(`同步完成！成功 ${res.data.synced_count} 個，跳過 ${res.data.skipped_count} 個`);
      fetchOKRs(); // 重新載入
    } catch (err) {
      console.error('Error syncing KPI KRs:', err);
      alert('同步失敗');
    } finally {
      setSyncing(false);
    }
  };

  // 取得進度條顏色
  const getProgressColor = (kr: KeyResult) => {
    if (kr.kr_type === 'kpi_based') {
      return 'bg-purple-500'; // KPI 類型用紫色
    }
    const progress = kr.progress_percentage || 0;
    if (progress >= 100) return 'bg-green-500';
    if (progress >= 70) return 'bg-blue-500';
    if (progress >= 30) return 'bg-yellow-500';
    return 'bg-gray-400';
  };

  if (loading) {
    return <div className="p-8">載入中...</div>;
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">OKR 管理</h1>
            <p className="text-gray-600 mt-1">目標與關鍵結果追蹤</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleSyncAllKPI}
              disabled={syncing}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
            >
              {syncing ? '同步中...' : '🔄 同步 KPI 進度'}
            </button>
            <Link
              href="/okr/new"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              新增 OKR
            </Link>
          </div>
        </div>

        {/* 圖例說明 */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6 flex items-center gap-6 text-sm">
          <span className="font-medium">KR 類型：</span>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-purple-500 rounded-full"></span>
            <span>KPI 連動</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
            <span>自定義指標</span>
          </div>
        </div>

        {okrs.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            尚無 OKR 資料，請點擊「新增 OKR」開始建立
          </div>
        ) : (
          <div className="space-y-6">
            {okrs.map((okr) => (
              <div key={okr.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-semibold">{okr.objective}</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      📅 {okr.quarter}
                    </p>
                  </div>
                  <Link
                    href={`/okr/${okr.id}`}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    查看詳情
                  </Link>
                </div>

                {okr.key_results && okr.key_results.length > 0 && (
                  <div className="space-y-4 mt-4">
                    {okr.key_results.map((kr) => (
                      <div key={kr.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              {kr.kr_type === 'kpi_based' ? (
                                <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded">
                                  KPI 連動
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                                  自定義
                                </span>
                              )}
                              <span className="font-medium">{kr.description}</span>
                            </div>
                            {kr.kr_type === 'kpi_based' && kr.kpi_name && (
                              <p className="text-sm text-purple-600 mt-1">
                                📊 {kr.kpi_code}: {kr.kpi_name}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-semibold">
                              {parseFloat(String(kr.progress_percentage || 0)).toFixed(0)}%
                            </div>
                            <div className="text-sm text-gray-500">
                              {kr.current_value || 0} / {kr.target_value || 0} {kr.unit || ''}
                            </div>
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div
                            className={`${getProgressColor(kr)} h-2.5 rounded-full transition-all`}
                            style={{
                              width: `${Math.min(100, parseFloat(String(kr.progress_percentage || 0)))}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

