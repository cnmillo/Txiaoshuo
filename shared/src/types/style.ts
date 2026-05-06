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

// 叙事视角
export type NarrativePerspective =
  | 'first_person'     // 第一人称
  | 'third_person'     // 第三人称
  | 'omniscient'       // 全知视角
  | 'limited'          // 有限视角

// 语言风格
export type LanguageStyle =
  | 'classical'        // 古典
  | 'modern'           // 现代
  | 'colloquial'       // 口语化
  | 'literary'         // 文艺
  | 'concise'          // 简洁

// 描写风格
export type DescriptionStyle =
  | 'detailed'         // 细腻
  | 'concise'          // 简洁
  | 'ornate'           // 华丽
  | 'vivid'            // 生动
  | 'atmospheric'      // 氛围感

// 节奏风格
export type PacingStyle =
  | 'fast'             // 快节奏
  | 'moderate'         // 适中
  | 'slow'             // 慢节奏
  | 'variable'         // 变化多端

// 对话风格
export type DialogueStyle =
  | 'natural'          // 自然
  | 'witty'            // 机智
  | 'formal'           // 正式
  | 'humorous'         // 幽默
  | 'dramatic'         // 戏剧化

// 风格配置
export interface StyleConfig {
  genre: NovelGenre
  perspective: NarrativePerspective
  language: LanguageStyle
  description: DescriptionStyle
  pacing: PacingStyle
  dialogue: DialogueStyle
}

// 风格定义
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

// 创建风格请求
export interface CreateStyleRequest {
  name: string
  description?: string
  config: StyleConfig
  promptTemplate?: string
  sampleText?: string
}

// 更新风格请求
export interface UpdateStyleRequest {
  name?: string
  description?: string
  config?: Partial<StyleConfig>
  promptTemplate?: string
  sampleText?: string
}

// 风格模板
export interface StyleTemplate {
  id: string
  name: string
  description: string
  genre: NovelGenre
  config: StyleConfig
  promptTemplate: string
  sampleText: string
}

// 风格预览请求
export interface PreviewStyleRequest {
  config: StyleConfig
  prompt?: string
}

// 风格预览响应
export interface PreviewStyleResponse {
  sampleText: string
  promptPreview: string
}

// 风格列表筛选
export interface StyleFilter {
  genre?: NovelGenre
  isCustom?: boolean
  search?: string
}

// 风格应用结果
export interface StyleApplication {
  styleId: string
  styleName: string
  promptText: string
  parameters: Record<string, unknown>
}

// 风格一致性检查
export interface StyleConsistencyCheck {
  styleId: string
  content: string
  isConsistent: boolean
  issues?: string[]
  suggestions?: string[]
}

// 风格统计
export interface StyleStats {
  totalStyles: number
  customStyles: number
  defaultStyles: number
  stylesByGenre: Record<NovelGenre, number>
}

// 风格选项（用于下拉选择）
export interface StyleOption {
  value: string
  label: string
  description?: string
  group?: string
}

// 风格配置选项组
export interface StyleConfigOptions {
  genres: StyleOption[]
  perspectives: StyleOption[]
  languages: StyleOption[]
  descriptions: StyleOption[]
  pacings: StyleOption[]
  dialogues: StyleOption[]
}
