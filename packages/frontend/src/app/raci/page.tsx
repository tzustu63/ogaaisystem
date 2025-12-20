'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import Link from 'next/link';

interface RACITemplate {
  id: string;
  name: string;
  description?: string;
  scenario_type?: string;
  raci_matrix: any;
  workflow_steps?: any[];
}

interface Workflow {
  id: string;
  template_id: string;
  entity_type: string;
  entity_id: string;
  current_step: string;
  status: string;
  template_name?: string;
}

export default function RACIPage() {
  const [templates, setTemplates] = useState<RACITemplate[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [activeTab, setActiveTab] = useState<'templates' | 'workflows'>('templates');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [templatesRes, workflowsRes] = await Promise.all([
        api.get('/raci/templates'),
        api.get('/raci/workflows'),
      ]);
      setTemplates(templatesRes.data);
      setWorkflows(workflowsRes.data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'archived':
        return 'bg-green-100 text-green-800';
      case 'approval':
        return 'bg-blue-100 text-blue-800';
      case 'consultation':
        return 'bg-yellow-100 text-yellow-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="p-8">載入中...</div>;
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">RACI 工作流管理</h1>
          <Link
            href="/raci/templates/new"
            className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
          >
            新增模板
          </Link>
        </div>

        {/* 標籤切換 */}
        <div className="mb-6 border-b">
          <div className="flex space-x-4">
            <button
              onClick={() => setActiveTab('templates')}
              className={`px-4 py-2 font-medium ${
                activeTab === 'templates'
                  ? 'border-b-2 border-primary-600 text-primary-600'
                  : 'text-gray-600'
              }`}
            >
              模板管理
            </button>
            <button
              onClick={() => setActiveTab('workflows')}
              className={`px-4 py-2 font-medium ${
                activeTab === 'workflows'
                  ? 'border-b-2 border-primary-600 text-primary-600'
                  : 'text-gray-600'
              }`}
            >
              進行中的工作流
            </button>
          </div>
        </div>

        {/* 模板列表 */}
        {activeTab === 'templates' && (
          <div className="space-y-4">
            {templates.map((template) => (
              <div key={template.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold mb-2">{template.name}</h2>
                    {template.description && (
                      <p className="text-gray-600 mb-4">{template.description}</p>
                    )}

                    {/* RACI 矩陣 */}
                    <div className="grid grid-cols-4 gap-4 mt-4">
                      {['R', 'A', 'C', 'I'].map((role) => (
                        <div key={role}>
                          <h3 className="font-medium mb-2">{role}</h3>
                          <ul className="text-sm text-gray-600 space-y-1">
                            {(template.raci_matrix[role] || []).map((userId: string, idx: number) => (
                              <li key={idx}>使用者 {userId.substring(0, 8)}...</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>

                    {template.workflow_steps && template.workflow_steps.length > 0 && (
                      <div className="mt-4">
                        <h3 className="font-medium mb-2">工作流步驟</h3>
                        <div className="flex space-x-2">
                          {template.workflow_steps.map((step: any, idx: number) => (
                            <span
                              key={idx}
                              className="px-3 py-1 bg-gray-100 rounded text-sm"
                            >
                              {step.step}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <Link
                    href={`/raci/workflows/new?template_id=${template.id}`}
                    className="ml-4 px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
                  >
                    建立工作流
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 工作流列表 */}
        {activeTab === 'workflows' && (
          <div className="space-y-4">
            {workflows.map((workflow) => (
              <div key={workflow.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold mb-2">
                      {workflow.template_name || '工作流'}
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-4">
                      <div>
                        <span className="text-gray-600">實體類型</span>
                        <p className="font-medium">{workflow.entity_type}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">當前步驟</span>
                        <p className="font-medium">{workflow.current_step}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">狀態</span>
                        <p>
                          <span
                            className={`px-2 py-1 rounded text-xs ${getStatusColor(
                              workflow.status
                            )}`}
                          >
                            {workflow.status}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>

                  <Link
                    href={`/raci/workflows/${workflow.id}`}
                    className="ml-4 px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
                  >
                    查看詳情
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

