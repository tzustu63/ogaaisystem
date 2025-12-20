'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const menuItems = [
  {
    title: '📊 戰略儀表板',
    href: '/dashboard',
    children: [
      { title: 'BSC 四構面總覽', href: '/dashboard' },
      { title: '戰略地圖', href: '/dashboard/strategy-map' },
      { title: 'KPI Registry', href: '/kpi' },
    ],
  },
  {
    title: '🎯 戰術管理',
    href: '/initiatives',
    children: [
      { title: 'Initiatives', href: '/initiatives' },
      { title: 'OKR 管理', href: '/okr' },
      { title: 'RACI 模板', href: '/raci' },
    ],
  },
  {
    title: '✅ 執行管理',
    href: '/kanban',
    children: [
      { title: 'Kanban 看板', href: '/kanban' },
      { title: 'Incident 管理', href: '/incidents' },
      { title: 'PDCA 循環', href: '/pdca' },
    ],
  },
  {
    title: '📁 數據管理',
    href: '/data',
    children: [
      { title: '資料匯入', href: '/data/import' },
      { title: '系統對接狀態', href: '/data/integration' },
      { title: '資料品質報告', href: '/data/quality' },
    ],
  },
  {
    title: '👥 系統設定',
    href: '/settings',
    children: [
      { title: '用戶與權限', href: '/settings/users' },
      { title: '通知設定', href: '/settings/notifications' },
      { title: '稽核日誌', href: '/settings/audit' },
      { title: '個資合規', href: '/settings/gdpr' },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="w-64 bg-gray-800 text-white min-h-screen p-4">
      <div className="mb-8">
        <h1 className="text-xl font-bold">策略執行管理系統</h1>
      </div>

      <nav>
        {menuItems.map((item) => (
          <div key={item.title} className="mb-4">
            <Link
              href={item.href}
              className={`block px-4 py-2 rounded ${
                pathname.startsWith(item.href) ? 'bg-gray-700' : 'hover:bg-gray-700'
              }`}
            >
              {item.title}
            </Link>
            {item.children && pathname.startsWith(item.href) && (
              <div className="ml-4 mt-2 space-y-1">
                {item.children.map((child) => (
                  <Link
                    key={child.href}
                    href={child.href}
                    className={`block px-4 py-2 rounded text-sm ${
                      pathname === child.href
                        ? 'bg-gray-700'
                        : 'hover:bg-gray-700 text-gray-300'
                    }`}
                  >
                    {child.title}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
    </div>
  );
}

