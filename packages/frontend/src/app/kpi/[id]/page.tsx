'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { kpiApi } from '@/lib/api';
import ReactECharts from 'echarts-for-react';
import Link from 'next/link';
import TracePath from '@/components/TracePath';

// KPI 例外標記組件
function ExceptionMarker({ kpiId, period }: { kpiId: string; period: string }) {
  const [isException, setIsException] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // 檢查是否已有例外標記
    kpiApi.getById(kpiId)
      .then((res) => {
        const value = res.data.recent_values?.find((v: any) => v.period === period);
        setIsException(value?.is_manual_exception || false);
      })
      .catch(console.error);
  }, [kpiId, period]);

  const handleMarkException = async () => {
    if (!reason.trim()) {
      alert('請填寫例外原因');
      return;
    }

    setLoading(true);
    try {
      await kpiApi.markException(kpiId, period, reason);
      setIsException(true);
      setShowModal(false);
      setReason('');
      alert('已標記例外');
    } catch (error) {
      console.error('Error marking exception:', error);
      alert('標記例外失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveException = async () => {
    setLoading(true);
    try {
      await kpiApi.removeException(kpiId, period);
      setIsException(false);
      alert('已取消例外標記');
    } catch (error) {
      console.error('Error removing exception:', error);
      alert('取消例外標記失敗');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {isException ? (
        <button
          onClick={handleRemoveException}
          disabled={loading}
          className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded text-sm hover:bg-yellow-200"
        >
          ⚠️ 已標記例外
        </button>
      ) : (
        <button
          onClick={() => setShowModal(true)}
          className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200"
        >
          標記例外
        </button>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">標記例外情況</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">例外原因 *</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full border rounded p-2"
                rows={4}
                placeholder="請說明為何標記為例外..."
              />
            </div>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border rounded"
              >
                取消
              </button>
              <button
                onClick={handleMarkException}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                {loading ? '處理中...' : '確認'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

interface KPI {
  id: string;
  kpi_id: string;
  name_zh: string;
  name_en?: string;
  bsc_perspective: string;
  definition: string;
  formula: string;
  data_source: string;
  data_steward: string;
  update_frequency: string;
  target_value: any;
  thresholds: any;
  status?: string;
  recent_values?: any[];
  versions?: any[];
}

export default function KPIDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [kpi, setKpi] = useState<KPI | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      kpiApi.getById(params.id as string)
        .then((res) => {
          setKpi(res.data);
          setLoading(false);
        })
        .catch((err) => {
          console.error('Error fetching KPI:', err);
          setLoading(false);
        });
    }
  }, [params.id]);

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'green':
        return 'bg-green-500';
      case 'yellow':
        return 'bg-yellow-500';
      case 'red':
        return 'bg-red-500';
      default:
        return 'bg-gray-300';
    }
  };

  const getPerspectiveLabel = (perspective: string) => {
    const labels: Record<string, string> = {
      financial: '財務構面',
      customer: '客戶構面',
      internal_process: '內部流程構面',
      learning_growth: '學習成長構面',
    };
    return labels[perspective] || perspective;
  };

  // 準備趨勢圖資料
  const getTrendChartOption = () => {
    if (!kpi?.recent_values || kpi.recent_values.length === 0) {
      return {
        title: { text: '尚無資料' },
      };
    }

    const periods = kpi.recent_values.map((v) => v.period).reverse();
    const values = kpi.recent_values.map((v) => v.value).reverse();
    const targets = kpi.recent_values.map((v) => v.target_value).reverse();

    return {
      title: {
        text: `${kpi.name_zh} 趨勢圖`,
        left: 'center',
      },
      tooltip: {
        trigger: 'axis',
      },
      legend: {
        data: ['實際值', '目標值'],
        top: 30,
      },
      xAxis: {
        type: 'category',
        data: periods,
      },
      yAxis: {
        type: 'value',
        name: '數值',
      },
      series: [
        {
          name: '實際值',
          type: 'line',
          data: values,
          smooth: true,
          itemStyle: { color: '#3b82f6' },
        },
        {
          name: '目標值',
          type: 'line',
          data: targets,
          smooth: true,
          itemStyle: { color: '#10b981' },
          lineStyle: { type: 'dashed' },
        },
      ],
    };
  };

  if (loading) {
    return <div className="p-8">載入中...</div>;
  }

  if (!kpi) {
    return <div className="p-8">KPI 不存在</div>;
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* 麵包屑 */}
        <nav className="mb-6">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Link href="/dashboard" className="hover:text-gray-900">
              戰略儀表板
            </Link>
            <span>/</span>
            <Link href="/kpi" className="hover:text-gray-900">
              持續且重要目標
            </Link>
            <span>/</span>
            <span className="text-gray-900">{kpi.name_zh}</span>
          </div>
        </nav>

        {/* 基本資訊 */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">{kpi.name_zh}</h1>
                {kpi.name_en && (
                  <p className="text-gray-600 mt-1">{kpi.name_en}</p>
                )}
              </div>
              <div className="flex items-center space-x-4">
                <span
                  className={`inline-block w-4 h-4 rounded-full ${getStatusColor(
                    kpi.status
                  )}`}
                />
                <span className="text-sm text-gray-600">KPI ID: {kpi.kpi_id}</span>
              </div>
            </div>
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">基本資訊</h3>
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="text-gray-600">BSC 構面</dt>
                  <dd>{getPerspectiveLabel(kpi.bsc_perspective)}</dd>
                </div>
                <div>
                  <dt className="text-gray-600">定義</dt>
                  <dd className="mt-1">{kpi.definition}</dd>
                </div>
                <div>
                  <dt className="text-gray-600">公式</dt>
                  <dd className="mt-1 font-mono text-xs bg-gray-50 p-2 rounded">
                    {kpi.formula}
                  </dd>
                </div>
              </dl>
            </div>

            <div>
              <h3 className="font-semibold mb-2">資料管理</h3>
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="text-gray-600">資料來源</dt>
                  <dd>{kpi.data_source}</dd>
                </div>
                <div>
                  <dt className="text-gray-600">資料負責人</dt>
                  <dd>{kpi.data_steward}</dd>
                </div>
                <div>
                  <dt className="text-gray-600">更新頻率</dt>
                  <dd>{kpi.update_frequency}</dd>
                </div>
                <div>
                  <dt className="text-gray-600">當前版本</dt>
                  <dd>v{kpi.versions?.length || 1}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>

        {/* 趨勢圖 */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-6 border-b flex items-center justify-between">
            <h2 className="text-xl font-semibold">趨勢分析</h2>
            {kpi.recent_values && kpi.recent_values.length > 0 && (
              <ExceptionMarker kpiId={kpi.id} period={kpi.recent_values[0].period} />
            )}
          </div>
          <div className="p-6">
            <ReactECharts
              option={getTrendChartOption()}
              style={{ height: '400px' }}
            />
          </div>
        </div>

        {/* 下鑽路徑 */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">下鑽路徑</h2>
          </div>
          <div className="p-6">
            <TracePath kpiId={kpi.id} type="down" />
          </div>
        </div>

        {/* 相關資訊 */}
        <div className="bg-white rounded-lg shadow mt-6">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">相關資訊</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">相關策略專案</h3>
                <p className="text-sm text-gray-600">
                  <Link href={`/initiatives?kpi_id=${kpi.id}`} className="text-blue-600 hover:underline">
                    查看相關策略專案 →
                  </Link>
                </p>
              </div>
              <div>
                <h3 className="font-medium mb-2">相關 OKR</h3>
                <p className="text-sm text-gray-600">
                  <Link href={`/okr?kpi_id=${kpi.id}`} className="text-blue-600 hover:underline">
                    查看相關 OKR →
                  </Link>
                </p>
              </div>
              <div>
                <h3 className="font-medium mb-2">相關任務</h3>
                <p className="text-sm text-gray-600">
                  <Link href={`/kanban?kpi_id=${kpi.id}`} className="text-blue-600 hover:underline">
                    查看相關任務 →
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

