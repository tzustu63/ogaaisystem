'use client';

import { useEffect, useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import api from '@/lib/api';
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
  const [groupBy, setGroupBy] = useState<'status' | 'department' | 'project' | 'priority'>('status');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTasks();
  }, [groupBy]);

  const fetchTasks = async () => {
    try {
      const params: any = {};
      if (groupBy !== 'status') {
        params.groupBy = groupBy;
      }
      const res = await api.get('/tasks/kanban/board', { params });
      
      if (groupBy === 'status') {
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

    // 如果分組方式不是狀態，則不允許拖曳
    if (groupBy !== 'status') {
      alert('僅在「依狀態」分組時可拖曳任務');
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
      await api.patch(`/tasks/${draggableId}/status`, {
        status: destination.droppableId,
      });
    } catch (error) {
      console.error('Error updating task status:', error);
      // 回滾
      fetchTasks();
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
    if (groupBy === 'status') {
      return [
        { id: 'todo', title: '待處理', tasks: tasks.todo },
        { id: 'in_progress', title: '進行中', tasks: tasks.in_progress },
        { id: 'review', title: '待審核', tasks: tasks.review },
        { id: 'done', title: '已完成', tasks: tasks.done },
      ];
    } else if (groupBy === 'department') {
      return Object.entries(tasks as any)
        .filter(([key]) => key !== 'todo' && key !== 'in_progress' && key !== 'review' && key !== 'done')
        .map(([key, value]) => ({
          id: key,
          title: key,
          tasks: Array.isArray(value) ? value : [],
        }));
    } else if (groupBy === 'project') {
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
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-600">分組方式：</label>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as any)}
              className="border rounded px-3 py-1 text-sm"
            >
              <option value="status">依狀態</option>
              <option value="department">依單位</option>
              <option value="project">依專案</option>
              <option value="priority">依優先級</option>
            </select>
          </div>
        </div>

        <DragDropContext onDragEnd={onDragEnd}>
          <div className={`grid gap-6 ${
            groupBy === 'status' || groupBy === 'priority' 
              ? 'grid-cols-1 md:grid-cols-4' 
              : 'grid-cols-1 md:grid-cols-3'
          }`}>
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
                              className={`bg-white rounded-lg shadow p-4 mb-3 ${
                                snapshot.isDragging ? 'shadow-lg' : ''
                              }`}
                            >
                              <Link href={`/kanban?task=${task.id}`}>
                                <h3 className="font-medium mb-2 hover:text-blue-600">{task.title}</h3>
                              </Link>
                              <div className="flex items-center justify-between text-sm text-gray-600">
                                <span>{task.assignee_name}</span>
                                <span
                                  className={`px-2 py-1 rounded text-xs ${getPriorityColor(
                                    task.priority
                                  )}`}
                                >
                                  {task.priority}
                                </span>
                              </div>
                              {task.due_date && (
                                <p className="text-xs text-gray-500 mt-2">
                                  截止：{new Date(task.due_date).toLocaleDateString('zh-TW')}
                                </p>
                              )}
                              <div className="mt-2 pt-2 border-t">
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
      </div>
    </div>
  );
}

