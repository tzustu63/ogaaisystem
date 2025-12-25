'use client';

import { useEffect, useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import api from '@/lib/api';
import { taskApi, initiativeApi, okrApi, systemOptionsApi } from '@/lib/api';
import TracePath from '@/components/TracePath';
import Link from 'next/link';

interface Task {
  id: string;
  title: string;
  assignee_name?: string;
  due_date?: string;
  priority: string;
  status: string;
}

interface User {
  id: string;
  full_name: string;
}

interface Initiative {
  id: string;
  name_zh: string;
}

interface OKR {
  id: string;
  objective: string;
  quarter: string;
  key_results?: KeyResult[];
}

interface KeyResult {
  id: string;
  description: string;
  okr_id: string;
  target_value?: number;
  unit?: string;
}

export default function KanbanPage() {
  const [tasks, setTasks] = useState<{
    todo: Task[];
    in_progress: Task[];
    review: Task[];
    done: Task[];
  }>({
    todo: [],
    in_progress: [],
    review: [],
    done: [],
  });
  const [groupBy, setGroupBy] = useState<'status' | 'initiative' | 'assignee' | 'priority'>('status');
  const [selectedInitiativeId, setSelectedInitiativeId] = useState<string>('');
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [okrs, setOkrs] = useState<OKR[]>([]);
  const [keyResults, setKeyResults] = useState<KeyResult[]>([]);
  const [loadingOkrs, setLoadingOkrs] = useState(false);
  const [loadingKrs, setLoadingKrs] = useState(false);
  const [creatingTask, setCreatingTask] = useState(false);
  const [showEditTaskModal, setShowEditTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    task_type: 'routine' as 'routine' | 'project' | 'incident',
    priority: 'medium' as 'urgent' | 'high' | 'medium' | 'low',
    assignee_id: '',
    due_date: '',
    initiative_id: '',
    okr_id: '',
    kr_id: '',
    kr_contribution_value: 0,
    funding_source: '',
    amount: '',
  });
  
  const [selectedKR, setSelectedKR] = useState<KeyResult | null>(null);
  const [fundingSources, setFundingSources] = useState<any[]>([]);
  const [evidenceItems, setEvidenceItems] = useState<Array<{ description: string; url: string }>>([]);

  useEffect(() => {
    fetchTasks();
    fetchOptions();
  }, [groupBy, selectedInitiativeId, selectedAssigneeId]);

  const fetchOptions = async () => {
    try {
      const [usersRes, initiativesRes, fundingSourcesRes] = await Promise.all([
        api.get('/users'),
        initiativeApi.getAll(),
        systemOptionsApi.getByCategory('funding_source'),
      ]);
      setUsers(usersRes.data || []);
      setInitiatives(initiativesRes.data || []);
      setFundingSources(fundingSourcesRes.data || []);
    } catch (error) {
      console.error('Error fetching options:', error);
    }
  };

  // 當選擇策略專案時，載入相關的 OKRs
  const handleInitiativeChange = async (initiativeId: string) => {
    setNewTask({
      ...newTask,
      initiative_id: initiativeId,
      okr_id: '', // 清空 OKR 選擇
      kr_id: '', // 清空 KR 選擇
    });
    setOkrs([]);
    setKeyResults([]);

    if (!initiativeId) {
      return;
    }

    setLoadingOkrs(true);
    try {
      const okrsRes = await okrApi.getAll({ initiative_id: initiativeId });
      setOkrs(okrsRes.data || []);
    } catch (error) {
      console.error('Error fetching OKRs:', error);
      setOkrs([]);
    } finally {
      setLoadingOkrs(false);
    }
  };

  // 當選擇 OKR 時，載入相關的 Key Results
  const handleOKRChange = async (okrId: string) => {
    setNewTask({
      ...newTask,
      okr_id: okrId,
      kr_id: '', // 清空 KR 選擇
      kr_contribution_value: 0, // 清空貢獻值
    });
    setKeyResults([]);
    setSelectedKR(null);

    if (!okrId) {
      return;
    }

    setLoadingKrs(true);
    try {
      const okrRes = await okrApi.getById(okrId);
      if (okrRes.data.key_results) {
        setKeyResults(okrRes.data.key_results.map((kr: any) => ({
          id: kr.id,
          description: kr.description,
          okr_id: okrId,
          target_value: kr.target_value,
          unit: kr.unit,
        })));
      }
    } catch (error) {
      console.error('Error fetching Key Results:', error);
      setKeyResults([]);
    } finally {
      setLoadingKrs(false);
    }
  };

  // 當選擇 Key Result 時，設定選中的 KR 資訊
  const handleKRChange = (krId: string) => {
    const kr = keyResults.find(k => k.id === krId);
    setSelectedKR(kr || null);
    setNewTask({
      ...newTask,
      kr_id: krId,
      kr_contribution_value: 0, // 重置貢獻值
    });
  };

  const fetchTasks = async () => {
    try {
      const params: any = {};
      if (groupBy !== 'status') {
        params.groupBy = groupBy;
      }
      // 如果選擇了特定策略專案，加入篩選
      if (groupBy === 'initiative' && selectedInitiativeId) {
        params.initiative_id = selectedInitiativeId;
      }
      // 如果選擇了特定負責人，加入篩選
      if (groupBy === 'assignee' && selectedAssigneeId) {
        params.assignee_id = selectedAssigneeId;
      }
      const res = await api.get('/tasks/kanban/board', { params });
      
      // 如果選擇了特定專案或負責人，後端會返回按狀態分組的資料
      const isFiltered = (groupBy === 'initiative' && selectedInitiativeId) || 
                         (groupBy === 'assignee' && selectedAssigneeId);
      
      if (groupBy === 'status' || isFiltered) {
        // 按狀態分組的資料結構
        setTasks(res.data);
      } else {
        // 自訂分組的資料結構不同，需要轉換
        const groupedData: any = res.data;
        setTasks({
          todo: [],
          in_progress: [],
          review: [],
          done: [],
          ...groupedData, // 包含分組資料
        });
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      setLoading(false);
    }
  };

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;

    // 檢查是否選擇了特定專案或負責人（此時會按狀態分組，可以拖曳）
    const isFiltered = (groupBy === 'initiative' && selectedInitiativeId) || 
                       (groupBy === 'assignee' && selectedAssigneeId);

    // 如果分組方式不是狀態，且沒有選擇特定專案/負責人，則不允許拖曳
    if (groupBy !== 'status' && !isFiltered) {
      alert('僅在「依狀態」分組或選擇特定專案/負責人時可拖曳任務');
      return;
    }

    if (source.droppableId === destination.droppableId) return;

    // 更新本地狀態
    const sourceTasks = [...tasks[source.droppableId as keyof typeof tasks]];
    const destTasks = [...tasks[destination.droppableId as keyof typeof tasks]];
    const [movedTask] = sourceTasks.splice(source.index, 1);
    destTasks.splice(destination.index, 0, movedTask);

    setTasks({
      ...tasks,
      [source.droppableId]: sourceTasks,
      [destination.droppableId]: destTasks,
    });

    // 更新後端
    try {
      const response = await api.patch(`/tasks/${draggableId}/status`, {
        status: destination.droppableId,
      });
      
      // 如果任務移動到「完成」狀態，提示 KR 值已自動更新
      if (destination.droppableId === 'done') {
        // 後端會自動更新 KR 進度，這裡不需要額外操作
        // 可以選擇性地顯示提示訊息（但為了不干擾用戶，暫時不顯示）
      }
    } catch (error) {
      console.error('Error updating task status:', error);
      // 回滾
      fetchTasks();
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingTask(true);
    
    try {
      const taskData = {
        ...newTask,
        assignee_id: newTask.assignee_id || undefined,
        due_date: newTask.due_date || undefined,
        initiative_id: newTask.initiative_id || undefined,
        kr_id: newTask.kr_id || undefined,
        kr_contribution_value: newTask.kr_id ? Number(newTask.kr_contribution_value) || 0 : undefined,
        funding_source: newTask.funding_source || undefined,
        amount: newTask.amount && String(newTask.amount).trim() ? parseFloat(String(newTask.amount)) : undefined,
      };
      
      await taskApi.create(taskData);
      setShowNewTaskModal(false);
      setNewTask({
        title: '',
        description: '',
        task_type: 'routine',
        priority: 'medium',
        assignee_id: '',
        due_date: '',
        initiative_id: '',
        okr_id: '',
        kr_id: '',
        kr_contribution_value: 0,
        funding_source: '',
        amount: '',
      });
      setOkrs([]);
      setKeyResults([]);
      setSelectedKR(null);
      await fetchTasks();
    } catch (error: any) {
      console.error('Error creating task:', error);
      alert(error.response?.data?.error || '建立任務失敗');
    } finally {
      setCreatingTask(false);
    }
  };

  const handleEditTask = async (task: any) => {
    try {
      const taskDetail = await taskApi.getById(task.id);
      const taskData = taskDetail.data;
      
      // 從 kr_id 取得 okr_id（如果任務沒有直接存 okr_id）
      let okrId = taskData.okr_id;
      if (!okrId && taskData.kr_id) {
        // 從 keyResults 中找對應的 okr_id
        const kr = keyResults.find((k) => k.id === taskData.kr_id);
        if (kr) {
          okrId = kr.okr_id;
        }
      }
      
      // 載入相關的 OKR 和 KR（如果有的話）
      if (taskData.initiative_id) {
        await handleInitiativeChange(taskData.initiative_id);
        if (okrId) {
          await handleOKRChange(okrId);
          if (taskData.kr_id) {
            const kr = keyResults.find((k) => k.id === taskData.kr_id);
            if (kr) {
              setSelectedKR(kr);
            }
          }
        }
      }
      
      // 載入佐證資料
      const evidenceItemsData = (taskData.attachments || []).map((att: any) => ({
        description: att.file_name || att.description || '',
        url: att.file_url || '',
      }));
      setEvidenceItems(evidenceItemsData.length > 0 ? evidenceItemsData : [{ description: '', url: '' }]);
      
      setEditingTask(taskData);
      setNewTask({
        title: taskData.title || '',
        description: taskData.description || '',
        task_type: taskData.task_type || 'routine',
        priority: taskData.priority || 'medium',
        assignee_id: taskData.assignee_id || '',
        due_date: taskData.due_date ? new Date(taskData.due_date).toISOString().split('T')[0] : '',
        initiative_id: taskData.initiative_id || '',
        okr_id: okrId || '',
        kr_id: taskData.kr_id || '',
        kr_contribution_value: Number(taskData.kr_contribution_value) || 0,
        funding_source: taskData.funding_source || '',
        amount: taskData.amount ? String(taskData.amount) : '',
      });
      setShowEditTaskModal(true);
    } catch (error: any) {
      console.error('Error fetching task:', error);
      alert('載入任務資料失敗');
    }
  };

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;
    
    setCreatingTask(true);
    try {
      // 過濾掉空的佐證資料
      const validEvidenceItems = evidenceItems.filter(item => item.url.trim() || item.description.trim());
      
      // 注意：後端 schema 沒有 okr_id 欄位，不要傳送
      await taskApi.update(editingTask.id, {
        title: newTask.title,
        description: newTask.description || undefined,
        task_type: newTask.task_type,
        priority: newTask.priority,
        assignee_id: newTask.assignee_id,
        due_date: newTask.due_date || undefined,
        initiative_id: newTask.initiative_id || undefined,
        kr_id: newTask.kr_id || undefined,
        kr_contribution_value: newTask.kr_id ? Number(newTask.kr_contribution_value) || 0 : undefined,
        funding_source: newTask.funding_source || undefined,
        amount: newTask.amount && String(newTask.amount).trim() ? parseFloat(String(newTask.amount)) : undefined,
        attachments: validEvidenceItems.length > 0 ? validEvidenceItems : undefined,
      });
      setShowEditTaskModal(false);
      setEditingTask(null);
      setEvidenceItems([{ description: '', url: '' }]);
      setNewTask({
        title: '',
        description: '',
        task_type: 'routine',
        priority: 'medium',
        assignee_id: '',
        due_date: '',
        initiative_id: '',
        okr_id: '',
        kr_id: '',
        kr_contribution_value: 0,
        funding_source: '',
        amount: '',
      });
      await fetchTasks();
    } catch (error: any) {
      console.error('Error updating task:', error);
      alert(error.response?.data?.error || '更新任務失敗');
    } finally {
      setCreatingTask(false);
    }
  };

  const handleDeleteTask = async (taskId: string, taskTitle: string) => {
    if (!confirm(`確定要刪除任務「${taskTitle}」嗎？`)) {
      return;
    }
    
    try {
      await taskApi.delete(taskId);
      await fetchTasks();
    } catch (error: any) {
      console.error('Error deleting task:', error);
      alert(error.response?.data?.error || '刪除任務失敗');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getColumns = () => {
    // 檢查是否選擇了特定專案或負責人（此時會按狀態分組）
    const isFiltered = (groupBy === 'initiative' && selectedInitiativeId) || 
                       (groupBy === 'assignee' && selectedAssigneeId);
    
    if (groupBy === 'status' || isFiltered) {
      // 按狀態分組
      return [
        { id: 'todo', title: '待處理', tasks: tasks.todo || [] },
        { id: 'in_progress', title: '進行中', tasks: tasks.in_progress || [] },
        { id: 'review', title: '待審核', tasks: tasks.review || [] },
        { id: 'done', title: '已完成', tasks: tasks.done || [] },
      ];
    } else if (groupBy === 'initiative') {
      // 依策略專案分組（顯示所有專案）
      return Object.entries(tasks as any)
        .filter(([key]) => key !== 'todo' && key !== 'in_progress' && key !== 'review' && key !== 'done')
        .map(([key, value]) => ({
          id: key,
          title: key,
          tasks: Array.isArray(value) ? value : [],
        }));
    } else if (groupBy === 'assignee') {
      // 依負責人分組（顯示所有負責人）
      return Object.entries(tasks as any)
        .filter(([key]) => key !== 'todo' && key !== 'in_progress' && key !== 'review' && key !== 'done')
        .map(([key, value]) => ({
          id: key,
          title: key,
          tasks: Array.isArray(value) ? value : [],
        }));
    } else {
      // priority
      return [
        { id: 'urgent', title: '緊急', tasks: (tasks as any).urgent || [] },
        { id: 'high', title: '高', tasks: (tasks as any).high || [] },
        { id: 'medium', title: '中', tasks: (tasks as any).medium || [] },
        { id: 'low', title: '低', tasks: (tasks as any).low || [] },
      ];
    }
  };

  const columns = getColumns();

  if (loading) {
    return <div className="p-8">載入中...</div>;
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Kanban 看板</h1>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-600">分組方式：</label>
              <select
                value={groupBy}
                onChange={(e) => {
                  setGroupBy(e.target.value as any);
                  // 切換分組方式時清空選擇
                  setSelectedInitiativeId('');
                  setSelectedAssigneeId('');
                }}
                className="border rounded px-3 py-1 text-sm"
              >
                <option value="status">依狀態</option>
                <option value="initiative">依策略專案</option>
                <option value="assignee">依負責人</option>
                <option value="priority">依優先級</option>
              </select>
            </div>

            {/* 當選擇「依策略專案」時，顯示專案選擇器 */}
            {groupBy === 'initiative' && (
              <div className="flex items-center space-x-2">
                <label className="text-sm text-gray-600">選擇專案：</label>
                <select
                  value={selectedInitiativeId}
                  onChange={(e) => setSelectedInitiativeId(e.target.value)}
                  className="border rounded px-3 py-1 text-sm"
                >
                  <option value="">全部專案</option>
                  {initiatives.map((initiative) => (
                    <option key={initiative.id} value={initiative.id}>
                      {initiative.name_zh}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* 當選擇「依負責人」時，顯示負責人選擇器 */}
            {groupBy === 'assignee' && (
              <div className="flex items-center space-x-2">
                <label className="text-sm text-gray-600">選擇負責人：</label>
                <select
                  value={selectedAssigneeId}
                  onChange={(e) => setSelectedAssigneeId(e.target.value)}
                  className="border rounded px-3 py-1 text-sm"
                >
                  <option value="">全部負責人</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.full_name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={() => setShowNewTaskModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              ➕ 新增任務
            </button>
          </div>
        </div>

        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid gap-6 grid-cols-1 md:grid-cols-4">
            {columns.map((column) => (
              <div key={column.id} className="bg-gray-50 rounded-lg p-4">
                <h2 className="font-semibold mb-4">
                  {column.title} ({column.tasks.length})
                </h2>
                <Droppable droppableId={column.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`min-h-[200px] ${
                        snapshot.isDraggingOver ? 'bg-blue-50' : ''
                      }`}
                    >
                      {column.tasks.map((task: any, index: number) => (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`bg-white rounded-lg shadow p-3 mb-3 ${
                                snapshot.isDragging ? 'shadow-lg' : ''
                              }`}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <h3 className="font-medium text-sm flex-1 line-clamp-2">{task.title}</h3>
                                <div className="flex gap-1 ml-2">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEditTask(task);
                                    }}
                                    className="text-blue-600 hover:text-blue-800 text-xs px-1"
                                    title="編輯"
                                  >
                                    編輯
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteTask(task.id, task.title);
                                    }}
                                    className="text-red-600 hover:text-red-800 text-xs px-1"
                                    title="刪除"
                                  >
                                    刪除
                                  </button>
                                </div>
                              </div>
                              <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                                <span className="truncate">{task.assignee_name || '未指派'}</span>
                                <span
                                  className={`px-1.5 py-0.5 rounded text-xs ${getPriorityColor(
                                    task.priority
                                  )}`}
                                >
                                  {task.priority === 'urgent' ? '緊急' : task.priority === 'high' ? '高' : task.priority === 'medium' ? '中' : '低'}
                                </span>
                              </div>
                              {task.due_date && (
                                <p className="text-xs text-gray-500 mb-1">
                                  {new Date(task.due_date).toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit' })}
                                </p>
                              )}
                              <div className="mt-1.5 pt-1.5 border-t border-gray-100">
                                <TracePath taskId={task.id} type="up" />
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </DragDropContext>

        {/* 編輯任務模態框 */}
        {showEditTaskModal && editingTask && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold mb-4">編輯任務</h2>
              <form onSubmit={handleUpdateTask} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    任務標題 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    任務描述
                  </label>
                  <textarea
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      任務類型 <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={newTask.task_type}
                      onChange={(e) => setNewTask({ ...newTask, task_type: e.target.value as any })}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="routine">例行</option>
                      <option value="project">專案</option>
                      <option value="incident">事件</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      優先級 <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={newTask.priority}
                      onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as any })}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="low">低</option>
                      <option value="medium">中</option>
                      <option value="high">高</option>
                      <option value="urgent">緊急</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    負責人 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newTask.assignee_id}
                    onChange={(e) => setNewTask({ ...newTask, assignee_id: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">請選擇</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.full_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    截止日期
                  </label>
                  <input
                    type="date"
                    value={newTask.due_date}
                    onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      經費來源
                    </label>
                    <select
                      value={newTask.funding_source}
                      onChange={(e) => setNewTask({ ...newTask, funding_source: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">請選擇</option>
                      {fundingSources.map((source) => (
                        <option key={source.id} value={source.value}>
                          {source.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      金額
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={newTask.amount}
                      onChange={(e) => setNewTask({ ...newTask, amount: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="輸入金額"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    關聯策略專案 <span className="text-gray-500 text-xs">(步驟 1)</span>
                  </label>
                  <select
                    value={newTask.initiative_id}
                    onChange={(e) => handleInitiativeChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">請先選擇策略專案</option>
                    {initiatives.map((initiative) => (
                      <option key={initiative.id} value={initiative.id}>
                        {initiative.name_zh}
                      </option>
                    ))}
                  </select>
                </div>

                {newTask.initiative_id && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      選擇 OKR (Objective) <span className="text-gray-500 text-xs">(步驟 2)</span>
                    </label>
                    <select
                      value={newTask.okr_id}
                      onChange={(e) => handleOKRChange(e.target.value)}
                      disabled={loadingOkrs || !newTask.initiative_id}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                    >
                      <option value="">
                        {loadingOkrs ? '載入中...' : okrs.length === 0 ? '該策略專案尚無 OKR' : '請選擇 OKR'}
                      </option>
                      {okrs.map((okr) => (
                        <option key={okr.id} value={okr.id}>
                          {okr.objective} ({okr.quarter})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {newTask.okr_id && keyResults.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      選擇 Key Result (KR) <span className="text-gray-500 text-xs">(步驟 3)</span>
                    </label>
                    <select
                      value={newTask.kr_id}
                      onChange={(e) => {
                        const krId = e.target.value;
                        const kr = keyResults.find((k) => k.id === krId);
                        setSelectedKR(kr || null);
                        setNewTask({ ...newTask, kr_id: krId, kr_contribution_value: 0 });
                      }}
                      disabled={loadingKrs || !newTask.okr_id}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                    >
                      <option value="">
                        {loadingKrs ? '載入中...' : keyResults.length === 0 ? '該 OKR 尚無 Key Result' : '請選擇 Key Result'}
                      </option>
                      {keyResults.map((kr) => (
                        <option key={kr.id} value={kr.id}>
                          {kr.description.substring(0, 70)}{kr.description.length > 70 ? '...' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {selectedKR && newTask.kr_id && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      KR 貢獻值 <span className="text-gray-500 text-xs">(步驟 4)</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={newTask.kr_contribution_value || 0}
                      onChange={(e) => setNewTask({ ...newTask, kr_contribution_value: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="輸入貢獻值"
                    />
                    <p className="text-xs text-gray-500 mt-1">請輸入此任務對 KR 的貢獻值（單位：{selectedKR.unit || '無單位'}）</p>
                    <p className="text-xs text-gray-500 mt-1">
                      所有相關任務的貢獻值會自動加總到 KR 的 current_value
                    </p>
                  </div>
                )}

                {/* 佐證資料 */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      佐證資料
                    </label>
                    <button
                      type="button"
                      onClick={() => setEvidenceItems([...evidenceItems, { description: '', url: '' }])}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      + 新增佐證
                    </button>
                  </div>
                  <div className="space-y-3">
                    {evidenceItems.map((item, index) => (
                      <div key={index} className="flex gap-2 items-start">
                        <div className="flex-1 space-y-2">
                          <input
                            type="text"
                            placeholder="佐證說明"
                            value={item.description}
                            onChange={(e) => {
                              const newItems = [...evidenceItems];
                              newItems[index].description = e.target.value;
                              setEvidenceItems(newItems);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          />
                          <input
                            type="url"
                            placeholder="Google Drive 網址"
                            value={item.url}
                            onChange={(e) => {
                              const newItems = [...evidenceItems];
                              newItems[index].url = e.target.value;
                              setEvidenceItems(newItems);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const newItems = evidenceItems.filter((_, i) => i !== index);
                            setEvidenceItems(newItems.length > 0 ? newItems : [{ description: '', url: '' }]);
                          }}
                          className="text-red-600 hover:text-red-800 px-2 py-1 text-sm"
                        >
                          刪除
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditTaskModal(false);
                      setEditingTask(null);
                      setEvidenceItems([{ description: '', url: '' }]);
                      setNewTask({
                        title: '',
                        description: '',
                        task_type: 'routine',
                        priority: 'medium',
                        assignee_id: '',
                        due_date: '',
                        initiative_id: '',
                        okr_id: '',
                        kr_id: '',
                        kr_contribution_value: 0,
                        funding_source: '',
                        amount: '',
                      });
                      setSelectedKR(null);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={creatingTask}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {creatingTask ? '更新中...' : '更新任務'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 新增任務模態框 */}
        {showNewTaskModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold mb-4">新增任務</h2>
              <form onSubmit={handleCreateTask} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    任務標題 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    任務描述
                  </label>
                  <textarea
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      任務類型 <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={newTask.task_type}
                      onChange={(e) => setNewTask({ ...newTask, task_type: e.target.value as any })}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="routine">例行</option>
                      <option value="project">專案</option>
                      <option value="incident">事件</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      優先級 <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={newTask.priority}
                      onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as any })}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="low">低</option>
                      <option value="medium">中</option>
                      <option value="high">高</option>
                      <option value="urgent">緊急</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    負責人 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newTask.assignee_id}
                    onChange={(e) => setNewTask({ ...newTask, assignee_id: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">請選擇</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.full_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    截止日期
                  </label>
                  <input
                    type="date"
                    value={newTask.due_date}
                    onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      經費來源
                    </label>
                    <select
                      value={newTask.funding_source}
                      onChange={(e) => setNewTask({ ...newTask, funding_source: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">請選擇</option>
                      {fundingSources.map((source) => (
                        <option key={source.id} value={source.value}>
                          {source.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      金額
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={newTask.amount}
                      onChange={(e) => setNewTask({ ...newTask, amount: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="輸入金額"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    關聯策略專案 <span className="text-gray-500 text-xs">(步驟 1)</span>
                  </label>
                  <select
                    value={newTask.initiative_id}
                    onChange={(e) => handleInitiativeChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">請先選擇策略專案</option>
                    {initiatives.map((initiative) => (
                      <option key={initiative.id} value={initiative.id}>
                        {initiative.name_zh}
                      </option>
                    ))}
                  </select>
                </div>

                {newTask.initiative_id && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      選擇 OKR (Objective) <span className="text-gray-500 text-xs">(步驟 2)</span>
                    </label>
                    <select
                      value={newTask.okr_id}
                      onChange={(e) => handleOKRChange(e.target.value)}
                      disabled={loadingOkrs}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      <option value="">
                        {loadingOkrs ? '載入中...' : okrs.length === 0 ? '該策略專案尚無 OKR' : '請選擇 OKR'}
                      </option>
                      {okrs.map((okr) => (
                        <option key={okr.id} value={okr.id}>
                          {okr.quarter} - {okr.objective.substring(0, 60)}{okr.objective.length > 60 ? '...' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {newTask.okr_id && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        選擇 Key Result <span className="text-gray-500 text-xs">(步驟 3)</span>
                      </label>
                      <select
                        value={newTask.kr_id}
                        onChange={(e) => handleKRChange(e.target.value)}
                        disabled={loadingKrs}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      >
                        <option value="">
                          {loadingKrs ? '載入中...' : keyResults.length === 0 ? '該 OKR 尚無 Key Result' : '請選擇 Key Result'}
                        </option>
                        {keyResults.map((kr) => (
                          <option key={kr.id} value={kr.id}>
                            {kr.description.substring(0, 70)}{kr.description.length > 70 ? '...' : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedKR && (
                      <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                        <div className="text-sm text-gray-700 mb-2">
                          <p className="font-medium">目標值：{selectedKR.target_value || 0} {selectedKR.unit || ''}</p>
                          <p className="text-xs text-gray-500 mt-1">請輸入此任務對 KR 的貢獻值（單位：{selectedKR.unit || '無單位'}）</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            KR 貢獻值 <span className="text-red-500">*</span>
                          </label>
                          <div className="flex items-center space-x-2">
                            <input
                              type="number"
                              value={newTask.kr_contribution_value || 0}
                              onChange={(e) => setNewTask({ ...newTask, kr_contribution_value: parseFloat(e.target.value) || 0 })}
                              min="0"
                              step="0.01"
                              required
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="輸入貢獻值"
                            />
                            <span className="text-sm text-gray-600">{selectedKR.unit || ''}</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            所有相關任務的貢獻值會自動加總到 KR 的 current_value
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                )}

                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewTaskModal(false);
                      setNewTask({
                        title: '',
                        description: '',
                        task_type: 'routine',
                        priority: 'medium',
                        assignee_id: '',
                        due_date: '',
                        initiative_id: '',
                        okr_id: '',
                        kr_id: '',
                        kr_contribution_value: 0,
                        funding_source: '',
                        amount: '',
                      });
                      setOkrs([]);
                      setKeyResults([]);
                      setSelectedKR(null);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={creatingTask}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {creatingTask ? '建立中...' : '建立任務'}
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

