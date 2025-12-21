'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
  kpi_perspective?: string;
  kpi_baseline_value?: number;
  kpi_target_value?: number;
}

interface OKRDetail {
  id: string;
  initiative_id: string;
  initiative_name?: string;
  quarter: string;
  objective: string;
  status: string;
  progress: number;
  created_at: string;
  updated_at: string;
  key_results: KeyResult[];
}

export default function OKRDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [okr, setOkr] = useState<OKRDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchOKR();
    }
  }, [params.id]);

  const fetchOKR = async () => {
    try {
      const res = await api.get(`/okr/${params.id}`);
      setOkr(res.data);
    } catch (error) {
      console.error('Error fetching OKR:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncKR = async (krId: string) => {
    setSyncing(true);
    try {
      await api.post(`/okr/key-results/${krId}/sync-kpi`);
      await fetchOKR();
      alert('同步成功');
    } catch (error: any) {
      alert(error.response?.data?.error || '同步失敗');
    } finally {
      setSyncing(false);
    }
  };

  const handleUpdateProgress = async (krId: string, newValue: number) => {
    try {
      await api.put(`/okr/key-results/${krId}/progress`, {
        current_value: newValue,
      });
      await fetchOKR();
    } catch (error: any) {
      alert(error.response?.data?.error || '更新失敗');
    }
  };

  const getProgressColor = (progress: number, krType?: string) => {
    if (krType === 'kpi_based') return 'bg-purple-500';
    if (progress >= 70) return 'bg-green-500';
    if (progress >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-blue-100 text-blue-800',
      achieved: 'bg-green-100 text-green-800',
      at_risk: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-500',
    };
    const labels: Record<string, string> = {
      active: '進行中',
      achieved: '已達成',
      at_risk: '有風險',
      cancelled: '已取消',
    };
    return (
      <span className={`px-2 py-1 text-xs rounded ${styles[status] || 'bg-gray-100'}`}>
        {labels[status] || status}
      </span>
    );
  };

  if (loading) {
    return <div className="p-8">載入中...</div>;
  }

  if (!okr) {
    return (
      <div className="p-8">
        <p>OKR 不存在</p>
        <Link href="/okr" className="text-blue-600 hover:underline">
          返回 OKR 列表
        </Link>
      </div>
    );
  }

  const overallProgress = okr.key_results.length > 0
    ? Math.round(
        okr.key_results.reduce((sum, kr) => sum + (kr.progress_percentage || 0), 0) /
          okr.key_results.length
      )
    : 0;

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
            <span className="text-gray-900">OKR 詳情</span>
          </div>
        </nav>

        {/* 標題區 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-2xl font-bold mb-2">{okr.objective}</h1>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <span className="bg-gray-100 px-2 py-1 rounded">{okr.quarter}</span>
                {getStatusBadge(okr.status)}
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500 mb-1">整體進度</p>
              <p className="text-3xl font-bold text-primary-600">{overallProgress}%</p>
            </div>
          </div>

          {/* 進度條 */}
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full ${getProgressColor(overallProgress)}`}
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>

        {/* Key Results */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b flex justify-between items-center">
            <h2 className="text-xl font-semibold">
              Key Results ({okr.key_results.length})
            </h2>
          </div>

          <div className="divide-y">
            {okr.key_results.map((kr, index) => (
              <div key={kr.id} className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-medium">KR{index + 1}</span>
                      {kr.kr_type === 'kpi_based' ? (
                        <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-800 rounded">
                          KPI 連動
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">
                          自訂
                        </span>
                      )}
                    </div>
                    <p className="text-gray-700">{kr.description}</p>
                    
                    {/* KPI 連動資訊 */}
                    {kr.kr_type === 'kpi_based' && kr.kpi_code && (
                      <div className="mt-2 p-2 bg-purple-50 rounded text-sm">
                        <p className="text-purple-700">
                          📊 連動 KPI：{kr.kpi_code} - {kr.kpi_name}
                        </p>
                        <p className="text-gray-600 text-xs mt-1">
                          基準值: {kr.kpi_baseline_value} → 目標值: {kr.kpi_target_value}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="text-right ml-4">
                    <p className="text-2xl font-bold">{kr.progress_percentage || 0}%</p>
                    <p className="text-sm text-gray-500">
                      {kr.current_value || 0} / {kr.target_value} {kr.unit || ''}
                    </p>
                  </div>
                </div>

                {/* 進度條 */}
                <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                  <div
                    className={`h-2 rounded-full ${getProgressColor(
                      kr.progress_percentage || 0,
                      kr.kr_type
                    )}`}
                    style={{ width: `${kr.progress_percentage || 0}%` }}
                  />
                </div>

                {/* 操作按鈕 */}
                <div className="flex space-x-2">
                  {kr.kr_type === 'kpi_based' ? (
                    <button
                      onClick={() => handleSyncKR(kr.id)}
                      disabled={syncing}
                      className="px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded hover:bg-purple-200 disabled:opacity-50"
                    >
                      {syncing ? '同步中...' : '🔄 同步 KPI 進度'}
                    </button>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500">更新進度：</span>
                      <input
                        type="number"
                        defaultValue={kr.current_value || 0}
                        min={0}
                        max={kr.target_value}
                        className="w-20 px-2 py-1 text-sm border rounded"
                        onBlur={(e) => {
                          const newValue = parseFloat(e.target.value);
                          if (!isNaN(newValue) && newValue !== kr.current_value) {
                            handleUpdateProgress(kr.id, newValue);
                          }
                        }}
                      />
                      <span className="text-sm text-gray-500">/ {kr.target_value}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {okr.key_results.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                尚無 Key Results
              </div>
            )}
          </div>
        </div>

        {/* 操作按鈕 */}
        <div className="mt-6 flex justify-between">
          <Link
            href="/okr"
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            ← 返回列表
          </Link>
          <button
            onClick={() => router.push(`/okr/${params.id}/edit`)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            編輯 OKR
          </button>
        </div>
      </div>
    </div>
  );
}
