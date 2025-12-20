'use client';

import { useEffect, useState } from 'react';
import { dataQualityApi } from '@/lib/api';
import Link from 'next/link';

interface QualityReport {
  id: string;
  cycle_name: string;
  check_frequency: string;
  responsible_name: string;
  created_at: string;
  stats: {
    total_checks: number;
    pass_count: number;
    warning_count: number;
    fail_count: number;
    pass_rate: string;
  };
  checks: any[];
}

export default function DataQualityPage() {
  const [reports, setReports] = useState<QualityReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const res = await dataQualityApi.getReports();
      setReports(res.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching quality reports:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8">載入中...</div>;
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* 麵包屑 */}
        <nav className="mb-6">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Link href="/data" className="hover:text-gray-900">
              數據管理
            </Link>
            <span>/</span>
            <span className="text-gray-900">資料品質報告</span>
          </div>
        </nav>

        <h1 className="text-2xl font-bold mb-6">資料品質報告</h1>

        <div className="space-y-4">
          {reports.map((report) => (
            <div key={report.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold">{report.cycle_name}</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    負責人：{report.responsible_name} | 檢核頻率：{report.check_frequency}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-600">
                    {report.stats.pass_rate}%
                  </div>
                  <div className="text-sm text-gray-600">通過率</div>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-lg font-semibold">{report.stats.total_checks}</div>
                  <div className="text-xs text-gray-600">總檢核次數</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-green-600">{report.stats.pass_count}</div>
                  <div className="text-xs text-gray-600">通過</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-yellow-600">{report.stats.warning_count}</div>
                  <div className="text-xs text-gray-600">警告</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-red-600">{report.stats.fail_count}</div>
                  <div className="text-xs text-gray-600">失敗</div>
                </div>
              </div>

              {report.checks && report.checks.length > 0 && (
                <div className="mt-4">
                  <h3 className="font-medium mb-2">最近檢核記錄</h3>
                  <div className="space-y-2">
                    {report.checks.slice(0, 3).map((check: any, index: number) => (
                      <div key={index} className="p-3 bg-gray-50 rounded text-sm">
                        <div className="flex items-center justify-between">
                          <span>{new Date(check.check_date).toLocaleDateString('zh-TW')}</span>
                          <div className="flex space-x-2">
                            <span className={`px-2 py-1 rounded ${
                              check.completeness_status === 'pass' ? 'bg-green-100 text-green-800' :
                              check.completeness_status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              完整性: {check.completeness_status}
                            </span>
                            <span className={`px-2 py-1 rounded ${
                              check.timeliness_status === 'pass' ? 'bg-green-100 text-green-800' :
                              check.timeliness_status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              準時性: {check.timeliness_status}
                            </span>
                            <span className={`px-2 py-1 rounded ${
                              check.consistency_status === 'pass' ? 'bg-green-100 text-green-800' :
                              check.consistency_status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              一致性: {check.consistency_status}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

