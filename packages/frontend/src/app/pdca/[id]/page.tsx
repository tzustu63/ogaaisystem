'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { pdcaApi, taskApi, userApi, kpiApi } from '@/lib/api';
import Link from 'next/link';

interface PDCACycle {
  id: string;
  cycle_name: string;
  check_frequency: string;
  responsible_name?: string;
  initiative_id?: string;
  initiative_name?: string;
  okr_id?: string;
  okr_objective?: string;
  data_source?: string;
  plans?: any[];
  executions?: any[];
  checks?: any[];
  actions?: any[];
}

interface User {
  id: string;
  full_name: string;
  username: string;
}

interface Task {
  id: string;
  title: string;
}

interface KPI {
  id: string;
  name_zh: string;
}

export default function PDCADetailPage() {
  const params = useParams();
  const [cycle, setCycle] = useState<PDCACycle | null>(null);
  const [loading, setLoading] = useState(true);
  
  // 模態框狀態
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showEditPlanModal, setShowEditPlanModal] = useState(false);
  const [showExecutionModal, setShowExecutionModal] = useState(false);
  const [showCheckModal, setShowCheckModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  
  // 表單狀態
  const [planForm, setPlanForm] = useState({
    plan_description: '',
    target_value: '',
    check_points: [''],
  });
  const [editingPlan, setEditingPlan] = useState<any>(null);
  
  const [executionForm, setExecutionForm] = useState({
    check_point: '',
    execution_date: new Date().toISOString().split('T')[0],
    actual_value: '',
    evidence_urls: [''],
  });
  
  const [checkForm, setCheckForm] = useState({
    check_date: new Date().toISOString().split('T')[0],
  });
  
  const [actionForm, setActionForm] = useState({
    root_cause: '',
    action_type: '',
    action_items: [''],
    expected_kpi_impacts: [] as string[],
    validation_method: '',
    responsible_user_id: '',
    due_date: '',
    create_task: false,
  });
  
  // 選項列表
  const [users, setUsers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchCycle();
    }
  }, [params.id]);

  useEffect(() => {
    if (cycle) {
      fetchOptions();
    }
  }, [cycle]);

  const fetchCycle = async () => {
    try {
      const res = await pdcaApi.getById(params.id as string);
      setCycle(res.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching PDCA cycle:', err);
      setLoading(false);
    }
  };

  const fetchOptions = async () => {
    try {
      const [usersRes, kpisRes] = await Promise.all([
        userApi.getUsers(),
        kpiApi.getAll(),
      ]);
      setUsers(usersRes.data || []);
      setKpis(kpisRes.data || []);

      // 根據 PDCA 循環的 initiative_id 來取得相關任務
      if (cycle?.initiative_id) {
        const tasksRes = await taskApi.getAll({ initiative_id: cycle.initiative_id });
        setTasks(tasksRes.data || []);
      } else {
        // 如果沒有 initiative_id，則不顯示任務選項
        setTasks([]);
      }
    } catch (err) {
      console.error('Error fetching options:', err);
    }
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await pdcaApi.createPlan(params.id as string, {
        plan_description: planForm.plan_description,
        target_value: planForm.target_value || undefined,
        check_points: planForm.check_points.filter((p) => p.trim() !== ''),
      });
      setShowPlanModal(false);
      setPlanForm({ plan_description: '', target_value: '', check_points: [''] });
      await fetchCycle();
    } catch (error: any) {
      alert(error.response?.data?.error || '建立 Plan 失敗');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditPlan = (plan: any) => {
    setEditingPlan(plan);
    setPlanForm({
      plan_description: plan.plan_description || '',
      target_value: plan.target_value || '',
      check_points: plan.check_points && plan.check_points.length > 0 
        ? plan.check_points 
        : [''],
    });
    setShowEditPlanModal(true);
  };

  const handleUpdatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;
    setSubmitting(true);
    try {
      await pdcaApi.updatePlan(editingPlan.id, {
        plan_description: planForm.plan_description,
        target_value: planForm.target_value || undefined,
        check_points: planForm.check_points.filter((p) => p.trim() !== ''),
      });
      setShowEditPlanModal(false);
      setEditingPlan(null);
      setPlanForm({ plan_description: '', target_value: '', check_points: [''] });
      await fetchCycle();
    } catch (error: any) {
      alert(error.response?.data?.error || '更新 Plan 失敗');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePlan = async (planId: string) => {
    if (!confirm('確定要刪除此 Plan 嗎？')) return;
    setSubmitting(true);
    try {
      await pdcaApi.deletePlan(planId);
      await fetchCycle();
    } catch (error: any) {
      alert(error.response?.data?.error || '刪除 Plan 失敗');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateExecution = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await pdcaApi.createExecution(params.id as string, {
        check_point: executionForm.check_point || undefined,
        execution_date: executionForm.execution_date,
        actual_value: executionForm.actual_value || undefined,
        evidence_urls: executionForm.evidence_urls.filter((url) => url.trim() !== ''),
      });
      setShowExecutionModal(false);
      setExecutionForm({
        check_point: '',
        execution_date: new Date().toISOString().split('T')[0],
        actual_value: '',
        evidence_urls: [''],
      });
      await fetchCycle();
    } catch (error: any) {
      alert(error.response?.data?.error || '記錄執行失敗');
    } finally {
      setSubmitting(false);
    }
  };

  // 取得所有 Plan 的檢核點
  const getAllCheckPoints = () => {
    if (!cycle?.plans || cycle.plans.length === 0) return [];
    const checkPoints: string[] = [];
    cycle.plans.forEach((plan: any) => {
      if (plan.check_points && Array.isArray(plan.check_points)) {
        plan.check_points.forEach((point: string) => {
          if (point && point.trim() && !checkPoints.includes(point.trim())) {
            checkPoints.push(point.trim());
          }
        });
      }
    });
    return checkPoints;
  };

  const handleCreateCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await pdcaApi.createCheck(params.id as string, {
        check_date: checkForm.check_date,
      });
      setShowCheckModal(false);
      setCheckForm({ check_date: new Date().toISOString().split('T')[0] });
      await fetchCycle();
    } catch (error: any) {
      alert(error.response?.data?.error || '執行檢核失敗');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await pdcaApi.createAction(params.id as string, {
        root_cause: actionForm.root_cause,
        action_type: actionForm.action_type,
        action_items: actionForm.action_items.filter((item) => item.trim() !== ''),
        expected_kpi_impacts: actionForm.expected_kpi_impacts,
        validation_method: actionForm.validation_method || undefined,
        responsible_user_id: actionForm.responsible_user_id,
        due_date: actionForm.due_date || undefined,
        create_task: actionForm.create_task,
      });
      setShowActionModal(false);
      setActionForm({
        root_cause: '',
        action_type: '',
        action_items: [''],
        expected_kpi_impacts: [],
        validation_method: '',
        responsible_user_id: '',
        due_date: '',
        create_task: false,
      });
      await fetchCycle();
    } catch (error: any) {
      alert(error.response?.data?.error || '建立改善行動失敗');
    } finally {
      setSubmitting(false);
    }
  };

  const getFrequencyLabel = (frequency: string) => {
    const labels: Record<string, string> = {
      weekly: '每週',
      monthly: '每月',
      quarterly: '每季',
    };
    return labels[frequency] || frequency;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass':
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'warning':
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'fail':
      case 'pending':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pass: '通過',
      warning: '警告',
      fail: '失敗',
      completed: '已完成',
      in_progress: '進行中',
      pending: '待處理',
    };
    return labels[status] || status;
  };

  const getRootCauseLabel = (cause: string) => {
    const labels: Record<string, string> = {
      human: '人力',
      process: '流程',
      system: '系統',
      external_policy: '外部政策',
      partner: '合作方',
    };
    return labels[cause] || cause;
  };

  if (loading) {
    return <div className="p-8">載入中...</div>;
  }

  if (!cycle) {
    return <div className="p-8">PDCA 循環不存在</div>;
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* 麵包屑 */}
        <nav className="mb-6">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Link href="/pdca" className="hover:text-gray-900">
              PDCA 循環
            </Link>
            <span>/</span>
            <span className="text-gray-900">{cycle.cycle_name}</span>
          </div>
        </nav>

        {/* 基本資訊 */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-6 border-b">
            <h1 className="text-2xl font-bold">{cycle.cycle_name}</h1>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="font-semibold mb-2">循環資訊</h3>
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="text-gray-600">檢核頻率</dt>
                  <dd>{getFrequencyLabel(cycle.check_frequency)}</dd>
                </div>
                <div>
                  <dt className="text-gray-600">負責人</dt>
                  <dd>{cycle.responsible_name || '未指定'}</dd>
                </div>
                <div>
                  <dt className="text-gray-600">資料來源</dt>
                  <dd>{cycle.data_source || '未設定'}</dd>
                </div>
              </dl>
            </div>

            <div>
              <h3 className="font-semibold mb-2">關聯專案</h3>
              <dl className="space-y-2 text-sm">
                {cycle.initiative_name && (
                  <div>
                    <dt className="text-gray-600">策略專案</dt>
                    <dd>{cycle.initiative_name}</dd>
                  </div>
                )}
                {cycle.okr_objective && (
                  <div>
                    <dt className="text-gray-600">OKR</dt>
                    <dd>{cycle.okr_objective}</dd>
                  </div>
                )}
                {!cycle.initiative_name && !cycle.okr_objective && (
                  <span className="text-gray-500 text-sm">無</span>
                )}
              </dl>
            </div>
          </div>
        </div>

        {/* Plan 階段 */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-6 border-b flex justify-between items-center">
            <h2 className="text-xl font-semibold">Plan（計畫）</h2>
            <button
              onClick={() => setShowPlanModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
            >
              + 新增 Plan
            </button>
          </div>
          <div className="p-6">
            {cycle.plans && cycle.plans.length > 0 ? (
              <div className="space-y-4">
                {cycle.plans.map((plan) => (
                  <div key={plan.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h3 className="font-medium">計畫描述</h3>
                        <p className="text-sm text-gray-700 mt-1">{plan.plan_description}</p>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => handleEditPlan(plan)}
                          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                          disabled={submitting}
                        >
                          編輯
                        </button>
                        <button
                          onClick={() => handleDeletePlan(plan.id)}
                          className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                          disabled={submitting}
                        >
                          刪除
                        </button>
                      </div>
                    </div>
                    {plan.target_value && (
                      <div className="mb-2">
                        <span className="text-sm text-gray-600">目標值：</span>
                        <span className="text-sm font-medium">{plan.target_value}</span>
                      </div>
                    )}
                    {plan.check_points && plan.check_points.length > 0 && (
                      <div>
                        <span className="text-sm text-gray-600">檢核點：</span>
                        <ul className="list-disc list-inside text-sm text-gray-700 mt-1">
                          {plan.check_points.map((point: string, idx: number) => (
                            <li key={idx}>{point}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">尚無 Plan 記錄</p>
            )}
          </div>
        </div>

        {/* Do 階段 */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-6 border-b flex justify-between items-center">
            <h2 className="text-xl font-semibold">Do（執行）</h2>
            <button
              onClick={() => setShowExecutionModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
            >
              + 記錄執行
            </button>
          </div>
          <div className="p-6">
            {cycle.executions && cycle.executions.length > 0 ? (
              <div className="space-y-4">
                {cycle.executions.map((execution) => (
                  <div key={execution.id} className="border rounded-lg p-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">執行日期</span>
                        <p className="font-medium">
                          {execution.execution_date
                            ? new Date(execution.execution_date).toLocaleDateString('zh-TW')
                            : '未設定'}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-600">關聯檢核點</span>
                        <p className="font-medium">{execution.check_point || '未指定'}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">實際值</span>
                        <p className="font-medium">{execution.actual_value || '未記錄'}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">執行人</span>
                        <p className="font-medium">{execution.executed_by_name || '未知'}</p>
                      </div>
                    </div>
                    {execution.evidence_urls && execution.evidence_urls.length > 0 && (
                      <div className="mt-2">
                        <span className="text-sm text-gray-600">證據連結：</span>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {execution.evidence_urls.map((url: string, idx: number) => (
                            <a
                              key={idx}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline text-sm"
                            >
                              連結 {idx + 1}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">尚無執行記錄</p>
            )}
          </div>
        </div>

        {/* Check 階段 */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-6 border-b flex justify-between items-center">
            <h2 className="text-xl font-semibold">Check（檢核）</h2>
            <button
              onClick={() => setShowCheckModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
            >
              + 執行檢核
            </button>
          </div>
          <div className="p-6">
            {cycle.checks && cycle.checks.length > 0 ? (
              <div className="space-y-4">
                {cycle.checks.map((check) => (
                  <div key={check.id} className="border rounded-lg p-4">
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">
                          檢核日期：{check.check_date
                            ? new Date(check.check_date).toLocaleDateString('zh-TW')
                            : '未設定'}
                        </span>
                        <span className="text-sm text-gray-600">
                          檢核人：{check.checked_by_name || '未知'}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <span className="text-sm text-gray-600">完整性</span>
                        <div className="mt-1">
                          <span
                            className={`px-2 py-1 rounded text-xs ${getStatusColor(
                              check.completeness_status
                            )}`}
                          >
                            {getStatusLabel(check.completeness_status)}
                          </span>
                        </div>
                        {check.completeness_issues && check.completeness_issues.length > 0 && (
                          <ul className="list-disc list-inside text-xs text-gray-600 mt-1">
                            {check.completeness_issues.map((issue: string, idx: number) => (
                              <li key={idx}>{issue}</li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <div>
                        <span className="text-sm text-gray-600">準時性</span>
                        <div className="mt-1">
                          <span
                            className={`px-2 py-1 rounded text-xs ${getStatusColor(
                              check.timeliness_status
                            )}`}
                          >
                            {getStatusLabel(check.timeliness_status)}
                          </span>
                        </div>
                        {check.timeliness_issues && check.timeliness_issues.length > 0 && (
                          <ul className="list-disc list-inside text-xs text-gray-600 mt-1">
                            {check.timeliness_issues.map((issue: string, idx: number) => (
                              <li key={idx}>{issue}</li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <div>
                        <span className="text-sm text-gray-600">一致性</span>
                        <div className="mt-1">
                          <span
                            className={`px-2 py-1 rounded text-xs ${getStatusColor(
                              check.consistency_status
                            )}`}
                          >
                            {getStatusLabel(check.consistency_status)}
                          </span>
                        </div>
                        {check.consistency_issues && check.consistency_issues.length > 0 && (
                          <ul className="list-disc list-inside text-xs text-gray-600 mt-1">
                            {check.consistency_issues.map((issue: string, idx: number) => (
                              <li key={idx}>{issue}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>

                    {check.variance_analysis && (
                      <div className="mt-4 p-3 bg-gray-50 rounded">
                        <span className="text-sm font-medium">差異分析</span>
                        <p className="text-sm text-gray-700 mt-1">{check.variance_analysis}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">尚無檢核記錄</p>
            )}
          </div>
        </div>

        {/* Act 階段 */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-6 border-b flex justify-between items-center">
            <h2 className="text-xl font-semibold">Act（改善行動）</h2>
            <button
              onClick={() => setShowActionModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
            >
              + 新增改善行動
            </button>
          </div>
          <div className="p-6">
            {cycle.actions && cycle.actions.length > 0 ? (
              <div className="space-y-4">
                {cycle.actions.map((action) => (
                  <div key={action.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span
                            className={`px-2 py-1 rounded text-xs ${getStatusColor(
                              action.status
                            )}`}
                          >
                            {getStatusLabel(action.status)}
                          </span>
                          <span className="text-sm text-gray-600">
                            根本原因：{getRootCauseLabel(action.root_cause)}
                          </span>
                        </div>
                        <div className="text-sm">
                          <span className="text-gray-600">對策類型：</span>
                          <span className="font-medium">{action.action_type}</span>
                        </div>
                      </div>
                    </div>

                    {action.action_items && action.action_items.length > 0 && (
                      <div className="mb-3">
                        <span className="text-sm font-medium">具體行動：</span>
                        <ul className="list-disc list-inside text-sm text-gray-700 mt-1">
                          {action.action_items.map((item: string, idx: number) => (
                            <li key={idx}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">負責人</span>
                        <p className="font-medium">{action.responsible_name || '未指定'}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">截止日期</span>
                        <p className="font-medium">
                          {action.due_date
                            ? new Date(action.due_date).toLocaleDateString('zh-TW')
                            : '未設定'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">尚無改善行動</p>
            )}
          </div>
        </div>
      </div>

      {/* Plan 模態框 */}
      {showPlanModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">新增 Plan</h3>
            <form onSubmit={handleCreatePlan} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  計畫描述 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={planForm.plan_description}
                  onChange={(e) =>
                    setPlanForm({ ...planForm, plan_description: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                  rows={4}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">目標值</label>
                <input
                  type="text"
                  value={planForm.target_value}
                  onChange={(e) => setPlanForm({ ...planForm, target_value: e.target.value })}
                  className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                  placeholder="例如：100、95% 等"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">檢核點</label>
                {planForm.check_points.map((point, idx) => (
                  <div key={idx} className="mb-2 flex gap-2">
                    <input
                      type="text"
                      value={point}
                      onChange={(e) => {
                        const newPoints = [...planForm.check_points];
                        newPoints[idx] = e.target.value;
                        setPlanForm({ ...planForm, check_points: newPoints });
                      }}
                      className="flex-1 px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                      placeholder={`檢核點 ${idx + 1}`}
                    />
                    {planForm.check_points.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const newPoints = planForm.check_points.filter((_, i) => i !== idx);
                          setPlanForm({ ...planForm, check_points: newPoints });
                        }}
                        className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                      >
                        刪除
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setPlanForm({
                      ...planForm,
                      check_points: [...planForm.check_points, ''],
                    })
                  }
                  className="mt-2 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
                >
                  + 新增檢核點
                </button>
              </div>
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowPlanModal(false);
                    setPlanForm({ plan_description: '', target_value: '', check_points: [''] });
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? '建立中...' : '建立 Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 編輯 Plan 模態框 */}
      {showEditPlanModal && editingPlan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">編輯 Plan</h3>
            <form onSubmit={handleUpdatePlan} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  計畫描述 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={planForm.plan_description}
                  onChange={(e) =>
                    setPlanForm({ ...planForm, plan_description: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                  rows={4}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">目標值</label>
                <input
                  type="text"
                  value={planForm.target_value}
                  onChange={(e) => setPlanForm({ ...planForm, target_value: e.target.value })}
                  className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                  placeholder="例如：100、95% 等"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">檢核點</label>
                {planForm.check_points.map((point, idx) => (
                  <div key={idx} className="mb-2 flex gap-2">
                    <input
                      type="text"
                      value={point}
                      onChange={(e) => {
                        const newPoints = [...planForm.check_points];
                        newPoints[idx] = e.target.value;
                        setPlanForm({ ...planForm, check_points: newPoints });
                      }}
                      className="flex-1 px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                      placeholder={`檢核點 ${idx + 1}`}
                    />
                    {planForm.check_points.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const newPoints = planForm.check_points.filter((_, i) => i !== idx);
                          setPlanForm({ ...planForm, check_points: newPoints });
                        }}
                        className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                      >
                        刪除
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setPlanForm({
                      ...planForm,
                      check_points: [...planForm.check_points, ''],
                    })
                  }
                  className="mt-2 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
                >
                  + 新增檢核點
                </button>
              </div>
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditPlanModal(false);
                    setEditingPlan(null);
                    setPlanForm({ plan_description: '', target_value: '', check_points: [''] });
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? '更新中...' : '更新 Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Execution 模態框 */}
      {showExecutionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">記錄執行</h3>
            <form onSubmit={handleCreateExecution} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">關聯檢核點</label>
                <select
                  value={executionForm.check_point}
                  onChange={(e) => setExecutionForm({ ...executionForm, check_point: e.target.value })}
                  className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                  disabled={getAllCheckPoints().length === 0}
                >
                  <option value="">
                    {getAllCheckPoints().length === 0
                      ? '尚無檢核點，請先建立 Plan 並設定檢核點'
                      : '請選擇檢核點（可選）'}
                  </option>
                  {getAllCheckPoints().map((point, idx) => (
                    <option key={idx} value={point}>
                      {point}
                    </option>
                  ))}
                </select>
                {getAllCheckPoints().length > 0 && (
                  <p className="mt-1 text-xs text-gray-500">
                    顯示所有 Plan 的檢核點
                  </p>
                )}
                {getAllCheckPoints().length === 0 && (
                  <p className="mt-1 text-xs text-yellow-600">
                    請先在 Plan 階段建立 Plan 並設定檢核點
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  執行日期 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={executionForm.execution_date}
                  onChange={(e) =>
                    setExecutionForm({ ...executionForm, execution_date: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">實際值</label>
                <input
                  type="text"
                  value={executionForm.actual_value}
                  onChange={(e) =>
                    setExecutionForm({ ...executionForm, actual_value: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                  placeholder="例如：95、98% 等"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">證據連結</label>
                {executionForm.evidence_urls.map((url, idx) => (
                  <div key={idx} className="mb-2 flex gap-2">
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => {
                        const newUrls = [...executionForm.evidence_urls];
                        newUrls[idx] = e.target.value;
                        setExecutionForm({ ...executionForm, evidence_urls: newUrls });
                      }}
                      className="flex-1 px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                      placeholder="https://..."
                    />
                    {executionForm.evidence_urls.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const newUrls = executionForm.evidence_urls.filter((_, i) => i !== idx);
                          setExecutionForm({ ...executionForm, evidence_urls: newUrls });
                        }}
                        className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                      >
                        刪除
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setExecutionForm({
                      ...executionForm,
                      evidence_urls: [...executionForm.evidence_urls, ''],
                    })
                  }
                  className="mt-2 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
                >
                  + 新增連結
                </button>
              </div>
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
      setShowExecutionModal(false);
      setExecutionForm({
        check_point: '',
        execution_date: new Date().toISOString().split('T')[0],
        actual_value: '',
        evidence_urls: [''],
      });
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? '記錄中...' : '記錄執行'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Check 模態框 */}
      {showCheckModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">執行檢核</h3>
            <p className="text-sm text-gray-600 mb-4">
              系統將自動進行完整性、準時性和一致性檢核，並計算差異分析。
            </p>
            <form onSubmit={handleCreateCheck} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">檢核日期</label>
                <input
                  type="date"
                  value={checkForm.check_date}
                  onChange={(e) =>
                    setCheckForm({ ...checkForm, check_date: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  留空將使用今天日期
                </p>
              </div>
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowCheckModal(false);
                    setCheckForm({ check_date: new Date().toISOString().split('T')[0] });
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? '檢核中...' : '執行檢核'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Action 模態框 */}
      {showActionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">新增改善行動</h3>
            <form onSubmit={handleCreateAction} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  根本原因 <span className="text-red-500">*</span>
                </label>
                <select
                  value={actionForm.root_cause}
                  onChange={(e) =>
                    setActionForm({ ...actionForm, root_cause: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">請選擇</option>
                  <option value="human">人力</option>
                  <option value="process">流程</option>
                  <option value="system">系統</option>
                  <option value="external_policy">外部政策</option>
                  <option value="partner">合作方</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  對策類型 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={actionForm.action_type}
                  onChange={(e) =>
                    setActionForm({ ...actionForm, action_type: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                  placeholder="例如：流程優化、系統改善等"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  具體行動 <span className="text-red-500">*</span>
                </label>
                {actionForm.action_items.map((item, idx) => (
                  <div key={idx} className="mb-2 flex gap-2">
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => {
                        const newItems = [...actionForm.action_items];
                        newItems[idx] = e.target.value;
                        setActionForm({ ...actionForm, action_items: newItems });
                      }}
                      className="flex-1 px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                      placeholder={`行動項目 ${idx + 1}`}
                      required
                    />
                    {actionForm.action_items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const newItems = actionForm.action_items.filter((_, i) => i !== idx);
                          setActionForm({ ...actionForm, action_items: newItems });
                        }}
                        className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                      >
                        刪除
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setActionForm({
                      ...actionForm,
                      action_items: [...actionForm.action_items, ''],
                    })
                  }
                  className="mt-2 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
                >
                  + 新增行動項目
                </button>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  預期影響的 KPI
                </label>
                <div className="max-h-40 overflow-y-auto border rounded p-3">
                  {kpis.map((kpi) => (
                    <label key={kpi.id} className="flex items-center space-x-2 mb-2">
                      <input
                        type="checkbox"
                        checked={actionForm.expected_kpi_impacts.includes(kpi.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setActionForm({
                              ...actionForm,
                              expected_kpi_impacts: [...actionForm.expected_kpi_impacts, kpi.id],
                            });
                          } else {
                            setActionForm({
                              ...actionForm,
                              expected_kpi_impacts: actionForm.expected_kpi_impacts.filter(
                                (id) => id !== kpi.id
                              ),
                            });
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm">{kpi.name_zh}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">驗證方法</label>
                <textarea
                  value={actionForm.validation_method}
                  onChange={(e) =>
                    setActionForm({ ...actionForm, validation_method: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="描述如何驗證改善行動的效果"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  負責人 <span className="text-red-500">*</span>
                </label>
                <select
                  value={actionForm.responsible_user_id}
                  onChange={(e) =>
                    setActionForm({ ...actionForm, responsible_user_id: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">請選擇</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.full_name} ({user.username})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">截止日期</label>
                <input
                  type="date"
                  value={actionForm.due_date}
                  onChange={(e) =>
                    setActionForm({ ...actionForm, due_date: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={actionForm.create_task}
                    onChange={(e) =>
                      setActionForm({ ...actionForm, create_task: e.target.checked })
                    }
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">
                    自動為每個行動項目建立 Kanban 任務
                  </span>
                </label>
              </div>
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowActionModal(false);
                    setActionForm({
                      root_cause: '',
                      action_type: '',
                      action_items: [''],
                      expected_kpi_impacts: [],
                      validation_method: '',
                      responsible_user_id: '',
                      due_date: '',
                      create_task: false,
                    });
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? '建立中...' : '建立改善行動'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
