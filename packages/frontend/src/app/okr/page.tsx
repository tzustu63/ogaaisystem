'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import Link from 'next/link';

interface OKR {
  id: string;
  initiative_id: string;
  quarter: string;
  objective: string;
  key_results?: any[];
  kr_count?: number;
}

export default function OKRPage() {
  const [okrs, setOkrs] = useState<OKR[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/okr')
      .then((res) => {
        setOkrs(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching OKRs:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="p-8">載入中...</div>;
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">OKR 管理</h1>
          <Link
            href="/okr/new"
            className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
          >
            新增 OKR
          </Link>
        </div>

        <div className="space-y-6">
          {okrs.map((okr) => (
            <div key={okr.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold">{okr.objective}</h2>
                  <p className="text-sm text-gray-600 mt-1">季度：{okr.quarter}</p>
                </div>
                <Link
                  href={`/okr/${okr.id}`}
                  className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
                >
                  查看詳情
                </Link>
              </div>

              {okr.key_results && okr.key_results.length > 0 && (
                <div className="space-y-3 mt-4">
                  {okr.key_results.map((kr: any) => (
                    <div key={kr.id}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{kr.description}</span>
                        <span>
                          {parseFloat(kr.progress_percentage || 0).toFixed(1)}% (
                          {kr.current_value || 0} / {kr.target_value || 0} {kr.unit || ''})
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-primary-600 h-2 rounded-full transition-all"
                          style={{
                            width: `${Math.min(100, parseFloat(kr.progress_percentage || 0))}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

