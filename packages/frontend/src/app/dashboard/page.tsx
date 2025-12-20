'use client';

import { useEffect, useState } from 'react';
import { kpiApi } from '@/lib/api';
import api from '@/lib/api';
import Link from 'next/link';
import ReactECharts from 'echarts-for-react';

export default function DashboardPage() {
  const [kpis, setKpis] = useState<any[]>([]);
  const [dashboardSummary, setDashboardSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'overview' | 'trend' | 'indicators' | 'drilldown'>('overview');

  useEffect(() => {
    Promise.all([
      kpiApi.getAll(),
      api.get('/bsc/dashboard/summary'),
    ])
      .then(([kpisRes, summaryRes]) => {
        setKpis(kpisRes.data);
        setDashboardSummary(summaryRes.data);
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
              onClick={() => setViewMode('trend')}
              className={`px-4 py-2 rounded ${
                viewMode === 'trend' ? 'bg-primary-600 text-white' : 'bg-gray-200'
              }`}
            >
              趨勢圖
            </button>
            <button
              onClick={() => setViewMode('indicators')}
              className={`px-4 py-2 rounded ${
                viewMode === 'indicators' ? 'bg-primary-600 text-white' : 'bg-gray-200'
              }`}
            >
              領先/落後指標
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

        {/* 視圖2：趨勢圖 */}
        {viewMode === 'trend' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">趨勢圖視圖</h2>
            <p className="text-gray-600">
              請點擊下方 KPI 列表中的項目查看個別 KPI 的趨勢圖。
            </p>
          </div>
        )}

        {/* 視圖3：領先/落後指標 */}
        {viewMode === 'indicators' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">領先/落後指標標記</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">領先指標 (Leading Indicators)</h3>
                <p className="text-sm text-gray-600 mb-4">
                  可提前干預的指標，用於預測未來表現
                </p>
                <div className="space-y-2">
                  {kpis
                    .filter((k) => k.is_leading_indicator)
                    .map((kpi) => (
                      <div key={kpi.id} className="p-3 bg-blue-50 rounded">
                        <span className="font-medium">{kpi.name_zh}</span>
                        <span className="ml-2 text-xs text-blue-600">[領先指標]</span>
                      </div>
                    ))}
                  {kpis.filter((k) => k.is_leading_indicator).length === 0 && (
                    <p className="text-sm text-gray-500">尚無標記為領先指標的 KPI</p>
                  )}
                </div>
              </div>
              <div>
                <h3 className="font-medium mb-2">落後指標 (Lagging Indicators)</h3>
                <p className="text-sm text-gray-600 mb-4">
                  結果指標，反映過去表現
                </p>
                <div className="space-y-2">
                  {kpis
                    .filter((k) => k.is_lagging_indicator)
                    .map((kpi) => (
                      <div key={kpi.id} className="p-3 bg-gray-50 rounded">
                        <span className="font-medium">{kpi.name_zh}</span>
                        <span className="ml-2 text-xs text-gray-600">[落後指標]</span>
                      </div>
                    ))}
                  {kpis.filter((k) => k.is_lagging_indicator).length === 0 && (
                    <p className="text-sm text-gray-500">尚無標記為落後指標的 KPI</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 視圖4：下鑽路徑 */}
        {viewMode === 'drilldown' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">下鑽路徑</h2>
            <p className="text-gray-600 mb-4">
              點擊下方 KPI 可進行下鑽：KPI → OKR → Initiative → 任務 → 證據
            </p>
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

