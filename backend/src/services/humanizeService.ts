/**
 * 去除AI味服务
 * 整合检测和改写功能，提供一键去除AI味功能
 */

import logger from '../utils/logger.js'
import {
  detectAIFeatures,
  getAIScore,
  type AIFeatureDetectionResult
} from './aiDetector.js'
import {
  rewriteText,
  rewriteBasedOnFeatures,
  type RewriteResult,
  type RewriteOptions
} from './textRewriter.js'
import {
  optimizeStyle,
  type StyleOptimizationResult,
  type StyleOptimizationOptions
} from './styleOptimizer.js'
import {
  detectAntiTemplateViolations,
  type AntiTemplateDetectionResult
} from '../utils/antiTemplateConstraints.js'
import type { NovelGenre } from '../types/index.js'

/**
 * 去除AI味结果
 */
export interface HumanizeResult {
  /** 处理后的文本 */
  processedText: string
  /** 原始AI痕迹分数 */
  originalScore: number
  /** 处理后AI痕迹分数 */
  processedScore: number
  /** 改进程度 */
  improvement: number
  /** 检测详情 */
  detection: AIFeatureDetectionResult
  /** 改写详情 */
  rewrite: RewriteResult
  /** 风格优化详情 */
  styleOptimization?: StyleOptimizationResult
  /** 原始文本反模板约束检测 */
  originalAntiTemplateDetection?: AntiTemplateDetectionResult
  /** 处理后文本反模板约束检测 */
  processedAntiTemplateDetection?: AntiTemplateDetectionResult
  /** 处理步骤 */
  processingSteps: ProcessingStep[]
  /** 处理时间 (毫秒) */
  processingTime: number
  /** 建议 */
  suggestions: string[]
  /** 原创度评估 */
  originalityScore: number
  /** 语义保持度 */
  fidelityScore: number
}

/**
 * 批量处理结果
 */
export interface BatchHumanizeResult {
  /** 处理结果列表 */
  results: HumanizeResult[]
  /** 总处理时间 (毫秒) */
  totalTime: number
  /** 平均改进程度 */
  averageImprovement: number
  /** 成功数量 */
  successCount: number
  /** 失败数量 */
  failedCount: number
  /** 错误信息 */
  errors: string[]
}

/**
 * 处理步骤
 */
export interface ProcessingStep {
  /** 步骤名称 */
  name: string
  /** 步骤描述 */
  description: string
  /** 执行状态 */
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'skipped'
  /** 执行时间 (毫秒) */
  duration?: number
  /** 结果信息 */
  result?: string
}

/**
 * 段落处理结果
 */
export interface ParagraphHumanizeResult {
  /** 段落索引 */
  index: number
  /** 原始段落 */
  originalParagraph: string
  /** 处理后段落 */
  processedParagraph: string
  /** AI痕迹分数变化 */
  scoreChange: number
  /** 应用的修改 */
  modifications: string[]
}

/**
 * 整章处理结果
 */
export interface ChapterHumanizeResult {
  /** 章节ID */
  chapterId: string
  /** 章节标题 */
  chapterTitle: string
  /** 处理结果 */
  result: HumanizeResult
  /** 段落级处理结果 */
  paragraphResults: ParagraphHumanizeResult[]
  /** 保留的用户修改 */
  preservedUserEdits: UserEdit[]
}

/**
 * 用户编辑记录
 */
export interface UserEdit {
  /** 编辑位置 */
  position: number
  /** 原始内容 */
  originalContent: string
  /** 用户修改内容 */
  userContent: string
  /** 编辑时间 */
  editTime: string
}

/**
 * 去除AI味选项
 */
export interface HumanizeOptions {
  /** 处理强度 */
  intensity?: 'light' | 'medium' | 'strong' | 'auto'
  /** 是否启用风格优化 */
  enableStyleOptimization?: boolean
  /** 小说类型 */
  genre?: NovelGenre
  /** 保留特定短语 */
  preservePhrases?: string[]
  /** 目标读者 */
  targetAudience?: 'young' | 'adult' | 'general'
  /** 处理模式 */
  mode?: 'rewrite' | 'optimize' | 'full'
  /** 用户编辑记录 */
  userEdits?: UserEdit[]
  /** 目标原创度 */
  targetOriginality?: number
}

/**
 * 去除AI味服务类
 */
export class HumanizeService {
  private options: HumanizeOptions

  constructor(options: HumanizeOptions = {}) {
    this.options = {
      intensity: 'auto',
      enableStyleOptimization: true,
      targetAudience: 'general',
      mode: 'full',
      ...options
    }
  }

  /**
   * 一键去除AI味
   */
  async humanize(text: string): Promise<HumanizeResult> {
    const startTime = Date.now()
    const processingSteps: ProcessingStep[] = []

    try {
      logger.info('开始去除AI味处理', { textLength: text.length, intensity: this.options.intensity })

      // 步骤1: AI特征检测
      processingSteps.push({
        name: 'AI特征检测',
        description: '分析文本中的AI写作特征',
        status: 'processing'
      })

      const detectionStart = Date.now()
      const detection = detectAIFeatures(text)
      const detectionDuration = Date.now() - detectionStart

      processingSteps[0].status = 'completed'
      processingSteps[0].duration = detectionDuration
      processingSteps[0].result = `检测到 ${detection.features.length} 种AI特征，AI痕迹分数: ${detection.score}，原创度: ${detection.originalityScore}`

      const originalAntiTemplateDetection = detectAntiTemplateViolations(text)

      processingSteps.push({
        name: '原始文本反模板约束检测',
        description: '检测原始文本中的反模板约束违规',
        status: 'completed',
        duration: 0,
        result: originalAntiTemplateDetection.summary
      })

      const intensity = this.determineIntensity(detection.score)

      // 步骤2: 文本改写
      processingSteps.push({
        name: '文本改写',
        description: '重构句式，替换AI常用词汇',
        status: 'processing'
      })

      const rewriteStart = Date.now()
      const rewrite = rewriteBasedOnFeatures(text, detection.features)
      const rewriteDuration = Date.now() - rewriteStart

      processingSteps[1].status = 'completed'
      processingSteps[1].duration = rewriteDuration
      processingSteps[1].result = `替换了 ${rewrite.statistics.replacedPhrases} 个词汇，重构了 ${rewrite.statistics.restructuredSentences} 个句子，原创度提升: ${rewrite.originalityImprovement}`

      let processedText = rewrite.rewrittenText
      let styleOptimization: StyleOptimizationResult | undefined

      // 步骤3: 风格优化（如果启用）
      if (this.options.enableStyleOptimization && this.options.mode !== 'rewrite') {
        processingSteps.push({
          name: '风格优化',
          description: '优化语言风格，增加人性化表达',
          status: 'processing'
        })

        const styleStart = Date.now()
        const styleOptions: StyleOptimizationOptions = {
          genre: this.options.genre,
          intensity: intensity === 'strong' ? 'strong' : 'medium',
          preserveAuthorStyle: true,
          targetAudience: this.options.targetAudience
        }

        styleOptimization = optimizeStyle(processedText, styleOptions)
        processedText = styleOptimization.optimizedText
        const styleDuration = Date.now() - styleStart

        processingSteps[2].status = 'completed'
        processingSteps[2].duration = styleDuration
        processingSteps[2].result = `应用了 ${styleOptimization.appliedStyles.length} 种风格调整，风格评分: ${styleOptimization.styleScore}`
      } else {
        processingSteps.push({
          name: '风格优化',
          description: '优化语言风格，增加人性化表达',
          status: 'skipped',
          result: '用户选择跳过风格优化'
        })
      }

      // 步骤4: 验证改进效果
      processingSteps.push({
        name: '效果验证',
        description: '验证处理后的AI痕迹分数和原创度',
        status: 'processing'
      })

      const verifyStart = Date.now()
      const processedScore = getAIScore(processedText)
      const finalDetection = detectAIFeatures(processedText)
      const verifyDuration = Date.now() - verifyStart

      const improvement = Math.max(0, detection.score - processedScore)
      const improvementPercent = detection.score > 0 ? (improvement / detection.score) * 100 : 0

      processingSteps[processingSteps.length - 1].status = 'completed'
      processingSteps[processingSteps.length - 1].duration = verifyDuration
      processingSteps[processingSteps.length - 1].result = `AI痕迹分数从 ${detection.score} 降至 ${processedScore}，改进 ${improvementPercent.toFixed(1)}%，原创度从 ${detection.originalityScore} 提升至 ${finalDetection.originalityScore}`

      const processedAntiTemplateDetection = detectAntiTemplateViolations(processedText)

      processingSteps.push({
        name: '处理后反模板约束检测',
        description: '检测处理后文本中残留的反模板约束违规',
        status: 'completed',
        duration: 0,
        result: processedAntiTemplateDetection.summary
      })

      const totalTime = Date.now() - startTime

      // 生成建议
      const suggestions = this.generateSuggestions(detection, processedScore, finalDetection.originalityScore, processedAntiTemplateDetection)

      logger.info('去除AI味处理完成', {
        originalScore: detection.score,
        processedScore,
        improvement: improvementPercent,
        originalOriginality: detection.originalityScore,
        processedOriginality: finalDetection.originalityScore,
        totalTime
      })

      return {
        processedText,
        originalScore: detection.score,
        processedScore,
        improvement: improvementPercent,
        detection,
        rewrite,
        styleOptimization,
        originalAntiTemplateDetection,
        processedAntiTemplateDetection,
        processingSteps,
        processingTime: totalTime,
        suggestions,
        originalityScore: finalDetection.originalityScore,
        fidelityScore: rewrite.fidelityScore
      }
    } catch (error) {
      logger.error('去除AI味处理失败', error)

      // 更新最后一步状态为失败
      if (processingSteps.length > 0) {
        processingSteps[processingSteps.length - 1].status = 'failed'
        processingSteps[processingSteps.length - 1].result = error instanceof Error ? error.message : '未知错误'
      }

      throw new Error('去除AI味处理失败: ' + (error instanceof Error ? error.message : '未知错误'))
    }
  }

  /**
   * 段落级处理
   */
  async humanizeParagraphs(text: string, _options?: HumanizeOptions): Promise<ParagraphHumanizeResult[]> {
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0)
    const results: ParagraphHumanizeResult[] = []

    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i]

      try {
        // 检测段落AI分数
        const originalScore = getAIScore(paragraph)

        // 处理段落
        const result = await this.humanize(paragraph)

        // 计算改进
        const scoreChange = originalScore - result.processedScore

        results.push({
          index: i,
          originalParagraph: paragraph,
          processedParagraph: result.processedText,
          scoreChange,
          modifications: result.rewrite.improvements
        })
      } catch (error) {
        logger.error(`处理第 ${i} 段落失败`, error)
        // 失败时保留原文
        results.push({
          index: i,
          originalParagraph: paragraph,
          processedParagraph: paragraph,
          scoreChange: 0,
          modifications: ['处理失败，保留原文']
        })
      }
    }

    return results
  }

  /**
   * 整章处理
   */
  async humanizeChapter(
    chapterId: string,
    chapterTitle: string,
    content: string,
    _options?: HumanizeOptions,
    userEdits: UserEdit[] = []
  ): Promise<ChapterHumanizeResult> {
    const startTime = Date.now()

    try {
      logger.info('开始处理整章', { chapterId, chapterTitle, contentLength: content.length })

      // 1. 段落级处理
      const paragraphResults = await this.humanizeParagraphs(content)

      // 2. 合并处理后的段落
      let processedContent = paragraphResults.map(r => r.processedParagraph).join('\n\n')

      // 3. 应用用户编辑（如果有）
      const preservedUserEdits: UserEdit[] = []
      if (userEdits && userEdits.length > 0) {
        processedContent = this.applyUserEdits(processedContent, userEdits)
        preservedUserEdits.push(...userEdits)
      }

      // 4. 整体再处理一次以确保连贯性
      const finalResult = await this.humanize(processedContent)

      const totalTime = Date.now() - startTime

      logger.info('整章处理完成', {
        chapterId,
        paragraphCount: paragraphResults.length,
        totalTime
      })

      return {
        chapterId,
        chapterTitle,
        result: finalResult,
        paragraphResults,
        preservedUserEdits
      }
    } catch (error) {
      logger.error('整章处理失败', { chapterId, error })
      throw new Error('整章处理失败: ' + (error instanceof Error ? error.message : '未知错误'))
    }
  }

  /**
   * 批量处理
   */
  async batchHumanize(texts: string[]): Promise<BatchHumanizeResult> {
    const startTime = Date.now()
    const results: HumanizeResult[] = []
    const errors: string[] = []
    let successCount = 0
    let failedCount = 0

    logger.info('开始批量处理', { count: texts.length })

    for (let i = 0; i < texts.length; i++) {
      try {
        const result = await this.humanize(texts[i])
        results.push(result)
        successCount++

        // 每处理10个记录一次进度
        if ((i + 1) % 10 === 0) {
          logger.info(`批量处理进度: ${i + 1}/${texts.length}`)
        }
      } catch (error) {
        failedCount++
        const errorMsg = error instanceof Error ? error.message : '未知错误'
        errors.push(`第 ${i + 1} 项: ${errorMsg}`)

        // 失败时返回原始结果
        results.push({
          processedText: texts[i],
          originalScore: 50,
          processedScore: 50,
          improvement: 0,
          detection: {
            score: 50,
            features: [],
            paragraphsToRewrite: [],
            assessment: '处理失败',
            suggestions: [],
            originalityScore: 50,
            detailedAnalysis: {
              sentenceVariety: 0,
              vocabularyDiversity: 0,
              emotionalDepth: 0,
              structuralComplexity: 0
            }
          },
          rewrite: {
            rewrittenText: texts[i],
            appliedRules: [],
            statistics: {
              originalLength: texts[i].length,
              rewrittenLength: texts[i].length,
              replacedPhrases: 0,
              restructuredSentences: 0,
              appliedRules: 0,
              styleAdjustments: 0,
              flowImprovements: 0
            },
            fidelityScore: 100,
            improvements: ['处理失败，返回原文'],
            originalityImprovement: 0,
            semanticAnalysis: {
              preservedMeaning: 100,
              structuralChanges: 0,
              vocabularyChanges: 0
            },
            hasAntiTemplateViolations: false
          },
          processingSteps: [],
          processingTime: 0,
          suggestions: ['处理失败，请检查文本内容'],
          originalityScore: 50,
          fidelityScore: 100
        })
      }
    }

    const totalTime = Date.now() - startTime
    const averageImprovement = results.reduce((sum, r) => sum + r.improvement, 0) / results.length

    logger.info('批量处理完成', {
      total: texts.length,
      success: successCount,
      failed: failedCount,
      totalTime
    })

    return {
      results,
      totalTime,
      averageImprovement,
      successCount,
      failedCount,
      errors
    }
  }

  /**
   * 仅分析AI痕迹
   */
  analyze(text: string): AIFeatureDetectionResult {
    return detectAIFeatures(text)
  }

  /**
   * 仅改写文本
   */
  rewrite(text: string, options?: RewriteOptions): RewriteResult {
    const rewriteOptions = {
      intensity: this.options.intensity === 'auto' ? 'medium' : this.options.intensity,
      ...options
    }
    return rewriteText(text, rewriteOptions)
  }

  /**
   * 仅优化风格
   */
  optimizeStyle(text: string, options?: StyleOptimizationOptions): StyleOptimizationResult {
    const styleOptions: StyleOptimizationOptions = {
      genre: this.options.genre,
      intensity: this.options.intensity === 'auto' ? 'medium' : this.options.intensity,
      targetAudience: this.options.targetAudience,
      ...options
    }
    return optimizeStyle(text, styleOptions)
  }

  /**
   * 根据AI分数确定处理强度
   */
  private determineIntensity(score: number): 'light' | 'medium' | 'strong' {
    if (this.options.intensity && this.options.intensity !== 'auto') {
      return this.options.intensity
    }

    if (score < 30) {
      return 'light'
    } else if (score < 60) {
      return 'medium'
    } else {
      return 'strong'
    }
  }

  /**
   * 应用用户编辑
   */
  private applyUserEdits(text: string, userEdits: UserEdit[]): string {
    let result = text

    // 按位置排序，从后向前应用（避免位置偏移）
    const sortedEdits = [...userEdits].sort((a, b) => b.position - a.position)

    for (const edit of sortedEdits) {
      // 检查原始内容是否匹配
      const actualContent = result.slice(edit.position, edit.position + edit.originalContent.length)
      if (actualContent === edit.originalContent) {
        // 应用用户编辑
        result = result.slice(0, edit.position) + edit.userContent + result.slice(edit.position + edit.originalContent.length)
      }
    }

    return result
  }

  /**
   * 生成建议
   */
  private generateSuggestions(detection: AIFeatureDetectionResult, processedScore: number, originalityScore: number, antiTemplateDetection?: AntiTemplateDetectionResult): string[] {
    const suggestions: string[] = []

    suggestions.push(...detection.suggestions)

    if (antiTemplateDetection && antiTemplateDetection.totalViolations > 0) {
      const criticalViolations = antiTemplateDetection.violations.filter(v => v.severity === 'critical')
      if (criticalViolations.length > 0) {
        const criticalWords = criticalViolations.map(v => `"${v.word}"`).join('、')
        suggestions.push(`处理后仍存在严重反模板违规：${criticalWords}，必须手动替换或删除`)
      }
      const warningViolations = antiTemplateDetection.violations.filter(v => v.severity === 'warning')
      if (warningViolations.length > 0) {
        const warningWords = [...new Set(warningViolations.map(v => `"${v.word}"`))].slice(0, 5).join('、')
        suggestions.push(`处理后仍有${warningViolations.length}处反模板警告：${warningWords}等，建议进一步优化`)
      }
      const templateViolations = antiTemplateDetection.violations.filter(v => v.type === 'template_pattern')
      if (templateViolations.length > 0) {
        suggestions.push('文本中仍存在模板化结构，建议拆解重构相关段落')
      }
    }

    // 基于处理后分数生成建议
    if (processedScore > 40) {
      suggestions.push('处理后仍有较明显的AI痕迹，建议进行深度改写或手动调整')
    } else if (processedScore > 20) {
      suggestions.push('处理效果良好，如需要可以进一步手动微调')
    } else {
      suggestions.push('处理效果优秀，文本自然度已大幅提升')
    }

    // 基于原创度生成建议
    if (originalityScore < 60) {
      suggestions.push('原创度较低，建议增加更多个性化表达和独特的叙述角度')
    } else if (originalityScore < 80) {
      suggestions.push('原创度良好，可通过增加具体细节和个性化元素进一步提升')
    } else {
      suggestions.push('原创度优秀，文本具有独特的个人风格')
    }

    // 添加通用建议
    suggestions.push('建议通读全文，确保改写后的内容符合上下文逻辑')
    suggestions.push('重点关注对话和描写部分，这些是最容易暴露AI痕迹的地方')
    suggestions.push('考虑添加更多具体的感官细节和个人体验，提升文本的真实感')

    return [...new Set(suggestions)]
  }

  /**
   * 获取处理统计信息
   */
  getStats(result: HumanizeResult): {
    originalLength: number
    processedLength: number
    lengthChange: number
    aiScoreImprovement: number
    rulesApplied: number
    styleAdjustments: number
  } {
    return {
      originalLength: result.rewrite.statistics.originalLength,
      processedLength: result.processedText.length,
      lengthChange: result.processedText.length - result.rewrite.statistics.originalLength,
      aiScoreImprovement: result.improvement,
      rulesApplied: result.rewrite.appliedRules.length,
      styleAdjustments: result.styleOptimization?.appliedStyles.length || 0
    }
  }
}

/**
 * 创建去除AI味服务实例
 */
export function createHumanizeService(options?: HumanizeOptions): HumanizeService {
  return new HumanizeService(options)
}

/**
 * 一键去除AI味
 */
export async function humanizeText(text: string, options?: HumanizeOptions): Promise<HumanizeResult> {
  const service = new HumanizeService(options)
  return service.humanize(text)
}

/**
 * 批量去除AI味
 */
export async function batchHumanizeTexts(texts: string[], options?: HumanizeOptions): Promise<BatchHumanizeResult> {
  const service = new HumanizeService(options)
  return service.batchHumanize(texts)
}

/**
 * 分析AI痕迹
 */
export function analyzeAIFeatures(text: string): AIFeatureDetectionResult {
  return detectAIFeatures(text)
}

/**
 * 处理段落
 */
export async function humanizeParagraphs(text: string, options?: HumanizeOptions): Promise<ParagraphHumanizeResult[]> {
  const service = new HumanizeService(options)
  return service.humanizeParagraphs(text)
}

/**
 * 处理整章
 */
export async function humanizeChapter(
  chapterId: string,
  chapterTitle: string,
  content: string,
  options?: HumanizeOptions,
  userEdits?: UserEdit[]
): Promise<ChapterHumanizeResult> {
  const service = new HumanizeService(options)
  return service.humanizeChapter(chapterId, chapterTitle, content, options, userEdits)
}

/**
 * 快速去除AI味
 */
export async function quickHumanize(text: string): Promise<string> {
  const service = new HumanizeService({ intensity: 'light', enableStyleOptimization: false })
  const result = await service.humanize(text)
  return result.processedText
}

export default HumanizeService
