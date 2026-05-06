// 从style.ts导入所有类型
import * as StyleTypes from './style.js'

// 重新导出style.ts中的所有类型
export * from './style.js'

// 重新导出新创建的类型模块
export * from './template.js'
export * from './review.js'
export * from './humanize.js'
export * from './quality.js'
export * from './common.js'
export * from './writingStyle.js'

// 大纲节点类型
export interface OutlineNode {
  id: string
  title: string
  content?: string
  children: OutlineNode[]
  orderIndex: number
}

// 小说类型
export interface Novel {
  id: string
  title: string
  prompt: string
  content?: string
  outline?: string
  structuredOutline?: OutlineNode[]
  templateId?: string
  style?: string
  styleConfig?: StyleTypes.StyleConfig
  wordCount?: number
  targetWordCount: number
  status: 'generating' | 'completed' | 'failed'
  error?: string
  description?: string
  generatedChapterCount?: number
  totalChapterCount?: number
  lastFailedChapterIndex?: number
  lastFailureReason?: string
  createdAt: string
  updatedAt: string
}

// 章节类型
export interface Chapter {
  id: string
  novelId: string
  title: string
  content?: string
  description?: string  // 章节描述/摘要信息
  orderIndex: number
  wordCount?: number
  createdAt: string
  updatedAt: string
}

// 生成小说请求
export interface GenerateNovelRequest {
  title: string
  prompt: string
  templateId?: string
  style?: string
  styleConfig?: StyleTypes.StyleConfig
  wordCount?: number
  outline?: string
  structuredOutline?: OutlineNode[]
  images?: string[]
  imageDescriptions?: string[]
  logicRequirements?: string
}

// 生成小说响应
export interface GenerateNovelResponse {
  id: string
  message?: string
}

// AI配置类型
export interface AIConfig {
  apiKey: string
  baseUrl: string
  model: string
  customModelName?: string
  temperature?: number
  maxTokens?: number
}

// 自定义CURL配置
export interface CurlConfig {
  useCustomCurl: boolean
  curlCommand: string
}

// 应用设置类型
export interface AppSettings {
  aiConfig?: AIConfig
  curlConfig?: CurlConfig
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

// 小说风格类型
export type NovelStyle =
  | 'fantasy'
  | 'wuxia'
  | 'xianxia'
  | 'romance'
  | 'scifi'
  | 'mystery'
  | 'history'
  | 'urban'
  | 'game'
  | 'military'
  | 'sports'
  | 'lifestyle'
  | 'horror'
  | 'fantasy_western'
  | 'other'

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
  catchphrase?: string // 口头禅
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
  genre: NovelStyle
  characterCount?: number
  plotPointCount?: number
}

// 生成故事规划响应
export interface GenerateStoryPlanResponse {
  id: string
  plan: StoryPlan
  message?: string
}
