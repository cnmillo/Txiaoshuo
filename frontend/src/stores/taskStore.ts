/**
 * 任务状态管理
 * 
 * 使用 Zustand 管理任务中心的状态
 * 支持任务列表、筛选、排序、实时更新等功能
 */

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type {
  Task,
  TaskStats,
  TaskFilter,
  TaskLog,
  TaskRecoverySuggestion,
} from '../types/task'
import { DEFAULT_TASK_FILTER, TaskStatus } from '../types/task'
import {
  getTaskList,
  getTaskDetail,
  getTaskStats,
  retryTask,
  cancelTask,
  deleteTask,
  batchDeleteTasks,
  getTaskLogs,
  getTaskRecoverySuggestions,
  TaskPoller,
  TASK_POLLING_CONFIG,
} from '../services/taskService'

// ============================================================================
// Store 类型定义
// ============================================================================

interface TaskStore {
  // 状态
  tasks: Task[]
  selectedTask: Task | null
  taskLogs: TaskLog[]
  recoverySuggestions: TaskRecoverySuggestion[]
  stats: TaskStats
  filter: TaskFilter
  pagination: {
    page: number
    limit: number
    total: number
  }
  isLoading: boolean
  isPolling: boolean
  error: string | null

  // 轮询器
  poller: TaskPoller | null

  // 操作
  fetchTasks: () => Promise<void>
  fetchTaskDetail: (taskId: string) => Promise<void>
  fetchStats: () => Promise<void>
  fetchTaskLogs: (taskId: string) => Promise<void>
  fetchRecoverySuggestions: (taskId: string) => Promise<void>
  
  // 筛选和分页
  setFilter: (filter: Partial<TaskFilter>) => void
  resetFilter: () => void
  setPage: (page: number) => void
  setPageSize: (limit: number) => void
  
  // 任务操作
  retryTaskAction: (taskId: string) => Promise<void>
  cancelTaskAction: (taskId: string) => Promise<void>
  deleteTaskAction: (taskId: string) => Promise<void>
  batchDeleteTasksAction: (taskIds: string[]) => Promise<void>
  cleanupCompletedTasks: () => Promise<void>
  
  // 选择
  selectTask: (task: Task | null) => void
  clearSelection: () => void
  
  // 轮询控制
  startPolling: () => void
  stopPolling: () => void
  togglePolling: () => void
  
  // 错误处理
  clearError: () => void
}

// ============================================================================
// 初始状态
// ============================================================================

const initialStats: TaskStats = {
  total: 0,
  pending: 0,
  running: 0,
  completed: 0,
  failed: 0,
  cancelled: 0,
  byType: {},
}

// ============================================================================
// Store 实现
// ============================================================================

export const useTaskStore = create<TaskStore>()(
  subscribeWithSelector((set, get) => ({
    // 初始状态
    tasks: [],
    selectedTask: null,
    taskLogs: [],
    recoverySuggestions: [],
    stats: initialStats,
    filter: DEFAULT_TASK_FILTER,
    pagination: {
      page: 1,
      limit: 20,
      total: 0,
    },
    isLoading: false,
    isPolling: false,
    error: null,
    poller: null,

    // ========================================================================
    // 数据获取
    // ========================================================================

    fetchTasks: async () => {
      const { filter, pagination } = get()
      
      set({ isLoading: true, error: null })
      
      try {
        const response = await getTaskList({
          page: pagination.page,
          limit: pagination.limit,
          status: filter.status === 'all' ? undefined : filter.status,
          type: filter.type === 'all' ? undefined : filter.type,
        })
        
        set({
          tasks: response.data,
          pagination: {
            ...pagination,
            total: response.total,
          },
          isLoading: false,
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : '获取任务列表失败'
        set({ error: message, isLoading: false })
      }
    },

    fetchTaskDetail: async (taskId: string) => {
      set({ isLoading: true, error: null })
      
      try {
        const task = await getTaskDetail(taskId)
        set({ selectedTask: task, isLoading: false })
      } catch (error) {
        const message = error instanceof Error ? error.message : '获取任务详情失败'
        set({ error: message, isLoading: false })
      }
    },

    fetchStats: async () => {
      try {
        const stats = await getTaskStats()
        set({ stats })
      } catch (error) {
        console.error('获取任务统计失败:', error)
      }
    },

    fetchTaskLogs: async (taskId: string) => {
      try {
        const logs = await getTaskLogs(taskId)
        set({ taskLogs: logs })
      } catch (error) {
        console.error('获取任务日志失败:', error)
        set({ taskLogs: [] })
      }
    },

    fetchRecoverySuggestions: async (taskId: string) => {
      try {
        const suggestions = await getTaskRecoverySuggestions(taskId)
        set({ recoverySuggestions: suggestions })
      } catch (error) {
        console.error('获取恢复建议失败:', error)
        set({ recoverySuggestions: [] })
      }
    },

    // ========================================================================
    // 筛选和分页
    // ========================================================================

    setFilter: (filterUpdate: Partial<TaskFilter>) => {
      const { filter, fetchTasks } = get()
      const newFilter = { ...filter, ...filterUpdate }
      
      set({
        filter: newFilter,
        pagination: { ...get().pagination, page: 1 }, // 重置到第一页
      })
      
      fetchTasks()
    },

    resetFilter: () => {
      set({
        filter: DEFAULT_TASK_FILTER,
        pagination: { ...get().pagination, page: 1 },
      })
      get().fetchTasks()
    },

    setPage: (page: number) => {
      set({ pagination: { ...get().pagination, page } })
      get().fetchTasks()
    },

    setPageSize: (limit: number) => {
      set({
        pagination: { ...get().pagination, limit, page: 1 },
      })
      get().fetchTasks()
    },

    // ========================================================================
    // 任务操作
    // ========================================================================

    retryTaskAction: async (taskId: string) => {
      set({ isLoading: true, error: null })
      
      try {
        await retryTask(taskId)
        
        // 刷新列表
        await get().fetchTasks()
        await get().fetchStats()
        
        // 如果当前选中的就是这个任务，更新详情
        if (get().selectedTask?.id === taskId) {
          await get().fetchTaskDetail(taskId)
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : '重试任务失败'
        set({ error: message, isLoading: false })
        throw error
      }
    },

    cancelTaskAction: async (taskId: string) => {
      set({ isLoading: true, error: null })
      
      try {
        await cancelTask(taskId)
        
        // 刷新列表
        await get().fetchTasks()
        await get().fetchStats()
        
        // 如果当前选中的就是这个任务，更新详情
        if (get().selectedTask?.id === taskId) {
          await get().fetchTaskDetail(taskId)
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : '取消任务失败'
        set({ error: message, isLoading: false })
        throw error
      }
    },

    deleteTaskAction: async (taskId: string) => {
      set({ isLoading: true, error: null })
      
      try {
        await deleteTask(taskId)
        
        // 清除选中状态
        if (get().selectedTask?.id === taskId) {
          set({ selectedTask: null })
        }
        
        // 刷新列表
        await get().fetchTasks()
        await get().fetchStats()
      } catch (error) {
        const message = error instanceof Error ? error.message : '删除任务失败'
        set({ error: message, isLoading: false })
        throw error
      }
    },

    batchDeleteTasksAction: async (taskIds: string[]) => {
      set({ isLoading: true, error: null })
      
      try {
        await batchDeleteTasks({ taskIds })
        
        // 刷新列表
        await get().fetchTasks()
        await get().fetchStats()
      } catch (error) {
        const message = error instanceof Error ? error.message : '批量删除任务失败'
        set({ error: message, isLoading: false })
        throw error
      }
    },

    cleanupCompletedTasks: async () => {
      set({ isLoading: true, error: null })
      
      try {
        await batchDeleteTasks({ status: TaskStatus.COMPLETED })
        
        // 刷新列表
        await get().fetchTasks()
        await get().fetchStats()
      } catch (error) {
        const message = error instanceof Error ? error.message : '清理任务失败'
        set({ error: message, isLoading: false })
        throw error
      }
    },

    // ========================================================================
    // 选择
    // ========================================================================

    selectTask: (task: Task | null) => {
      set({ selectedTask: task })
      
      if (task) {
        get().fetchTaskLogs(task.id)
        
        if (task.status === TaskStatus.FAILED) {
          get().fetchRecoverySuggestions(task.id)
        }
      } else {
        set({ taskLogs: [], recoverySuggestions: [] })
      }
    },

    clearSelection: () => {
      set({
        selectedTask: null,
        taskLogs: [],
        recoverySuggestions: [],
      })
    },

    // ========================================================================
    // 轮询控制
    // ========================================================================

    startPolling: () => {
      const { isPolling } = get()
      
      if (isPolling) return
      
      // 创建新的轮询器
      const newPoller = new TaskPoller(async () => {
        await get().fetchTasks()
        await get().fetchStats()
      }, TASK_POLLING_CONFIG.interval)
      
      newPoller.start()
      
      set({ isPolling: true, poller: newPoller })
    },

    stopPolling: () => {
      const { poller } = get()
      
      if (poller) {
        poller.stop()
      }
      
      set({ isPolling: false, poller: null })
    },

    togglePolling: () => {
      const { isPolling } = get()
      
      if (isPolling) {
        get().stopPolling()
      } else {
        get().startPolling()
      }
    },

    // ========================================================================
    // 错误处理
    // ========================================================================

    clearError: () => {
      set({ error: null })
    },
  }))
)

// ============================================================================
// 选择器
// ============================================================================

/**
 * 任务列表选择器
 */
export const selectTasks = (state: TaskStore) => state.tasks

/**
 * 选中任务选择器
 */
export const selectSelectedTask = (state: TaskStore) => state.selectedTask

/**
 * 任务统计选择器
 */
export const selectStats = (state: TaskStore) => state.stats

/**
 * 筛选器选择器
 */
export const selectFilter = (state: TaskStore) => state.filter

/**
 * 分页选择器
 */
export const selectPagination = (state: TaskStore) => state.pagination

/**
 * 加载状态选择器
 */
export const selectIsLoading = (state: TaskStore) => state.isLoading

/**
 * 轮询状态选择器
 */
export const selectIsPolling = (state: TaskStore) => state.isPolling

/**
 * 错误选择器
 */
export const selectError = (state: TaskStore) => state.error

/**
 * 任务日志选择器
 */
export const selectTaskLogs = (state: TaskStore) => state.taskLogs

/**
 * 恢复建议选择器
 */
export const selectRecoverySuggestions = (state: TaskStore) => state.recoverySuggestions

/**
 * 按状态分组的任务选择器
 */
export const selectTasksByStatus = (state: TaskStore) => {
  const grouped: Record<TaskStatus, Task[]> = {
    [TaskStatus.PENDING]: [],
    [TaskStatus.RUNNING]: [],
    [TaskStatus.COMPLETED]: [],
    [TaskStatus.FAILED]: [],
    [TaskStatus.CANCELLED]: [],
  }
  
  state.tasks.forEach(task => {
    grouped[task.status].push(task)
  })
  
  return grouped
}

/**
 * 活跃任务（执行中）选择器
 */
export const selectActiveTasks = (state: TaskStore) =>
  state.tasks.filter(task => task.status === TaskStatus.RUNNING)

/**
 * 失败任务选择器
 */
export const selectFailedTasks = (state: TaskStore) =>
  state.tasks.filter(task => task.status === TaskStatus.FAILED)
