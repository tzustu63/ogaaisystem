'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';

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

interface CurrentUser {
  id: string;
  username: string;
  email: string;
  fullName: string;
  roles: string[];
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }
      const res = await authApi.getMe();
      // 後端返回的結構是 { user: {...} }
      const userData = res.data.user || res.data;
      setCurrentUser({
        id: userData.id,
        username: userData.username,
        email: userData.email,
        fullName: userData.full_name || userData.fullName,
        roles: userData.roles || [],
      });
    } catch (error) {
      console.error('Error fetching current user:', error);
      // 如果 token 無效，清除但不重定向（讓用戶繼續使用，但隱藏用戶信息）
      // localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    // 清除 token
    localStorage.removeItem('token');
    // 重定向到登入頁
    router.push('/login');
  };

  return (
    <div className="w-64 bg-gray-800 text-white min-h-screen p-4 flex flex-col">
      <div className="mb-8">
        <Link href="/">
          <h1 className="text-xl font-bold hover:text-gray-300 cursor-pointer transition-colors">
            策略執行管理系統
          </h1>
        </Link>
      </div>

      <nav className="flex-1">
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

      {/* 用戶信息和登出按鈕 */}
      <div className="mt-auto pt-4 border-t border-gray-700">
        {!loading && currentUser && (
          <div className="mb-3">
            <div className="px-4 py-2">
              <div className="text-sm font-medium">{currentUser.fullName || currentUser.username}</div>
              <div className="text-xs text-gray-400 mt-1">{currentUser.email}</div>
              {currentUser.roles && currentUser.roles.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {currentUser.roles.map((role, index) => (
                    <span
                      key={index}
                      className="px-2 py-0.5 bg-gray-700 text-gray-300 rounded text-xs"
                    >
                      {role === 'admin' ? '管理員' : role}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-sm font-medium transition-colors"
        >
          登出
        </button>
      </div>
    </div>
  );
}

