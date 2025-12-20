'use client';

import { useEffect, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import api from '@/lib/api';

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

export default function StrategyMapPage() {
  const [objectives, setObjectives] = useState<BSCObjective[]>([]);
  const [links, setLinks] = useState<CausalLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsedPerspectives, setCollapsedPerspectives] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [objectivesRes, linksRes] = await Promise.all([
        api.get('/bsc/objectives'),
        api.get('/bsc/causal-links'),
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
      setLoading(false);
    }
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
        <div className="bg-white rounded-lg shadow p-6">
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
          </div>
        </div>
      </div>
    </div>
  );
}

