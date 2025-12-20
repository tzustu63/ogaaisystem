'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { raciApi } from '@/lib/api';
import Link from 'next/link';

interface ConsultationProgress {
  user_id: string;
  user_info: {
    name: string;
    email: string;
  } | null;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  days_elapsed: number;
  is_overdue: boolean;
  consultation: {
    comment: string;
    created_at: string;
  } | null;
}

interface ProgressData {
  workflow: {
    id: string;
    template_name: string;
    current_step: string;
    status: string;
    sla_days: number | null;
  };
  progress: ConsultationProgress[];
  stats: {
    total: number;
    completed: number;
    in_progress: number;
    overdue: number;
    pending: number;
  };
}

export default function ConsultationProgressPage() {
  const params = useParams();
  const [data, setData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      raciApi.getConsultationProgress(params.id as string)
        .then((res) => {
          setData(res.data);
          setLoading(false);
        })
        .catch((err) => {
          console.error('Error fetching progress:', err);
          setLoading(false);
        });
    }
  }, [params.id]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return '已完成';
      case 'in_progress':
        return '進行中';
      case 'overdue':
        return '已逾期';
      default:
        return '待處理';
    }
  };

  if (loading) {
    return <div className="p-8">載入中...</div>;
  }

  if (!data) {
    return <div className="p-8">無法載入會簽進度</div>;
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* 麵包屑 */}
        <nav className="mb-6">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Link href="/raci" className="hover:text-gray-900">
              RACI 工作流
            </Link>
            <span>/</span>
            <span className="text-gray-900">會簽進度</span>
          </div>
        </nav>

        {/* 工作流資訊 */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-6 border-b">
            <h1 className="text-2xl font-bold">{data.workflow.template_name}</h1>
            <p className="text-gray-600 mt-2">
              當前步驟：{data.workflow.current_step} | 狀態：{data.workflow.status}
              {data.workflow.sla_days && ` | SLA：${data.workflow.sla_days} 天`}
            </p>
          </div>
        </div>

        {/* 統計資訊 */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">總數</div>
            <div className="text-2xl font-bold">{data.stats.total}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">已完成</div>
            <div className="text-2xl font-bold text-green-600">{data.stats.completed}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">進行中</div>
            <div className="text-2xl font-bold text-blue-600">{data.stats.in_progress}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">已逾期</div>
            <div className="text-2xl font-bold text-red-600">{data.stats.overdue}</div>
          </div>
        </div>

        {/* 會簽進度列表 */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">會簽進度詳情</h2>
          </div>
          <div className="divide-y">
            {data.progress.map((item, index) => (
              <div key={index} className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="font-medium">
                        {item.user_info?.name || `使用者 ${item.user_id.substring(0, 8)}`}
                      </h3>
                      <span className={`px-2 py-1 rounded text-xs ${getStatusColor(item.status)}`}>
                        {getStatusLabel(item.status)}
                      </span>
                      {item.is_overdue && (
                        <span className="text-red-600 text-sm">
                          逾期 {item.days_elapsed} 天
                        </span>
                      )}
                    </div>
                    {item.user_info?.email && (
                      <p className="text-sm text-gray-600 mt-1">{item.user_info.email}</p>
                    )}
                    {item.consultation && (
                      <div className="mt-2 p-3 bg-gray-50 rounded">
                        <p className="text-sm text-gray-700">{item.consultation.comment}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          提交時間：{new Date(item.consultation.created_at).toLocaleString('zh-TW')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

