/**
 * AI 导演模式类型定义
 * 
 * 定义 AI 自动导演模式的所有类型、接口和数据结构
 * 支持从灵感输入到整本方向候选生成的完整流程
 */

// ============================================================================
// 整本方向候选类型
// ============================================================================

/**
 * 书名备选
 */
export interface TitleCandidate {
  /** 书名 */
  title: string
  /** 推荐理由 */
  reason: string
  /** 风格标签 */
  styleTags: string[]
}

/**
 * 题材定位
 */
export interface GenrePositioning {
  /** 主题材 */
  primaryGenre: string
  /** 子题材列表 */
  subGenres: string[]
  /** 题材描述 */
  description: string
  /** 市场热度评估 */
  marketHeat: 'hot' | 'warm' | 'normal' | 'cold'
}

/**
 * 卖点
 */
export interface SellingPoint {
  /** 卖点ID */
  id: string
  /** 卖点标题 */
  title: string
  /** 卖点描述 */
  description: string
  /** 重要性等级 */
  importance: 'core' | 'major' | 'minor'
  /** 实现难度 */
  difficulty: 'easy' | 'medium' | 'hard'
}

/**
 * 前30章承诺
 */
export interface First30ChaptersPromise {
  /** 承诺ID */
  id: string
  /** 承诺内容 */
  content: string
  /** 铺设章节范围 */
  setupRange: {
    start: number
    end: number
  }
  /** 兑现方式 */
  payoffMethod: string
  /** 读者期待值 */
  readerExpectation: string
}

/**
 * 整本方向候选方案
 */
export interface DirectionCandidate {
  /** 方案ID */
  id: string
  /** 方案名称 */
  name: string
  /** 书名备选列表 */
  titleCandidates: TitleCandidate[]
  /** 题材定位 */
  genrePositioning: GenrePositioning
  /** 卖点列表 */
  sellingPoints: SellingPoint[]
  /** 前30章承诺 */
  first30ChaptersPromise: First30ChaptersPromise[]
  /** 一句话简介 */
  oneLineSummary: string
  /** 目标读者感受 */
  targetReaderFeeling: string
  /** 创作难度评估 */
  difficultyAssessment: {
    overall: 'easy' | 'medium' | 'hard' | 'expert'
    factors: {
      name: string
      level: 'easy' | 'medium' | 'hard'
      description: string
    }[]
  }
  /** 生成时间 */
  generatedAt: string
  /** 方案评分 */
  score?: number
  /** 用户选择状态 */
  selected?: boolean
}

/**
 * 候选方案生成请求
 */
export interface GenerateCandidatesRequest {
  /** 灵感文本 */
  inspiration: string
  /** 生成数量 */
  count?: number
  /** 额外要求 */
  additionalRequirements?: string
  /** 参考风格 */
  referenceStyle?: string
}

/**
 * 候选方案生成响应
 */
export interface GenerateCandidatesResponse {
  /** 候选方案列表 */
  candidates: DirectionCandidate[]
  /** 生成耗时（毫秒） */
  duration: number
  /** AI 分析说明 */
  analysis?: string
}

// ============================================================================
// 方案迭代类型
// ============================================================================

/**
 * 迭代类型
 */
export enum IterationType {
  /** 重新生成所有方案 */
  REGENERATE_ALL = 'regenerate_all',
  /** 继续生成下一轮 */
  GENERATE_MORE = 'generate_more',
  /** 修改某一方案 */
  MODIFY_ONE = 'modify_one',
  /** 重做某套的标题组 */
  REDO_TITLES = 'redo_titles',
}

/**
 * 方案修改请求
 */
export interface ModifyCandidateRequest {
  /** 原方案ID */
  candidateId: string
  /** 修改类型 */
  modificationType: 'full' | 'titles' | 'selling_points' | 'promise'
  /** 修改说明 */
  modificationNote: string
  /** 保留的元素 */
  preserveElements?: string[]
}

/**
 * 方案修改响应
 */
export interface ModifyCandidateResponse {
  /** 修改后的方案 */
  candidate: DirectionCandidate
  /** 修改说明 */
  modificationSummary: string
}

// ============================================================================
// 推进方式类型
// ============================================================================

/**
 * 推进方式
 */
export enum ProgressMode {
  /** 按重要阶段审核 */
  STAGE_REVIEW = 'stage_review',
  /** 自动推进到可开写 */
  AUTO_TO_WRITABLE = 'auto_to_writable',
  /** 继续自动执行前10章 */
  AUTO_FIRST_10_CHAPTERS = 'auto_first_10_chapters',
}

/**
 * 阶段审核配置
 */
export interface StageReviewConfig {
  /** 审核阶段列表 */
  reviewStages: ReviewStage[]
  /** 是否暂停等待确认 */
  pauseForConfirmation: boolean
}

/**
 * 审核阶段
 */
export interface ReviewStage {
  /** 阶段名称 */
  stageName: string
  /** 审核要点 */
  reviewPoints: string[]
  /** 是否必须审核 */
  required: boolean
}

/**
 * 自动推进配置
 */
export interface AutoProgressConfig {
  /** 推进方式 */
  mode: ProgressMode
  /** 阶段审核配置（仅 STAGE_REVIEW 模式） */
  stageReviewConfig?: StageReviewConfig
  /** 最大自动执行章节数（仅 AUTO_FIRST_10_CHAPTERS 模式） */
  maxAutoChapters?: number
  /** 是否在关键节点暂停 */
  pauseAtKeyPoints: boolean
}

// ============================================================================
// 导演模式状态类型
// ============================================================================

/**
 * 导演模式状态
 */
export enum DirectorModeStatus {
  /** 空闲 */
  IDLE = 'idle',
  /** 生成灵感候选 */
  GENERATING_CANDIDATES = 'generating_candidates',
  /** 等待用户选择 */
  WAITING_SELECTION = 'waiting_selection',
  /** 方案迭代中 */
  ITERATING = 'iterating',
  /** 推进中 */
  PROGRESSING = 'progressing',
  /** 已完成 */
  COMPLETED = 'completed',
  /** 错误 */
  ERROR = 'error',
}

/**
 * 导演模式状态
 */
export interface DirectorModeState {
  /** 当前状态 */
  status: DirectorModeStatus
  /** 当前灵感 */
  currentInspiration: string
  /** 候选方案列表 */
  candidates: DirectionCandidate[]
  /** 当前轮次 */
  currentRound: number
  /** 选中的方案ID */
  selectedCandidateId: string | null
  /** 推进方式 */
  progressMode: ProgressMode | null
  /** 错误信息 */
  error: string | null
  /** 加载状态 */
  isLoading: boolean
  /** 当前操作描述 */
  currentOperation: string
}

// ============================================================================
// API 请求/响应类型
// ============================================================================

/**
 * 开始导演模式请求
 */
export interface StartDirectorModeRequest {
  /** 灵感文本 */
  inspiration: string
  /** 初始候选数量 */
  initialCandidateCount?: number
}

/**
 * 开始导演模式响应
 */
export interface StartDirectorModeResponse {
  /** 候选方案列表 */
  candidates: DirectionCandidate[]
  /** 会话ID */
  sessionId: string
}

/**
 * 选择方案请求
 */
export interface SelectCandidateRequest {
  /** 方案ID */
  candidateId: string
  /** 推进方式 */
  progressMode: ProgressMode
  /** 自动推进配置 */
  autoProgressConfig?: AutoProgressConfig
}

/**
 * 选择方案响应
 */
export interface SelectCandidateResponse {
  /** 是否成功 */
  success: boolean
  /** 下一步操作提示 */
  nextStepHint: string
  /** 工作流ID */
  workflowId?: string
}

// ============================================================================
// 灵感输入提示类型
// ============================================================================

/**
 * 灵感输入提示
 */
export interface InspirationPrompt {
  /** 提示标题 */
  title: string
  /** 提示描述 */
  description: string
  /** 示例文本 */
  example: string
  /** 提示分类 */
  category: 'character' | 'plot' | 'setting' | 'theme' | 'style'
}

/**
 * 预设灵感提示列表
 */
export const INSPIRATION_PROMPTS: InspirationPrompt[] = [
  {
    title: '主角觉醒',
    description: '普通少年意外获得神秘力量，踏上修仙之路',
    example: '一个普通少年意外获得神秘力量，踏上修仙之路',
    category: 'character',
  },
  {
    title: '重生复仇',
    description: '主角重生回到过去，利用前世记忆改变命运',
    example: '主角重生回到十年前，誓要改变家族被灭的命运',
    category: 'plot',
  },
  {
    title: '穿越异界',
    description: '现代人穿越到异世界，利用现代知识开创事业',
    example: '程序员穿越到魔法世界，用编程思维改造魔法体系',
    category: 'setting',
  },
  {
    title: '都市异能',
    description: '现代都市中隐藏的异能者世界',
    example: '看似普通的快递员，其实是隐藏在都市中的异能者',
    category: 'setting',
  },
  {
    title: '玄幻争霸',
    description: '在强者为尊的世界中崛起争霸',
    example: '废柴少年觉醒远古血脉，誓要成为万界至尊',
    category: 'theme',
  },
]
