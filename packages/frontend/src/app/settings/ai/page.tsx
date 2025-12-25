'use client';

import { useState, useEffect } from 'react';
import { aiSettingsApi } from '@/lib/api';
import Link from 'next/link';

interface AISetting {
  id: string;
  setting_key: string;
  setting_value: string;
  description: string;
  updated_at: string;
  display_order?: number;
  category?: string;
}

// 設定欄位的標籤和說明
const SETTING_LABELS: Record<string, { title: string; description: string; icon: string }> = {
  ai_role_prompt: {
    title: '角色設定',
    description: 'AI 助理的角色定位與職責說明，決定 AI 的身份和專業領域',
    icon: '👤',
  },
  ai_context_prompt: {
    title: '背景資訊',
    description: '系統背景、目標受眾、使用情境等上下文資訊',
    icon: '📋',
  },
  database_schema_prompt: {
    title: '資料庫架構',
    description: '資料庫結構說明，供 AI 生成正確的 SQL 查詢',
    icon: '🗄️',
  },
  ai_output_format_prompt: {
    title: '輸出格式',
    description: '回應的結構、語氣風格、內容深度等格式要求',
    icon: '📝',
  },
  ai_examples_prompt: {
    title: '範例參考',
    description: '期望的輸出範例，幫助 AI 理解回應的格式和風格',
    icon: '💡',
  },
  ai_constraints_prompt: {
    title: '限制條件',
    description: '查詢與回應的安全性限制、專業性要求',
    icon: '🔒',
  },
};

// 類別分組
const CATEGORIES = [
  { id: 'prompt', title: 'Prompt 設定', description: '控制 AI 的行為和回應方式' },
  { id: 'database', title: '資料庫設定', description: '定義 AI 如何理解和查詢資料庫' },
];

// 設定的顯示順序
const SETTING_ORDER = [
  'ai_role_prompt',
  'ai_context_prompt',
  'ai_output_format_prompt',
  'ai_examples_prompt',
  'ai_constraints_prompt',
  'database_schema_prompt',
];

export default function AISettingsPage() {
  const [settings, setSettings] = useState<AISetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['prompt', 'database']));

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await aiSettingsApi.getAll();
      // 按照預定順序排序
      const sortedSettings = response.data.sort((a: AISetting, b: AISetting) => {
        const orderA = SETTING_ORDER.indexOf(a.setting_key);
        const orderB = SETTING_ORDER.indexOf(b.setting_key);
        if (orderA === -1 && orderB === -1) return 0;
        if (orderA === -1) return 1;
        if (orderB === -1) return -1;
        return orderA - orderB;
      });
      setSettings(sortedSettings);
    } catch (error) {
      console.error('Error loading AI settings:', error);
      setMessage({ type: 'error', text: '載入設定失敗' });
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (setting: AISetting) => {
    setEditingKey(setting.setting_key);
    setEditValue(setting.setting_value);
    setMessage(null);
  };

  const cancelEditing = () => {
    setEditingKey(null);
    setEditValue('');
  };

  const saveSetting = async (key: string) => {
    try {
      setSaving(true);
      await aiSettingsApi.update(key, { setting_value: editValue });
      setMessage({ type: 'success', text: '設定已儲存' });
      setEditingKey(null);
      await loadSettings();
    } catch (error) {
      console.error('Error saving AI setting:', error);
      setMessage({ type: 'error', text: '儲存設定失敗' });
    } finally {
      setSaving(false);
    }
  };

  const resetSetting = async (key: string) => {
    if (!confirm('確定要重置為預設值嗎？')) {
      return;
    }

    try {
      setSaving(true);
      await aiSettingsApi.reset(key);
      setMessage({ type: 'success', text: '已重置為預設值' });
      setEditingKey(null);
      await loadSettings();
    } catch (error) {
      console.error('Error resetting AI setting:', error);
      setMessage({ type: 'error', text: '重置設定失敗' });
    } finally {
      setSaving(false);
    }
  };

  const toggleSection = (categoryId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  // 根據 setting_key 判斷類別
  const getCategory = (key: string): string => {
    if (key === 'database_schema_prompt') return 'database';
    return 'prompt';
  };

  // 按類別分組設定
  const groupedSettings = settings.reduce((acc, setting) => {
    const category = getCategory(setting.setting_key);
    if (!acc[category]) acc[category] = [];
    acc[category].push(setting);
    return acc;
  }, {} as Record<string, AISetting[]>);

  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center py-12">載入中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto">
        {/* 麵包屑 */}
        <nav className="mb-6">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Link href="/settings" className="hover:text-gray-900">
              系統設定
            </Link>
            <span>/</span>
            <span className="text-gray-900">AI 設定</span>
          </div>
        </nav>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">AI 設定</h1>
            <p className="text-gray-600 mt-1">
              自訂 AI 小幫手的 Prompt 設定，調整 AI 的行為和回應格式
            </p>
          </div>
          <Link
            href="/chat"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            前往 AI 小幫手
          </Link>
        </div>

        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Prompt 結構說明 */}
        <div className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-100">
          <h3 className="font-semibold text-blue-900 mb-3">Prompt 設計架構</h3>
          <p className="text-sm text-blue-800 mb-4">
            一個好的 Prompt 應包含以下要素，系統已將這些要素拆分為獨立設定項目：
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="font-medium text-gray-900 mb-1">1. 角色與背景</div>
              <div className="text-gray-600">定義 AI 的身份、職責、目標受眾和使用情境</div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="font-medium text-gray-900 mb-1">2. 輸出格式</div>
              <div className="text-gray-600">說明期望的回應形式、語氣風格、內容深度</div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="font-medium text-gray-900 mb-1">3. 範例與限制</div>
              <div className="text-gray-600">提供輸出範例，並設定安全性限制條件</div>
            </div>
          </div>
        </div>

        {/* 按類別顯示設定 */}
        {CATEGORIES.map((category) => {
          const categorySettings = groupedSettings[category.id] || [];
          if (categorySettings.length === 0) return null;

          const isExpanded = expandedSections.has(category.id);

          return (
            <div key={category.id} className="mb-6">
              {/* 類別標題 */}
              <button
                onClick={() => toggleSection(category.id)}
                className="w-full flex items-center justify-between p-4 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors mb-4"
              >
                <div className="text-left">
                  <h2 className="text-lg font-semibold text-gray-900">{category.title}</h2>
                  <p className="text-sm text-gray-600">{category.description}</p>
                </div>
                <svg
                  className={`w-5 h-5 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* 類別內的設定項目 */}
              {isExpanded && (
                <div className="space-y-4">
                  {categorySettings.map((setting) => {
                    const label = SETTING_LABELS[setting.setting_key] || {
                      title: setting.setting_key,
                      description: setting.description || '',
                      icon: '⚙️',
                    };
                    const isEditing = editingKey === setting.setting_key;

                    return (
                      <div key={setting.id} className="bg-white rounded-lg shadow border border-gray-200">
                        <div className="p-5 border-b border-gray-100">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-3">
                              <span className="text-2xl">{label.icon}</span>
                              <div>
                                <h3 className="text-base font-semibold text-gray-900">{label.title}</h3>
                                <p className="text-sm text-gray-600 mt-0.5">{label.description}</p>
                                <p className="text-xs text-gray-400 mt-1">
                                  最後更新：{new Date(setting.updated_at).toLocaleString('zh-TW')}
                                </p>
                              </div>
                            </div>
                            {!isEditing && (
                              <div className="flex space-x-2 flex-shrink-0">
                                <button
                                  onClick={() => startEditing(setting)}
                                  className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                                >
                                  編輯
                                </button>
                                <button
                                  onClick={() => resetSetting(setting.setting_key)}
                                  disabled={saving}
                                  className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                                >
                                  重置
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="p-5">
                          {isEditing ? (
                            <div className="space-y-4">
                              <textarea
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                rows={18}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="輸入 Prompt 內容..."
                              />
                              <div className="flex justify-end space-x-2">
                                <button
                                  onClick={cancelEditing}
                                  disabled={saving}
                                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                                >
                                  取消
                                </button>
                                <button
                                  onClick={() => saveSetting(setting.setting_key)}
                                  disabled={saving}
                                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                >
                                  {saving ? '儲存中...' : '儲存變更'}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <pre className="whitespace-pre-wrap text-sm text-gray-700 bg-gray-50 p-4 rounded-lg overflow-auto max-h-48 font-mono">
                              {setting.setting_value}
                            </pre>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {settings.length === 0 && (
          <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
            尚無 AI 設定資料，請執行資料庫遷移來初始化設定
          </div>
        )}

        {/* 使用說明 */}
        <div className="mt-8 bg-amber-50 rounded-lg p-6 border border-amber-200">
          <h3 className="font-semibold text-amber-900 mb-3">使用說明</h3>
          <ul className="text-sm text-amber-800 space-y-2">
            <li><strong>角色設定：</strong>定義 AI 的身份（如「慈濟大學全球事務長的 AI 助理」）和專業領域</li>
            <li><strong>背景資訊：</strong>提供系統背景、目標受眾、使用情境等上下文</li>
            <li><strong>輸出格式：</strong>指定回應的結構（列點、表格）、語氣（正式、專業）、長度（詳盡說明）</li>
            <li><strong>範例參考：</strong>提供 1-2 個期望的輸出範例，讓 AI 更能掌握方向</li>
            <li><strong>限制條件：</strong>設定安全性規則、查詢限制、專業性要求</li>
            <li><strong>資料庫架構：</strong>定義 AI 如何理解資料庫結構以生成正確的 SQL 查詢</li>
          </ul>
          <p className="text-sm text-amber-700 mt-4">
            修改後立即生效，新的對話將使用更新後的設定。如果設定錯誤導致 AI 無法正常運作，可以點擊「重置」恢復原始設定。
          </p>
        </div>
      </div>
    </div>
  );
}
