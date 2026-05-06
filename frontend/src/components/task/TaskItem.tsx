/**
 * 任务项组件
 * 
 * 显示单个任务的信息和操作按钮
 */

import React, { useState } from 'react'
import type { Task } from '../../types/task'
import { TaskStatus, TaskStatusLabels, TaskStatusColors, TaskTypeLabels } from '../../types/task'
import { useTaskStore } from '../../stores/taskStore'
import toast from 'react-hot-toast'

interface TaskItemProps {
  task: Task
  isSelected: boolean
  onClick: () => void
}

const TaskItem: React.FC<TaskItemProps> = ({ task, isSelected, onClick }) => {
  const [isOperating, setIsOperating] = useState(false)
  const { retryTaskAction, cancelTaskAction, deleteTaskAction } = useTaskStore()

  // 格式化时间
  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    
    // 小于1分钟
    if (diff < 60000) {
      return '刚刚'
    }
    
    // 小于1小时
    if (diff < 3600000) {
      return `${Math.floor(diff / 60000)}分钟前`
    }
    
    // 小于24小时
    if (diff < 86400000) {
      return `${Math.floor(diff / 3600000)}小时前`
    }
    
    // 其他
    return date.toLocaleDateString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // 处理重试
  const handleRetry = async (e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (task.retryCount >= task.maxRetries) {
      toast.error('已达到最大重试次数')
      return
    }
    
    setIsOperating(true)
    try {
      await retryTaskAction(task.id)
      toast.success('任务已重新启动')
    } catch (error) {
      toast.error('重试失败')
    } finally {
      setIsOperating(false)
    }
  }

  // 处理取消
  const handleCancel = async (e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (!confirm('确定要取消此任务吗？')) {
      return
    }
    
    setIsOperating(true)
    try {
      await cancelTaskAction(task.id)
      toast.success('任务已取消')
    } catch (error) {
      toast.error('取消失败')
    } finally {
      setIsOperating(false)
    }
  }

  // 处理删除
  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (!confirm('确定要删除此任务吗？')) {
      return
    }
    
    setIsOperating(true)
    try {
      await deleteTaskAction(task.id)
      toast.success('任务已删除')
    } catch (error) {
      toast.error('删除失败')
    } finally {
      setIsOperating(false)
    }
  }

  // 获取状态图标
  const getStatusIcon = () => {
    switch (task.status) {
      case TaskStatus.PENDING:
        return (
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case TaskStatus.RUNNING:
        return (
          <svg className="w-5 h-5 text-blue-500 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        )
      case TaskStatus.COMPLETED:
        return (
          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case TaskStatus.FAILED:
        return (
          <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case TaskStatus.CANCELLED:
        return (
          <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
    }
  }

  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-lg border transition-all cursor-pointer ${
        isSelected
          ? 'border-blue-500 bg-blue-50 shadow-sm'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
      }`}
    >
      <div className="flex items-start gap-4">
        {/* 状态图标 */}
        <div className="flex-shrink-0 mt-0.5">
          {getStatusIcon()}
        </div>

        {/* 主内容 */}
        <div className="flex-1 min-w-0">
          {/* 标题行 */}
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-gray-900">
              {TaskTypeLabels[task.type]}
            </span>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${TaskStatusColors[task.status]}`}>
              {TaskStatusLabels[task.status]}
            </span>
          </div>

          {/* 进度条 */}
          {(task.status === TaskStatus.RUNNING || task.status === TaskStatus.PENDING) && (
            <div className="mb-2">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                <span>{task.current || '准备中...'}</span>
                <span>{task.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div
                  className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${task.progress}%` }}
                />
              </div>
            </div>
          )}

          {/* 错误信息 */}
          {task.status === TaskStatus.FAILED && task.error && (
            <div className="mb-2 p-2 bg-red-50 rounded text-sm text-red-700">
              {task.error}
            </div>
          )}

          {/* 元信息 */}
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>ID: {task.id.slice(0, 8)}...</span>
            <span>创建于 {formatTime(task.createdAt)}</span>
            {task.startedAt && (
              <span>开始于 {formatTime(task.startedAt)}</span>
            )}
            {task.completedAt && (
              <span>完成于 {formatTime(task.completedAt)}</span>
            )}
            {task.retryCount > 0 && (
              <span className="text-yellow-600">
                重试 {task.retryCount}/{task.maxRetries} 次
              </span>
            )}
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex-shrink-0 flex items-center gap-2">
          {task.status === TaskStatus.FAILED && task.retryCount < task.maxRetries && (
            <button
              onClick={handleRetry}
              disabled={isOperating}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              重试
            </button>
          )}
          
          {task.status === TaskStatus.RUNNING && (
            <button
              onClick={handleCancel}
              disabled={isOperating}
              className="px-3 py-1 text-sm bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              取消
            </button>
          )}
          
          {(task.status === TaskStatus.COMPLETED || 
            task.status === TaskStatus.FAILED || 
            task.status === TaskStatus.CANCELLED) && (
            <button
              onClick={handleDelete}
              disabled={isOperating}
              className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              删除
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default TaskItem
