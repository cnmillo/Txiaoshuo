/**
 * 任务 API 服务
 * 
 * 提供任务管理相关的 API 调用
 */

import api from './api'
import type {
  Task,
  TaskListParams,
  TaskListResponse,
  TaskStats,
  TaskLog,
  TaskRecoverySuggestion,
  BatchOperationResult,
} from '../types/task'

// ============================================================================
// 任务列表 API
// ============================================================================

/**
 * 获取任务列表
 */
export const getTaskList = async (params: TaskListParams): Promise<TaskListResponse> => {
  const queryParams = new URLSearchParams()
  
  queryParams.append('page', String(params.page))
  queryParams.append('limit', String(params.limit))
  
  if (params.status) {
    queryParams.append('status', params.status)
  }
  
  if (params.type) {
    queryParams.append('type', params.type)
  }
  
  if (params.novelId) {
    queryParams.append('novelId', params.novelId)
  }

  const response = await api.get(`/tasks/list?${queryParams.toString()}`)
  return (response as unknown as { success: boolean; data: TaskListResponse }).data
}

/**
 * 获取任务详情
 */
export const getTaskDetail = async (taskId: string): Promise<Task> => {
  const response = await api.get(`/tasks/${taskId}`)
  return (response as unknown as { success: boolean; data: Task }).data
}

/**
 * 获取任务统计
 */
export const getTaskStats = async (novelId?: string): Promise<TaskStats> => {
  const params = novelId ? `?novelId=${novelId}` : ''
  const response = await api.get(`/tasks/stats/overview${params}`)
  return (response as unknown as { success: boolean; data: TaskStats }).data
}

// ============================================================================
// 任务操作 API
// ============================================================================

/**
 * 重试任务
 */
export const retryTask = async (taskId: string): Promise<Task> => {
  const response = await api.post(`/tasks/${taskId}/retry`)
  return (response as unknown as { success: boolean; data: Task }).data
}

/**
 * 取消任务
 */
export const cancelTask = async (taskId: string): Promise<Task> => {
  const response = await api.post(`/tasks/${taskId}/cancel`)
  return (response as unknown as { success: boolean; data: Task }).data
}

/**
 * 删除任务
 */
export const deleteTask = async (taskId: string): Promise<{ deleted: boolean }> => {
  const response = await api.delete(`/tasks/${taskId}`)
  return (response as unknown as { success: boolean; data: { deleted: boolean } }).data
}

/**
 * 批量删除任务
 */
export const batchDeleteTasks = async (params: {
  taskIds?: string[]
  status?: string
}): Promise<{ deletedCount: number }> => {
  const response = await api.post('/tasks/batch-delete', params)
  return (response as unknown as { success: boolean; data: { deletedCount: number } }).data
}

/**
 * 清理过期任务
 */
export const cleanupTasks = async (olderThanDays: number = 7): Promise<{ deletedCount: number }> => {
  const response = await api.post('/tasks/cleanup', { olderThanDays })
  return (response as unknown as { success: boolean; data: { deletedCount: number } }).data
}

// ============================================================================
// 任务日志 API
// ============================================================================

/**
 * 获取任务执行日志
 */
export const getTaskLogs = async (taskId: string): Promise<TaskLog[]> => {
  const response = await api.get(`/tasks/${taskId}/logs`)
  return (response as unknown as { success: boolean; data: TaskLog[] }).data
}

/**
 * 获取失败任务恢复建议
 */
export const getTaskRecoverySuggestions = async (taskId: string): Promise<TaskRecoverySuggestion[]> => {
  const response = await api.get(`/tasks/${taskId}/recovery-suggestions`)
  return (response as unknown as { success: boolean; data: TaskRecoverySuggestion[] }).data
}

// ============================================================================
// 批量操作 API
// ============================================================================

/**
 * 批量重试任务
 */
export const batchRetryTasks = async (taskIds: string[]): Promise<BatchOperationResult> => {
  const results = await Promise.allSettled(
    taskIds.map(id => retryTask(id))
  )
  
  const successCount = results.filter(r => r.status === 'fulfilled').length
  const failedCount = results.filter(r => r.status === 'rejected').length
  const failedTaskIds = results
    .map((r, i) => r.status === 'rejected' ? taskIds[i] : null)
    .filter((id): id is string => id !== null)
  
  return {
    successCount,
    failedCount,
    failedTaskIds,
  }
}

/**
 * 批量取消任务
 */
export const batchCancelTasks = async (taskIds: string[]): Promise<BatchOperationResult> => {
  const results = await Promise.allSettled(
    taskIds.map(id => cancelTask(id))
  )
  
  const successCount = results.filter(r => r.status === 'fulfilled').length
  const failedCount = results.filter(r => r.status === 'rejected').length
  const failedTaskIds = results
    .map((r, i) => r.status === 'rejected' ? taskIds[i] : null)
    .filter((id): id is string => id !== null)
  
  return {
    successCount,
    failedCount,
    failedTaskIds,
  }
}

// ============================================================================
// 实时更新相关
// ============================================================================

/**
 * 任务轮询配置
 */
export const TASK_POLLING_CONFIG = {
  /** 轮询间隔（毫秒） */
  interval: 3000,
  /** 最大重试次数 */
  maxRetries: 3,
  /** 重试延迟（毫秒） */
  retryDelay: 1000,
}

/**
 * 创建任务轮询器
 */
export class TaskPoller {
  private intervalId: NodeJS.Timeout | null = null
  private isPolling = false
  private retryCount = 0
  
  constructor(
    private fetchTasks: () => Promise<void>,
    private interval: number = TASK_POLLING_CONFIG.interval
  ) {}
  
  /**
   * 开始轮询
   */
  start(): void {
    if (this.isPolling) return
    
    this.isPolling = true
    this.retryCount = 0
    
    // 立即执行一次
    this.poll()
    
    // 设置定时轮询
    this.intervalId = setInterval(() => {
      this.poll()
    }, this.interval)
  }
  
  /**
   * 停止轮询
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    this.isPolling = false
  }
  
  /**
   * 执行轮询
   */
  private async poll(): Promise<void> {
    try {
      await this.fetchTasks()
      this.retryCount = 0
    } catch (error) {
      this.retryCount++
      
      if (this.retryCount >= TASK_POLLING_CONFIG.maxRetries) {
        console.error('任务轮询失败次数过多，停止轮询')
        this.stop()
      }
    }
  }
  
  /**
   * 更新轮询间隔
   */
  setInterval(interval: number): void {
    this.interval = interval
    if (this.isPolling) {
      this.stop()
      this.start()
    }
  }
  
  /**
   * 获取轮询状态
   */
  isActive(): boolean {
    return this.isPolling
  }
}

// ============================================================================
// 导出
// ============================================================================

export default {
  getTaskList,
  getTaskDetail,
  getTaskStats,
  retryTask,
  cancelTask,
  deleteTask,
  batchDeleteTasks,
  cleanupTasks,
  getTaskLogs,
  getTaskRecoverySuggestions,
  batchRetryTasks,
  batchCancelTasks,
  TaskPoller,
}
