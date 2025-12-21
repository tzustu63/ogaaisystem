'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';

interface MenuItem {
  title: string;
  href: string;
  children?: { title: string; href: string }[];
}

const menuItems: MenuItem[] = [
  {
    title: '📊 戰略儀表板',
    href: '/dashboard',
    children: [
      { title: 'BSC 四構面總覽', href: '/dashboard' },
      { title: '戰略地圖', href: '/dashboard/strategy-map' },
      { title: '持續且重要目標', href: '/kpi' },
    ],
  },
  {
    title: '🎯 戰術管理',
    href: '/initiatives',
    children: [
      { title: '策略專案', href: '/initiatives' },
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
      { title: '選項管理', href: '/settings/options' },
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

// 判斷當前路徑是否屬於某個選單項目
const isPathInMenuItem = (pathname: string, item: MenuItem): boolean => {
  // 檢查是否匹配主路徑
  if (pathname === item.href || pathname.startsWith(item.href + '/')) {
    return true;
  }
  // 檢查是否匹配任一子項目路徑
  if (item.children) {
    return item.children.some(
      child => pathname === child.href || pathname.startsWith(child.href + '/')
    );
  }
  return false;
};

// 判斷當前路徑是否完全匹配某個子項目
const isActiveChild = (pathname: string, childHref: string): boolean => {
  return pathname === childHref || pathname.startsWith(childHref + '/');
};

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set());

  // 根據當前路徑決定展開哪個選單
  const getActiveMenuTitle = useCallback((path: string): string | null => {
    for (const item of menuItems) {
      if (isPathInMenuItem(path, item)) {
        return item.title;
      }
    }
    return null;
  }, []);

  useEffect(() => {
    setMounted(true);
    fetchCurrentUser();
  }, []);

  // 當路徑變化時，自動展開對應的選單
  useEffect(() => {
    const activeMenu = getActiveMenuTitle(pathname);
    if (activeMenu) {
      setExpandedMenus(new Set([activeMenu]));
    }
  }, [pathname, getActiveMenuTitle]);

  const fetchCurrentUser = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }
      const res = await authApi.getMe();
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
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/login');
  };

  // 切換選單展開/折疊
  const toggleMenu = (title: string) => {
    setExpandedMenus(prev => {
      const newSet = new Set<string>();
      // 只允許展開一個選單
      if (!prev.has(title)) {
        newSet.add(title);
      }
      return newSet;
    });
  };

  // 登入頁不顯示側欄
  if (!mounted || pathname === '/login') {
    if (pathname === '/login') {
      return null;
    }
    return <div className="w-64 bg-gray-800 min-h-screen"></div>;
  }

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
        {menuItems.map((item) => {
          const isExpanded = expandedMenus.has(item.title);
          const isActive = isPathInMenuItem(pathname, item);

          return (
            <div key={item.title} className="mb-2">
              {/* 主選單項目 */}
              <button
                onClick={() => toggleMenu(item.title)}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'hover:bg-gray-700 text-gray-300'
                }`}
              >
                <span className="font-medium">{item.title}</span>
                {item.children && (
                  <svg
                    className={`w-4 h-4 transition-transform duration-200 ${
                      isExpanded ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                )}
              </button>

              {/* 子選單 - 帶動畫效果 */}
              {item.children && (
                <div
                  className={`overflow-hidden transition-all duration-200 ease-in-out ${
                    isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <div className="ml-4 mt-1 space-y-1 border-l-2 border-gray-600 pl-2">
                    {item.children.map((child) => {
                      const isChildActive = isActiveChild(pathname, child.href);
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={`block px-3 py-2 rounded-lg text-sm transition-all duration-150 ${
                            isChildActive
                              ? 'bg-gray-700 text-white font-medium'
                              : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                          }`}
                        >
                          {child.title}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
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

