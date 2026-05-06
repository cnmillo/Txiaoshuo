/**
 * 任务恢复组件
 * 
 * 显示失败任务的恢复建议和操作
 */

import React from 'react'
import type { Task, TaskRecoverySuggestion } from '../../types/task'
import { TaskTypeLabels } from '../../types/task'

interface TaskRecoveryProps {
  task: Task
  suggestions: TaskRecoverySuggestion[]
  onRetry: () => void
}

const TaskRecovery: React.FC<TaskRecoveryProps> = ({ task, suggestions, onRetry }) => {
  // 获取建议图标
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

  // 获取优先级样式
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

  // 获取优先级标签
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
      {/* 失败概要 */}
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
                {task.error}
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

      {/* 恢复建议 */}
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

      {/* 常见问题 */}
      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h3 className="text-sm font-medium text-blue-800 mb-2">常见失败原因</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li className="flex items-start gap-2">
            <span className="text-blue-500">-</span>
            <span>AI 服务暂时不可用或响应超时</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500">-</span>
            <span>API 密钥无效或已过期</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500">-</span>
            <span>请求参数不符合要求</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500">-</span>
            <span>网络连接问题</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500">-</span>
            <span>资源配额已用尽</span>
          </li>
        </ul>
      </div>

      {/* 帮助链接 */}
      <div className="text-sm text-gray-500">
        <p>
          如果问题持续存在，请
          <a href="#" className="text-blue-600 hover:underline ml-1">
            联系技术支持
          </a>
          或查看
          <a href="#" className="text-blue-600 hover:underline ml-1">
            帮助文档
          </a>
        </p>
      </div>
    </div>
  )
}

export default TaskRecovery
