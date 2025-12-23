'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { initiativeApi } from '@/lib/api';
import Link from 'next/link';

// 報告生成組件
function ReportGenerator({ initiativeId }: { initiativeId: string }) {
  const [showModal, setShowModal] = useState(false);
  const [reportType, setReportType] = useState<'program' | 'evidence'>('program');
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const generateReport = async () => {
    setLoading(true);
    try {
      const res = reportType === 'program'
        ? await initiativeApi.getProgramReport(initiativeId)
        : await initiativeApi.getEvidenceSummary(initiativeId);
      setReportData(res.data);
    } catch (error) {
      console.error('Error generating report:', error);
      alert('產生報告失敗');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        產生報告
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">產生報告</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">報告類型</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value as any)}
                className="w-full border rounded p-2"
              >
                <option value="program">計畫清單報告</option>
                <option value="evidence">執行證據彙整</option>
              </select>
            </div>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowModal(false);
                  setReportData(null);
                }}
                className="px-4 py-2 border rounded"
              >
                取消
              </button>
              <button
                onClick={generateReport}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                {loading ? '產生中...' : '產生報告'}
              </button>
            </div>

            {reportData && (
              <div className="mt-6 border-t pt-4">
                <h4 className="font-medium mb-2">報告內容</h4>
                <pre className="bg-gray-50 p-4 rounded text-xs overflow-auto">
                  {JSON.stringify(reportData, null, 2)}
                </pre>
                <button
                  onClick={() => {
                    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${reportType}_report_${Date.now()}.json`;
                    a.click();
                  }}
                  className="mt-2 px-4 py-2 bg-green-600 text-white rounded text-sm"
                >
                  下載 JSON
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
import ReactECharts from 'echarts-for-react';

interface InitiativeDetail {
  id: string;
  initiative_id: string;
  name_zh: string;
  name_en?: string;
  initiative_type: string;
  status: string;
  risk_level?: string;
  kpis?: any[];
  programs?: string[];
  okrs?: any[];
}

export default function InitiativeDetailPage() {
  const params = useParams();
  const [initiative, setInitiative] = useState<InitiativeDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      initiativeApi.getById(params.id as string)
        .then((res) => {
          setInitiative(res.data);
          setLoading(false);
        })
        .catch((err) => {
          console.error('Error fetching initiative:', err);
          setLoading(false);
        });
    }
  }, [params.id]);

  // OKR 進度圖
  const getOKRProgressOption = () => {
    if (!initiative?.okrs || initiative.okrs.length === 0) {
      return { title: { text: '尚無 OKR' } };
    }

    const okr = initiative.okrs[0]; // 顯示最新的 OKR
    if (!okr.key_results || okr.key_results.length === 0) {
      return { title: { text: '尚無 Key Results' } };
    }

    const krs = okr.key_results;
    const data = krs.map((kr: any) => ({
      value: parseFloat(kr.progress_percentage || 0),
      name: kr.description.substring(0, 30) + (kr.description.length > 30 ? '...' : ''),
    }));

    return {
      title: {
        text: 'OKR 進度',
        left: 'center',
      },
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c}%',
      },
      series: [
        {
          type: 'bar',
          data: data,
          label: {
            show: true,
            position: 'right',
            formatter: '{c}%',
          },
        },
      ],
    };
  };

  if (loading) {
    return <div className="p-8">載入中...</div>;
  }

  if (!initiative) {
    return <div className="p-8">策略專案不存在</div>;
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* 麵包屑 */}
        <nav className="mb-6">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Link href="/initiatives" className="hover:text-gray-900">
              策略專案
            </Link>
            <span>/</span>
            <span className="text-gray-900">{initiative.name_zh}</span>
          </div>
        </nav>

        {/* 基本資訊 */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-6 border-b flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold">{initiative.name_zh}</h1>
              {initiative.name_en && (
                <p className="text-gray-600 mt-1">{initiative.name_en}</p>
              )}
            </div>
            <Link
              href={`/initiatives/${initiative.id}/edit`}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              ✏️ 編輯
            </Link>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="font-semibold mb-2">專案資訊</h3>
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="text-gray-600">專案編號</dt>
                  <dd>{initiative.initiative_id}</dd>
                </div>
                <div>
                  <dt className="text-gray-600">狀態</dt>
                  <dd>{initiative.status}</dd>
                </div>
                <div>
                  <dt className="text-gray-600">風險等級</dt>
                  <dd>{initiative.risk_level || '未設定'}</dd>
                </div>
              </dl>
            </div>

            <div>
              <h3 className="font-semibold mb-2">適用計畫</h3>
              <div className="flex flex-wrap gap-2">
                {initiative.programs?.map((program) => (
                  <span
                    key={program}
                    className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs"
                  >
                    {program}
                  </span>
                )) || <span className="text-gray-500 text-sm">無</span>}
              </div>
            </div>
          </div>
        </div>

        {/* OKR 進度 */}
        {initiative.okrs && initiative.okrs.length > 0 && (
          <div className="bg-white rounded-lg shadow mb-6">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">OKR 進度</h2>
            </div>
            <div className="p-6">
              {initiative.okrs.map((okr) => (
                <div key={okr.id} className="mb-6">
                  <h3 className="font-medium mb-4">{okr.objective}</h3>
                  <div className="space-y-3">
                    {okr.key_results?.map((kr: any) => (
                      <div key={kr.id}>
                        <div className="flex justify-between text-sm mb-1">
                          <span>{kr.description}</span>
                          <span>{parseFloat(kr.progress_percentage || 0).toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-primary-600 h-2 rounded-full"
                            style={{
                              width: `${Math.min(100, parseFloat(kr.progress_percentage || 0))}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 影響的 KPI */}
        {initiative.kpis && initiative.kpis.length > 0 && (
          <div className="bg-white rounded-lg shadow mb-6">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">影響的 KPI</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {initiative.kpis.map((kpi) => (
                  <div key={kpi.id} className="border-b pb-4 last:border-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <Link
                          href={`/kpi/${kpi.id}`}
                          className="font-medium text-primary-600 hover:underline"
                        >
                          {kpi.name_zh}
                        </Link>
                        <p className="text-sm text-gray-600 mt-1">
                          預期影響：{kpi.expected_impact}
                        </p>
                        {kpi.actual_impact_description && (
                          <p className="text-sm text-gray-700 mt-2">
                            實際影響：{kpi.actual_impact_description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 相關任務 */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">相關任務</h2>
          </div>
          <div className="p-6">
            <Link
              href={`/kanban?initiative_id=${initiative.id}`}
              className="text-primary-600 hover:underline"
            >
              查看相關任務 →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

