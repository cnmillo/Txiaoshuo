/**
 * 任务中心类型定义
 * 
 * 定义任务管理相关的所有类型、接口和数据结构
 */

// ============================================================================
// 任务状态枚举
// ============================================================================

/**
 * 任务状态枚举
 */
export enum TaskStatus {
  /** 待处理 - 任务已创建，等待执行 */
  PENDING = 'pending',
  /** 执行中 - 任务正在执行 */
  RUNNING = 'running',
  /** 已完成 - 任务执行成功 */
  COMPLETED = 'completed',
  /** 失败 - 任务执行失败 */
  FAILED = 'failed',
  /** 已取消 - 任务被用户取消 */
  CANCELLED = 'cancelled',
}

/**
 * 任务状态标签映射
 */
export const TaskStatusLabels: Record<TaskStatus, string> = {
  [TaskStatus.PENDING]: '排队中',
  [TaskStatus.RUNNING]: '执行中',
  [TaskStatus.COMPLETED]: '已完成',
  [TaskStatus.FAILED]: '失败',
  [TaskStatus.CANCELLED]: '已取消',
}

/**
 * 任务状态颜色映射
 */
export const TaskStatusColors: Record<TaskStatus, string> = {
  [TaskStatus.PENDING]: 'bg-gray-100 text-gray-800',
  [TaskStatus.RUNNING]: 'bg-blue-100 text-blue-800',
  [TaskStatus.COMPLETED]: 'bg-green-100 text-green-800',
  [TaskStatus.FAILED]: 'bg-red-100 text-red-800',
  [TaskStatus.CANCELLED]: 'bg-yellow-100 text-yellow-800',
}

// ============================================================================
// 任务类型枚举
// ============================================================================

/**
 * 任务类型枚举
 */
export enum TaskType {
  /** 生成小说 */
  GENERATE_NOVEL = 'generate_novel',
  /** 生成章节 */
  GENERATE_CHAPTER = 'generate_chapter',
  /** 生成大纲 */
  GENERATE_OUTLINE = 'generate_outline',
  /** 生成宏观规划 */
  GENERATE_MACRO_PLAN = 'generate_macro_plan',
  /** 生成角色 */
  GENERATE_CHARACTERS = 'generate_characters',
  /** 生成卷规划 */
  GENERATE_VOLUME_PLAN = 'generate_volume_plan',
  /** 批量生成章节 */
  GENERATE_CHAPTERS = 'generate_chapters',
  /** 文本拟人化 */
  HUMANIZE_TEXT = 'humanize_text',
  /** 质量检查 */
  QUALITY_CHECK = 'quality_check',
  /** 导出小说 */
  EXPORT_NOVEL = 'export_novel',
  /** 导入分析 */
  IMPORT_ANALYSIS = 'import_analysis',
  /** 审计章节 */
  AUDIT_CHAPTER = 'audit_chapter',
  /** 修复章节 */
  FIX_CHAPTER = 'fix_chapter',
}

/**
 * 任务类型标签映射
 */
export const TaskTypeLabels: Record<TaskType, string> = {
  [TaskType.GENERATE_NOVEL]: '生成小说',
  [TaskType.GENERATE_CHAPTER]: '生成章节',
  [TaskType.GENERATE_OUTLINE]: '生成大纲',
  [TaskType.GENERATE_MACRO_PLAN]: '生成宏观规划',
  [TaskType.GENERATE_CHARACTERS]: '生成角色',
  [TaskType.GENERATE_VOLUME_PLAN]: '生成卷规划',
  [TaskType.GENERATE_CHAPTERS]: '批量生成章节',
  [TaskType.HUMANIZE_TEXT]: '文本拟人化',
  [TaskType.QUALITY_CHECK]: '质量检查',
  [TaskType.EXPORT_NOVEL]: '导出小说',
  [TaskType.IMPORT_ANALYSIS]: '导入分析',
  [TaskType.AUDIT_CHAPTER]: '审计章节',
  [TaskType.FIX_CHAPTER]: '修复章节',
}

/**
 * 任务类型分组
 */
export const TaskTypeGroups = {
  generation: [
    TaskType.GENERATE_NOVEL,
    TaskType.GENERATE_CHAPTER,
    TaskType.GENERATE_OUTLINE,
    TaskType.GENERATE_MACRO_PLAN,
    TaskType.GENERATE_CHARACTERS,
    TaskType.GENERATE_VOLUME_PLAN,
    TaskType.GENERATE_CHAPTERS,
  ],
  audit: [
    TaskType.QUALITY_CHECK,
    TaskType.AUDIT_CHAPTER,
  ],
  fix: [
    TaskType.FIX_CHAPTER,
    TaskType.HUMANIZE_TEXT,
  ],
  other: [
    TaskType.EXPORT_NOVEL,
    TaskType.IMPORT_ANALYSIS,
  ],
}

/**
 * 任务类型分组标签
 */
export const TaskTypeGroupLabels: Record<keyof typeof TaskTypeGroups, string> = {
  generation: '生成类',
  audit: '审计类',
  fix: '修复类',
  other: '其他',
}

// ============================================================================
// 任务接口定义
// ============================================================================

/**
 * 任务接口
 */
export interface Task {
  /** 任务ID */
  id: string
  /** 关联的小说ID */
  novelId?: string
  /** 任务类型 */
  type: TaskType
  /** 任务状态 */
  status: TaskStatus
  /** 进度百分比 (0-100) */
  progress: number
  /** 总数 */
  total?: number
  /** 当前执行项描述 */
  current?: string
  /** 任务结果 */
  result?: unknown
  /** 错误信息 */
  error?: string | undefined
  /** 重试次数 */
  retryCount: number
  /** 最大重试次数 */
  maxRetries: number
  /** 开始时间 */
  startedAt?: string
  /** 完成时间 */
  completedAt?: string
  /** 创建时间 */
  createdAt: string
  /** 更新时间 */
  updatedAt: string
}

/**
 * 任务进度更新
 */
export interface TaskProgress {
  /** 进度百分比 */
  progress: number
  /** 当前执行项描述 */
  current?: string
  /** 总数 */
  total?: number
}

/**
 * 任务统计
 */
export interface TaskStats {
  /** 总任务数 */
  total: number
  /** 待处理任务数 */
  pending: number
  /** 执行中任务数 */
  running: number
  /** 已完成任务数 */
  completed: number
  /** 失败任务数 */
  failed: number
  /** 已取消任务数 */
  cancelled: number
  /** 按类型分组的统计 */
  byType: Record<string, number>
}

/**
 * 任务列表查询参数
 */
export interface TaskListParams {
  /** 页码 */
  page: number
  /** 每页数量 */
  limit: number
  /** 状态筛选 */
  status?: TaskStatus
  /** 类型筛选 */
  type?: TaskType
  /** 小说ID筛选 */
  novelId?: string
  /** 搜索关键词 */
  search?: string
  /** 排序字段 */
  sortBy?: 'createdAt' | 'updatedAt' | 'status' | 'progress'
  /** 排序方向 */
  sortOrder?: 'asc' | 'desc'
}

/**
 * 任务列表响应
 */
export interface TaskListResponse {
  /** 任务列表 */
  data: Task[]
  /** 总数 */
  total: number
  /** 当前页码 */
  page: number
  /** 每页数量 */
  limit: number
}

/**
 * 任务执行日志
 */
export interface TaskLog {
  /** 日志ID */
  id: string
  /** 任务ID */
  taskId: string
  /** 日志级别 */
  level: 'info' | 'warning' | 'error' | 'debug'
  /** 日志消息 */
  message: string
  /** 日志详情 */
  details?: Record<string, unknown>
  /** 时间戳 */
  timestamp: string
}

/**
 * 失败任务恢复建议
 */
export interface TaskRecoverySuggestion {
  /** 建议ID */
  id: string
  /** 任务ID */
  taskId: string
  /** 建议类型 */
  type: 'retry' | 'modify_params' | 'check_config' | 'contact_support'
  /** 建议标题 */
  title: string
  /** 建议描述 */
  description: string
  /** 操作建议 */
  action?: string
  /** 优先级 */
  priority: 'high' | 'medium' | 'low'
}

/**
 * 批量操作参数
 */
export interface BatchOperationParams {
  /** 任务ID列表 */
  taskIds: string[]
  /** 操作类型 */
  operation: 'retry' | 'cancel' | 'delete'
}

/**
 * 批量操作结果
 */
export interface BatchOperationResult {
  /** 成功数量 */
  successCount: number
  /** 失败数量 */
  failedCount: number
  /** 失败的任务ID列表 */
  failedTaskIds?: string[]
  /** 错误消息列表 */
  errors?: string[]
}

// ============================================================================
// 任务事件类型
// ============================================================================

/**
 * 任务事件类型
 */
export enum TaskEventType {
  /** 任务创建 */
  TASK_CREATED = 'task_created',
  /** 任务开始 */
  TASK_STARTED = 'task_started',
  /** 任务进度更新 */
  TASK_PROGRESS = 'task_progress',
  /** 任务完成 */
  TASK_COMPLETED = 'task_completed',
  /** 任务失败 */
  TASK_FAILED = 'task_failed',
  /** 任务取消 */
  TASK_CANCELLED = 'task_cancelled',
  /** 任务重试 */
  TASK_RETRY = 'task_retry',
}

/**
 * 任务事件
 */
export interface TaskEvent {
  /** 事件类型 */
  type: TaskEventType
  /** 任务ID */
  taskId: string
  /** 时间戳 */
  timestamp: string
  /** 事件数据 */
  data?: unknown
}

// ============================================================================
// 工具类型
// ============================================================================

/**
 * 任务筛选状态
 */
export type TaskFilterStatus = TaskStatus | 'all'

/**
 * 任务筛选类型
 */
export type TaskFilterType = TaskType | 'all'

/**
 * 任务排序字段
 */
export type TaskSortField = 'createdAt' | 'updatedAt' | 'status' | 'progress' | 'type'

/**
 * 任务排序方向
 */
export type TaskSortOrder = 'asc' | 'desc'

/**
 * 任务筛选器
 */
export interface TaskFilter {
  /** 状态筛选 */
  status: TaskFilterStatus
  /** 类型筛选 */
  type: TaskFilterType
  /** 搜索关键词 */
  search: string
  /** 排序字段 */
  sortBy: TaskSortField
  /** 排序方向 */
  sortOrder: TaskSortOrder
}

/**
 * 默认任务筛选器
 */
export const DEFAULT_TASK_FILTER: TaskFilter = {
  status: 'all',
  type: 'all',
  search: '',
  sortBy: 'createdAt',
  sortOrder: 'desc',
}
