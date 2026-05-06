/**
 * 写法引擎类型定义
 * 
 * 包含写法资产、特征提取、写法绑定等相关类型
 */

// ============================================================================
// 写法特征类型
// ============================================================================

/**
 * 句式特征
 */
export interface SentenceFeature {
  type: 'sentence'
  // 长短句比例
  longSentenceRatio: number // 0-1
  shortSentenceRatio: number // 0-1
  // 句子复杂度
  averageSentenceLength: number
  complexSentenceRatio: number // 复杂句占比
  // 句式多样性
  sentenceVariety: number // 0-100
  // 特殊句式
  rhetoricalQuestions: boolean // 反问句
  exclamatorySentences: boolean // 感叹句
  parallelSentences: boolean // 排比句
  // 描述
  description: string
}

/**
 * 用词习惯特征
 */
export interface VocabularyFeature {
  type: 'vocabulary'
  // 常用词汇
  frequentWords: Array<{
    word: string
    frequency: number
    category: string
  }>
  // 修辞手法
  rhetoricalDevices: Array<{
    type: 'metaphor' | 'simile' | 'personification' | 'exaggeration' | 'parallelism' | 'other'
    frequency: number
    examples: string[]
  }>
  // 词汇丰富度
  vocabularyRichness: number // 0-100
  // 古典/现代词汇比例
  classicalRatio: number // 0-1
  modernRatio: number // 0-1
  // 描述
  description: string
}

/**
 * 情感表达特征
 */
export interface EmotionFeature {
  type: 'emotion'
  // 情感基调
  emotionalTone: 'positive' | 'negative' | 'neutral' | 'mixed'
  // 情感强度
  emotionalIntensity: number // 0-100
  // 情感表达方式
  expressionStyle: 'direct' | 'implicit' | 'subtle' | 'intense'
  // 常见情感类型
  commonEmotions: Array<{
    emotion: string
    frequency: number
  }>
  // 描述
  description: string
}

/**
 * 节奏控制特征
 */
export interface RhythmFeature {
  type: 'rhythm'
  // 整体节奏
  overallPacing: 'fast' | 'moderate' | 'slow' | 'variable'
  // 段落节奏
  paragraphRhythm: {
    averageParagraphLength: number
    shortParagraphRatio: number
    longParagraphRatio: number
  }
  // 章节节奏
  chapterRhythm: {
    cliffhangerFrequency: number // 悬念频率
    tensionBuildup: string // 紧张感构建方式
  }
  // 描述
  description: string
}

/**
 * 视角运用特征
 */
export interface PerspectiveFeature {
  type: 'perspective'
  // 主要视角
  primaryPerspective: 'first_person' | 'third_person_limited' | 'third_person_omniscient'
  // 视角切换
  perspectiveSwitching: boolean
  switchFrequency: number // 切换频率
  // 内心独白
  innerMonologue: {
    frequency: number
    style: 'stream_of_consciousness' | 'organized' | 'mixed'
  }
  // 描述
  description: string
}

/**
 * 写法特征联合类型
 */
export type WritingStyleFeature =
  | SentenceFeature
  | VocabularyFeature
  | EmotionFeature
  | RhythmFeature
  | PerspectiveFeature

/**
 * 特征提取结果
 */
export interface FeatureExtractionResult {
  id: string
  sourceText: string
  features: WritingStyleFeature[]
  extractedAt: string
  confidence: number // 0-1
  metadata?: {
    textLength: number
    chapterCount?: number
    genre?: string
  }
}

// ============================================================================
// 写法资产类型
// ============================================================================

/**
 * 写法资产
 */
export interface WritingStyleAsset {
  id: string
  name: string
  description: string
  // 风格标签
  styleTags: string[]
  // 适用场景
  applicableScenes: string[]
  // 特征池
  featurePool: WritingStyleFeature[]
  // 参考文本
  referenceText?: string
  // 示例文本
  sampleText?: string
  // 提示词模板
  promptTemplate?: string
  // 是否自定义
  isCustom: boolean
  // 是否默认
  isDefault?: boolean
  // 使用统计
  usageStats: {
    totalUsage: number
    lastUsedAt?: string
    averageRating?: number
  }
  // 创建和更新时间
  createdAt: string
  updatedAt: string
}

/**
 * 创建写法资产请求
 */
export interface CreateWritingStyleRequest {
  name: string
  description: string
  styleTags: string[]
  applicableScenes: string[]
  featurePool?: WritingStyleFeature[]
  referenceText?: string
  sampleText?: string
  promptTemplate?: string
}

/**
 * 更新写法资产请求
 */
export interface UpdateWritingStyleRequest {
  name?: string
  description?: string
  styleTags?: string[]
  applicableScenes?: string[]
  featurePool?: WritingStyleFeature[]
  referenceText?: string
  sampleText?: string
  promptTemplate?: string
}

/**
 * 写法资产筛选条件
 */
export interface WritingStyleFilter {
  search?: string
  styleTags?: string[]
  applicableScenes?: string[]
  isCustom?: boolean
}

/**
 * 写法资产统计
 */
export interface WritingStyleStats {
  totalAssets: number
  customAssets: number
  defaultAssets: number
  assetsByScene: Record<string, number>
  assetsByTag: Record<string, number>
  mostUsedAssets: Array<{
    id: string
    name: string
    usageCount: number
  }>
}

// ============================================================================
// 写法绑定类型
// ============================================================================

/**
 * 写法绑定目标类型
 */
export type BindingTargetType = 'novel' | 'chapter' | 'volume'

/**
 * 写法绑定
 */
export interface WritingStyleBinding {
  id: string
  writingStyleId: string
  targetType: BindingTargetType
  targetId: string
  // 绑定配置
  config: {
    // 应用强度
    intensity: 'light' | 'medium' | 'strong'
    // 特征权重
    featureWeights?: Record<string, number>
    // 自定义调整
    customAdjustments?: string
  }
  // 创建时间
  createdAt: string
  updatedAt: string
}

/**
 * 创建写法绑定请求
 */
export interface CreateWritingStyleBindingRequest {
  writingStyleId: string
  targetType: BindingTargetType
  targetId: string
  config: {
    intensity: 'light' | 'medium' | 'strong'
    featureWeights?: Record<string, number>
    customAdjustments?: string
  }
}

/**
 * 写法绑定预览
 */
export interface WritingStyleBindingPreview {
  binding: WritingStyleBinding
  writingStyle: WritingStyleAsset
  targetInfo: {
    type: BindingTargetType
    id: string
    name: string
  }
  expectedEffect: string
}

// ============================================================================
// 特征池管理类型
// ============================================================================

/**
 * 特征池项
 */
export interface FeaturePoolItem {
  id: string
  feature: WritingStyleFeature
  isEnabled: boolean
  weight: number // 0-1
  source: 'extracted' | 'manual' | 'template'
  createdAt: string
}

/**
 * 特征组合
 */
export interface FeatureCombination {
  id: string
  name: string
  description: string
  features: Array<{
    featureId: string
    weight: number
  }>
  createdAt: string
  updatedAt: string
}

/**
 * 特征提取请求
 */
export interface ExtractFeaturesRequest {
  text: string
  options?: {
    extractSentence?: boolean
    extractVocabulary?: boolean
    extractEmotion?: boolean
    extractRhythm?: boolean
    extractPerspective?: boolean
    customPrompt?: string
  }
}

/**
 * 特征提取响应
 */
export interface ExtractFeaturesResponse {
  result: FeatureExtractionResult
  suggestions: string[]
}

// ============================================================================
// 写法预览和应用类型
// ============================================================================

/**
 * 写法应用效果预览
 */
export interface WritingStylePreviewResult {
  writingStyleId: string
  sampleText: string
  appliedText: string
  changes: Array<{
    type: string
    before: string
    after: string
    reason: string
  }>
  score: number // 0-100
  feedback: string
}

/**
 * 写法应用请求
 */
export interface ApplyWritingStyleRequest {
  writingStyleId: string
  text: string
  config: {
    intensity: 'light' | 'medium' | 'strong'
    preservePhrases?: string[]
    customAdjustments?: string
  }
}

/**
 * 写法应用响应
 */
export interface ApplyWritingStyleResponse {
  result: string
  changes: Array<{
    type: string
    position: number
    before: string
    after: string
  }>
  statistics: {
    originalLength: number
    resultLength: number
    changeCount: number
  }
}

// ============================================================================
// 写法模板类型
// ============================================================================

/**
 * 写法模板
 */
export interface WritingStyleTemplate {
  id: string
  name: string
  description: string
  genre: string
  features: WritingStyleFeature[]
  promptTemplate: string
  sampleText: string
  tags: string[]
}

// ============================================================================
// 导入导出类型
// ============================================================================

/**
 * 写法资产导出数据
 */
export interface WritingStyleExportData {
  version: string
  exportedAt: string
  assets: WritingStyleAsset[]
  featureCombinations?: FeatureCombination[]
}

/**
 * 写法资产导入结果
 */
export interface WritingStyleImportResult {
  success: boolean
  importedCount: number
  skippedCount: number
  errors: Array<{
    assetName: string
    error: string
  }>
}

// ============================================================================
// UI 相关类型
// ============================================================================

/**
 * 写法资产选项（用于下拉选择）
 */
export interface WritingStyleOption {
  value: string
  label: string
  description?: string
  tags?: string[]
}

/**
 * 特征类型选项
 */
export interface FeatureTypeOption {
  value: WritingStyleFeature['type']
  label: string
  description: string
  icon?: string
}

/**
 * 写法配置选项组
 */
export interface WritingStyleConfigOptions {
  intensityLevels: Array<{
    value: 'light' | 'medium' | 'strong'
    label: string
    description: string
  }>
  featureTypes: FeatureTypeOption[]
  sceneOptions: Array<{
    value: string
    label: string
  }>
  styleTagOptions: Array<{
    value: string
    label: string
  }>
}
