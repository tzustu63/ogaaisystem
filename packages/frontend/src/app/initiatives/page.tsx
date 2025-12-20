'use client';

import { useEffect, useState } from 'react';
import { initiativeApi } from '@/lib/api';
import Link from 'next/link';

interface Initiative {
  id: string;
  initiative_id: string;
  name_zh: string;
  name_en?: string;
  initiative_type: string;
  status: string;
  risk_level?: string;
  start_date?: string;
  end_date?: string;
  okr_count?: number;
  task_count?: number;
}

export default function InitiativesPage() {
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initiativeApi.getAll()
      .then((res) => {
        setInitiatives(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching initiatives:', err);
        setLoading(false);
      });
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'planning':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRiskColor = (risk?: string) => {
    switch (risk) {
      case 'high':
        return 'bg-red-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
        return 'bg-green-500';
      default:
        return 'bg-gray-300';
    }
  };

  if (loading) {
    return <div className="p-8">載入中...</div>;
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">策略專案 (Initiatives)</h1>
          <Link
            href="/initiatives/new"
            className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
          >
            新增專案
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {initiatives.map((initiative) => (
            <div key={initiative.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h2 className="text-xl font-semibold">{initiative.name_zh}</h2>
                    <span
                      className={`px-2 py-1 rounded text-xs ${getStatusColor(
                        initiative.status
                      )}`}
                    >
                      {initiative.status}
                    </span>
                    {initiative.risk_level && (
                      <div className="flex items-center space-x-1">
                        <span
                          className={`inline-block w-2 h-2 rounded-full ${getRiskColor(
                            initiative.risk_level
                          )}`}
                        />
                        <span className="text-xs text-gray-600">
                          {initiative.risk_level}
                        </span>
                      </div>
                    )}
                  </div>
                  {initiative.name_en && (
                    <p className="text-gray-600 mb-4">{initiative.name_en}</p>
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">專案編號</span>
                      <p className="font-medium">{initiative.initiative_id}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">類型</span>
                      <p className="font-medium">{initiative.initiative_type}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">OKR 數量</span>
                      <p className="font-medium">{initiative.okr_count || 0}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">任務數量</span>
                      <p className="font-medium">{initiative.task_count || 0}</p>
                    </div>
                  </div>

                  {initiative.start_date && initiative.end_date && (
                    <div className="mt-4 text-sm text-gray-600">
                      <span>
                        {new Date(initiative.start_date).toLocaleDateString('zh-TW')} -{' '}
                        {new Date(initiative.end_date).toLocaleDateString('zh-TW')}
                      </span>
                    </div>
                  )}
                </div>

                <Link
                  href={`/initiatives/${initiative.id}`}
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

