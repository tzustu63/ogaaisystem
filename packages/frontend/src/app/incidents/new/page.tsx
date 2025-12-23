'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { incidentApi, userApi } from '@/lib/api';
import Link from 'next/link';

interface IncidentFormData {
  incident_type: 'campus_safety' | 'medical' | 'legal' | 'visa' | 'other';
  severity: 'critical' | 'high' | 'medium' | 'low';
  occurred_at: string;
  location: string;
  student_name: string;
  student_id: string;
  contact_info: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  description: string;
  accountable_user_id: string;
}

interface User {
  id: string;
  full_name: string;
  username: string;
}

export default function NewIncidentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [formData, setFormData] = useState<IncidentFormData>({
    incident_type: 'campus_safety',
    severity: 'medium',
    occurred_at: new Date().toISOString().slice(0, 16),
    location: '',
    student_name: '',
    student_id: '',
    contact_info: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    description: '',
    accountable_user_id: '',
  });

  useEffect(() => {
    // 載入用戶列表
    userApi.getUsers()
      .then((res) => setUsers(res.data || []))
      .catch((err) => console.error('Error loading users:', err));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const submitData = {
        ...formData,
        location: formData.location || undefined,
        student_id: formData.student_id || undefined,
        contact_info: formData.contact_info || undefined,
        emergency_contact_name: formData.emergency_contact_name || undefined,
        emergency_contact_phone: formData.emergency_contact_phone || undefined,
      };

      const response = await incidentApi.create(submitData);
      router.push(`/incidents/${response.data.id}`);
    } catch (error: any) {
      console.error('Error creating incident:', error);
      alert(error.response?.data?.error || '建立緊急事件失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const getIncidentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      campus_safety: '校園安全',
      medical: '醫療',
      legal: '法律',
      visa: '簽證',
      other: '其他',
    };
    return labels[type] || type;
  };

  const getSeverityLabel = (severity: string) => {
    const labels: Record<string, string> = {
      critical: '緊急',
      high: '高',
      medium: '中',
      low: '低',
    };
    return labels[severity] || severity;
  };

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link href="/incidents" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
            ← 返回緊急事件列表
          </Link>
          <h1 className="text-3xl font-bold">新增緊急事件</h1>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
          {/* 事件類型 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              事件類型 <span className="text-red-500">*</span>
            </label>
            <select
              name="incident_type"
              value={formData.incident_type}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="campus_safety">校園安全</option>
              <option value="medical">醫療</option>
              <option value="legal">法律</option>
              <option value="visa">簽證</option>
              <option value="other">其他</option>
            </select>
          </div>

          {/* 嚴重程度 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              嚴重程度 <span className="text-red-500">*</span>
            </label>
            <select
              name="severity"
              value={formData.severity}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="critical">緊急</option>
              <option value="high">高</option>
              <option value="medium">中</option>
              <option value="low">低</option>
            </select>
          </div>

          {/* 發生時間 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              發生時間 <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              name="occurred_at"
              value={formData.occurred_at}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {/* 發生地點 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              發生地點
            </label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="例如：宿舍、教室、校外等"
            />
          </div>

          {/* 學生資訊 */}
          <div className="border-t pt-6">
            <h2 className="text-lg font-semibold mb-4">學生資訊</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  學生姓名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="student_name"
                  value={formData.student_name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  學生 ID
                </label>
                <input
                  type="text"
                  name="student_id"
                  value={formData.student_id}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  聯絡方式
                </label>
                <input
                  type="text"
                  name="contact_info"
                  value={formData.contact_info}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="電話、Email 等"
                />
              </div>
            </div>
          </div>

          {/* 緊急聯絡人 */}
          <div className="border-t pt-6">
            <h2 className="text-lg font-semibold mb-4">緊急聯絡人</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  緊急聯絡人姓名
                </label>
                <input
                  type="text"
                  name="emergency_contact_name"
                  value={formData.emergency_contact_name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  緊急聯絡人電話
                </label>
                <input
                  type="text"
                  name="emergency_contact_phone"
                  value={formData.emergency_contact_phone}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* 事件描述 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              事件描述 <span className="text-red-500">*</span>
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={6}
              className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="請詳細描述事件經過..."
              required
            />
          </div>

          {/* 負責人 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              負責人 <span className="text-red-500">*</span>
            </label>
            <select
              name="accountable_user_id"
              value={formData.accountable_user_id}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">請選擇負責人</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.full_name} ({user.username})
                </option>
              ))}
            </select>
          </div>

          {/* 按鈕 */}
          <div className="flex justify-end space-x-4 pt-4 border-t">
            <Link
              href="/incidents"
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              取消
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? '建立中...' : '建立事件'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

