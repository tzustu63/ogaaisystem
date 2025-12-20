'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import Link from 'next/link';

interface Incident {
  id: string;
  incident_number: string;
  incident_type: string;
  severity: string;
  occurred_at: string;
  student_name: string;
  description: string;
  status: string;
  accountable_name?: string;
  completed_checklist_count?: number;
  total_checklist_count?: number;
}

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<{ status?: string; severity?: string }>({});

  useEffect(() => {
    fetchIncidents();
  }, [filter]);

  const fetchIncidents = async () => {
    try {
      const params = new URLSearchParams();
      if (filter.status) params.append('status', filter.status);
      if (filter.severity) params.append('severity', filter.severity);

      const res = await api.get(`/incidents?${params.toString()}`);
      setIncidents(res.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching incidents:', error);
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-600 text-white';
      case 'high':
        return 'bg-orange-500 text-white';
      case 'medium':
        return 'bg-yellow-500 text-white';
      case 'low':
        return 'bg-green-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'closed':
        return 'bg-green-100 text-green-800';
      case 'resolved':
        return 'bg-blue-100 text-blue-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'open':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      campus_safety: '校安',
      medical: '醫療',
      legal: '法務',
      visa: '簽證',
      other: '其他',
    };
    return labels[type] || type;
  };

  if (loading) {
    return <div className="p-8">載入中...</div>;
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">緊急事件管理</h1>
          <Link
            href="/incidents/new"
            className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
          >
            新增事件
          </Link>
        </div>

        {/* 篩選器 */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex space-x-4">
            <select
              value={filter.status || ''}
              onChange={(e) => setFilter({ ...filter, status: e.target.value || undefined })}
              className="px-4 py-2 border rounded"
            >
              <option value="">所有狀態</option>
              <option value="open">開啟</option>
              <option value="in_progress">處理中</option>
              <option value="resolved">已解決</option>
              <option value="closed">已結案</option>
            </select>
            <select
              value={filter.severity || ''}
              onChange={(e) => setFilter({ ...filter, severity: e.target.value || undefined })}
              className="px-4 py-2 border rounded"
            >
              <option value="">所有嚴重程度</option>
              <option value="critical">緊急</option>
              <option value="high">高</option>
              <option value="medium">中</option>
              <option value="low">低</option>
            </select>
          </div>
        </div>

        {/* 事件列表 */}
        <div className="space-y-4">
          {incidents.map((incident) => (
            <div key={incident.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h2 className="text-xl font-semibold">{incident.incident_number}</h2>
                    <span
                      className={`px-2 py-1 rounded text-xs ${getSeverityColor(
                        incident.severity
                      )}`}
                    >
                      {incident.severity}
                    </span>
                    <span
                      className={`px-2 py-1 rounded text-xs ${getStatusColor(
                        incident.status
                      )}`}
                    >
                      {incident.status}
                    </span>
                    <span className="text-sm text-gray-600">
                      {getTypeLabel(incident.incident_type)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                    <div>
                      <span className="text-gray-600">當事人</span>
                      <p className="font-medium">{incident.student_name}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">發生時間</span>
                      <p className="font-medium">
                        {new Date(incident.occurred_at).toLocaleString('zh-TW')}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600">負責人</span>
                      <p className="font-medium">{incident.accountable_name || '未指定'}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Checklist 進度</span>
                      <p className="font-medium">
                        {incident.completed_checklist_count || 0} /{' '}
                        {incident.total_checklist_count || 0}
                      </p>
                    </div>
                  </div>

                  <p className="text-gray-700 text-sm line-clamp-2">{incident.description}</p>
                </div>

                <Link
                  href={`/incidents/${incident.id}`}
                  className="ml-4 px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
                >
                  查看詳情
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

