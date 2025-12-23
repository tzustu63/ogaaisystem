'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import Link from 'next/link';

interface KeyResult {
  id: string;
  description: string;
  target_value: number;
  current_value: number;
  progress_percentage: number;
  status: string;
  unit?: string;
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


  // 取得進度條顏色
  const getProgressColor = (progress: number) => {
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
            <Link
              href="/okr/new"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              新增目標 Objective
            </Link>
          </div>
        </div>

        {okrs.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            尚無目標資料，請點擊「新增目標 Objective」開始建立
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
                            <span className="font-medium">{kr.description}</span>
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
                            className={`${getProgressColor(parseFloat(String(kr.progress_percentage || 0)))} h-2.5 rounded-full transition-all`}
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

