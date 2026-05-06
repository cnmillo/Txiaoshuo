/**
 * 任务列表组件
 * 
 * 显示任务列表，支持筛选、搜索、排序和分页
 */

import React, { useEffect, useCallback } from 'react'
import { useTaskStore } from '../../stores/taskStore'
import { TaskStatus } from '../../types/task'
import type { Task } from '../../types/task'
import TaskItem from './TaskItem'
import TaskFilter from './TaskFilter'
import TaskStats from './TaskStats'
import TaskDetail from './TaskDetail'

const TaskList: React.FC = () => {
  const {
    tasks,
    selectedTask,
    pagination,
    isLoading,
    isPolling,
    error,
    fetchTasks,
    fetchStats,
    selectTask,
    clearSelection,
    startPolling,
    stopPolling,
    clearError,
  } = useTaskStore()

  // 初始化加载
  useEffect(() => {
    fetchTasks()
    fetchStats()
  }, [fetchTasks, fetchStats])

  // 自动开启轮询（如果有执行中的任务）
  useEffect(() => {
    const hasRunningTasks = tasks.some(task => task.status === TaskStatus.RUNNING)
    
    if (hasRunningTasks && !isPolling) {
      startPolling()
    } else if (!hasRunningTasks && isPolling) {
      stopPolling()
    }
  }, [tasks, isPolling, startPolling, stopPolling])

  // 组件卸载时停止轮询
  useEffect(() => {
    return () => {
      stopPolling()
    }
  }, [stopPolling])

  // 处理任务点击
  const handleTaskClick = useCallback((task: Task) => {
    selectTask(task)
  }, [selectTask])

  // 处理关闭详情
  const handleCloseDetail = useCallback(() => {
    clearSelection()
  }, [clearSelection])

  // 处理分页
  const handlePageChange = useCallback((page: number) => {
    useTaskStore.getState().setPage(page)
  }, [])

  // 计算总页数
  const totalPages = Math.ceil(pagination.total / pagination.limit)

  return (
    <div className="h-full flex flex-col">
      {/* 统计卡片 */}
      <TaskStats />

      {/* 筛选栏 */}
      <TaskFilter />

      {/* 错误提示 */}
      {error && (
        <div className="mx-4 mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
          <span className="text-red-800">{error}</span>
          <button
            onClick={clearError}
            className="text-red-600 hover:text-red-800"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* 任务列表 */}
      <div className="flex-1 overflow-auto px-4 pb-4">
        {isLoading && tasks.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-lg">暂无任务</p>
            <p className="text-sm mt-2">创建新任务后将在此显示</p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {tasks.map(task => (
                <TaskItem
                  key={task.id}
                  task={task}
                  isSelected={selectedTask?.id === task.id}
                  onClick={() => handleTaskClick(task)}
                />
              ))}
            </div>

            {/* 分页 */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="px-3 py-1 rounded border border-gray-300 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  上一页
                </button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (pagination.page <= 3) {
                      pageNum = i + 1
                    } else if (pagination.page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = pagination.page - 2 + i
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`w-8 h-8 rounded text-sm ${
                          pagination.page === pageNum
                            ? 'bg-blue-600 text-white'
                            : 'border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                </div>
                
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === totalPages}
                  className="px-3 py-1 rounded border border-gray-300 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  下一页
                </button>
                
                <span className="text-sm text-gray-500 ml-4">
                  共 {pagination.total} 条
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* 任务详情抽屉 */}
      {selectedTask && (
        <TaskDetail
          task={selectedTask}
          onClose={handleCloseDetail}
        />
      )}
    </div>
  )
}

export default TaskList
