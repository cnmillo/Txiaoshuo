/**
 * 任务筛选组件
 * 
 * 提供任务状态、类型筛选和搜索功能
 */

import React, { useState, useCallback } from 'react'
import { useTaskStore } from '../../stores/taskStore'
import {
  TaskStatus,
  TaskStatusLabels,
  TaskTypeLabels,
  TaskTypeGroups,
  TaskTypeGroupLabels,
} from '../../types/task'
import type { TaskFilterStatus, TaskFilterType } from '../../types/task'

const TaskFilter: React.FC = () => {
  const { filter, setFilter, resetFilter, isPolling, togglePolling } = useTaskStore()
  const [searchInput, setSearchInput] = useState(filter.search)

  // 状态选项
  const statusOptions: { value: TaskFilterStatus; label: string }[] = [
    { value: 'all', label: '全部状态' },
    { value: TaskStatus.PENDING, label: TaskStatusLabels[TaskStatus.PENDING] },
    { value: TaskStatus.RUNNING, label: TaskStatusLabels[TaskStatus.RUNNING] },
    { value: TaskStatus.COMPLETED, label: TaskStatusLabels[TaskStatus.COMPLETED] },
    { value: TaskStatus.FAILED, label: TaskStatusLabels[TaskStatus.FAILED] },
    { value: TaskStatus.CANCELLED, label: TaskStatusLabels[TaskStatus.CANCELLED] },
  ]

  // 类型选项（按分组）
  const typeOptions: { value: TaskFilterType; label: string; group?: string }[] = [
    { value: 'all', label: '全部类型' },
  ]

  // 添加分组类型
  Object.entries(TaskTypeGroups).forEach(([group, types]) => {
    types.forEach(type => {
      typeOptions.push({
        value: type,
        label: TaskTypeLabels[type],
        group: TaskTypeGroupLabels[group as keyof typeof TaskTypeGroupLabels],
      })
    })
  })

  // 处理状态变更
  const handleStatusChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilter({ status: e.target.value as TaskFilterStatus })
  }, [setFilter])

  // 处理类型变更
  const handleTypeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilter({ type: e.target.value as TaskFilterType })
  }, [setFilter])

  // 处理搜索
  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    setFilter({ search: searchInput })
  }, [searchInput, setFilter])

  // 处理搜索输入变化
  const handleSearchInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value)
  }, [])

  // 处理清空搜索
  const handleClearSearch = useCallback(() => {
    setSearchInput('')
    setFilter({ search: '' })
  }, [setFilter])

  // 处理重置
  const handleReset = useCallback(() => {
    setSearchInput('')
    resetFilter()
  }, [resetFilter])

  return (
    <div className="px-4 py-3 bg-white border-b border-gray-200">
      <div className="flex flex-wrap items-center gap-3">
        {/* 状态筛选 */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">状态:</label>
          <select
            value={filter.status}
            onChange={handleStatusChange}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {statusOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* 类型筛选 */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">类型:</label>
          <select
            value={filter.type}
            onChange={handleTypeChange}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">全部类型</option>
            {Object.entries(TaskTypeGroups).map(([group, types]) => (
              <optgroup key={group} label={TaskTypeGroupLabels[group as keyof typeof TaskTypeGroupLabels]}>
                {types.map(type => (
                  <option key={type} value={type}>
                    {TaskTypeLabels[type]}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {/* 搜索框 */}
        <form onSubmit={handleSearch} className="flex-1 min-w-[200px] max-w-md">
          <div className="relative">
            <input
              type="text"
              value={searchInput}
              onChange={handleSearchInputChange}
              placeholder="搜索任务ID或描述..."
              className="w-full px-3 py-1.5 pr-10 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {searchInput ? (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            ) : (
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            )}
          </div>
        </form>

        {/* 操作按钮 */}
        <div className="flex items-center gap-2">
          {/* 轮询开关 */}
          <button
            onClick={togglePolling}
            className={`px-3 py-1.5 rounded-md text-sm flex items-center gap-1.5 ${
              isPolling
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {isPolling ? (
              <>
                <svg className="w-4 h-4 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="8" />
                </svg>
                <span>自动刷新中</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>开启自动刷新</span>
              </>
            )}
          </button>

          {/* 重置按钮 */}
          <button
            onClick={handleReset}
            className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md text-sm hover:bg-gray-200"
          >
            重置筛选
          </button>
        </div>
      </div>
    </div>
  )
}

export default TaskFilter
