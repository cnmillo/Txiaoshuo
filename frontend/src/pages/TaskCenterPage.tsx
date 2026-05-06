/**
 * 任务中心页面
 * 
 * 任务管理的主页面，集成任务列表、筛选、统计等功能
 */

import React, { useEffect } from 'react'
import { TaskList } from '../components/task'
import { useTaskStore } from '../stores/taskStore'

const TaskCenterPage: React.FC = () => {
  const { stopPolling, cleanupCompletedTasks } = useTaskStore()

  // 组件卸载时停止轮询
  useEffect(() => {
    return () => {
      stopPolling()
    }
  }, [stopPolling])

  // 处理清理已完成任务
  const handleCleanup = async () => {
    if (!confirm('确定要清理所有已完成的任务吗？')) {
      return
    }
    
    try {
      await cleanupCompletedTasks()
    } catch (error) {
      console.error('清理任务失败:', error)
    }
  }

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* 页面头部 */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">任务中心</h1>
            <p className="text-sm text-gray-500 mt-1">
              管理和监控所有后台任务的执行状态
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleCleanup}
              className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              清理已完成任务
            </button>
          </div>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 overflow-hidden">
        <TaskList />
      </div>
    </div>
  )
}

export default TaskCenterPage
