/**
 * 任务统计组件
 * 
 * 显示任务状态统计卡片
 */

import React from 'react'
import { useTaskStore } from '../../stores/taskStore'
import { TaskStatus, TaskStatusLabels } from '../../types/task'

const TaskStats: React.FC = () => {
  const { stats, setFilter } = useTaskStore()

  // 统计项配置
  const statItems = [
    {
      key: 'total',
      label: '总任务',
      value: stats.total,
      color: 'bg-gray-500',
      status: 'all' as const,
    },
    {
      key: 'pending',
      label: TaskStatusLabels[TaskStatus.PENDING],
      value: stats.pending,
      color: 'bg-gray-400',
      status: TaskStatus.PENDING,
    },
    {
      key: 'running',
      label: TaskStatusLabels[TaskStatus.RUNNING],
      value: stats.running,
      color: 'bg-blue-500',
      status: TaskStatus.RUNNING,
    },
    {
      key: 'completed',
      label: TaskStatusLabels[TaskStatus.COMPLETED],
      value: stats.completed,
      color: 'bg-green-500',
      status: TaskStatus.COMPLETED,
    },
    {
      key: 'failed',
      label: TaskStatusLabels[TaskStatus.FAILED],
      value: stats.failed,
      color: 'bg-red-500',
      status: TaskStatus.FAILED,
    },
    {
      key: 'cancelled',
      label: TaskStatusLabels[TaskStatus.CANCELLED],
      value: stats.cancelled,
      color: 'bg-yellow-500',
      status: TaskStatus.CANCELLED,
    },
  ]

  // 处理点击统计项
  const handleStatClick = (status: 'all' | TaskStatus) => {
    setFilter({ status })
  }

  return (
    <div className="px-4 py-4 bg-gray-50 border-b border-gray-200">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {statItems.map(item => (
          <div
            key={item.key}
            onClick={() => handleStatClick(item.status)}
            className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">{item.label}</span>
              <div className={`w-2 h-2 rounded-full ${item.color}`} />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {item.value.toLocaleString()}
            </div>
            {stats.total > 0 && item.key !== 'total' && (
              <div className="text-xs text-gray-500 mt-1">
                {((item.value / stats.total) * 100).toFixed(1)}%
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 按类型统计 */}
      {Object.keys(stats.byType).length > 0 && (
        <div className="mt-4 bg-white rounded-lg p-4 shadow-sm border border-gray-100">
          <h3 className="text-sm font-medium text-gray-700 mb-3">按类型统计</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {Object.entries(stats.byType).map(([type, count]) => (
              <div
                key={type}
                className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded"
              >
                <span className="text-sm text-gray-600 truncate">{type}</span>
                <span className="text-sm font-medium text-gray-900 ml-2">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default TaskStats
