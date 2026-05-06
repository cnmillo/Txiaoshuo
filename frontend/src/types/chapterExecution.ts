/**
 * 章节执行工作流类型定义
 * 
 * 定义章节导航、生成、审计和修复相关的所有类型
 */

// ============================================================================
// 章节状态枚举
// ============================================================================

/**
 * 章节写作状态
 */
export enum ChapterStatus {
  /** 待写 */
  PENDING = 'pending',
  /** 写作中 */
  WRITING = 'writing',
  /** 已完成 */
  COMPLETED = 'completed',
  /** 需修复 */
  NEEDS_FIX = 'needs_fix',
  /** 审计中 */
  AUDITING = 'auditing',
  /** 生成中 */
  GENERATING = 'generating',
}

/**
 * 审计问题类型
 */
export enum AuditIssueType {
  /** 内容质量 */
  CONTENT_QUALITY = 'content_quality',
  /** 角色一致性 */
  CHARACTER_CONSISTENCY = 'character_consistency',
  /** 情节连贯性 */
  PLOT_CONTINUITY = 'plot_continuity',
  /** 文风一致性 */
  STYLE_CONSISTENCY = 'style_consistency',
  /** 节奏问题 */
  PACING = 'pacing',
  /** 对话问题 */
  DIALOGUE = 'dialogue',
  /** 描写问题 */
  DESCRIPTION = 'description',
}

/**
 * 问题严重程度
 */
export enum IssueSeverity {
  /** 低 */
  LOW = 'low',
  /** 中 */
  MEDIUM = 'medium',
  /** 高 */
  HIGH = 'high',
  /** 严重 */
  CRITICAL = 'critical',
}

/**
 * 修复状态
 */
export enum FixStatus {
  /** 待修复 */
  PENDING = 'pending',
  /** 修复中 */
  IN_PROGRESS = 'in_progress',
  /** 已修复 */
  FIXED = 'fixed',
  /** 已忽略 */
  IGNORED = 'ignored',
}

// ============================================================================
// 章节数据结构
// ============================================================================

/**
 * 章节导航项
 */
export interface ChapterNavigationItem {
  /** 章节ID */
  id: string
  /** 章节序号 */
  chapterNumber: number
  /** 章节标题 */
  title: string
  /** 状态 */
  status: ChapterStatus
  /** 字数 */
  wordCount: number
  /** 预计字数 */
  estimatedWordCount: number
  /** 更新时间 */
  updatedAt: string
  /** 审计分数 */
  auditScore?: number
  /** 是否有未修复问题 */
  hasUnfixedIssues?: boolean
  /** 节奏类型 */
  rhythmType?: 'fast' | 'medium' | 'slow'
}

/**
 * 章节进度统计
 */
export interface ChapterProgressStats {
  /** 总章节数 */
  totalChapters: number
  /** 已完成章节数 */
  completedChapters: number
  /** 写作中章节数 */
  writingChapters: number
  /** 待写章节数 */
  pendingChapters: number
  /** 需修复章节数 */
  needsFixChapters: number
  /** 总字数 */
  totalWordCount: number
  /** 平均审计分数 */
  averageAuditScore: number
  /** 完成百分比 */
  completionPercentage: number
}

/**
 * 章节筛选条件
 */
export interface ChapterFilter {
  /** 状态筛选 */
  status?: ChapterStatus | 'all'
  /** 搜索关键词 */
  search?: string
  /** 排序字段 */
  sortBy?: 'chapterNumber' | 'wordCount' | 'updatedAt' | 'auditScore'
  /** 排序方向 */
  sortOrder?: 'asc' | 'desc'
}

// ============================================================================
// 章节生成相关
// ============================================================================

/**
 * 章节生成参数
 */
export interface ChapterGenerationParams {
  /** 目标字数 */
  targetWordCount: number
  /** 写作风格 */
  writingStyle?: string
  /** 视角 (第一人称/第三人称) */
  perspective?: 'first' | 'third'
  /** 节奏类型 */
  rhythmType?: 'fast' | 'medium' | 'slow'
  /** 情感基调 */
  emotionalTone?: string
  /** 特殊要求 */
  specialRequirements?: string
  /** 是否包含大纲 */
  includeOutline?: boolean
  /** 参考章节ID列表 */
  referenceChapterIds?: string[]
  /** 是否自动润色 */
  autoPolish?: boolean
  /** 润色强度 */
  polishIntensity?: 'light' | 'medium' | 'deep'
}

/**
 * 批量生成参数
 */
export interface BatchGenerationParams {
  /** 起始章节号 */
  startChapter: number
  /** 结束章节号 */
  endChapter: number
  /** 生成参数 */
  generationParams: ChapterGenerationParams
  /** 是否自动审计 */
  autoAudit: boolean
  /** 是否自动修复 */
  autoFix: boolean
}

/**
 * 生成进度
 */
export interface GenerationProgress {
  /** 任务ID */
  taskId: string
  /** 当前章节 */
  currentChapter: number
  /** 总章节数 */
  totalChapters: number
  /** 当前状态 */
  status: 'pending' | 'generating' | 'auditing' | 'fixing' | 'completed' | 'failed'
  /** 进度百分比 */
  percentage: number
  /** 当前操作描述 */
  currentAction: string
  /** 预计剩余时间(秒) */
  estimatedTimeRemaining?: number
  /** 错误信息 */
  error?: string
}

// ============================================================================
// 审计相关
// ============================================================================

/**
 * 审计问题详情
 */
export interface AuditIssueDetail {
  /** 问题ID */
  id: string
  /** 问题类型 */
  type: AuditIssueType
  /** 问题描述 */
  description: string
  /** 严重程度 */
  severity: IssueSeverity
  /** 问题位置 */
  location: {
    /** 段落索引 */
    paragraphIndex: number
    /** 句子索引(可选) */
    sentenceIndex?: number
    /** 起始字符位置 */
    startOffset?: number
    /** 结束字符位置 */
    endOffset?: number
    /** 原文片段 */
    originalText?: string
  }
  /** 上下文 */
  context?: string
  /** 建议修复方案 */
  suggestedFix?: string
  /** 相关角色(如果有) */
  relatedCharacters?: string[]
  /** 相关情节(如果有) */
  relatedPlotPoints?: string[]
}

/**
 * 审计结果
 */
export interface ChapterAuditResult {
  /** 审计ID */
  id: string
  /** 章节ID */
  chapterId: string
  /** 审计时间 */
  auditedAt: string
  /** 总分 (0-100) */
  overallScore: number
  /** 各维度分数 */
  dimensionScores: {
    /** 内容质量分数 */
    contentQuality: number
    /** 角色一致性分数 */
    characterConsistency: number
    /** 情节连贯性分数 */
    plotContinuity: number
    /** 文风一致性分数 */
    styleConsistency: number
    /** 节奏分数 */
    pacing: number
  }
  /** 问题列表 */
  issues: AuditIssueDetail[]
  /** 整体建议 */
  overallSuggestions: string[]
  /** 优点列表 */
  strengths: string[]
}

/**
 * 审计报告
 */
export interface AuditReport {
  /** 报告ID */
  id: string
  /** 工作流ID */
  workflowId: string
  /** 生成时间 */
  generatedAt: string
  /** 章节审计结果列表 */
  chapterResults: ChapterAuditResult[]
  /** 整体统计 */
  overallStats: {
    /** 平均分数 */
    averageScore: number
    /** 问题总数 */
    totalIssues: number
    /** 各严重程度问题数量 */
    issuesBySeverity: Record<IssueSeverity, number>
    /** 各类型问题数量 */
    issuesByType: Record<AuditIssueType, number>
  }
  /** 整体建议 */
  overallRecommendations: string[]
}

// ============================================================================
// 修复建议相关
// ============================================================================

/**
 * 修复建议
 */
export interface FixSuggestion {
  /** 建议ID */
  id: string
  /** 关联的问题ID */
  issueId: string
  /** 建议类型 */
  type: 'auto' | 'manual' | 'rewrite'
  /** 建议描述 */
  description: string
  /** 原始文本 */
  originalText: string
  /** 建议修改后的文本 */
  suggestedText: string
  /** 修改原因 */
  reason: string
  /** 置信度 (0-1) */
  confidence: number
  /** 是否可自动应用 */
  canAutoApply: boolean
  /** 修复状态 */
  status: FixStatus
}

/**
 * 修复记录
 */
export interface FixRecord {
  /** 记录ID */
  id: string
  /** 章节ID */
  chapterId: string
  /** 问题ID */
  issueId: string
  /** 修复前内容 */
  beforeContent: string
  /** 修复后内容 */
  afterContent: string
  /** 修复类型 */
  fixType: 'auto' | 'manual'
  /** 修复时间 */
  fixedAt: string
  /** 操作者 */
  fixedBy: 'system' | 'user'
  /** 备注 */
  note?: string
}

/**
 * 修复历史
 */
export interface FixHistory {
  /** 章节ID */
  chapterId: string
  /** 修复记录列表 */
  records: FixRecord[]
  /** 总修复次数 */
  totalFixes: number
  /** 自动修复次数 */
  autoFixes: number
  /** 手动修复次数 */
  manualFixes: number
}

// ============================================================================
// 工作流集成
// ============================================================================

/**
 * 章节执行工作流状态
 */
export interface ChapterExecutionState {
  /** 当前选中的章节ID */
  selectedChapterId: string | null
  /** 当前生成任务 */
  currentGenerationTask: GenerationProgress | null
  /** 当前审计结果 */
  currentAuditResult: ChapterAuditResult | null
  /** 当前修复建议列表 */
  currentFixSuggestions: FixSuggestion[]
  /** 筛选条件 */
  filter: ChapterFilter
  /** 是否正在加载 */
  isLoading: boolean
  /** 错误信息 */
  error: string | null
}

/**
 * 章节执行操作
 */
export interface ChapterExecutionActions {
  /** 选择章节 */
  selectChapter: (chapterId: string | null) => void
  /** 开始生成 */
  startGeneration: (params: ChapterGenerationParams) => Promise<void>
  /** 批量生成 */
  startBatchGeneration: (params: BatchGenerationParams) => Promise<void>
  /** 取消生成 */
  cancelGeneration: () => void
  /** 开始审计 */
  startAudit: (chapterId: string) => Promise<ChapterAuditResult>
  /** 批量审计 */
  startBatchAudit: (chapterIds: string[]) => Promise<AuditReport>
  /** 应用修复建议 */
  applyFix: (suggestionId: string) => Promise<void>
  /** 批量应用修复 */
  applyBatchFixes: (suggestionIds: string[]) => Promise<void>
  /** 忽略修复建议 */
  ignoreFix: (suggestionId: string) => void
  /** 手动编辑修复 */
  manualFix: (issueId: string, newContent: string) => Promise<void>
  /** 更新筛选条件 */
  updateFilter: (filter: Partial<ChapterFilter>) => void
  /** 刷新章节数据 */
  refreshChapters: () => Promise<void>
}

// ============================================================================
// API 请求/响应类型
// ============================================================================

/**
 * 生成章节请求
 */
export interface GenerateChapterRequest {
  /** 章节大纲 */
  chapterOutline: {
    chapterNumber: number
    title: string
    summary: string
    keyPlotPoints: string[]
    involvedCharacters: string[]
  }
  /** 生成参数 */
  params: ChapterGenerationParams
  /** 上下文信息 */
  context: {
    /** 前文摘要 */
    previousSummary?: string
    /** 角色信息 */
    characterInfo?: Array<{
      name: string
      role: string
      traits: string[]
    }>
    /** 世界观设定 */
    worldviewSettings?: string[]
  }
}

/**
 * 生成章节响应
 */
export interface GenerateChapterResponse {
  /** 章节ID */
  chapterId: string
  /** 章节内容 */
  content: string
  /** 字数 */
  wordCount: number
  /** 生成时间 */
  generatedAt: string
}

/**
 * 审计章节请求
 */
export interface AuditChapterRequest {
  /** 章节ID */
  chapterId: string
  /** 章节内容 */
  content: string
  /** 审计选项 */
  options?: {
    /** 检查类型列表 */
    checkTypes?: AuditIssueType[]
    /** 是否详细报告 */
    detailedReport?: boolean
    /** 参考内容(用于一致性检查) */
    referenceContent?: {
      /** 前文内容 */
      previousChapters?: string[]
      /** 角色设定 */
      characterProfiles?: string[]
      /** 大纲 */
      outline?: string
    }
  }
}

/**
 * 审计章节响应
 */
export interface AuditChapterResponse {
  /** 审计结果 */
  result: ChapterAuditResult
}

/**
 * 获取修复建议请求
 */
export interface GetFixSuggestionsRequest {
  /** 章节ID */
  chapterId: string
  /** 审计结果ID */
  auditResultId: string
  /** 问题ID列表(可选，不传则获取所有) */
  issueIds?: string[]
}

/**
 * 获取修复建议响应
 */
export interface GetFixSuggestionsResponse {
  /** 修复建议列表 */
  suggestions: FixSuggestion[]
}

/**
 * 应用修复请求
 */
export interface ApplyFixRequest {
  /** 章节ID */
  chapterId: string
  /** 建议ID */
  suggestionId: string
  /** 是否自动应用 */
  autoApply: boolean
}

/**
 * 应用修复响应
 */
export interface ApplyFixResponse {
  /** 是否成功 */
  success: boolean
  /** 修复后的内容 */
  updatedContent?: string
  /** 错误信息 */
  error?: string
}
