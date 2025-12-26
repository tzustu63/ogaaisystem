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
  position: string | null;
  line_id: string | null;
  phone: string | null;
  is_active: boolean;
  roles: string[];
  created_at: string;
}

interface UserFormData {
  username: string;
  email: string;
  full_name: string;
  department: string;
  position: string;
  line_id: string;
  phone: string;
  password: string;
  is_active: boolean;
  roles: string[];
}

const AVAILABLE_ROLES = ['admin', 'user', 'viewer'];

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const [formData, setFormData] = useState<UserFormData>({
    username: '',
    email: '',
    full_name: '',
    department: '',
    position: '',
    line_id: '',
    phone: '',
    password: '',
    is_active: true,
    roles: [],
  });

  const [editFormData, setEditFormData] = useState<UserFormData & { id: string } | null>(null);

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

  const filteredUsers = users.filter((user) => {
    // 狀態篩選
    if (filter === 'active' && !user.is_active) return false;
    if (filter === 'inactive' && user.is_active) return false;

    // 搜尋篩選
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        user.full_name?.toLowerCase().includes(term) ||
        user.username?.toLowerCase().includes(term) ||
        user.email?.toLowerCase().includes(term) ||
        user.department?.toLowerCase().includes(term)
      );
    }

    return true;
  });

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      await userApi.createUser({
        username: formData.username,
        email: formData.email,
        full_name: formData.full_name,
        department: formData.department || undefined,
        position: formData.position || undefined,
        line_id: formData.line_id || undefined,
        phone: formData.phone || undefined,
        password: formData.password,
        is_active: formData.is_active,
        roles: formData.roles.length > 0 ? formData.roles : undefined,
      });
      setShowModal(false);
      resetFormData();
      await fetchUsers();
      alert('人員創建成功');
    } catch (error: any) {
      console.error('Error creating user:', error);
      alert(error.response?.data?.error || '創建人員失敗');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFormData) return;

    setSaving(true);
    try {
      await userApi.updateUser(editFormData.id, {
        email: editFormData.email,
        full_name: editFormData.full_name,
        department: editFormData.department || undefined,
        position: editFormData.position || undefined,
        line_id: editFormData.line_id || undefined,
        phone: editFormData.phone || undefined,
        is_active: editFormData.is_active,
        roles: editFormData.roles,
      });
      setShowEditModal(false);
      setEditFormData(null);
      await fetchUsers();
      alert('人員更新成功');
    } catch (error: any) {
      console.error('Error updating user:', error);
      alert(error.response?.data?.error || '更新人員失敗');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (userId: string, currentStatus: boolean) => {
    const action = currentStatus ? '停用' : '啟用';
    if (!confirm(`確定要${action}此人員嗎？`)) return;

    try {
      await userApi.toggleActive(userId);
      await fetchUsers();
    } catch (error: any) {
      console.error('Error toggling user status:', error);
      alert(error.response?.data?.error || `${action}人員失敗`);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId || !newPassword) return;

    setSaving(true);
    try {
      await userApi.resetPassword(selectedUserId, newPassword);
      setShowPasswordModal(false);
      setSelectedUserId(null);
      setNewPassword('');
      alert('密碼已重設');
    } catch (error: any) {
      console.error('Error resetting password:', error);
      alert(error.response?.data?.error || '重設密碼失敗');
    } finally {
      setSaving(false);
    }
  };

  const handleEditUser = (user: User) => {
    setEditFormData({
      id: user.id,
      username: user.username,
      email: user.email,
      full_name: user.full_name,
      department: user.department || '',
      position: user.position || '',
      line_id: user.line_id || '',
      phone: user.phone || '',
      password: '',
      is_active: user.is_active ?? true,
      roles: user.roles || [],
    });
    setShowEditModal(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setEditFormData((prev) =>
      prev
        ? {
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
          }
        : null
    );
  };

  const handleRoleChange = (role: string, checked: boolean, isEdit: boolean) => {
    if (isEdit && editFormData) {
      setEditFormData((prev) =>
        prev
          ? {
              ...prev,
              roles: checked ? [...prev.roles, role] : prev.roles.filter((r) => r !== role),
            }
          : null
      );
    } else {
      setFormData((prev) => ({
        ...prev,
        roles: checked ? [...prev.roles, role] : prev.roles.filter((r) => r !== role),
      }));
    }
  };

  const resetFormData = () => {
    setFormData({
      username: '',
      email: '',
      full_name: '',
      department: '',
      position: '',
      line_id: '',
      phone: '',
      password: '',
      is_active: true,
      roles: [],
    });
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
            <span className="text-gray-900">人員管理</span>
          </div>
        </nav>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">人員管理</h1>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            新增人員
          </button>
        </div>

        {/* 篩選與搜尋 */}
        <div className="flex items-center gap-4 mb-4">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as 'all' | 'active' | 'inactive')}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">全部狀態</option>
            <option value="active">啟用中</option>
            <option value="inactive">已停用</option>
          </select>
          <input
            type="text"
            placeholder="搜尋姓名、帳號、Email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 max-w-md px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">姓名</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">部門</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">職位</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">角色</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">狀態</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className={!user.is_active ? 'bg-gray-50' : ''}>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium">{user.full_name}</div>
                    <div className="text-xs text-gray-500">@{user.username}</div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.department || '-'}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.position || '-'}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex flex-wrap gap-1">
                      {user.roles && user.roles.length > 0 ? (
                        user.roles.map((role, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs"
                          >
                            {role}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    {user.is_active ? (
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                        啟用
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                        停用
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEditUser(user)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        編輯
                      </button>
                      <button
                        onClick={() => {
                          setSelectedUserId(user.id);
                          setShowPasswordModal(true);
                        }}
                        className="text-gray-600 hover:text-gray-900"
                      >
                        重設密碼
                      </button>
                      <button
                        onClick={() => handleToggleActive(user.id, user.is_active)}
                        className={user.is_active ? 'text-orange-600 hover:text-orange-900' : 'text-green-600 hover:text-green-900'}
                      >
                        {user.is_active ? '停用' : '啟用'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    沒有符合條件的人員
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 新增人員 Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-4">新增人員</h2>

              <form onSubmit={handleCreateUser}>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      帳號 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      姓名 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="full_name"
                      value={formData.full_name}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">部門</label>
                    <input
                      type="text"
                      name="department"
                      value={formData.department}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">職位</label>
                    <input
                      type="text"
                      name="position"
                      value={formData.position}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">電話</label>
                    <input
                      type="text"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Line ID</label>
                    <input
                      type="text"
                      name="line_id"
                      value={formData.line_id}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    密碼 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    minLength={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">至少 6 個字符</p>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">角色</label>
                  <div className="flex flex-wrap gap-3">
                    {AVAILABLE_ROLES.map((role) => (
                      <label key={role} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.roles.includes(role)}
                          onChange={(e) => handleRoleChange(role, e.target.checked, false)}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm">{role}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="mb-6">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="is_active"
                      checked={formData.is_active}
                      onChange={handleInputChange}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm font-medium text-gray-700">啟用帳號</span>
                  </label>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      resetFormData();
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    disabled={saving}
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? '創建中...' : '創建'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 編輯人員 Modal */}
        {showEditModal && editFormData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-4">編輯人員</h2>

              <form onSubmit={handleUpdateUser}>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">帳號</label>
                    <input
                      type="text"
                      value={editFormData.username}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      姓名 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="full_name"
                      value={editFormData.full_name}
                      onChange={handleEditInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={editFormData.email}
                    onChange={handleEditInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">部門</label>
                    <input
                      type="text"
                      name="department"
                      value={editFormData.department}
                      onChange={handleEditInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">職位</label>
                    <input
                      type="text"
                      name="position"
                      value={editFormData.position}
                      onChange={handleEditInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">電話</label>
                    <input
                      type="text"
                      name="phone"
                      value={editFormData.phone}
                      onChange={handleEditInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Line ID</label>
                    <input
                      type="text"
                      name="line_id"
                      value={editFormData.line_id}
                      onChange={handleEditInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">角色</label>
                  <div className="flex flex-wrap gap-3">
                    {AVAILABLE_ROLES.map((role) => (
                      <label key={role} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={editFormData.roles.includes(role)}
                          onChange={(e) => handleRoleChange(role, e.target.checked, true)}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm">{role}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="mb-6">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="is_active"
                      checked={editFormData.is_active}
                      onChange={handleEditInputChange}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm font-medium text-gray-700">啟用帳號</span>
                  </label>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditFormData(null);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    disabled={saving}
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? '更新中...' : '更新'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 重設密碼 Modal */}
        {showPasswordModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-sm">
              <h2 className="text-xl font-bold mb-4">重設密碼</h2>

              <form onSubmit={handleResetPassword}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    新密碼 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">至少 6 個字符</p>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordModal(false);
                      setSelectedUserId(null);
                      setNewPassword('');
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    disabled={saving}
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? '重設中...' : '確認重設'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
