'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import Link from 'next/link';

interface PDCACycle {
  id: string;
  cycle_name: string;
  check_frequency: string;
  responsible_name?: string;
  initiative_name?: string;
}

interface PDCAAction {
  id: string;
  root_cause: string;
  action_type: string;
  action_items: string[];
  status: string;
  due_date?: string;
  responsible_name?: string;
  cycle_name?: string;
}

export default function PDCAPage() {
  const [cycles, setCycles] = useState<PDCACycle[]>([]);
  const [actions, setActions] = useState<PDCAAction[]>([]);
  const [activeTab, setActiveTab] = useState<'cycles' | 'actions'>('cycles');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [cyclesRes, actionsRes] = await Promise.all([
        api.get('/pdca'),
        api.get('/pdca/actions/dashboard'),
      ]);
      setCycles(cyclesRes.data);
      setActions(actionsRes.data?.actions || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching PDCA data:', error);
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRootCauseLabel = (cause: string) => {
    const labels: Record<string, string> = {
      human: '人力',
      process: '流程',
      system: '系統',
      external_policy: '外部政策',
      partner: '合作方',
    };
    return labels[cause] || cause;
  };

  if (loading) {
    return <div className="p-8">載入中...</div>;
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">PDCA 循環管理</h1>
          <Link
            href="/pdca/new"
            className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
          >
            新增循環
          </Link>
        </div>

        {/* 標籤切換 */}
        <div className="mb-6 border-b">
          <div className="flex space-x-4">
            <button
              onClick={() => setActiveTab('cycles')}
              className={`px-4 py-2 font-medium ${
                activeTab === 'cycles'
                  ? 'border-b-2 border-primary-600 text-primary-600'
                  : 'text-gray-600'
              }`}
            >
              PDCA 循環
            </button>
            <button
              onClick={() => setActiveTab('actions')}
              className={`px-4 py-2 font-medium ${
                activeTab === 'actions'
                  ? 'border-b-2 border-primary-600 text-primary-600'
                  : 'text-gray-600'
              }`}
            >
              改善行動追蹤
            </button>
          </div>
        </div>

        {/* PDCA 循環列表 */}
        {activeTab === 'cycles' && (
          <div className="space-y-4">
            {cycles.map((cycle) => (
              <div key={cycle.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold mb-2">{cycle.cycle_name}</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">檢核頻率</span>
                        <p className="font-medium">{cycle.check_frequency}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">負責人</span>
                        <p className="font-medium">{cycle.responsible_name || '未指定'}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">關聯專案</span>
                        <p className="font-medium">{cycle.initiative_name || '無'}</p>
                      </div>
                    </div>
                  </div>

                  <Link
                    href={`/pdca/${cycle.id}`}
                    className="ml-4 px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
                  >
                    查看詳情
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 改善行動列表 */}
        {activeTab === 'actions' && (
          <div className="space-y-4">
            {actions.map((action) => (
              <div key={action.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h2 className="text-xl font-semibold">改善行動</h2>
                      <span
                        className={`px-2 py-1 rounded text-xs ${getStatusColor(
                          action.status
                        )}`}
                      >
                        {action.status}
                      </span>
                      <span className="text-sm text-gray-600">
                        {getRootCauseLabel(action.root_cause)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                      <div>
                        <span className="text-gray-600">對策類型</span>
                        <p className="font-medium">{action.action_type}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">負責人</span>
                        <p className="font-medium">{action.responsible_name || '未指定'}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">截止日期</span>
                        <p className="font-medium">
                          {action.due_date
                            ? new Date(action.due_date).toLocaleDateString('zh-TW')
                            : '未設定'}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-600">PDCA 循環</span>
                        <p className="font-medium">{action.cycle_name || '無'}</p>
                      </div>
                    </div>

                    {action.action_items && action.action_items.length > 0 && (
                      <div>
                        <h3 className="font-medium mb-2">具體行動</h3>
                        <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                          {action.action_items.map((item, idx) => (
                            <li key={idx}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

