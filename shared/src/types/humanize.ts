/**
 * 检测到的AI特征
 */
export interface DetectedFeature {
  /** 特征类型 */
  type: string
  /** 特征描述 */
  description: string
  /** 严重程度 (1-5) */
  severity: number
  /** 出现次数 */
  count: number
  /** 示例 */
  examples: string[]
  /** 影响范围 */
  impact: 'low' | 'medium' | 'high'
}

/**
 * 段落问题
 */
export interface ParagraphIssue {
  /** 段落索引 */
  index: number
  /** 段落内容 */
  content: string
  /** 问题类型 */
  issues: string[]
  /** 建议改写 */
  suggestedRewrite?: string
  /** 问题严重程度 */
  severity: number
}

/**
 * AI特征检测结果
 */
export interface AIFeatures {
  /** AI痕迹分数 (0-100) */
  score: number
  /** 检测到的AI特征列表 */
  features: DetectedFeature[]
  /** 需要改写的段落 */
  paragraphsToRewrite: ParagraphIssue[]
  /** 总体评估 */
  assessment: string
  /** 建议 */
  suggestions: string[]
  /** 原创度评估 */
  originalityScore: number
  /** 详细分析 */
  detailedAnalysis: {
    sentenceVariety: number
    vocabularyDiversity: number
    emotionalDepth: number
    structuralComplexity: number
  }
}

export interface RewriteResult {
  text: string
  changes: string[]
}

export interface OptimizeResult {
  text: string
  improvements: string[]
}

export interface HumanizeResult {
  processedText: string
  originalScore: number
  processedScore: number
  improvement: number
  processingSteps: ProcessingStep[]
  processingTime: number
  suggestions: string[]
  statistics: {
    originalLength: number
    processedLength: number
    replacedPhrases: number
    restructuredSentences: number
    appliedRules: number
    styleAdjustments: number
  }
}

export interface ProcessingStep {
  name: string
  description: string
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'skipped'
  duration?: number
  result?: string
}

export interface HumanizeParagraphsResult {
  paragraphCount: number
  paragraphs: Array<{
    index: number
    originalParagraph: string
    processedParagraph: string
    scoreChange: number
    modifications: string[]
  }>
  summary: {
    totalParagraphs: number
    improvedParagraphs: number
    averageImprovement: number
  }
}

export interface HumanizeChapterResult {
  chapterId: string
  chapterTitle: string
  processedText: string
  originalScore: number
  processedScore: number
  improvement: number
  paragraphCount: number
  processingTime: number
  suggestions: string[]
}
