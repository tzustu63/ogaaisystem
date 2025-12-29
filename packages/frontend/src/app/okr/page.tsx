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
  initiative_name: string;
  initiative_code: string;
  quarter: string;
  objective: string;
  key_results?: KeyResult[];
  kr_count?: number;
}

interface InitiativeGroup {
  initiative_id: string;
  initiative_name: string;
  initiative_code: string;
  okrs: OKR[];
}

export default function OKRPage() {
  const [okrs, setOkrs] = useState<OKR[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedInitiatives, setExpandedInitiatives] = useState<Set<string>>(new Set());

  const fetchOKRs = async () => {
    try {
      const res = await api.get('/okr');
      // 取得每個 OKR 的 Key Results 詳情
      const okrsWithKRs = await Promise.all(
        res.data.map(async (okr: OKR) => {
          try {
            const detailRes = await api.get(`/okr/${okr.id}`);
            return {
              ...detailRes.data,
              initiative_name: okr.initiative_name,
              initiative_code: okr.initiative_code,
            };
          } catch {
            return okr;
          }
        })
      );
      setOkrs(okrsWithKRs);
      // 預設展開所有策略專案
      const initiativeIds = new Set(okrsWithKRs.map((okr: OKR) => okr.initiative_id || 'no-initiative'));
      setExpandedInitiatives(initiativeIds);
    } catch (err) {
      console.error('Error fetching OKRs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOKRs();
  }, []);

  // 按策略專案分組
  const groupedByInitiative = (): InitiativeGroup[] => {
    const groups: Record<string, InitiativeGroup> = {};

    okrs.forEach((okr) => {
      const key = okr.initiative_id || 'no-initiative';
      if (!groups[key]) {
        groups[key] = {
          initiative_id: okr.initiative_id,
          initiative_name: okr.initiative_name || '未分類',
          initiative_code: okr.initiative_code || '',
          okrs: [],
        };
      }
      groups[key].okrs.push(okr);
    });

    return Object.values(groups);
  };

  // 切換展開/收合
  const toggleInitiative = (initiativeId: string) => {
    setExpandedInitiatives((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(initiativeId)) {
        newSet.delete(initiativeId);
      } else {
        newSet.add(initiativeId);
      }
      return newSet;
    });
  };

  // 全部展開
  const expandAll = () => {
    const allIds = new Set(okrs.map((okr) => okr.initiative_id || 'no-initiative'));
    setExpandedInitiatives(allIds);
  };

  // 全部收合
  const collapseAll = () => {
    setExpandedInitiatives(new Set());
  };

  // 取得進度條顏色
  const getProgressColor = (progress: number) => {
    if (progress >= 100) return 'bg-green-500';
    if (progress >= 70) return 'bg-blue-500';
    if (progress >= 30) return 'bg-yellow-500';
    return 'bg-gray-400';
  };

  // 計算策略專案的整體進度
  const calculateInitiativeProgress = (okrList: OKR[]) => {
    let totalKRs = 0;
    let totalProgress = 0;

    okrList.forEach((okr) => {
      if (okr.key_results && okr.key_results.length > 0) {
        okr.key_results.forEach((kr) => {
          totalKRs++;
          totalProgress += parseFloat(String(kr.progress_percentage || 0));
        });
      }
    });

    return totalKRs > 0 ? Math.round(totalProgress / totalKRs) : 0;
  };

  if (loading) {
    return <div className="p-8">載入中...</div>;
  }

  const groups = groupedByInitiative();

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
              onClick={expandAll}
              className="px-3 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
            >
              全部展開
            </button>
            <button
              onClick={collapseAll}
              className="px-3 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
            >
              全部收合
            </button>
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
          <div className="space-y-4">
            {groups.map((group) => {
              const isExpanded = expandedInitiatives.has(group.initiative_id || 'no-initiative');
              const overallProgress = calculateInitiativeProgress(group.okrs);

              return (
                <div key={group.initiative_id || 'no-initiative'} className="bg-white rounded-lg shadow overflow-hidden">
                  {/* 策略專案標題（可點擊展開/收合） */}
                  <button
                    onClick={() => toggleInitiative(group.initiative_id || 'no-initiative')}
                    className="w-full px-6 py-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      {/* 展開/收合圖示 */}
                      <svg
                        className={`w-5 h-5 text-gray-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                      <div className="text-left">
                        <h2 className="text-lg font-semibold text-gray-900">
                          {group.initiative_name}
                        </h2>
                        <p className="text-sm text-gray-500">
                          {group.initiative_code && `${group.initiative_code} · `}
                          {group.okrs.length} 個目標
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {/* 整體進度 */}
                      <div className="text-right">
                        <div className="text-lg font-semibold">{overallProgress}%</div>
                        <div className="text-xs text-gray-500">整體進度</div>
                      </div>
                      <div className="w-32 bg-gray-200 rounded-full h-2.5">
                        <div
                          className={`${getProgressColor(overallProgress)} h-2.5 rounded-full transition-all`}
                          style={{ width: `${Math.min(100, overallProgress)}%` }}
                        />
                      </div>
                    </div>
                  </button>

                  {/* OKR 列表（可折疊） */}
                  <div
                    className={`overflow-hidden transition-all duration-300 ${
                      isExpanded ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'
                    }`}
                  >
                    <div className="p-6 space-y-6 border-t">
                      {group.okrs.map((okr) => (
                        <div key={okr.id} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h3 className="text-lg font-semibold">{okr.objective}</h3>
                              <p className="text-sm text-gray-600 mt-1">
                                學年度 {okr.quarter}
                              </p>
                            </div>
                            <Link
                              href={`/okr/${okr.id}`}
                              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                              查看詳情
                            </Link>
                          </div>

                          {okr.key_results && okr.key_results.length > 0 && (
                            <div className="space-y-3 mt-4">
                              {okr.key_results.map((kr) => (
                                <div key={kr.id} className="bg-gray-50 rounded-lg p-3">
                                  <div className="flex justify-between items-start mb-2">
                                    <div className="flex-1">
                                      <span className="text-sm font-medium">{kr.description}</span>
                                    </div>
                                    <div className="text-right ml-4">
                                      <div className="text-sm font-semibold">
                                        {parseFloat(String(kr.progress_percentage || 0)).toFixed(0)}%
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        {kr.current_value || 0} / {kr.target_value || 0} {kr.unit || ''}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                      className={`${getProgressColor(parseFloat(String(kr.progress_percentage || 0)))} h-2 rounded-full transition-all`}
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
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
