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
    return null; // 載入時不顯示，避免閃爍
  }

  if (path.length === 0) {
    return null; // 無路徑時不顯示
  }

  // 精簡顯示：只顯示最後兩層（KR 和 OKR 或策略專案）
  const displayPath = path.length > 2 ? path.slice(-2) : path;

  return (
    <div className="flex items-center space-x-1 text-xs text-gray-600 flex-wrap">
      {displayPath.map((item, index) => (
        <div key={index} className="flex items-center space-x-1">
          {index > 0 && <span className="text-gray-400">→</span>}
          <Link
            href={item.url || '#'}
            className="text-blue-600 hover:text-blue-900 hover:underline truncate max-w-[100px]"
            title={item.name}
          >
            {item.name.length > 12 ? `${item.name.substring(0, 12)}...` : item.name}
          </Link>
        </div>
      ))}
    </div>
  );
}

