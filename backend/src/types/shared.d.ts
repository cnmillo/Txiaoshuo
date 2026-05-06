// 共享类型声明

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

export type NarrativePerspective = 
  | 'first_person'     // 第一人称
  | 'third_person'     // 第三人称
  | 'omniscient'       // 全知视角
  | 'limited'          // 有限视角

export type LanguageStyle = 
  | 'classical'        // 古典
  | 'modern'           // 现代
  | 'colloquial'       // 口语化
  | 'literary'         // 文艺
  | 'concise'          // 简洁

export type DescriptionStyle = 
  | 'detailed'         // 细腻
  | 'concise'          // 简洁
  | 'ornate'           // 华丽
  | 'vivid'            // 生动
  | 'atmospheric'      // 氛围感

export type PacingStyle = 
  | 'fast'             // 快节奏
  | 'moderate'         // 适中
  | 'slow'             // 慢节奏
  | 'variable'         // 变化多端

export type DialogueStyle = 
  | 'natural'          // 自然
  | 'witty'            // 机智
  | 'formal'           // 正式
  | 'humorous'         // 幽默
  | 'dramatic'         // 戏剧化

export interface StyleConfig {
  genre: NovelGenre
  perspective: NarrativePerspective
  language: LanguageStyle
  description: DescriptionStyle
  pacing: PacingStyle
  dialogue: DialogueStyle
}

export interface Style {
  id: string
  name: string
  description?: string
  config: StyleConfig
  promptTemplate?: string
  sampleText?: string
  isCustom: boolean
  isDefault?: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateStyleRequest {
  name: string
  description?: string
  config: StyleConfig
  promptTemplate?: string
  sampleText?: string
}

export interface UpdateStyleRequest {
  name?: string
  description?: string
  config?: Partial<StyleConfig>
  promptTemplate?: string
  sampleText?: string
}

export interface StyleTemplate {
  id: string
  name: string
  description: string
  genre: NovelGenre
  config: StyleConfig
  promptTemplate: string
  sampleText: string
}

export interface StyleFilter {
  genre?: NovelGenre
  isCustom?: boolean
  search?: string
}

export interface StyleStats {
  totalStyles: number
  customStyles: number
  defaultStyles: number
  stylesByGenre: Record<NovelGenre, number>
}

export interface StyleConsistencyCheck {
  styleId: string
  content: string
  isConsistent: boolean
  issues?: string[]
  suggestions?: string[]
}

export interface StyleOption {
  value: string
  label: string
  description?: string
  group?: string
}

export interface StyleConfigOptions {
  genres: StyleOption[]
  perspectives: StyleOption[]
  languages: StyleOption[]
  descriptions: StyleOption[]
  pacings: StyleOption[]
  dialogues: StyleOption[]
}

export interface OutlineNode {
  id: string
  title: string
  content?: string
  children: OutlineNode[]
  orderIndex: number
}

export interface Novel {
  id: string
  title: string
  prompt: string
  content?: string
  outline?: string
  structuredOutline?: OutlineNode[]
  style?: string
  styleConfig?: StyleConfig
  wordCount?: number
  targetWordCount: number
  status: 'generating' | 'completed' | 'failed'
  description?: string
  createdAt: string
  updatedAt: string
}

export interface GenerateNovelRequest {
  title: string
  prompt: string
  style?: string
  styleConfig?: StyleConfig
  wordCount?: number
  outline?: string
  structuredOutline?: OutlineNode[]
  templateId?: string
}

// 写作模板相关类型
export interface WritingTemplateStructure {
  title: string
  chapters?: Array<{
    title: string
    sections: string[]
  }>
  sections?: string[]
}

export interface WritingTemplate {
  id: string
  name: string
  description: string
  type: 'novel' | 'short_story' | 'poetry' | 'article'
  structure: WritingTemplateStructure
  guidelines?: string[]
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

export interface WritingTemplateCreate {
  name: string
  description: string
  type: 'novel' | 'short_story' | 'poetry' | 'article'
  structure: WritingTemplateStructure
  guidelines?: string[]
}

export interface WritingTemplateUpdate {
  name?: string
  description?: string
  type?: 'novel' | 'short_story' | 'poetry' | 'article'
  structure?: WritingTemplateStructure
  guidelines?: string[]
}

export interface StyleGuide {
  templateId: string
  templateName: string
  structureGuide: string[]
  writingTips: string[]
  styleSuggestions: string[]
  examples: string[]
}

export interface TemplateFilter {
  type?: string
  search?: string
}
