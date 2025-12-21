'use client';

import { useEffect, useState } from 'react';
import { kpiApi } from '@/lib/api';
import api from '@/lib/api';
import Link from 'next/link';
import ReactECharts from 'echarts-for-react';

interface Initiative {
  id: string;
  name: string;
  status: string;
  progress: number;
  start_date: string;
  end_date: string;
}

interface OKR {
  id: string;
  objective: string;
  quarter: string;
  status: string;
  progress: number;
  key_results_count?: number;
}

export default function DashboardPage() {
  const [kpis, setKpis] = useState<any[]>([]);
  const [dashboardSummary, setDashboardSummary] = useState<any>(null);
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [okrs, setOKRs] = useState<OKR[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'overview' | 'initiatives' | 'okr' | 'drilldown'>('overview');

  useEffect(() => {
    Promise.all([
      kpiApi.getAll(),
      api.get('/bsc/dashboard/summary'),
      api.get('/initiatives'),
      api.get('/okr'),
    ])
      .then(([kpisRes, summaryRes, initRes, okrRes]) => {
        setKpis(kpisRes.data);
        setDashboardSummary(summaryRes.data);
        setInitiatives(initRes.data || []);
        setOKRs(okrRes.data || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching dashboard data:', err);
        setLoading(false);
      });
  }, []);

  // 統計燈號
  const statusCounts = {
    green: kpis.filter((k) => k.status === 'green').length,
    yellow: kpis.filter((k) => k.status === 'yellow').length,
    red: kpis.filter((k) => k.status === 'red').length,
  };

  // 四構面雷達圖
  const getRadarChartOption = () => {
    if (!dashboardSummary) {
      return { title: { text: '載入中...' } };
    }

    const perspectives = dashboardSummary.perspectives;
    const perspectiveLabels: Record<string, string> = {
      financial: '財務構面',
      customer: '客戶構面',
      internal_process: '內部流程構面',
      learning_growth: '學習成長構面',
    };

    return {
      title: {
        text: 'BSC 四構面達成率',
        left: 'center',
      },
      radar: {
        indicator: perspectives.map((p: any) => ({
          name: perspectiveLabels[p.perspective] || p.perspective,
          max: 100,
        })),
        center: ['50%', '60%'],
        radius: '70%',
      },
      series: [
        {
          type: 'radar',
          data: [
            {
              value: perspectives.map((p: any) => p.achievementRate),
              name: '達成率',
              areaStyle: {
                color: 'rgba(59, 130, 246, 0.3)',
              },
            },
          ],
        },
      ],
    };
  };

  // KPI 達成率橫條圖
  const getKPIBarChartOption = () => {
    if (kpis.length === 0) {
      return { title: { text: '尚無資料' } };
    }

    const topKpis = kpis.slice(0, 10);
    const kpiNames = topKpis.map((k) => k.name_zh);
    const achievementRates = topKpis.map((k) => {
      // 簡化計算，實際應從 kpi_values 取得
      return k.status === 'green' ? 100 : k.status === 'yellow' ? 70 : 50;
    });

    return {
      title: {
        text: 'KPI 達成率',
        left: 'center',
      },
      tooltip: {
        trigger: 'axis',
      },
      xAxis: {
        type: 'value',
        max: 100,
      },
      yAxis: {
        type: 'category',
        data: kpiNames,
      },
      series: [
        {
          type: 'bar',
          data: achievementRates,
          itemStyle: {
            color: (params: any) => {
              const value = params.value;
              if (value >= 90) return '#10b981';
              if (value >= 70) return '#f59e0b';
              return '#ef4444';
            },
          },
        },
      ],
    };
  };

  if (loading) {
    return <div className="p-8">載入中...</div>;
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">戰略儀表板</h1>
          <div className="flex space-x-2">
            <button
              onClick={() => setViewMode('overview')}
              className={`px-4 py-2 rounded ${
                viewMode === 'overview' ? 'bg-primary-600 text-white' : 'bg-gray-200'
              }`}
            >
              年度達成率
            </button>
            <button
              onClick={() => setViewMode('initiatives')}
              className={`px-4 py-2 rounded ${
                viewMode === 'initiatives' ? 'bg-primary-600 text-white' : 'bg-gray-200'
              }`}
            >
              策略專案
            </button>
            <button
              onClick={() => setViewMode('okr')}
              className={`px-4 py-2 rounded ${
                viewMode === 'okr' ? 'bg-primary-600 text-white' : 'bg-gray-200'
              }`}
            >
              OKR 進度
            </button>
            <button
              onClick={() => setViewMode('drilldown')}
              className={`px-4 py-2 rounded ${
                viewMode === 'drilldown' ? 'bg-primary-600 text-white' : 'bg-gray-200'
              }`}
            >
              下鑽路徑
            </button>
          </div>
        </div>

        {/* 視圖1：年度達成率總覽 */}
        {viewMode === 'overview' && (
          <>
            {/* 燈號統計 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600">綠燈</p>
                <p className="text-3xl font-bold text-green-600">{statusCounts.green}</p>
              </div>
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white text-2xl">✓</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600">黃燈</p>
                <p className="text-3xl font-bold text-yellow-600">{statusCounts.yellow}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center">
                <span className="text-white text-2xl">⚠</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600">紅燈</p>
                <p className="text-3xl font-bold text-red-600">{statusCounts.red}</p>
              </div>
              <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-white text-2xl">✗</span>
              </div>
            </div>
          </div>
        </div>

            {/* 四構面雷達圖 */}
            <div className="bg-white rounded-lg shadow mb-6">
              <div className="p-6 border-b">
                <h2 className="text-xl font-semibold">四構面達成率雷達圖</h2>
              </div>
              <div className="p-6">
                <ReactECharts
                  option={getRadarChartOption()}
                  style={{ height: '400px' }}
                />
              </div>
            </div>

            {/* KPI 達成率橫條圖 */}
            <div className="bg-white rounded-lg shadow mb-6">
              <div className="p-6 border-b">
                <h2 className="text-xl font-semibold">各 KPI 達成率</h2>
              </div>
              <div className="p-6">
                <ReactECharts
                  option={getKPIBarChartOption()}
                  style={{ height: '400px' }}
                />
              </div>
            </div>
          </>
        )}

        {/* 視圖2：策略專案 */}
        {viewMode === 'initiatives' && (
          <div className="space-y-6">
            {/* 策略專案統計 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-gray-600 text-sm">總專案數</p>
                <p className="text-2xl font-bold">{initiatives.length}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-gray-600 text-sm">進行中</p>
                <p className="text-2xl font-bold text-blue-600">
                  {initiatives.filter(i => i.status === 'in_progress' || i.status === 'active').length}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-gray-600 text-sm">已完成</p>
                <p className="text-2xl font-bold text-green-600">
                  {initiatives.filter(i => i.status === 'completed').length}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-gray-600 text-sm">平均進度</p>
                <p className="text-2xl font-bold text-purple-600">
                  {initiatives.length > 0 
                    ? Math.round(initiatives.reduce((sum, i) => sum + (i.progress || 0), 0) / initiatives.length)
                    : 0}%
                </p>
              </div>
            </div>

            {/* 策略專案列表 */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b flex justify-between items-center">
                <h2 className="text-xl font-semibold">策略專案總覽</h2>
                <Link href="/initiatives" className="text-primary-600 hover:underline text-sm">
                  查看全部 →
                </Link>
              </div>
              <div className="p-4 space-y-3">
                {initiatives.slice(0, 5).map((initiative) => (
                  <div key={initiative.id} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <Link href={`/initiatives/${initiative.id}`} className="font-medium hover:text-primary-600">
                        {initiative.name}
                      </Link>
                      <span className={`px-2 py-1 text-xs rounded ${
                        initiative.status === 'completed' ? 'bg-green-100 text-green-800' :
                        initiative.status === 'in_progress' || initiative.status === 'active' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {initiative.status === 'completed' ? '已完成' :
                         initiative.status === 'in_progress' || initiative.status === 'active' ? '進行中' :
                         initiative.status === 'planned' ? '規劃中' : initiative.status}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-primary-600 h-2 rounded-full" 
                        style={{ width: `${initiative.progress || 0}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">進度: {initiative.progress || 0}%</p>
                  </div>
                ))}
                {initiatives.length === 0 && (
                  <p className="text-gray-500 text-center py-4">尚無策略專案</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 視圖3：OKR 進度 */}
        {viewMode === 'okr' && (
          <div className="space-y-6">
            {/* OKR 統計 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-gray-600 text-sm">總 OKR 數</p>
                <p className="text-2xl font-bold">{okrs.length}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-gray-600 text-sm">進行中</p>
                <p className="text-2xl font-bold text-blue-600">
                  {okrs.filter(o => o.status === 'active' || o.status === 'in_progress').length}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-gray-600 text-sm">已達成</p>
                <p className="text-2xl font-bold text-green-600">
                  {okrs.filter(o => o.status === 'achieved' || o.status === 'completed').length}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-gray-600 text-sm">平均進度</p>
                <p className="text-2xl font-bold text-purple-600">
                  {okrs.length > 0 
                    ? Math.round(okrs.reduce((sum, o) => sum + (o.progress || 0), 0) / okrs.length)
                    : 0}%
                </p>
              </div>
            </div>

            {/* OKR 列表 */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b flex justify-between items-center">
                <h2 className="text-xl font-semibold">OKR 總覽</h2>
                <Link href="/okr" className="text-primary-600 hover:underline text-sm">
                  查看全部 →
                </Link>
              </div>
              <div className="p-4 space-y-3">
                {okrs.slice(0, 5).map((okr) => (
                  <div key={okr.id} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium">{okr.objective}</p>
                        <p className="text-xs text-gray-500">{okr.quarter}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded ${
                        okr.status === 'achieved' || okr.status === 'completed' ? 'bg-green-100 text-green-800' :
                        okr.status === 'active' || okr.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                        okr.status === 'at_risk' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {okr.status === 'achieved' || okr.status === 'completed' ? '已達成' :
                         okr.status === 'active' || okr.status === 'in_progress' ? '進行中' :
                         okr.status === 'at_risk' ? '有風險' : okr.status}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          (okr.progress || 0) >= 70 ? 'bg-green-500' :
                          (okr.progress || 0) >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${okr.progress || 0}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">進度: {okr.progress || 0}%</p>
                  </div>
                ))}
                {okrs.length === 0 && (
                  <p className="text-gray-500 text-center py-4">尚無 OKR</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 視圖4：下鑽路徑 */}
        {viewMode === 'drilldown' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">下鑽路徑</h2>
            <p className="text-gray-600 mb-4">
              從 BSC 構面出發，追蹤策略執行的完整路徑：
            </p>
            <div className="flex items-center justify-center space-x-2 text-sm bg-gray-50 p-4 rounded-lg mb-6">
              <span className="px-3 py-1 bg-red-100 text-red-800 rounded">BSC 構面</span>
              <span>→</span>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded">策略專案</span>
              <span>→</span>
              <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded">OKR</span>
              <span>→</span>
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded">任務</span>
              <span>→</span>
              <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded">KPI</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Link href="/initiatives" className="block p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                <h3 className="font-medium text-lg mb-2">📋 策略專案</h3>
                <p className="text-sm text-gray-600">查看所有策略專案及其執行進度</p>
                <p className="text-primary-600 text-sm mt-2">共 {initiatives.length} 個專案 →</p>
              </Link>
              <Link href="/okr" className="block p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                <h3 className="font-medium text-lg mb-2">🎯 OKR 管理</h3>
                <p className="text-sm text-gray-600">查看目標與關鍵結果的達成情況</p>
                <p className="text-primary-600 text-sm mt-2">共 {okrs.length} 個 OKR →</p>
              </Link>
            </div>
          </div>
        )}

        {/* KPI 列表（所有視圖共用） */}
        <div className="bg-white rounded-lg shadow mt-6">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">KPI 總覽</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    KPI ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    名稱
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    構面
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    狀態
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {kpis.slice(0, 10).map((kpi) => (
                  <tr key={kpi.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {kpi.kpi_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {kpi.name_zh}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {kpi.bsc_perspective}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-block w-3 h-3 rounded-full ${
                          kpi.status === 'green'
                            ? 'bg-green-500'
                            : kpi.status === 'yellow'
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                        }`}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Link
                        href={`/kpi/${kpi.id}`}
                        className="text-primary-600 hover:text-primary-900"
                      >
                        查看詳情
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

