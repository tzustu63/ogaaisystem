'use client';

import { useEffect, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import api from '@/lib/api';
import Link from 'next/link';

interface BSCObjective {
  id: string;
  name_zh: string;
  perspective: string;
}

interface CausalLink {
  id: string;
  from_objective_id: string;
  to_objective_id: string;
  from_objective?: BSCObjective;
  to_objective?: BSCObjective;
}

interface Initiative {
  id: string;
  name: string;
  status: string;
  progress: number;
  bsc_perspective?: string;
}

interface OKR {
  id: string;
  objective: string;
  quarter: string;
  status: string;
  progress: number;
  initiative_id?: string;
}

export default function StrategyMapPage() {
  const [objectives, setObjectives] = useState<BSCObjective[]>([]);
  const [links, setLinks] = useState<CausalLink[]>([]);
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [okrs, setOKRs] = useState<OKR[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsedPerspectives, setCollapsedPerspectives] = useState<Set<string>>(new Set());
  const [selectedPerspective, setSelectedPerspective] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [objectivesRes, linksRes, initRes, okrRes] = await Promise.all([
        api.get('/bsc/objectives'),
        api.get('/bsc/causal-links'),
        api.get('/initiatives'),
        api.get('/okr'),
      ]);

      const objectivesData = objectivesRes.data.map((obj: any) => ({
        id: obj.id,
        name_zh: obj.name_zh,
        perspective: obj.perspective,
      }));

      const linksData = linksRes.data.map((link: any) => ({
        id: link.id,
        from_objective_id: link.from_objective_id,
        to_objective_id: link.to_objective_id,
        from_objective: {
          id: link.from_objective_id,
          name_zh: link.from_objective_name,
          perspective: link.from_perspective,
        },
        to_objective: {
          id: link.to_objective_id,
          name_zh: link.to_objective_name,
          perspective: link.to_perspective,
        },
      }));

      setObjectives(objectivesData);
      setLinks(linksData);
      setInitiatives(initRes.data || []);
      setOKRs(okrRes.data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      // 如果 API 失敗，使用模擬資料
      const mockObjectives: BSCObjective[] = [
        { id: '1', name_zh: '提升外部經費', perspective: 'financial' },
        { id: '2', name_zh: '提升境外生滿意度', perspective: 'customer' },
        { id: '3', name_zh: '提升行政效率', perspective: 'internal_process' },
        { id: '4', name_zh: '提升雙語能力', perspective: 'learning_growth' },
      ];
      setObjectives(mockObjectives);
      setLinks([]);
      setInitiatives([]);
      setOKRs([]);
      setLoading(false);
    }
  };

  const perspectiveLabels: Record<string, string> = {
    financial: '財務構面',
    customer: '客戶構面',
    internal_process: '內部流程構面',
    learning_growth: '學習成長構面',
  };

  const getChartOption = () => {
    const perspectiveColors: Record<string, string> = {
      financial: '#ef4444',
      customer: '#3b82f6',
      internal_process: '#10b981',
      learning_growth: '#f59e0b',
    };

    const perspectiveLabels: Record<string, string> = {
      financial: '財務構面',
      customer: '客戶構面',
      internal_process: '內部流程構面',
      learning_growth: '學習成長構面',
    };

    // 建立節點（過濾已收合的構面）
    const nodes = objectives
      .filter((obj) => !collapsedPerspectives.has(obj.perspective))
      .map((obj) => ({
        id: obj.id,
        name: obj.name_zh,
        category: obj.perspective,
        value: 1,
        itemStyle: { color: perspectiveColors[obj.perspective] },
      }));

    // 建立邊（因果鏈，只顯示可見節點之間的連線）
    const visibleNodeIds = new Set(nodes.map((n) => n.id));
    const edges = links
      .filter((link) => visibleNodeIds.has(link.from_objective_id) && visibleNodeIds.has(link.to_objective_id))
      .map((link) => ({
        source: link.from_objective_id,
        target: link.to_objective_id,
        lineStyle: { color: '#999', width: 2 },
      }));

    // 分類
    const categories = Object.keys(perspectiveLabels).map((key) => ({
      name: perspectiveLabels[key],
    }));

    return {
      title: {
        text: '戰略地圖',
        left: 'center',
      },
      tooltip: {},
      legend: {
        data: categories.map((c) => c.name),
        top: 50,
      },
      series: [
        {
          type: 'graph',
          layout: 'force',
          data: nodes,
          links: edges,
          categories: categories,
          roam: true,
          label: {
            show: true,
            position: 'right',
            formatter: '{b}',
          },
          labelLayout: {
            hideOverlap: true,
          },
          lineStyle: {
            color: 'source',
            curveness: 0.3,
          },
          emphasis: {
            focus: 'adjacency',
            lineStyle: {
              width: 10,
            },
          },
          force: {
            repulsion: 1000,
            gravity: 0.1,
            edgeLength: 200,
            layoutAnimation: true,
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
        <h1 className="text-3xl font-bold mb-6">戰略地圖</h1>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold mb-4">BSC 四構面因果鏈</h2>
            <div className="grid grid-cols-4 gap-4 text-sm">
              {(['financial', 'customer', 'internal_process', 'learning_growth'] as const).map((perspective) => {
                const isCollapsed = collapsedPerspectives.has(perspective);
                const perspectiveLabels: Record<string, string> = {
                  financial: '財務構面',
                  customer: '客戶構面',
                  internal_process: '內部流程構面',
                  learning_growth: '學習成長構面',
                };
                const perspectiveColors: Record<string, string> = {
                  financial: 'red',
                  customer: 'blue',
                  internal_process: 'green',
                  learning_growth: 'yellow',
                };
                const count = objectives.filter((o) => o.perspective === perspective).length;
                return (
                  <div
                    key={perspective}
                    className={`p-4 bg-${perspectiveColors[perspective]}-50 rounded cursor-pointer hover:bg-${perspectiveColors[perspective]}-100 transition-colors`}
                    onClick={() => {
                      const newCollapsed = new Set(collapsedPerspectives);
                      if (isCollapsed) {
                        newCollapsed.delete(perspective);
                      } else {
                        newCollapsed.add(perspective);
                      }
                      setCollapsedPerspectives(newCollapsed);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className={`font-medium text-${perspectiveColors[perspective]}-800`}>
                        {perspectiveLabels[perspective]}
                      </h3>
                      <span className="text-lg">{isCollapsed ? '▼' : '▲'}</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">{count} 個目標</p>
                  </div>
                );
              })}
            </div>
          </div>

          <ReactECharts
            option={getChartOption()}
            style={{ height: '600px', width: '100%' }}
          />
        </div>

        {/* 因果鏈列表 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">因果鏈列表</h2>
          <div className="space-y-3">
            {links.map((link) => (
              <div key={link.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded">
                <div className="flex-1">
                  <span className="font-medium">{link.from_objective?.name_zh}</span>
                </div>
                <div className="text-gray-400">→</div>
                <div className="flex-1">
                  <span className="font-medium">{link.to_objective?.name_zh}</span>
                </div>
              </div>
            ))}
            {links.length === 0 && (
              <p className="text-gray-500 text-center py-4">尚無因果鏈資料</p>
            )}
          </div>
        </div>

        {/* 策略執行總覽 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 策略專案 */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">📋 策略專案</h2>
              <Link href="/initiatives" className="text-primary-600 hover:underline text-sm">
                查看全部 →
              </Link>
            </div>
            <div className="space-y-3">
              {initiatives.slice(0, 4).map((initiative) => (
                <div key={initiative.id} className="p-3 bg-gray-50 rounded">
                  <div className="flex justify-between items-center mb-1">
                    <Link href={`/initiatives/${initiative.id}`} className="font-medium text-sm hover:text-primary-600">
                      {initiative.name}
                    </Link>
                    <span className={`px-2 py-0.5 text-xs rounded ${
                      initiative.status === 'completed' ? 'bg-green-100 text-green-800' :
                      initiative.status === 'in_progress' || initiative.status === 'active' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {initiative.status === 'completed' ? '已完成' :
                       initiative.status === 'in_progress' || initiative.status === 'active' ? '進行中' : initiative.status}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div 
                      className="bg-primary-600 h-1.5 rounded-full" 
                      style={{ width: `${initiative.progress || 0}%` }}
                    />
                  </div>
                </div>
              ))}
              {initiatives.length === 0 && (
                <p className="text-gray-500 text-center py-4">尚無策略專案</p>
              )}
            </div>
          </div>

          {/* OKR 管理 */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">🎯 OKR 進度</h2>
              <Link href="/okr" className="text-primary-600 hover:underline text-sm">
                查看全部 →
              </Link>
            </div>
            <div className="space-y-3">
              {okrs.slice(0, 4).map((okr) => (
                <div key={okr.id} className="p-3 bg-gray-50 rounded">
                  <div className="flex justify-between items-center mb-1">
                    <p className="font-medium text-sm">{okr.objective}</p>
                    <span className="text-xs text-gray-500">{okr.quarter}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div 
                      className={`h-1.5 rounded-full ${
                        (okr.progress || 0) >= 70 ? 'bg-green-500' :
                        (okr.progress || 0) >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${okr.progress || 0}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{okr.progress || 0}%</p>
                </div>
              ))}
              {okrs.length === 0 && (
                <p className="text-gray-500 text-center py-4">尚無 OKR</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

