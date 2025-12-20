'use client';

import { useEffect, useState } from 'react';
import { settingsApi } from '@/lib/api';
import Link from 'next/link';

interface NotificationSettings {
  email_enabled: boolean;
  line_notify_enabled: boolean;
  kpi_status_change: boolean;
  workflow_notifications: boolean;
  pdca_reminders: boolean;
  incident_alerts: boolean;
}

export default function NotificationsPage() {
  const [settings, setSettings] = useState<NotificationSettings>({
    email_enabled: true,
    line_notify_enabled: false,
    kpi_status_change: true,
    workflow_notifications: true,
    pdca_reminders: true,
    incident_alerts: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await settingsApi.getNotificationSettings();
      setSettings(res.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching settings:', error);
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await settingsApi.updateNotificationSettings(settings);
      alert('設定已儲存');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('儲存設定失敗');
    } finally {
      setSaving(false);
    }
  };

  const toggleSetting = (key: keyof NotificationSettings) => {
    setSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  if (loading) {
    return <div className="p-8">載入中...</div>;
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        {/* 麵包屑 */}
        <nav className="mb-6">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Link href="/settings" className="hover:text-gray-900">
              系統設定
            </Link>
            <span>/</span>
            <span className="text-gray-900">通知設定</span>
          </div>
        </nav>

        <h1 className="text-2xl font-bold mb-6">通知設定</h1>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">通知通道</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium">Email 通知</label>
                <p className="text-sm text-gray-600">啟用 Email 通知功能</p>
              </div>
              <button
                onClick={() => toggleSetting('email_enabled')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                  settings.email_enabled ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                    settings.email_enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium">Line Notify</label>
                <p className="text-sm text-gray-600">啟用 Line Notify 通知</p>
              </div>
              <button
                onClick={() => toggleSetting('line_notify_enabled')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                  settings.line_notify_enabled ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                    settings.line_notify_enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">通知類型</h2>
          <div className="space-y-4">
            {[
              { key: 'kpi_status_change' as const, label: 'KPI 狀態變更', desc: '當 KPI 燈號變更時發送通知' },
              { key: 'workflow_notifications' as const, label: '工作流通知', desc: '工作流狀態變更與會簽提醒' },
              { key: 'pdca_reminders' as const, label: 'PDCA 提醒', desc: 'PDCA 檢核到期提醒' },
              { key: 'incident_alerts' as const, label: '事件警示', desc: '緊急事件發生時立即通知' },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between">
                <div>
                  <label className="font-medium">{item.label}</label>
                  <p className="text-sm text-gray-600">{item.desc}</p>
                </div>
                <button
                  onClick={() => toggleSetting(item.key)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                    settings[item.key] ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                      settings[item.key] ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? '儲存中...' : '儲存設定'}
          </button>
        </div>
      </div>
    </div>
  );
}

