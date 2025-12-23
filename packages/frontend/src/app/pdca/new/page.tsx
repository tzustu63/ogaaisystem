'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { pdcaApi, initiativeApi, okrApi, userApi } from '@/lib/api';
import Link from 'next/link';

interface PDCAFormData {
  initiative_id: string;
  okr_id: string;
  cycle_name: string;
  check_frequency: 'weekly' | 'monthly' | 'quarterly';
  responsible_user_id: string;
  data_source: string;
}

interface Initiative {
  id: string;
  name_zh: string;
}

interface OKR {
  id: string;
  objective: string;
  quarter: string;
}

interface User {
  id: string;
  full_name: string;
  username: string;
}

export default function NewPDCAPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [okrs, setOkrs] = useState<OKR[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [formData, setFormData] = useState<PDCAFormData>({
    initiative_id: '',
    okr_id: '',
    cycle_name: '',
    check_frequency: 'monthly',
    responsible_user_id: '',
    data_source: '',
  });

  useEffect(() => {
    // 載入 Initiatives 和 Users
    Promise.all([
      initiativeApi.getAll().then((res) => setInitiatives(res.data || [])),
      userApi.getUsers().then((res) => setUsers(res.data || [])),
    ]).catch((err) => console.error('Error loading data:', err));
  }, []);

  // 當選擇 Initiative 時，載入相關的 OKRs
  useEffect(() => {
    if (formData.initiative_id) {
      okrApi.getAll({ initiative_id: formData.initiative_id })
        .then((res) => setOkrs(res.data || []))
        .catch((err) => {
          console.error('Error loading OKRs:', err);
          setOkrs([]);
        });
    } else {
      setOkrs([]);
      setFormData((prev) => ({ ...prev, okr_id: '' }));
    }
  }, [formData.initiative_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 驗證：必須有 initiative_id 或 okr_id 其中之一
    if (!formData.initiative_id && !formData.okr_id) {
      alert('請選擇策略專案或 OKR');
      return;
    }

    setLoading(true);

    try {
      const submitData = {
        initiative_id: formData.initiative_id || undefined,
        okr_id: formData.okr_id || undefined,
        cycle_name: formData.cycle_name,
        check_frequency: formData.check_frequency,
        responsible_user_id: formData.responsible_user_id,
        data_source: formData.data_source || undefined,
      };

      const response = await pdcaApi.create(submitData);
      router.push(`/pdca/${response.data.id}`);
    } catch (error: any) {
      console.error('Error creating PDCA cycle:', error);
      alert(error.response?.data?.error || '建立 PDCA 循環失敗');
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

  const getFrequencyLabel = (frequency: string) => {
    const labels: Record<string, string> = {
      weekly: '每週',
      monthly: '每月',
      quarterly: '每季',
    };
    return labels[frequency] || frequency;
  };

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link href="/pdca" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
            ← 返回 PDCA 循環列表
          </Link>
          <h1 className="text-3xl font-bold">新增 PDCA 循環</h1>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
          {/* 關聯選項 */}
          <div className="border-b pb-6">
            <h2 className="text-lg font-semibold mb-4">關聯選項（至少選擇一項）</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 策略專案 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  策略專案
                </label>
                <select
                  name="initiative_id"
                  value={formData.initiative_id}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">請選擇策略專案（可選）</option>
                  {initiatives.map((initiative) => (
                    <option key={initiative.id} value={initiative.id}>
                      {initiative.name_zh}
                    </option>
                  ))}
                </select>
              </div>

              {/* OKR */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  OKR
                </label>
                <select
                  name="okr_id"
                  value={formData.okr_id}
                  onChange={handleInputChange}
                  disabled={!formData.initiative_id}
                  className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {formData.initiative_id ? '請選擇 OKR（可選）' : '請先選擇策略專案'}
                  </option>
                  {okrs.map((okr) => (
                    <option key={okr.id} value={okr.id}>
                      {okr.objective} ({okr.quarter})
                    </option>
                  ))}
                </select>
                {!formData.initiative_id && (
                  <p className="mt-1 text-xs text-gray-500">選擇策略專案後才能選擇 OKR</p>
                )}
              </div>
            </div>

            {!formData.initiative_id && !formData.okr_id && (
              <p className="mt-2 text-sm text-red-600">
                ⚠️ 請至少選擇一個策略專案或 OKR
              </p>
            )}
          </div>

          {/* 循環名稱 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              循環名稱 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="cycle_name"
              value={formData.cycle_name}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="例如：Q1 2024 招生檢核循環"
              required
            />
          </div>

          {/* 檢核頻率 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              檢核頻率 <span className="text-red-500">*</span>
            </label>
            <select
              name="check_frequency"
              value={formData.check_frequency}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="weekly">每週</option>
              <option value="monthly">每月</option>
              <option value="quarterly">每季</option>
            </select>
          </div>

          {/* 負責人 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              負責人 <span className="text-red-500">*</span>
            </label>
            <select
              name="responsible_user_id"
              value={formData.responsible_user_id}
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

          {/* 資料來源 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              資料來源
            </label>
            <input
              type="text"
              name="data_source"
              value={formData.data_source}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="例如：招生系統、CRM 系統等"
            />
          </div>

          {/* 按鈕 */}
          <div className="flex justify-end space-x-4 pt-4 border-t">
            <Link
              href="/pdca"
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              取消
            </Link>
            <button
              type="submit"
              disabled={loading || (!formData.initiative_id && !formData.okr_id)}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? '建立中...' : '建立循環'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


