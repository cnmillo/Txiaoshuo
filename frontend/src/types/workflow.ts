/**
 * 故事规划多阶段工作流类型定义
 * 
 * 该模块定义了故事规划工作流的所有类型、接口和数据结构
 * 支持从灵感输入到章节执行的完整创作流程
 */

import type { Character, Relationship, NovelStyle } from '@shared/types'

// ============================================================================
// 工作流阶段枚举
// ============================================================================

/**
 * 工作流阶段枚举
 * 定义故事规划的完整生命周期
 */
export enum WorkflowStage {
  /** 灵感输入 - 用户输入初始创意 */
  INSPIRATION = 'inspiration',
  /** 项目设定 - 明确题材、卖点、目标读者 */
  PROJECT_SETTING = 'project_setting',
  /** 故事宏观规划 - 整本走向、阶段升级、长线兑现 */
  MACRO_PLANNING = 'macro_planning',
  /** 角色准备 - 主角团、关系网、卷级职责 */
  CHARACTER_PREPARATION = 'character_preparation',
  /** 卷战略 - 分卷规划、卷级使命、升级节点 */
  VOLUME_STRATEGY = 'volume_strategy',
  /** 节奏拆章 - 章节列表、单章细化 */
  RHYTHM_BREAKDOWN = 'rhythm_breakdown',
  /** 章节执行 - 逐章推进、审计、修复 */
  CHAPTER_EXECUTION = 'chapter_execution',
}

/**
 * 阶段状态枚举
 */
export enum StageStatus {
  /** 待处理 */
  PENDING = 'pending',
  /** 进行中 */
  IN_PROGRESS = 'in_progress',
  /** 已完成 */
  COMPLETED = 'completed',
  /** 已跳过 */
  SKIPPED = 'skipped',
}

// ============================================================================
// 阶段数据结构
// ============================================================================

/**
 * 灵感输入阶段数据
 */
export interface InspirationStageData {
  /** 原始灵感文本 */
  inspiration: string
  /** 书名备选列表 */
  titleCandidates: string[]
  /** 题材定位 */
  genre?: NovelStyle
  /** 卖点列表 */
  sellingPoints: string[]
  /** 目标读者感受 */
  targetReaderFeeling?: string
  /** 前30章承诺 */
  first30ChaptersPromise?: string
  /** 创建时间 */
  createdAt: string
  /** 更新时间 */
  updatedAt: string
}

/**
 * 项目设定阶段数据
 */
export interface ProjectSettingStageData {
  /** 书名 */
  title: string
  /** 简介 */
  description?: string
  /** 题材 */
  genre: NovelStyle
  /** 核心卖点 */
  coreSellingPoint: string
  /** 目标读者感受 */
  targetReaderFeeling: string
  /** 前30章承诺 */
  first30ChaptersPromise: string
  /** 世界观提示 */
  worldviewHint?: string
  /** 风格提示 */
  styleHint?: string
  /** 写作风格 */
  writingStyle?: string
  /** 预计字数 */
  estimatedWordCount?: number
  /** 一句话简介 */
  oneLineSummary?: string
  /** 创建时间 */
  createdAt: string
  /** 更新时间 */
  updatedAt: string
}

/**
 * 故事宏观规划阶段数据
 */
export interface MacroPlanningStageData {
  /** 整本走向 */
  overallDirection: string
  /** 阶段升级节点 */
  upgradeNodes: UpgradeNode[]
  /** 长线兑现承诺 */
  longTermPromises: LongTermPromise[]
  /** 核心冲突 */
  coreConflict: string
  /** 主题 */
  theme: string
  /** 世界观概要 */
  worldviewSummary?: string
  /** 创建时间 */
  createdAt: string
  /** 更新时间 */
  updatedAt: string
}

/**
 * 升级节点
 */
export interface UpgradeNode {
  /** 节点ID */
  id: string
  /** 节点名称 */
  name: string
  /** 章节范围 */
  chapterRange: {
    start: number
    end: number
  }
  /** 升级内容 */
  upgradeContent: string
  /** 关键事件 */
  keyEvents: string[]
}

/**
 * 长线兑现承诺
 */
export interface LongTermPromise {
  /** 承诺ID */
  id: string
  /** 承诺内容 */
  content: string
  /** 铺设章节 */
  setupChapter?: number
  /** 兑现章节 */
  payoffChapter?: number
  /** 状态 */
  status: 'setup' | 'payoff' | 'both'
}

/**
 * 角色准备阶段数据
 */
export interface CharacterPreparationStageData {
  /** 主角团 */
  mainCharacters: Character[]
  /** 配角阵容 */
  supportingCharacters: Character[]
  /** 关系网络 */
  relationships: Relationship[]
  /** 卷级职责分配 */
  volumeResponsibilities: VolumeResponsibility[]
  /** 创建时间 */
  createdAt: string
  /** 更新时间 */
  updatedAt: string
}

/**
 * 卷级职责
 */
export interface VolumeResponsibility {
  /** 卷ID */
  volumeId: string
  /** 卷名称 */
  volumeName: string
  /** 角色职责列表 */
  responsibilities: {
    characterId: string
    characterName: string
    responsibility: string
    importance: 'major' | 'minor'
  }[]
}

/**
 * 卷战略阶段数据
 */
export interface VolumeStrategyStageData {
  /** 卷列表 */
  volumes: Volume[]
  /** 当前卷索引 */
  currentVolumeIndex: number
  /** 创建时间 */
  createdAt: string
  /** 更新时间 */
  updatedAt: string
}

/**
 * 卷信息
 */
export interface Volume {
  id: string
  name: string
  mission: string
  upgradeNodes: UpgradeNode[]
  endingHook: string
  chapterRange: {
    start: number
    end: number
  }
  status: StageStatus
  characterArc?: string
  tensionLevel?: number
}

/**
 * 节奏拆章阶段数据
 */
export interface RhythmBreakdownStageData {
  /** 当前卷ID */
  currentVolumeId: string
  /** 章节列表（当前卷） */
  chapters: ChapterOutline[]
  /** 当前章节索引 */
  currentChapterIndex: number
  /** 创建时间 */
  createdAt: string
  /** 更新时间 */
  updatedAt: string
  /** 多卷章节数据存储（卷ID -> 章节列表） */
  volumeChapters?: Record<string, ChapterOutline[]>
}

/**
 * 章节大纲
 */
export interface ChapterOutline {
  /** 章节ID */
  id: string
  /** 章节序号 */
  chapterNumber: number
  /** 章节标题 */
  title: string
  /** 章节摘要 */
  summary: string
  /** 关键情节点 */
  keyPlotPoints: string[]
  /** 涉及角色 */
  involvedCharacters: string[]
  /** 预计字数 */
  estimatedWordCount: number
  /** 节奏类型 */
  rhythmType: 'fast' | 'medium' | 'slow'
  /** 状态 */
  status: StageStatus
}

/**
 * 章节执行阶段数据
 */
export interface ChapterExecutionStageData {
  currentChapterId: string
  generatedChapters: GeneratedChapter[]
  auditResults: AuditResult[]
  createdAt: string
  updatedAt: string
  novelId?: string
}

/**
 * 已生成章节
 */
export interface GeneratedChapter {
  /** 章节ID */
  id: string
  /** 章节序号 */
  chapterNumber: number
  /** 章节标题 */
  title: string
  /** 章节内容 */
  content: string
  /** 字数 */
  wordCount: number
  /** 生成时间 */
  generatedAt: string
  /** 状态 */
  status: 'draft' | 'reviewed' | 'final'
}

/**
 * 审计结果
 */
export interface AuditResult {
  /** 章节ID */
  chapterId: string
  /** 审计分数 */
  score: number
  /** 问题列表 */
  issues: AuditIssue[]
  /** 修复建议 */
  suggestions: string[]
  /** 审计时间 */
  auditedAt: string
}

/**
 * 审计问题
 */
export interface AuditIssue {
  /** 问题类型 */
  type: 'consistency' | 'pacing' | 'character' | 'plot' | 'style'
  /** 问题描述 */
  description: string
  /** 严重程度 */
  severity: 'low' | 'medium' | 'high'
  /** 位置 */
  location?: {
    paragraph: number
    sentence?: number
  }
}

// ============================================================================
// 工作流状态
// ============================================================================

/**
 * 单个阶段的状态
 */
export interface StageState {
  /** 阶段标识 */
  stage: WorkflowStage
  /** 阶段状态 */
  status: StageStatus
  /** 阶段数据 */
  data: StageDataMap[WorkflowStage]
  /** 开始时间 */
  startedAt?: string
  /** 完成时间 */
  completedAt?: string
  /** 错误信息 */
  error?: string
  /** 重试次数 */
  retryCount: number
}

/**
 * 阶段数据映射类型
 */
export interface StageDataMap {
  [WorkflowStage.INSPIRATION]: InspirationStageData | null
  [WorkflowStage.PROJECT_SETTING]: ProjectSettingStageData | null
  [WorkflowStage.MACRO_PLANNING]: MacroPlanningStageData | null
  [WorkflowStage.CHARACTER_PREPARATION]: CharacterPreparationStageData | null
  [WorkflowStage.VOLUME_STRATEGY]: VolumeStrategyStageData | null
  [WorkflowStage.RHYTHM_BREAKDOWN]: RhythmBreakdownStageData | null
  [WorkflowStage.CHAPTER_EXECUTION]: ChapterExecutionStageData | null
}

/**
 * 工作流完整状态
 */
export interface WorkflowState {
  /** 工作流ID */
  id: string
  /** 关联的小说ID */
  novelId?: string
  /** 当前阶段 */
  currentStage: WorkflowStage
  /** 所有阶段状态 */
  stages: Record<WorkflowStage, StageState>
  /** 工作流版本（用于迁移） */
  version: number
  /** 创建时间 */
  createdAt: string
  /** 更新时间 */
  updatedAt: string
}

// ============================================================================
// 工作流操作类型
// ============================================================================

/**
 * 阶段转换结果
 */
export interface StageTransitionResult {
  /** 是否成功 */
  success: boolean
  /** 目标阶段 */
  targetStage: WorkflowStage
  /** 错误信息 */
  error?: string
  /** 需要确认的警告 */
  warnings?: string[]
}

/**
 * 工作流快照（用于持久化）
 */
export interface WorkflowSnapshot {
  /** 状态版本 */
  version: number
  /** 工作流状态 */
  state: WorkflowState
  /** 快照时间 */
  timestamp: string
}

/**
 * 阶段验证结果
 */
export interface StageValidationResult {
  /** 是否有效 */
  isValid: boolean
  /** 错误列表 */
  errors: string[]
  /** 警告列表 */
  warnings: string[]
}

// ============================================================================
// 工作流配置类型
// ============================================================================

/**
 * 阶段配置
 */
export interface StageConfig {
  /** 阶段标识 */
  stage: WorkflowStage
  /** 阶段名称 */
  name: string
  /** 阶段描述 */
  description: string
  /** 是否可选 */
  optional: boolean
  /** 是否可跳过 */
  canSkip: boolean
  /** 是否可回退 */
  canGoBack: boolean
  /** 前置阶段 */
  prerequisites: WorkflowStage[]
  /** 下一个阶段 */
  nextStage?: WorkflowStage
  /** 上一个阶段 */
  previousStage?: WorkflowStage
  /** 估计完成时间（分钟） */
  estimatedDuration: number
  /** 图标 */
  icon?: string
}

/**
 * 工作流配置
 */
export interface WorkflowConfig {
  /** 配置版本 */
  version: number
  /** 阶段配置列表 */
  stages: StageConfig[]
  /** 默认超时时间（毫秒） */
  defaultTimeout: number
  /** 最大重试次数 */
  maxRetryCount: number
  /** 是否自动保存 */
  autoSave: boolean
  /** 自动保存间隔（毫秒） */
  autoSaveInterval: number
}

// ============================================================================
// 工作流事件类型
// ============================================================================

/**
 * 工作流事件类型
 */
export enum WorkflowEventType {
  /** 阶段开始 */
  STAGE_STARTED = 'stage_started',
  /** 阶段完成 */
  STAGE_COMPLETED = 'stage_completed',
  /** 阶段跳过 */
  STAGE_SKIPPED = 'stage_skipped',
  /** 阶段失败 */
  STAGE_FAILED = 'stage_failed',
  /** 阶段回退 */
  STAGE_ROLLBACK = 'stage_rollback',
  /** 数据更新 */
  DATA_UPDATED = 'data_updated',
  /** 工作流重置 */
  WORKFLOW_RESET = 'workflow_reset',
  /** 工作流恢复 */
  WORKFLOW_RESTORED = 'workflow_restored',
}

/**
 * 工作流事件
 */
export interface WorkflowEvent {
  /** 事件类型 */
  type: WorkflowEventType
  /** 事件时间 */
  timestamp: string
  /** 相关阶段 */
  stage?: WorkflowStage
  /** 事件数据 */
  data?: unknown
  /** 错误信息 */
  error?: string
}

// ============================================================================
// 工具类型
// ============================================================================

/**
 * 提取阶段数据类型
 */
export type ExtractStageData<T extends WorkflowStage> = StageDataMap[T]

/**
 * 阶段状态联合类型
 */
export type AnyStageData = StageDataMap[keyof StageDataMap]

/**
 * 工作流状态更新函数类型
 */
export type WorkflowStateUpdater = (state: WorkflowState) => WorkflowState

/**
 * 阶段数据更新函数类型
 */
export type StageDataUpdater<T extends WorkflowStage> = (
  data: StageDataMap[T]
) => StageDataMap[T]

// ============================================================================
// 生成任务状态（用于页面切换时恢复）
// ============================================================================

/**
 * 生成进度信息
 */
export interface GenerationProgress {
  /** 当前章节号 */
  chapterNumber: number
  /** 当前章节标题 */
  chapterTitle: string
  /** 已完成字数 */
  completedWords: number
  /** 预计总字数 */
  totalWords: number
  /** 进度百分比 */
  percentage: number
  /** 状态 */
  status: 'generating' | 'paused' | 'completed' | 'failed'
  /** 开始时间 */
  startedAt: string
  /** 预估剩余时间（秒） */
  estimatedRemainingSeconds?: number
}

/**
 * 生成任务状态
 * 用于在页面切换时恢复生成状态
 */
export interface GenerationTask {
  /** 任务ID */
  taskId: string
  /** 章节ID */
  chapterId: string
  /** 章节号 */
  chapterNumber: number
  /** 卷ID */
  volumeId: string
  /** 生成进度 */
  progress: GenerationProgress
  /** 开始时间 */
  startedAt: string
  /** 是否正在生成 */
  isGenerating: boolean
}
