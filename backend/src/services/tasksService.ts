import { v4 as uuidv4 } from 'uuid'
import { query, queryOne, run } from '../database/index.js'
import logger from '../utils/logger.js'

// 任务状态枚举
export enum TaskStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

// 任务类型枚举
export enum TaskType {
  GENERATE_NOVEL = 'generate_novel',
  GENERATE_CHAPTER = 'generate_chapter',
  GENERATE_OUTLINE = 'generate_outline',
  GENERATE_MACRO_PLAN = 'generate_macro_plan',
  GENERATE_CHARACTERS = 'generate_characters',
  GENERATE_VOLUME_PLAN = 'generate_volume_plan',
  GENERATE_CHAPTERS = 'generate_chapters',
  HUMANIZE_TEXT = 'humanize_text',
  QUALITY_CHECK = 'quality_check',
  EXPORT_NOVEL = 'export_novel',
  IMPORT_ANALYSIS = 'import_analysis',
}

// 任务接口
export interface Task {
  id: string
  novelId?: string
  type: TaskType
  status: TaskStatus
  progress: number
  total?: number
  current?: string
  result?: unknown
  error?: string
  retryCount: number
  maxRetries: number
  startedAt?: string
  completedAt?: string
  createdAt: string
  updatedAt: string
}

// 任务进度更新
export interface TaskProgress {
  progress: number
  current?: string
  total?: number
}

// 数据库任务记录
interface DatabaseTask {
  id: string
  novel_id: string | null
  type: string
  status: string
  progress: number
  total: number | null
  current: string | null
  result: string | null
  error: string | null
  retry_count: number
  max_retries: number
  started_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

// 列表查询参数
interface ListTasksParams {
  page: number
  limit: number
  status?: string
  type?: string
  novelId?: string
}

// 批量删除参数
interface BatchDeleteParams {
  taskIds?: string[]
  status?: string
}

// 任务处理器类型
type TaskHandler = (task: Task) => Promise<unknown>

// 任务处理器映射
const taskHandlers: Map<TaskType, TaskHandler> = new Map()

/**
 * 任务管理服务
 */
export const tasksService = {
  /**
   * 初始化任务表
   */
  async initTasksTables(): Promise<void> {
    await run(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        novel_id TEXT,
        type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        progress INTEGER DEFAULT 0,
        total INTEGER,
        current TEXT,
        result TEXT,
        error TEXT,
        retry_count INTEGER DEFAULT 0,
        max_retries INTEGER DEFAULT 3,
        started_at TEXT,
        completed_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE
      )
    `)

    // 创建索引
    await run(`
      CREATE INDEX IF NOT EXISTS idx_tasks_status 
      ON tasks(status)
    `)

    await run(`
      CREATE INDEX IF NOT EXISTS idx_tasks_type 
      ON tasks(type)
    `)

    await run(`
      CREATE INDEX IF NOT EXISTS idx_tasks_novel 
      ON tasks(novel_id)
    `)

    logger.info('任务表初始化完成')
  },

  /**
   * 注册任务处理器
   */
  registerHandler(type: TaskType, handler: TaskHandler): void {
    taskHandlers.set(type, handler)
    logger.info(`注册任务处理器: ${type}`)
  },

  /**
   * 创建任务
   */
  async createTask(params: {
    novelId?: string
    type: TaskType
    maxRetries?: number
  }): Promise<Task> {
    const { novelId, type, maxRetries = 3 } = params
    const taskId = uuidv4()
    const now = new Date().toISOString()

    await run(
      `INSERT INTO tasks 
       (id, novel_id, type, status, progress, retry_count, max_retries, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [taskId, novelId || null, type, TaskStatus.PENDING, 0, 0, maxRetries, now, now]
    )

    return {
      id: taskId,
      novelId,
      type,
      status: TaskStatus.PENDING,
      progress: 0,
      retryCount: 0,
      maxRetries,
      createdAt: now,
      updatedAt: now
    }
  },

  /**
   * 获取任务
   */
  async getTask(taskId: string): Promise<Task | null> {
    const dbTask = await queryOne<DatabaseTask>(
      'SELECT * FROM tasks WHERE id = ?',
      [taskId]
    )

    if (!dbTask) {
      return null
    }

    return this.mapDatabaseToTask(dbTask)
  },

  /**
   * 更新任务状态
   */
  async updateTaskStatus(
    taskId: string,
    status: TaskStatus,
    params?: {
      progress?: number
      current?: string
      total?: number
      result?: unknown
      error?: string
    }
  ): Promise<Task> {
    const task = await this.getTask(taskId)

    if (!task) {
      throw new Error(`任务不存在: ${taskId}`)
    }

    const now = new Date().toISOString()
    const updates: string[] = ['status = ?', 'updated_at = ?']
    const values: unknown[] = [status, now]

    if (params?.progress !== undefined) {
      updates.push('progress = ?')
      values.push(params.progress)
    }

    if (params?.current !== undefined) {
      updates.push('current = ?')
      values.push(params.current)
    }

    if (params?.total !== undefined) {
      updates.push('total = ?')
      values.push(params.total)
    }

    if (params?.result !== undefined) {
      updates.push('result = ?')
      values.push(JSON.stringify(params.result))
    }

    if (params?.error !== undefined) {
      updates.push('error = ?')
      values.push(params.error)
    }

    if (status === TaskStatus.RUNNING && !task.startedAt) {
      updates.push('started_at = ?')
      values.push(now)
    }

    if (status === TaskStatus.COMPLETED || status === TaskStatus.FAILED || status === TaskStatus.CANCELLED) {
      updates.push('completed_at = ?')
      values.push(now)
    }

    values.push(taskId)

    await run(
      `UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`,
      values
    )

    return (await this.getTask(taskId))!
  },

  /**
   * 更新任务进度
   */
  async updateTaskProgress(taskId: string, progress: TaskProgress): Promise<void> {
    const now = new Date().toISOString()
    const updates: string[] = ['updated_at = ?']
    const values: unknown[] = [now]

    if (progress.progress !== undefined) {
      updates.push('progress = ?')
      values.push(progress.progress)
    }

    if (progress.current !== undefined) {
      updates.push('current = ?')
      values.push(progress.current)
    }

    if (progress.total !== undefined) {
      updates.push('total = ?')
      values.push(progress.total)
    }

    values.push(taskId)

    await run(
      `UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`,
      values
    )
  },

  /**
   * 获取任务列表
   */
  async listTasks(params: ListTasksParams): Promise<{
    data: Task[]
    total: number
    page: number
    limit: number
  }> {
    const { page, limit, status, type, novelId } = params
    const offset = (page - 1) * limit

    const conditions: string[] = []
    const queryParams: unknown[] = []

    if (status) {
      conditions.push('status = ?')
      queryParams.push(status)
    }

    if (type) {
      conditions.push('type = ?')
      queryParams.push(type)
    }

    if (novelId) {
      conditions.push('novel_id = ?')
      queryParams.push(novelId)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    // 获取总数
    const countResult = await queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM tasks ${whereClause}`,
      queryParams
    )
    const total = countResult?.count || 0

    // 获取列表
    const dbTasks = await query<DatabaseTask>(
      `SELECT * FROM tasks ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...queryParams, limit, offset]
    )

    return {
      data: dbTasks.map(t => this.mapDatabaseToTask(t)),
      total,
      page,
      limit
    }
  },

  /**
   * 重试任务
   */
  async retryTask(taskId: string): Promise<Task> {
    const task = await this.getTask(taskId)

    if (!task) {
      throw new Error(`任务不存在: ${taskId}`)
    }

    if (task.status !== TaskStatus.FAILED) {
      throw new Error('只能重试失败的任务')
    }

    if (task.retryCount >= task.maxRetries) {
      throw new Error(`任务已达到最大重试次数: ${task.maxRetries}`)
    }

    const now = new Date().toISOString()

    // 更新任务状态
    await run(
      `UPDATE tasks 
       SET status = ?, retry_count = retry_count + 1, error = NULL, updated_at = ?
       WHERE id = ?`,
      [TaskStatus.PENDING, now, taskId]
    )

    const updatedTask = (await this.getTask(taskId))!

    // 如果有注册的处理器，启动任务执行
    const handler = taskHandlers.get(task.type)
    if (handler) {
      this.executeTask(updatedTask).catch(error => {
        logger.error('任务执行失败', { taskId, error })
      })
    }

    return updatedTask
  },

  /**
   * 删除任务
   */
  async deleteTask(taskId: string): Promise<boolean> {
    const result = await run('DELETE FROM tasks WHERE id = ?', [taskId])
    return result.changes > 0
  },

  /**
   * 取消任务
   */
  async cancelTask(taskId: string): Promise<Task> {
    const task = await this.getTask(taskId)

    if (!task) {
      throw new Error(`任务不存在: ${taskId}`)
    }

    if (task.status === TaskStatus.COMPLETED || task.status === TaskStatus.CANCELLED) {
      throw new Error('任务已完成或已取消，无法取消')
    }

    return this.updateTaskStatus(taskId, TaskStatus.CANCELLED)
  },

  /**
   * 执行任务
   */
  async executeTask(task: Task): Promise<Task> {
    const handler = taskHandlers.get(task.type)

    if (!handler) {
      return this.updateTaskStatus(task.id, TaskStatus.FAILED, {
        error: `未找到任务处理器: ${task.type}`
      })
    }

    try {
      // 更新为运行中
      await this.updateTaskStatus(task.id, TaskStatus.RUNNING)

      // 执行任务
      const result = await handler(task)

      // 更新为完成
      return this.updateTaskStatus(task.id, TaskStatus.COMPLETED, {
        progress: 100,
        result
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '任务执行失败'
      logger.error('任务执行失败', { taskId: task.id, error: errorMessage })

      return this.updateTaskStatus(task.id, TaskStatus.FAILED, {
        error: errorMessage
      })
    }
  },

  /**
   * 获取任务统计
   */
  async getTaskStats(novelId?: string): Promise<{
    total: number
    pending: number
    running: number
    completed: number
    failed: number
    cancelled: number
    byType: Record<string, number>
  }> {
    const whereClause = novelId ? 'WHERE novel_id = ?' : ''
    const params = novelId ? [novelId] : []

    // 获取总数和状态统计
    const statusStats = await query<{ status: string; count: number }>(
      `SELECT status, COUNT(*) as count FROM tasks ${whereClause} GROUP BY status`,
      params
    )

    // 获取类型统计
    const typeStats = await query<{ type: string; count: number }>(
      `SELECT type, COUNT(*) as count FROM tasks ${whereClause} GROUP BY type`,
      params
    )

    const stats = {
      total: 0,
      pending: 0,
      running: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
      byType: {} as Record<string, number>
    }

    statusStats.forEach(s => {
      stats.total += s.count
      switch (s.status) {
        case TaskStatus.PENDING:
          stats.pending = s.count
          break
        case TaskStatus.RUNNING:
          stats.running = s.count
          break
        case TaskStatus.COMPLETED:
          stats.completed = s.count
          break
        case TaskStatus.FAILED:
          stats.failed = s.count
          break
        case TaskStatus.CANCELLED:
          stats.cancelled = s.count
          break
      }
    })

    typeStats.forEach(t => {
      stats.byType[t.type] = t.count
    })

    return stats
  },

  /**
   * 批量删除任务
   */
  async batchDeleteTasks(params: BatchDeleteParams): Promise<number> {
    const { taskIds, status } = params

    if (taskIds && taskIds.length > 0) {
      const placeholders = taskIds.map(() => '?').join(',')
      const result = await run(
        `DELETE FROM tasks WHERE id IN (${placeholders})`,
        taskIds
      )
      return result.changes
    }

    if (status) {
      const result = await run('DELETE FROM tasks WHERE status = ?', [status])
      return result.changes
    }

    return 0
  },

  /**
   * 清理过期任务
   */
  async cleanupTasks(olderThanDays: number = 7): Promise<number> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)

    const result = await run(
      `DELETE FROM tasks 
       WHERE status IN (?, ?) 
       AND completed_at < ?`,
      [TaskStatus.COMPLETED, TaskStatus.FAILED, cutoffDate.toISOString()]
    )

    logger.info(`清理了 ${result.changes} 个过期任务`)
    return result.changes
  },

  /**
   * 获取待处理任务
   */
  async getPendingTasks(limit: number = 10): Promise<Task[]> {
    const dbTasks = await query<DatabaseTask>(
      `SELECT * FROM tasks 
       WHERE status = ? 
       ORDER BY created_at ASC 
       LIMIT ?`,
      [TaskStatus.PENDING, limit]
    )

    return dbTasks.map(t => this.mapDatabaseToTask(t))
  },

  /**
   * 获取运行中的任务
   */
  async getRunningTasks(): Promise<Task[]> {
    const dbTasks = await query<DatabaseTask>(
      'SELECT * FROM tasks WHERE status = ?',
      [TaskStatus.RUNNING]
    )

    return dbTasks.map(t => this.mapDatabaseToTask(t))
  },

  /**
   * 获取任务执行日志
   */
  async getTaskLogs(taskId: string): Promise<Array<{
    id: string
    taskId: string
    level: 'info' | 'warning' | 'error' | 'debug'
    message: string
    details?: Record<string, unknown>
    timestamp: string
  }>> {
    // 获取任务信息
    const task = await this.getTask(taskId)
    if (!task) {
      return []
    }

    // 构建日志（基于任务状态和信息）
    const logs: Array<{
      id: string
      taskId: string
      level: 'info' | 'warning' | 'error' | 'debug'
      message: string
      details?: Record<string, unknown>
      timestamp: string
    }> = []

    // 创建日志
    logs.push({
      id: `${taskId}-created`,
      taskId,
      level: 'info',
      message: `任务已创建: ${task.type}`,
      details: { novelId: task.novelId },
      timestamp: task.createdAt
    })

    // 开始日志
    if (task.startedAt) {
      logs.push({
        id: `${taskId}-started`,
        taskId,
        level: 'info',
        message: '任务开始执行',
        timestamp: task.startedAt
      })
    }

    // 进度日志
    if (task.current && task.progress > 0) {
      logs.push({
        id: `${taskId}-progress`,
        taskId,
        level: 'debug',
        message: `当前进度: ${task.progress}%`,
        details: { current: task.current, total: task.total },
        timestamp: task.updatedAt
      })
    }

    // 错误日志
    if (task.error) {
      logs.push({
        id: `${taskId}-error`,
        taskId,
        level: 'error',
        message: task.error,
        timestamp: task.completedAt || task.updatedAt
      })
    }

    // 完成日志
    if (task.status === TaskStatus.COMPLETED && task.completedAt) {
      logs.push({
        id: `${taskId}-completed`,
        taskId,
        level: 'info',
        message: '任务执行完成',
        details: task.result ? { result: task.result } : undefined,
        timestamp: task.completedAt
      })
    }

    // 取消日志
    if (task.status === TaskStatus.CANCELLED && task.completedAt) {
      logs.push({
        id: `${taskId}-cancelled`,
        taskId,
        level: 'warning',
        message: '任务已取消',
        timestamp: task.completedAt
      })
    }

    // 重试日志
    if (task.retryCount > 0) {
      logs.push({
        id: `${taskId}-retry`,
        taskId,
        level: 'warning',
        message: `任务已重试 ${task.retryCount} 次`,
        details: { maxRetries: task.maxRetries },
        timestamp: task.updatedAt
      })
    }

    return logs.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )
  },

  /**
   * 获取失败任务恢复建议
   */
  async getRecoverySuggestions(taskId: string): Promise<Array<{
    id: string
    taskId: string
    type: 'retry' | 'modify_params' | 'check_config' | 'contact_support'
    title: string
    description: string
    action?: string
    priority: 'high' | 'medium' | 'low'
  }>> {
    const task = await this.getTask(taskId)
    if (!task || task.status !== TaskStatus.FAILED) {
      return []
    }

    const suggestions: Array<{
      id: string
      taskId: string
      type: 'retry' | 'modify_params' | 'check_config' | 'contact_support'
      title: string
      description: string
      action?: string
      priority: 'high' | 'medium' | 'low'
    }> = []

    // 根据错误类型提供建议
    const errorMessage = task.error?.toLowerCase() || ''

    // 重试建议
    if (task.retryCount < task.maxRetries) {
      suggestions.push({
        id: `${taskId}-retry`,
        taskId,
        type: 'retry',
        title: '重试任务',
        description: '任务执行失败，可以尝试重新执行。如果问题是临时的，重试可能会成功。',
        action: '点击"重试"按钮重新执行任务',
        priority: 'high'
      })
    }

    // AI 服务相关错误
    if (errorMessage.includes('ai') || errorMessage.includes('api') || errorMessage.includes('timeout')) {
      suggestions.push({
        id: `${taskId}-check-ai`,
        taskId,
        type: 'check_config',
        title: '检查 AI 服务配置',
        description: '任务可能因 AI 服务问题失败。请检查 API 密钥是否有效，服务是否可用。',
        action: '前往设置页面检查 AI 服务配置',
        priority: 'high'
      })
    }

    // 网络相关错误
    if (errorMessage.includes('network') || errorMessage.includes('connection') || errorMessage.includes('econnrefused')) {
      suggestions.push({
        id: `${taskId}-check-network`,
        taskId,
        type: 'check_config',
        title: '检查网络连接',
        description: '任务可能因网络问题失败。请确保网络连接正常。',
        action: '检查网络连接后重试',
        priority: 'high'
      })
    }

    // 参数相关错误
    if (errorMessage.includes('invalid') || errorMessage.includes('parameter') || errorMessage.includes('validation')) {
      suggestions.push({
        id: `${taskId}-check-params`,
        taskId,
        type: 'modify_params',
        title: '检查任务参数',
        description: '任务参数可能无效。请检查输入内容是否符合要求。',
        action: '检查并修改任务参数后重试',
        priority: 'medium'
      })
    }

    // 配额相关错误
    if (errorMessage.includes('quota') || errorMessage.includes('limit') || errorMessage.includes('rate')) {
      suggestions.push({
        id: `${taskId}-check-quota`,
        taskId,
        type: 'check_config',
        title: '检查服务配额',
        description: '可能已达到服务使用限制。请检查配额或等待限制重置。',
        action: '等待一段时间后重试，或升级服务计划',
        priority: 'medium'
      })
    }

    // 通用建议
    suggestions.push({
      id: `${taskId}-contact-support`,
      taskId,
      type: 'contact_support',
      title: '联系技术支持',
      description: '如果问题持续存在，请联系技术支持获取帮助。',
      action: '提供任务ID和错误信息以便快速定位问题',
      priority: 'low'
    })

    return suggestions
  },

  /**
   * 数据库记录映射到任务对象
   */
  mapDatabaseToTask(db: DatabaseTask): Task {
    return {
      id: db.id,
      novelId: db.novel_id || undefined,
      type: db.type as TaskType,
      status: db.status as TaskStatus,
      progress: db.progress,
      total: db.total || undefined,
      current: db.current || undefined,
      result: db.result ? JSON.parse(db.result) : undefined,
      error: db.error || undefined,
      retryCount: db.retry_count,
      maxRetries: db.max_retries,
      startedAt: db.started_at || undefined,
      completedAt: db.completed_at || undefined,
      createdAt: db.created_at,
      updatedAt: db.updated_at
    }
  }
}

export default tasksService
