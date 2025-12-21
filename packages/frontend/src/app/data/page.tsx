'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DataPage() {
  const router = useRouter();

  useEffect(() => {
    // 重定向到第一個資料管理子頁面
    router.replace('/data/import');
  }, [router]);

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center">
          <p className="text-gray-600">載入中...</p>
        </div>
      </div>
    </div>
  );
}
