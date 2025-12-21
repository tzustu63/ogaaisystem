'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import Link from 'next/link';

interface SystemOption {
  id: string;
  category: string;
  value: string;
  label: string;
  description?: string;
  is_active: boolean;
  sort_order: number;
}

const CATEGORIES = [
  { key: 'initiative_type', label: '專案類型', description: '策略專案的類型分類' },
  { key: 'department', label: '負責單位', description: '組織內的部門/單位' },
  { key: 'person', label: '人員名單', description: '可指派為負責人的人員' },
  { key: 'funding_source', label: '經費來源', description: '專案的經費來源類別' },
  { key: 'indicator', label: '對應指標', description: '專案相關的績效指標' },
];

export default function SystemOptionsPage() {
  const [options, setOptions] = useState<Record<string, SystemOption[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('initiative_type');
  const [editingOption, setEditingOption] = useState<SystemOption | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newOption, setNewOption] = useState({ value: '', label: '', description: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchOptions();
  }, []);

  const fetchOptions = async () => {
    try {
      const res = await api.get('/system-options');
      setOptions(res.data);
    } catch (error) {
      console.error('Error fetching options:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddOption = async () => {
    if (!newOption.value.trim() || !newOption.label.trim()) {
      alert('請填寫選項值和顯示名稱');
      return;
    }

    setSaving(true);
    try {
      await api.post(`/system-options/category/${selectedCategory}`, {
        value: newOption.value.trim().toLowerCase().replace(/\s+/g, '_'),
        label: newOption.label.trim(),
        description: newOption.description.trim() || undefined,
      });
      await fetchOptions();
      setShowAddModal(false);
      setNewOption({ value: '', label: '', description: '' });
    } catch (error: any) {
      alert(error.response?.data?.error || '新增失敗');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateOption = async () => {
    if (!editingOption) return;

    setSaving(true);
    try {
      await api.put(`/system-options/${editingOption.id}`, {
        label: editingOption.label,
        description: editingOption.description,
        is_active: editingOption.is_active,
      });
      await fetchOptions();
      setEditingOption(null);
    } catch (error: any) {
      alert(error.response?.data?.error || '更新失敗');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteOption = async (option: SystemOption) => {
    if (!confirm(`確定要刪除「${option.label}」嗎？`)) return;

    try {
      await api.delete(`/system-options/${option.id}`);
      await fetchOptions();
    } catch (error: any) {
      alert(error.response?.data?.error || '刪除失敗');
    }
  };

  const handleToggleActive = async (option: SystemOption) => {
    try {
      await api.put(`/system-options/${option.id}`, {
        is_active: !option.is_active,
      });
      await fetchOptions();
    } catch (error: any) {
      alert(error.response?.data?.error || '更新失敗');
    }
  };

  const currentCategoryOptions = options[selectedCategory] || [];
  const currentCategoryInfo = CATEGORIES.find(c => c.key === selectedCategory);

  if (loading) {
    return <div className="p-8">載入中...</div>;
  }

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        {/* 麵包屑 */}
        <nav className="mb-6">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Link href="/settings" className="hover:text-gray-900">
              系統設定
            </Link>
            <span>/</span>
            <span className="text-gray-900">選項管理</span>
          </div>
        </nav>

        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">選項管理</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* 類別選單 */}
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="font-semibold mb-4">選項類別</h2>
            <nav className="space-y-1">
              {CATEGORIES.map((category) => (
                <button
                  key={category.key}
                  onClick={() => setSelectedCategory(category.key)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                    selectedCategory === category.key
                      ? 'bg-blue-100 text-blue-800'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <div className="font-medium">{category.label}</div>
                  <div className="text-xs text-gray-500">{category.description}</div>
                </button>
              ))}
            </nav>
          </div>

          {/* 選項列表 */}
          <div className="lg:col-span-3 bg-white rounded-lg shadow">
            <div className="p-4 border-b flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold">{currentCategoryInfo?.label}</h2>
                <p className="text-sm text-gray-500">{currentCategoryInfo?.description}</p>
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                + 新增選項
              </button>
            </div>

            <div className="p-4">
              {currentCategoryOptions.length === 0 ? (
                <p className="text-gray-500 text-center py-8">尚無選項，請點擊「新增選項」按鈕</p>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="pb-2 font-medium">顯示名稱</th>
                      <th className="pb-2 font-medium">選項值</th>
                      <th className="pb-2 font-medium">說明</th>
                      <th className="pb-2 font-medium text-center">狀態</th>
                      <th className="pb-2 font-medium text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentCategoryOptions.map((option) => (
                      <tr key={option.id} className="border-b last:border-0">
                        <td className="py-3">{option.label}</td>
                        <td className="py-3 text-sm text-gray-500">{option.value}</td>
                        <td className="py-3 text-sm text-gray-500">{option.description || '-'}</td>
                        <td className="py-3 text-center">
                          <button
                            onClick={() => handleToggleActive(option)}
                            className={`px-2 py-1 text-xs rounded ${
                              option.is_active
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-500'
                            }`}
                          >
                            {option.is_active ? '啟用' : '停用'}
                          </button>
                        </td>
                        <td className="py-3 text-right space-x-2">
                          <button
                            onClick={() => setEditingOption(option)}
                            className="text-blue-600 hover:underline text-sm"
                          >
                            編輯
                          </button>
                          <button
                            onClick={() => handleDeleteOption(option)}
                            className="text-red-600 hover:underline text-sm"
                          >
                            刪除
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* 新增 Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">新增{currentCategoryInfo?.label}</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">顯示名稱 *</label>
                  <input
                    type="text"
                    value={newOption.label}
                    onChange={(e) => setNewOption({ ...newOption, label: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="例如：教務處"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">選項值 *</label>
                  <input
                    type="text"
                    value={newOption.value}
                    onChange={(e) => setNewOption({ ...newOption, value: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="例如：academic_affairs（英文，無空格）"
                  />
                  <p className="text-xs text-gray-500 mt-1">系統識別用，建議使用英文和底線</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">說明</label>
                  <input
                    type="text"
                    value={newOption.description}
                    onChange={(e) => setNewOption({ ...newOption, description: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="選填"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2 mt-6">
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setNewOption({ value: '', label: '', description: '' });
                  }}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  onClick={handleAddOption}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? '儲存中...' : '新增'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 編輯 Modal */}
        {editingOption && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">編輯選項</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">顯示名稱</label>
                  <input
                    type="text"
                    value={editingOption.label}
                    onChange={(e) =>
                      setEditingOption({ ...editingOption, label: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">選項值</label>
                  <input
                    type="text"
                    value={editingOption.value}
                    disabled
                    className="w-full px-3 py-2 border rounded-lg bg-gray-100"
                  />
                  <p className="text-xs text-gray-500 mt-1">選項值建立後無法修改</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">說明</label>
                  <input
                    type="text"
                    value={editingOption.description || ''}
                    onChange={(e) =>
                      setEditingOption({ ...editingOption, description: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={editingOption.is_active}
                    onChange={(e) =>
                      setEditingOption({ ...editingOption, is_active: e.target.checked })
                    }
                    className="mr-2"
                  />
                  <label className="text-sm">啟用此選項</label>
                </div>
              </div>
              <div className="flex justify-end space-x-2 mt-6">
                <button
                  onClick={() => setEditingOption(null)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  onClick={handleUpdateOption}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? '儲存中...' : '儲存'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
