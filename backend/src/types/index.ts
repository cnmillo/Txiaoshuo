// 扩展共享类型
import type { StyleConfig } from './shared.js'

// 重新导出共享类型
export type { Novel, StyleConfig, NarrativePerspective } from './shared.js'

// 重新导出新创建的共享类型
export type {
  Template,
  TemplateFilter,
  StyleGuideData,
  ReviewReportData,
  ConsistencySection,
  ReviewCriteria,
  AIFeatures,
  RewriteResult,
  OptimizeResult,
  HumanizeResult,
  HumanizeParagraphsResult,
  HumanizeChapterResult,
  QualityTask,
  QualityResult,
  FeatureOption,
  IntensityLevel,
  GenreOption,
  ChapterVersion,
  ConsistencyCheck
} from '@novel-generator/shared'

// 章节类型
export interface Chapter {
  id: string
  novelId: string
  title: string
  content?: string
  description?: string
  orderIndex: number
  wordCount?: number
  createdAt: string
  updatedAt: string
}

// AI配置类型
export interface AIConfig {
  apiKey: string
  baseUrl: string
  model: string
  customModelName?: string
  temperature?: number
  maxTokens?: number
  selectedCustomModelId?: string
  fallback?: {
    apiKey: string
    baseUrl: string
    model: string
  }
}

// AI润色设置类型
export interface HumanizeConfig {
  intensity?: 'light' | 'medium' | 'strong' | 'auto'
  enableStyleOptimization?: boolean
  genre?: string
  preservePhrases?: string[]
  targetAudience?: 'young' | 'adult' | 'general'
  mode?: 'rewrite' | 'optimize' | 'full'
  autoPolish?: boolean
  polishIntensity?: 'light' | 'medium' | 'deep'
}

// 应用设置类型
export interface AppSettings {
  aiConfig?: AIConfig
  curlConfig?: CurlConfig
  customModels?: CustomModel[]
  humanizeConfig?: HumanizeConfig
  theme?: 'light' | 'dark' | 'auto'
  language?: string
}

// API响应类型
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  message?: string
  code?: string
}

// 导出格式类型
export type ExportFormat = 'txt' | 'pdf' | 'epub'

// CURL配置 (已废弃，保留向后兼容)
/** @deprecated 使用 CustomModel 替代 */
export interface CurlConfig {
  useCustomCurl: boolean
  curlCommand: string
}

// 自定义OpenAI兼容模型配置
export interface CustomModel {
  id: string
  name: string
  baseUrl: string
  apiKey: string
  modelId: string
  createdAt: string
  lastTestAt?: string
  testStatus?: 'success' | 'failed' | 'untested'
  failCount?: number
  lastFailAt?: string
}

export interface DatabaseNovel {
  id: string
  title: string
  type: string
  status: 'generating' | 'completed' | 'failed' | 'draft'
  word_count: number
  target_word_count: number
  prompt?: string
  content?: string
  outline?: string
  description?: string
  style?: string
  styleConfig?: string
  error?: string
  totalChapterCount?: number
  generatedChapterCount?: number
  lastFailedChapterIndex?: number
  lastFailureReason?: string
  created_at: string
  updated_at: string
}

export interface DatabaseChapter {
  id: string
  novel_id: string
  title: string
  content: string
  description?: string
  order_index: number
  word_count: number
  created_at: string
  updated_at: string
}

export interface DatabaseSetting {
  key: string
  value: string
}

export interface DatabaseTemplate {
  id: string
  name: string
  type: string
  content: string
  created_at: string
}

export interface GenerateProgress {
  id: string
  novelId: string
  status: 'pending' | 'generating' | 'completed' | 'failed' | 'cancelled'
  progress: number
  currentChapter?: number
  totalChapters?: number
  message?: string
  error?: string
  createdAt: string
  updatedAt: string
}

export interface NovelFilter {
  search?: string
  type?: string
  status?: string
  sortBy?: 'created_at' | 'updated_at' | 'word_count' | 'title'
  sortOrder?: 'asc' | 'desc'
}

export interface PaginationParams {
  page: number
  limit: number
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface StatsData {
  totalNovels: number
  totalChapters: number
  totalWords: number
  novelsByStatus: Record<string, number>
  novelsByType: Record<string, number>
  recentNovels: number
}

export interface ExportOptions {
  includeTitle?: boolean
  includeAuthor?: boolean
  authorName?: string
}

// 导出格式类型
export type ExportFormatType = 'txt' | 'md' | 'html' | 'epub' | 'pdf'

// 字体设置
export interface FontSettings {
  family: string
  size: number
  lineHeight: number
  color: string
}

// 页面边距
export interface PageMargins {
  top: number
  right: number
  bottom: number
  left: number
}

// 页面设置
export interface PageSettings {
  size: 'A4' | 'A5' | 'B5' | 'letter' | 'legal'
  orientation: 'portrait' | 'landscape'
  margins: PageMargins
}

// 封面设置
export interface CoverSettings {
  enabled: boolean
  title: string
  subtitle?: string
  author?: string
  description?: string
  backgroundColor?: string
  textColor?: string
  imageUrl?: string
}

// 章节设置
export interface ChapterSettings {
  numbering: boolean
  separator: string
  pageBreak: boolean
  includeSummary: boolean
}

// 页眉页脚设置
export interface HeaderFooterSettings {
  headerEnabled: boolean
  headerText?: string
  footerEnabled: boolean
  footerText?: string
  pageNumberEnabled: boolean
  pageNumberPosition: 'center' | 'left' | 'right'
}

// 完整导出选项
export interface FullExportOptions {
  format: ExportFormatType
  includeTitle: boolean
  includeAuthor: boolean
  authorName: string
  selectedChapters?: number[]
  chapterRange?: { start: number; end: number }
  font: FontSettings
  page: PageSettings
  cover: CoverSettings
  chapter: ChapterSettings
  headerFooter: HeaderFooterSettings
  template?: string
  metadata?: {
    title?: string
    author?: string
    description?: string
    keywords?: string[]
    language?: string
    publisher?: string
    rights?: string
  }
}

// AI提供商配置
export interface AIProvider {
  id?: string
  name: string
  baseUrl: string
  models: string[]
  defaultModel: string
  apiKeyFormat: string
  docsUrl: string
}

// CURL配置
export interface CurlConfig {
  useCustomCurl: boolean
  curlCommand: string
}

// 小说类型
export type NovelGenre =
  | 'fantasy'      // 玄幻
  | 'wuxia'        // 武侠
  | 'xianxia'      // 仙侠
  | 'romance'      // 言情
  | 'scifi'        // 科幻
  | 'mystery'      // 悬疑
  | 'history'      // 历史
  | 'urban'        // 都市
  | 'game'         // 游戏
  | 'horror'       // 恐怖
  | 'military'     // 军事
  | 'general'      // 一般

// 小说长度
export type NovelLength = 'short' | 'medium' | 'long' | 'epic'

// 生成请求参数
export interface GenerateNovelParams {
  title: string
  prompt: string
  style?: string
  styleConfig?: StyleConfig
  wordCount?: number
  type?: NovelGenre
  length?: NovelLength
}

// 从大纲生成参数
export interface GenerateFromOutlineParams {
  novelId?: string
  title: string
  outline: string
  style?: string
  styleConfig?: StyleConfig
  wordCount?: number
  type?: NovelGenre
}

// 批量生成参数
export interface BatchGenerateParams {
  novelId: string
  startChapter: number
  endChapter: number
  outline: string
}

// 续写参数
export interface ContinueNovelParams {
  novelId: string
  chaptersToAdd: number
}

// 生成大纲参数
export interface GenerateOutlineParams {
  title: string
  prompt: string
  genre?: NovelGenre
  length?: NovelLength
}

// 生成章节参数
export interface GenerateChapterParams {
  title: string
  chapterNumber: number
  chapterTitle: string
  outline: string
  previousContent?: string
  targetWords?: number
  genre?: NovelGenre
  style?: string
  styleConfig?: StyleConfig
}

// 自定义CURL请求参数
export interface CustomCurlParams {
  command: string
  prompt: string
}

// 解析CURL参数
export interface ParseCurlParams {
  command: string
}

// AI生成请求参数
export interface AIGenerateParams {
  prompt: string
  systemPrompt?: string
  temperature?: number
  maxTokens?: number
}

// 流式响应数据
export interface StreamResponse {
  content?: string
  error?: string
  done?: boolean
}

// 人物设定类型
export interface Character {
  id: string
  name: string
  age: number
  gender: 'male' | 'female' | 'other'
  personality: string
  background: string
  appearance: string
  goals: string[]
  fears: string[]
  skills: string[]
  relationships: string[] // 关联的人物ID
  role: string
  importance: 'main' | 'supporting' | 'minor'
  // 人类化语言风格
  languageStyle?: string // 语言风格描述
  catchphrase?: string | string[] // 口头禅
  dialectHint?: string // 方言元素
}

// 关系类型
export interface Relationship {
  id: string
  character1Id: string
  character2Id: string
  type: 'family' | 'friend' | 'enemy' | 'lover' | 'colleague' | 'other'
  description: string
  strength: number // 1-10
}

// 世界观设定类型
export interface Worldview {
  id: string
  name: string
  description: string
  setting: {
    time: string
    location: string
    technologyLevel: string
    magicSystem?: string
    socialStructure: string
    keyElements: string[]
  }
  rules: string[]
  factions: Faction[]
}

// 派系类型
export interface Faction {
  id: string
  name: string
  description: string
  leader?: string // 人物ID
  goals: string[]
  allies: string[] // 其他派系ID
  enemies: string[] // 其他派系ID
}

// 情节点类型
export interface PlotPoint {
  id: string
  title: string
  description: string
  chapter?: number
  characters: string[] // 涉及的人物ID
  importance: 'major' | 'minor'
  impact: string
  choices?: string[]
  consequences?: string[]
  orderIndex: number
}

// 故事主线类型
export interface StoryArc {
  id: string
  title: string
  description: string
  startPoint: string // 情节点ID
  endPoint: string // 情节点ID
  plotPoints: string[] // 情节点ID数组
  theme: string
  conflict: string
  resolution: string
}

// 故事规划类型
export interface StoryPlan {
  id: string
  title: string
  description: string
  characters: Character[]
  relationships: Relationship[]
  worldview: Worldview
  storyArcs: StoryArc[]
  plotPoints: PlotPoint[]
  createdAt: string
  updatedAt: string
}

// 生成故事规划请求
export interface GenerateStoryPlanRequest {
  title: string
  prompt: string
  genre: NovelGenre
  characterCount?: number
  plotPointCount?: number
}

// 生成故事规划响应
export interface GenerateStoryPlanResponse {
  id: string
  plan: StoryPlan
  message?: string
}

// ============================================================================
// 润色相关类型
// ============================================================================

// 润色模式
export type PolishMode = 'good-writing' | 'de-AI-writing'

// 风格审计结果
export interface StyleAuditResult {
  overallScore: number // 总体风格评分 (0-100)
  aiFeatureCount: number // AI特征总数
  severityBreakdown: {
    high: number
    medium: number
    low: number
  }
  features: AIFeatureType[]
  suggestions: string[]
}

// AI特征类型
export interface AIFeatureType {
  type: string
  description: string
  examples: string[]
  position: number
  severity: 'high' | 'medium' | 'low'
}

// 润色结果（扩展版）
export interface PolishResultExtended {
  originalContent: string
  polishedContent: string
  aiFeaturesDetected: AIFeatureType[]
  improvements: string[]
  wordCountBefore: number
  wordCountAfter: number
  styleAudit?: StyleAuditResult
  mode: PolishMode
}


