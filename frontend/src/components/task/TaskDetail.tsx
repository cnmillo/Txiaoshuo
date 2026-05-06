/**
 * 任务详情组件
 * 
 * 显示任务的详细信息、执行日志和恢复建议
 */

import React, { useState, useEffect } from 'react'
import type { Task, TaskLog, TaskRecoverySuggestion } from '../../types/task'
import { TaskStatus, TaskStatusLabels, TaskStatusColors, TaskTypeLabels } from '../../types/task'
import { useTaskStore } from '../../stores/taskStore'
import toast from 'react-hot-toast'

interface TaskRecoveryProps {
  task: Task
  suggestions: TaskRecoverySuggestion[]
  onRetry: () => void
}

const TaskRecovery: React.FC<TaskRecoveryProps> = ({ task, suggestions, onRetry }) => {
  const getSuggestionIcon = (type: TaskRecoverySuggestion['type']) => {
    switch (type) {
      case 'retry':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        )
      case 'modify_params':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        )
      case 'check_config':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        )
      case 'contact_support':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        )
    }
  }

  const getPriorityStyle = (priority: TaskRecoverySuggestion['priority']) => {
    switch (priority) {
      case 'high':
        return 'border-red-200 bg-red-50'
      case 'medium':
        return 'border-yellow-200 bg-yellow-50'
      case 'low':
        return 'border-gray-200 bg-gray-50'
    }
  }

  const getPriorityLabel = (priority: TaskRecoverySuggestion['priority']) => {
    switch (priority) {
      case 'high':
        return <span className="text-xs text-red-600 font-medium">高优先级</span>
      case 'medium':
        return <span className="text-xs text-yellow-600 font-medium">中优先级</span>
      case 'low':
        return <span className="text-xs text-gray-600 font-medium">低优先级</span>
    }
  }

  return (
    <div className="space-y-6">
      <div className="p-4 bg-red-50 rounded-lg border border-red-200">
        <div className="flex items-start gap-3">
          <svg className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 className="text-sm font-medium text-red-800">任务执行失败</h3>
            <p className="text-sm text-red-700 mt-1">
              {TaskTypeLabels[task.type]} 任务在执行过程中遇到错误
            </p>
            {task.error && (
              <p className="text-sm text-red-600 mt-2 font-mono">
                {String(task.error)}
              </p>
            )}
            <div className="mt-3 flex items-center gap-4 text-sm text-red-700">
              <span>重试次数: {task.retryCount}/{task.maxRetries}</span>
              {task.retryCount < task.maxRetries && (
                <button
                  onClick={onRetry}
                  className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  立即重试
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {suggestions.length > 0 ? (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">恢复建议</h3>
          <div className="space-y-3">
            {suggestions.map(suggestion => (
              <div
                key={suggestion.id}
                className={`p-4 rounded-lg border ${getPriorityStyle(suggestion.priority)}`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 text-gray-500">
                    {getSuggestionIcon(suggestion.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm font-medium text-gray-900">
                        {suggestion.title}
                      </h4>
                      {getPriorityLabel(suggestion.priority)}
                    </div>
                    <p className="text-sm text-gray-600">
                      {suggestion.description}
                    </p>
                    {suggestion.action && (
                      <div className="mt-2 p-2 bg-white rounded border border-gray-200">
                        <p className="text-sm text-gray-700">
                          <span className="font-medium">建议操作: </span>
                          {suggestion.action}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <svg className="w-12 h-12 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <p>暂无恢复建议</p>
          <p className="text-sm mt-1">请尝试重试任务或检查配置</p>
        </div>
      )}
    </div>
  )
}

interface TaskDetailProps {
  task: Task
  onClose: () => void
}

const TaskDetail: React.FC<TaskDetailProps> = ({ task, onClose }) => {
  const [activeTab, setActiveTab] = useState<'info' | 'logs' | 'recovery'>('info')
  const {
    taskLogs,
    recoverySuggestions,
    fetchTaskLogs,
    fetchRecoverySuggestions,
    retryTaskAction,
    cancelTaskAction,
    deleteTaskAction,
  } = useTaskStore()
  const [isOperating, setIsOperating] = useState(false)

  // 加载日志和恢复建议
  useEffect(() => {
    if (activeTab === 'logs') {
      fetchTaskLogs(task.id)
    } else if (activeTab === 'recovery' && task.status === TaskStatus.FAILED) {
      fetchRecoverySuggestions(task.id)
    }
  }, [activeTab, task.id, task.status, fetchTaskLogs, fetchRecoverySuggestions])

  // 格式化时间
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  // 计算执行时长
  const calculateDuration = () => {
    if (!task.startedAt) return '-'
    
    const start = new Date(task.startedAt).getTime()
    const end = task.completedAt
      ? new Date(task.completedAt).getTime()
      : Date.now()
    
    const duration = Math.floor((end - start) / 1000)
    
    if (duration < 60) {
      return `${duration}秒`
    } else if (duration < 3600) {
      return `${Math.floor(duration / 60)}分${duration % 60}秒`
    } else {
      const hours = Math.floor(duration / 3600)
      const minutes = Math.floor((duration % 3600) / 60)
      return `${hours}小时${minutes}分`
    }
  }

  // 处理重试
  const handleRetry = async () => {
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
  const handleCancel = async () => {
    if (!confirm('确定要取消此任务吗？')) return
    
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
  const handleDelete = async () => {
    if (!confirm('确定要删除此任务吗？')) return
    
    setIsOperating(true)
    try {
      await deleteTaskAction(task.id)
      toast.success('任务已删除')
      onClose()
    } catch (error) {
      toast.error('删除失败')
    } finally {
      setIsOperating(false)
    }
  }

  // 获取日志级别样式
  const getLogLevelStyle = (level: TaskLog['level']) => {
    switch (level) {
      case 'error':
        return 'text-red-600 bg-red-50'
      case 'warning':
        return 'text-yellow-600 bg-yellow-50'
      case 'info':
        return 'text-blue-600 bg-blue-50'
      case 'debug':
        return 'text-gray-600 bg-gray-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-xl bg-white shadow-xl z-50 flex flex-col">
      {/* 头部 */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">任务详情</h2>
          <p className="text-sm text-gray-500 mt-1">
            {TaskTypeLabels[task.type]} - {task.id.slice(0, 8)}...
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* 标签页 */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('info')}
          className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'info'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          基本信息
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'logs'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          执行日志
        </button>
        {task.status === TaskStatus.FAILED && (
          <button
            onClick={() => setActiveTab('recovery')}
            className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'recovery'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            恢复建议
          </button>
        )}
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-auto p-6">
        {activeTab === 'info' ? (
          <div className="space-y-6">
            {/* 状态 */}
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">状态</h3>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${TaskStatusColors[task.status]}`}>
                {TaskStatusLabels[task.status]}
              </span>
            </div>

            {/* 进度 */}
            {(task.status === TaskStatus.RUNNING || task.status === TaskStatus.PENDING) ? (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">进度</h3>
                <div className="mb-2">
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                    <span>{task.current ? String(task.current) : '准备中...'}</span>
                    <span>{task.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${task.progress}%` }}
                    />
                  </div>
                </div>
                {task.total ? (
                  <p className="text-sm text-gray-500">
                    总计: {String(task.total)} 项
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">任务ID</h3>
                <p className="text-sm text-gray-900 font-mono">{task.id}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">任务类型</h3>
                <p className="text-sm text-gray-900">{TaskTypeLabels[task.type]}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">创建时间</h3>
                <p className="text-sm text-gray-900">{formatTime(task.createdAt)}</p>
              </div>
              {task.startedAt && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">开始时间</h3>
                  <p className="text-sm text-gray-900">{formatTime(task.startedAt)}</p>
                </div>
              )}
              {task.completedAt && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">完成时间</h3>
                  <p className="text-sm text-gray-900">{formatTime(task.completedAt)}</p>
                </div>
              )}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">执行时长</h3>
                <p className="text-sm text-gray-900">{calculateDuration()}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">重试次数</h3>
                <p className="text-sm text-gray-900">
                  {task.retryCount} / {task.maxRetries}
                </p>
              </div>
            </div>

            {/* 关联信息 */}
            {task.novelId && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">关联小说</h3>
                <p className="text-sm text-gray-900 font-mono">{task.novelId}</p>
              </div>
            )}

            {/* 结果 */}
            {task.result ? (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">执行结果</h3>
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <pre className="text-sm text-gray-800 whitespace-pre-wrap overflow-auto">
                    {JSON.stringify(task.result, null, 2)}
                  </pre>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {activeTab === 'logs' && (
          <div className="space-y-2">
            {taskLogs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>暂无日志</p>
              </div>
            ) : (
              taskLogs.map(log => (
                <div
                  key={log.id}
                  className={`p-3 rounded-lg ${getLogLevelStyle(log.level)}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium uppercase">{log.level}</span>
                    <span className="text-xs opacity-75">
                      {new Date(log.timestamp).toLocaleTimeString('zh-CN')}
                    </span>
                  </div>
                  <p className="text-sm">{log.message}</p>
                  {log.details && (
                    <pre className="mt-2 text-xs opacity-75 whitespace-pre-wrap">
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'recovery' && (
          <TaskRecovery
            task={task}
            suggestions={recoverySuggestions}
            onRetry={handleRetry}
          />
        )}
      </div>

      {/* 底部操作栏 */}
      <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
        {task.status === TaskStatus.FAILED && task.retryCount < task.maxRetries && (
          <button
            onClick={handleRetry}
            disabled={isOperating}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            重试任务
          </button>
        )}
        
        {task.status === TaskStatus.RUNNING && (
          <button
            onClick={handleCancel}
            disabled={isOperating}
            className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            取消任务
          </button>
        )}
        
        {(task.status === TaskStatus.COMPLETED ||
          task.status === TaskStatus.FAILED ||
          task.status === TaskStatus.CANCELLED) && (
          <button
            onClick={handleDelete}
            disabled={isOperating}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            删除任务
          </button>
        )}
        
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
        >
          关闭
        </button>
      </div>
    </div>
  )
}

export default TaskDetail
