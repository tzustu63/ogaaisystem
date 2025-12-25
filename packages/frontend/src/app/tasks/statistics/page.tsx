'use client';

import { useEffect, useState } from 'react';
import { taskApi, userApi } from '@/lib/api';
import ReactECharts from 'echarts-for-react';
import Link from 'next/link';

interface User {
  id: string;
  full_name: string;
  username: string;
}

interface TaskStatistics {
  user_id: string;
  user_name: string;
  username: string;
  completed_count: number;
  pending_count: number;
  total_count: number;
  completed_in_range: number;
}

interface DailyStat {
  date: string;
  count: number;
  user_id: string;
  user_name: string;
}

export default function TaskStatisticsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });
  const [statistics, setStatistics] = useState<TaskStatistics[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStat[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    fetchStatistics();
  }, [selectedUserIds, dateRange]);

  const fetchUsers = async () => {
    try {
      const res = await userApi.getUsers();
      setUsers(res.data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchStatistics = async () => {
    setLoading(true);
    try {
      const params: any = {
        start_date: dateRange.start,
        end_date: dateRange.end,
      };
      
      if (selectedUserIds.length > 0) {
        params.assignee_ids = selectedUserIds;
      }
      
      const res = await taskApi.getStatistics(params);
      setStatistics(res.data.summary || []);
      setDailyStats(res.data.daily || []);
    } catch (error) {
      console.error('Error fetching statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUserToggle = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    if (selectedUserIds.length === users.length) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(users.map((u) => u.id));
    }
  };

  // 圖表選項 - 完成數量對比
  const getComparisonChartOption = () => {
    const userNames = statistics.map((s) => s.user_name || s.username);
    const completedCounts = statistics.map((s) => s.completed_count);
    const pendingCounts = statistics.map((s) => s.pending_count);

    return {
      title: {
        text: '任務完成狀況對比',
        left: 'center',
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
      },
      legend: {
        data: ['已完成', '進行中'],
        top: 30,
      },
      xAxis: {
        type: 'category',
        data: userNames,
        axisLabel: {
          rotate: 45,
        },
      },
      yAxis: {
        type: 'value',
        name: '任務數量',
      },
      series: [
        {
          name: '已完成',
          type: 'bar',
          data: completedCounts,
          itemStyle: { color: '#10b981' },
        },
        {
          name: '進行中',
          type: 'bar',
          data: pendingCounts,
          itemStyle: { color: '#f59e0b' },
        },
      ],
    };
  };

  // 圖表選項 - 每日完成趨勢
  const getDailyTrendChartOption = () => {
    // 按日期分組，統計每日總完成數
    const dailyMap = new Map<string, number>();
    dailyStats.forEach((stat) => {
      const count = dailyMap.get(stat.date) || 0;
      dailyMap.set(stat.date, count + stat.count);
    });

    const dates = Array.from(dailyMap.keys()).sort();
    const counts = dates.map((date) => dailyMap.get(date) || 0);

    return {
      title: {
        text: '每日完成任務趨勢',
        left: 'center',
      },
      tooltip: {
        trigger: 'axis',
      },
      xAxis: {
        type: 'category',
        data: dates.map((d) => new Date(d).toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit' })),
      },
      yAxis: {
        type: 'value',
        name: '完成數量',
      },
      series: [
        {
          name: '完成數量',
          type: 'line',
          data: counts,
          smooth: true,
          itemStyle: { color: '#3b82f6' },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(59, 130, 246, 0.3)' },
                { offset: 1, color: 'rgba(59, 130, 246, 0.1)' },
              ],
            },
          },
        },
      ],
    };
  };

  const totalCompleted = statistics.reduce((sum, s) => sum + s.completed_count, 0);
  const totalPending = statistics.reduce((sum, s) => sum + s.pending_count, 0);
  const totalTasks = statistics.reduce((sum, s) => sum + s.total_count, 0);
  const completionRate = totalTasks > 0 ? ((totalCompleted / totalTasks) * 100).toFixed(1) : '0';

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* 麵包屑 */}
        <nav className="mb-6">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Link href="/dashboard" className="hover:text-gray-900">
              戰略儀表板
            </Link>
            <span>/</span>
            <span className="text-gray-900">任務統計</span>
          </div>
        </nav>

        <h1 className="text-3xl font-bold mb-6">任務完成統計</h1>

        {/* 篩選器 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">篩選條件</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 用戶選擇 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                選擇人員（可複選）
              </label>
              <div className="border rounded-md p-3 max-h-48 overflow-y-auto">
                <button
                  onClick={handleSelectAll}
                  className="text-sm text-blue-600 hover:text-blue-800 mb-2"
                >
                  {selectedUserIds.length === users.length ? '取消全選' : '全選'}
                </button>
                <div className="space-y-2">
                  {users.map((user) => (
                    <label key={user.id} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedUserIds.includes(user.id)}
                        onChange={() => handleUserToggle(user.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm">{user.full_name || user.username}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* 日期選擇 */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  開始日期
                </label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                  className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  結束日期
                </label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                  className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 統計摘要 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-600 text-sm">總任務數</p>
            <p className="text-2xl font-bold">{totalTasks}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-600 text-sm">已完成</p>
            <p className="text-2xl font-bold text-green-600">{totalCompleted}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-600 text-sm">進行中</p>
            <p className="text-2xl font-bold text-yellow-600">{totalPending}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-600 text-sm">完成率</p>
            <p className="text-2xl font-bold text-blue-600">{completionRate}%</p>
          </div>
        </div>

        {/* 圖表 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <ReactECharts
              option={getComparisonChartOption()}
              style={{ height: '400px' }}
            />
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <ReactECharts
              option={getDailyTrendChartOption()}
              style={{ height: '400px' }}
            />
          </div>
        </div>

        {/* 詳細表格 */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">詳細統計</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    人員
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    總任務數
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    已完成
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    進行中
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    期間完成
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    完成率
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      載入中...
                    </td>
                  </tr>
                ) : statistics.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      無資料
                    </td>
                  </tr>
                ) : (
                  statistics.map((stat) => {
                    const rate = stat.total_count > 0 
                      ? ((stat.completed_count / stat.total_count) * 100).toFixed(1)
                      : '0';
                    return (
                      <tr key={stat.user_id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {stat.user_name || stat.username}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {stat.total_count}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                          {stat.completed_count}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-600">
                          {stat.pending_count}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                          {stat.completed_in_range}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {rate}%
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

