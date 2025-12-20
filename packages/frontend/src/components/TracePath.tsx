'use client';

import { useEffect, useState } from 'react';
import { traceApi } from '@/lib/api';
import Link from 'next/link';

interface TracePathProps {
  taskId?: string;
  kpiId?: string;
  type: 'up' | 'down';
}

export default function TracePath({ taskId, kpiId, type }: TracePathProps) {
  const [path, setPath] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (type === 'up' && taskId) {
      traceApi.getTaskTraceUp(taskId)
        .then((res) => {
          setPath(res.data.path_up || []);
          setLoading(false);
        })
        .catch((err) => {
          console.error('Error fetching trace up:', err);
          setLoading(false);
        });
    } else if (type === 'down' && kpiId) {
      traceApi.getKpiTraceDown(kpiId)
        .then((res) => {
          setPath(res.data.path_down || []);
          setLoading(false);
        })
        .catch((err) => {
          console.error('Error fetching trace down:', err);
          setLoading(false);
        });
    }
  }, [taskId, kpiId, type]);

  if (loading) {
    return <div className="text-sm text-gray-500">載入路徑中...</div>;
  }

  if (path.length === 0) {
    return <div className="text-sm text-gray-500">無路徑資料</div>;
  }

  const getLevelLabel = (level: string) => {
    const labels: Record<string, string> = {
      task: '任務',
      kr: '關鍵結果',
      okr: 'OKR',
      initiative: '策略專案',
      kpi: 'KPI',
      bsc: 'BSC 目標',
    };
    return labels[level] || level;
  };

  return (
    <div className="flex items-center space-x-2 text-sm">
      {path.map((item, index) => (
        <div key={index} className="flex items-center space-x-2">
          {index > 0 && <span className="text-gray-400">→</span>}
          <Link
            href={item.url || '#'}
            className="text-blue-600 hover:text-blue-900 hover:underline"
          >
            <span className="text-xs text-gray-500">[{getLevelLabel(item.type)}]</span>{' '}
            {item.name}
          </Link>
        </div>
      ))}
    </div>
  );
}

