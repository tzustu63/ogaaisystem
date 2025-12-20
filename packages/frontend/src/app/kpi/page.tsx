'use client';

import { useEffect, useState } from 'react';
import { kpiApi } from '@/lib/api';
import Link from 'next/link';

interface KPI {
  id: string;
  kpi_id: string;
  name_zh: string;
  name_en?: string;
  bsc_perspective: string;
  status?: string;
  version_count?: number;
}

export default function KPIPage() {
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    kpiApi.getAll()
      .then((res) => {
        setKpis(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching KPIs:', err);
        setLoading(false);
      });
  }, []);

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

  if (loading) {
    return <div className="p-8">載入中...</div>;
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">KPI Registry</h1>
          <Link
            href="/kpi/new"
            className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
          >
            新增 KPI
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  KPI ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  名稱
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  BSC 構面
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  狀態
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  版本
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {kpis.map((kpi) => (
                <tr key={kpi.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {kpi.kpi_id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {kpi.name_zh}
                    {kpi.name_en && (
                      <span className="text-gray-500 ml-2">({kpi.name_en})</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {getPerspectiveLabel(kpi.bsc_perspective)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-block w-3 h-3 rounded-full ${getStatusColor(
                        kpi.status
                      )}`}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    v{kpi.version_count || 1}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
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
  );
}

