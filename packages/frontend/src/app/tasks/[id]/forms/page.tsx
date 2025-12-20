'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { taskApi } from '@/lib/api';
import Link from 'next/link';

interface FormDefinition {
  id: string;
  name: string;
  description: string;
  form_schema: any;
}

interface FormRecord {
  id: string;
  form_name: string;
  form_data: any;
  submitted_at: string;
}

export default function TaskFormsPage() {
  const params = useParams();
  const [definitions, setDefinitions] = useState<FormDefinition[]>([]);
  const [records, setRecords] = useState<FormRecord[]>([]);
  const [selectedForm, setSelectedForm] = useState<FormDefinition | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchData();
    }
  }, [params.id]);

  const fetchData = async () => {
    try {
      const [defsRes, recordsRes] = await Promise.all([
        taskApi.getFormDefinitions({ task_type: 'project' }),
        taskApi.getTaskForms(params.id as string),
      ]);
      setDefinitions(defsRes.data);
      setRecords(recordsRes.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedForm) return;

    setSubmitting(true);
    try {
      await taskApi.submitTaskForm(params.id as string, {
        form_definition_id: selectedForm.id,
        form_data: formData,
      });
      alert('表單已提交');
      setSelectedForm(null);
      setFormData({});
      fetchData();
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('提交表單失敗');
    } finally {
      setSubmitting(false);
    }
  };

  const renderFormField = (field: any, key: string) => {
    switch (field.type) {
      case 'text':
        return (
          <div key={key} className="mb-4">
            <label className="block text-sm font-medium mb-1">{field.label}</label>
            <input
              type="text"
              value={formData[key] || ''}
              onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
              className="w-full border rounded p-2"
              required={field.required}
            />
          </div>
        );
      case 'textarea':
        return (
          <div key={key} className="mb-4">
            <label className="block text-sm font-medium mb-1">{field.label}</label>
            <textarea
              value={formData[key] || ''}
              onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
              className="w-full border rounded p-2"
              rows={4}
              required={field.required}
            />
          </div>
        );
      case 'select':
        return (
          <div key={key} className="mb-4">
            <label className="block text-sm font-medium mb-1">{field.label}</label>
            <select
              value={formData[key] || ''}
              onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
              className="w-full border rounded p-2"
              required={field.required}
            >
              <option value="">請選擇</option>
              {field.options?.map((opt: string) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        );
      default:
        return null;
    }
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
            <Link href="/kanban" className="hover:text-gray-900">
              Kanban 看板
            </Link>
            <span>/</span>
            <span className="text-gray-900">任務表單</span>
          </div>
        </nav>

        <h1 className="text-2xl font-bold mb-6">任務表單管理</h1>

        {/* 表單定義列表 */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold">可用的表單</h2>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {definitions.map((def) => (
                <div
                  key={def.id}
                  className="p-4 border rounded-lg cursor-pointer hover:bg-gray-50"
                  onClick={() => setSelectedForm(def)}
                >
                  <h3 className="font-medium">{def.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{def.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 填寫表單 */}
        {selectedForm && (
          <div className="bg-white rounded-lg shadow mb-6">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold">填寫表單：{selectedForm.name}</h2>
            </div>
            <div className="p-6">
              {selectedForm.form_schema?.fields?.map((field: any, index: number) =>
                renderFormField(field, field.name || `field_${index}`)
              )}
              <div className="flex justify-end space-x-2 mt-6">
                <button
                  onClick={() => {
                    setSelectedForm(null);
                    setFormData({});
                  }}
                  className="px-4 py-2 border rounded"
                >
                  取消
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  {submitting ? '提交中...' : '提交表單'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 已提交的表單紀錄 */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold">已提交的表單</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {records.map((record) => (
                <div key={record.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium">{record.form_name}</h3>
                    <span className="text-xs text-gray-500">
                      {new Date(record.submitted_at).toLocaleString('zh-TW')}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    <pre className="bg-gray-50 p-3 rounded text-xs overflow-auto">
                      {JSON.stringify(record.form_data, null, 2)}
                    </pre>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

