'use client';

import { useEffect, useState } from 'react';
import { userApi } from '@/lib/api';
import Link from 'next/link';

interface User {
  id: string;
  username: string;
  email: string;
  full_name: string;
  department: string | null;
  roles: string[];
  created_at: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await userApi.getUsers();
      setUsers(res.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching users:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8">載入中...</div>;
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* 麵包屑 */}
        <nav className="mb-6">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Link href="/settings" className="hover:text-gray-900">
              系統設定
            </Link>
            <span>/</span>
            <span className="text-gray-900">用戶與權限</span>
          </div>
        </nav>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">用戶與權限管理</h1>
          <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            新增使用者
          </button>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">使用者名稱</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">部門</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">角色</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">建立時間</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium">{user.full_name}</div>
                    <div className="text-xs text-gray-500">{user.username}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.department || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-wrap gap-1">
                      {user.roles && user.roles.length > 0 ? (
                        user.roles.map((role, index) => (
                          <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                            {role}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-gray-500">無角色</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(user.created_at).toLocaleDateString('zh-TW')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button className="text-blue-600 hover:text-blue-900 mr-3">編輯</button>
                    <button className="text-red-600 hover:text-red-900">刪除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

