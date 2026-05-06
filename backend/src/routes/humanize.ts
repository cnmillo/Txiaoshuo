/**
 * 去除AI味 API路由
 * 提供AI痕迹分析、文本改写、风格优化、批量处理等功能
 */

import { Router, Request, Response } from 'express'
import { body, validationResult } from 'express-validator'
import { sendSuccess, sendError, HttpStatus, asyncHandler } from '../utils/response.js'
import logger from '../utils/logger.js'
import type { NovelGenre } from '../types/index.js'

import {
  createHumanizeService,
  humanizeText,
  batchHumanizeTexts,
  analyzeAIFeatures,
  humanizeParagraphs,
  humanizeChapter,
  quickHumanize,
  type HumanizeOptions,
  type UserEdit
} from '../services/humanizeService.js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const router = Router() as any

/**
 * 分析AI痕迹
 * POST /api/humanize/analyze
 * 
 * 请求体：
 * {
 *   "text": "需要分析的文本",
 *   "detailed": true
 * }
 */
router.post(
  '/analyze',
  [
    body('text')
      .notEmpty()
      .withMessage('文本内容不能为空')
      .isString()
      .withMessage('文本必须是字符串')
      .isLength({ min: 10, max: 50000 })
      .withMessage('文本长度必须在10-50000字符之间'),
    body('detailed')
      .optional()
      .isBoolean()
      .withMessage('detailed必须是布尔值')
  ],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (asyncHandler as any)(async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map(e => e.msg).join(',')
      sendError(res, `请求参数错误：${errorMessages}`, HttpStatus.BAD_REQUEST)
      return
    }
    const { text, detailed = true } = req.body

    try {
      logger.info('收到 AI 痕迹分析请求', { textLength: text.length })

      const result = analyzeAIFeatures(text)

      // 如果不需详细信息，简化返回
      if (!detailed) {
        sendSuccess(res, {
          score: result.score,
          assessment: result.assessment,
          featureCount: result.features.length
        })
        return
      }

      sendSuccess(res, result)
    } catch (error) {
      logger.error('AI 痕迹分析失败', error)
      sendError(res, 'AI 痕迹分析失败', HttpStatus.INTERNAL_SERVER_ERROR)
    }
  })
)

/**
 * 改写文本
 * POST /api/humanize/rewrite
 * 
 * 请求体：
 * {
 *   "text": "需要改写的文本",
 *   "intensity": "medium", // light/medium/strong/auto
 *   "preservePhrases": ["保留的短语"],
 *   "targetStyle": "natural" // natural/vivid/concise/literary
 * }
 */
router.post(
  '/rewrite',
  [
    body('text')
      .notEmpty()
      .withMessage('文本内容不能为空')
      .isString()
      .withMessage('文本必须是字符串')
      .isLength({ min: 10, max: 50000 })
      .withMessage('文本长度必须在10-50000字符之间'),
    body('intensity')
      .optional()
      .isIn(['light', 'medium', 'strong', 'auto'])
      .withMessage('intensity必须是light、medium、strong或auto'),
    body('preservePhrases')
      .optional()
      .isArray()
      .withMessage('preservePhrases必须是数组'),
    body('targetStyle')
      .optional()
      .isIn(['natural', 'vivid', 'concise', 'literary'])
      .withMessage('targetStyle必须是natural、vivid、concise或literary')
  ],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (asyncHandler as any)(async (req: Request, res: Response) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map(e => e.msg).join('，')
      sendError(res, `请求参数错误：${errorMessages}`, HttpStatus.BAD_REQUEST)
      return
    }
    const {
      text,
      intensity = 'auto',
      preservePhrases = [],
      targetStyle = 'natural'
    } = req.body

    try {
      logger.info('收到文本改写请求', { textLength: text.length, intensity })

      const service = createHumanizeService({
        intensity,
        preservePhrases,
        enableStyleOptimization: false
      })

      const rewriteResult = service.rewrite(text, {
        intensity: intensity === 'auto' ? 'medium' : intensity,
        targetStyle
      })

      sendSuccess(res, {
        rewrittenText: rewriteResult.rewrittenText,
        originalLength: rewriteResult.statistics.originalLength,
        rewrittenLength: rewriteResult.statistics.rewrittenLength,
        appliedRules: rewriteResult.appliedRules,
        fidelityScore: rewriteResult.fidelityScore,
        improvements: rewriteResult.improvements,
        statistics: rewriteResult.statistics
      })
    } catch (error) {
      logger.error('文本改写失败', error)
      sendError(
        res,
        '文本改写失败：' + (error instanceof Error ? error.message : '未知错误'),
        HttpStatus.INTERNAL_SERVER_ERROR
      )
    }
  })
)

/**
 * 优化风格
 * POST /api/humanize/optimize
 * 
 * 请求体：
 * {
 *   "text": "需要优化的文本",
 *   "genre": "fantasy", // 小说类型
 *   "intensity": "medium", // light/medium/strong
 *   "focus": ["dialogue_optimization", "description_enhancement"]
 * }
 */
router.post(
  '/optimize',
  [
    body('text')
      .notEmpty()
      .withMessage('文本内容不能为空')
      .isString()
      .withMessage('文本必须是字符串')
      .isLength({ min: 10, max: 50000 })
      .withMessage('文本长度必须在10-50000字符之间'),
    body('genre')
      .optional()
      .custom((value) => {
        if (value === '' || value === undefined || value === null) return true
        const validGenres = ['fantasy', 'wuxia', 'xianxia', 'romance', 'scifi', 'mystery', 'history', 'urban', 'game', 'horror', 'military', 'general']
        return validGenres.includes(value)
      })
      .withMessage('genre必须是有效的小说类型'),
    body('intensity')
      .optional()
      .isIn(['light', 'medium', 'strong'])
      .withMessage('intensity必须是light、medium或strong'),
    body('focus')
      .optional()
      .isArray()
      .withMessage('focus必须是数组')
  ],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (asyncHandler as any)(async (req: Request, res: Response) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map(e => e.msg).join('，')
      sendError(res, `请求参数错误：${errorMessages}`, HttpStatus.BAD_REQUEST)
      return
    }
    const {
      text,
      genre,
      intensity = 'medium',
      focus
    } = req.body

    try {
      logger.info('收到风格优化请求', { textLength: text.length, genre })

      const service = createHumanizeService({
        genre: genre as NovelGenre,
        intensity
      })

      const optimizeResult = service.optimizeStyle(text, {
        genre: genre as NovelGenre,
        intensity,
        focus
      })

      sendSuccess(res, {
        optimizedText: optimizeResult.optimizedText,
        originalLength: optimizeResult.statistics.originalLength,
        optimizedLength: optimizeResult.statistics.optimizedLength,
        appliedStyles: optimizeResult.appliedStyles,
        styleScore: optimizeResult.styleScore,
        improvements: optimizeResult.improvements,
        statistics: optimizeResult.statistics
      })
    } catch (error) {
      logger.error('风格优化失败', error)
      sendError(
        res,
        '风格优化失败：' + (error instanceof Error ? error.message : '未知错误'),
        HttpStatus.INTERNAL_SERVER_ERROR
      )
    }
  })
)

/**
 * 一键去除AI味
 * POST /api/humanize
 * 
 * 请求体：
 * {
 *   "text": "需要处理的文本",
 *   "intensity": "auto", // light/medium/strong/auto
 *   "genre": "fantasy", // 小说类型
 *   "enableStyleOptimization": true,
 *   "preservePhrases": ["保留的短语"]
 * }
 */
router.post(
  '/',
  [
    body('text')
      .notEmpty()
      .withMessage('文本内容不能为空')
      .isString()
      .withMessage('文本必须是字符串')
      .isLength({ min: 10, max: 50000 })
      .withMessage('文本长度必须在10-50000字符之间'),
    body('intensity')
      .optional()
      .isIn(['light', 'medium', 'strong', 'auto'])
      .withMessage('intensity必须是light、medium、strong或auto'),
    body('genre')
      .optional()
      .custom((value) => {
        if (value === '' || value === undefined || value === null) return true
        const validGenres = ['fantasy', 'wuxia', 'xianxia', 'romance', 'scifi', 'mystery', 'history', 'urban', 'game', 'horror', 'military', 'general']
        return validGenres.includes(value)
      })
      .withMessage('genre必须是有效的小说类型'),
    body('enableStyleOptimization')
      .optional()
      .isBoolean()
      .withMessage('enableStyleOptimization必须是布尔值'),
    body('preservePhrases')
      .optional()
      .isArray()
      .withMessage('preservePhrases必须是数组'),
    body('targetAudience')
      .optional()
      .isIn(['young', 'adult', 'general'])
      .withMessage('targetAudience必须是young、adult或general'),
    body('mode')
      .optional()
      .isIn(['rewrite', 'optimize', 'full'])
      .withMessage('mode必须是rewrite、optimize或full')
  ],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (asyncHandler as any)(async (req: Request, res: Response) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map(e => e.msg).join('，')
      sendError(res, `请求参数错误：${errorMessages}`, HttpStatus.BAD_REQUEST)
      return
    }
    const {
      text,
      intensity = 'auto',
      genre,
      enableStyleOptimization = true,
      preservePhrases = [],
      targetAudience = 'general',
      mode = 'full'
    } = req.body

    try {
      logger.info('收到去除AI味请求', {
        textLength: text.length,
        intensity,
        genre,
        enableStyleOptimization,
        targetAudience,
        mode
      })

      const options: HumanizeOptions = {
        intensity,
        genre: genre as NovelGenre,
        enableStyleOptimization,
        preservePhrases,
        targetAudience: targetAudience as 'young' | 'adult' | 'general',
        mode: mode as 'rewrite' | 'optimize' | 'full'
      }

      const result = await humanizeText(text, options)

      sendSuccess(res, {
        processedText: result.processedText,
        originalScore: result.originalScore,
        processedScore: result.processedScore,
        improvement: result.improvement,
        processingSteps: result.processingSteps,
        processingTime: result.processingTime,
        suggestions: result.suggestions,
        statistics: {
          originalLength: result.rewrite.statistics.originalLength,
          processedLength: result.processedText.length,
          replacedPhrases: result.rewrite.statistics.replacedPhrases,
          restructuredSentences: result.rewrite.statistics.restructuredSentences,
          appliedRules: result.rewrite.appliedRules.length,
          styleAdjustments: result.styleOptimization?.appliedStyles.length || 0
        }
      })
    } catch (error) {
      logger.error('去除AI味处理失败', error)
      sendError(
        res,
        '去除AI味处理失败：' + (error instanceof Error ? error.message : '未知错误'),
        HttpStatus.INTERNAL_SERVER_ERROR
      )
    }
  })
)

/**
 * 批量处理
 * POST /api/humanize/batch
 * 
 * 请求体：
 * {
 *   "texts": ["文本1", "文本2", ...],
 *   "intensity": "auto",
 *   "genre": "fantasy"
 * }
 */
router.post(
  '/batch',
  [
    body('texts')
      .notEmpty()
      .withMessage('文本列表不能为空')
      .isArray({ min: 1, max: 50 })
      .withMessage('文本列表必须是包含1-50个元素的数组'),
    body('texts.*')
      .isString()
      .withMessage('每个文本必须是字符串')
      .isLength({ min: 10, max: 10000 })
      .withMessage('每个文本长度必须在10-10000字符之间'),
    body('intensity')
      .optional()
      .isIn(['light', 'medium', 'strong', 'auto'])
      .withMessage('intensity必须是light、medium、strong或auto'),
    body('genre')
      .optional()
      .custom((value) => {
        if (value === '' || value === undefined || value === null) return true
        const validGenres = ['fantasy', 'wuxia', 'xianxia', 'romance', 'scifi', 'mystery', 'history', 'urban', 'game', 'horror', 'military', 'general']
        return validGenres.includes(value)
      })
      .withMessage('genre必须是有效的小说类型')
  ],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (asyncHandler as any)(async (req: Request, res: Response) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map(e => e.msg).join('，')
      sendError(res, `请求参数错误：${errorMessages}`, HttpStatus.BAD_REQUEST)
      return
    }
    const {
      texts,
      intensity = 'auto',
      genre
    } = req.body

    try {
      logger.info('收到批量处理请求', { count: texts.length, intensity, genre })

      const options: HumanizeOptions = {
        intensity,
        genre: genre as NovelGenre
      }

      const result = await batchHumanizeTexts(texts, options)

      sendSuccess(res, {
        results: result.results.map(r => ({
          processedText: r.processedText,
          originalScore: r.originalScore,
          processedScore: r.processedScore,
          improvement: r.improvement,
          processingTime: r.processingTime
        })),
        totalTime: result.totalTime,
        averageImprovement: result.averageImprovement,
        successCount: result.successCount,
        failedCount: result.failedCount,
        errors: result.errors
      })
    } catch (error) {
      logger.error('批量处理失败', error)
      sendError(
        res,
        '批量处理失败：' + (error instanceof Error ? error.message : '未知错误'),
        HttpStatus.INTERNAL_SERVER_ERROR
      )
    }
  })
)

/**
 * 段落级处理
 * POST /api/humanize/paragraphs
 * 
 * 请求体：
 * {
 *   "text": "需要处理的文本",
 *   "intensity": "auto"
 * }
 */
router.post(
  '/paragraphs',
  [
    body('text')
      .notEmpty()
      .withMessage('文本内容不能为空')
      .isString()
      .withMessage('文本必须是字符串')
      .isLength({ min: 10, max: 50000 })
      .withMessage('文本长度必须在10-50000字符之间'),
    body('intensity')
      .optional()
      .isIn(['light', 'medium', 'strong', 'auto'])
      .withMessage('intensity必须是light、medium、strong或auto')
  ],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (asyncHandler as any)(async (req: Request, res: Response) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map(e => e.msg).join(',')
      sendError(res, `请求参数错误：${errorMessages}`, HttpStatus.BAD_REQUEST)
      return
    }
    const { text, intensity = 'auto' } = req.body

    try {
      logger.info('收到段落级处理请求', { textLength: text.length, intensity })

      const options: HumanizeOptions = { intensity }
      const results = await humanizeParagraphs(text, options)

      sendSuccess(res, {
        paragraphCount: results.length,
        paragraphs: results.map(r => ({
          index: r.index,
          originalParagraph: r.originalParagraph,
          processedParagraph: r.processedParagraph,
          scoreChange: r.scoreChange,
          modifications: r.modifications
        })),
        summary: {
          totalParagraphs: results.length,
          improvedParagraphs: results.filter(r => r.scoreChange > 0).length,
          averageImprovement: results.reduce((sum, r) => sum + r.scoreChange, 0) / results.length
        }
      })
    } catch (error) {
      logger.error('段落级处理失败', error)
      sendError(
        res,
        '段落级处理失败：' + (error instanceof Error ? error.message : '未知错误'),
        HttpStatus.INTERNAL_SERVER_ERROR
      )
    }
  })
)

/**
 * 整章处理
 * POST /api/humanize/chapter
 * 
 * 请求体：
 * {
 *   "chapterId": "章节ID",
 *   "chapterTitle": "章节标题",
 *   "content": "章节内容",
 *   "intensity": "auto",
 *   "genre": "fantasy",
 *   "userEdits": [
 *     {
 *       "position": 0,
 *       "originalContent": "原文",
 *       "userContent": "用户修改",
 *       "editTime": "2024-01-01T00:00:00Z"
 *     }
 *   ]
 * }
 */
router.post(
  '/chapter',
  [
    body('chapterId')
      .notEmpty()
      .withMessage('章节ID不能为空')
      .isString()
      .withMessage('章节ID必须是字符串'),
    body('chapterTitle')
      .notEmpty()
      .withMessage('章节标题不能为空')
      .isString()
      .withMessage('章节标题必须是字符串'),
    body('content')
      .notEmpty()
      .withMessage('章节内容不能为空')
      .isString()
      .withMessage('章节内容必须是字符串')
      .isLength({ min: 10, max: 100000 })
      .withMessage('章节内容长度必须在10-100000字符之间'),
    body('intensity')
      .optional()
      .isIn(['light', 'medium', 'strong', 'auto'])
      .withMessage('intensity必须是light、medium、strong或auto'),
    body('genre')
      .optional()
      .custom((value) => {
        if (value === '' || value === undefined || value === null) return true
        const validGenres = ['fantasy', 'wuxia', 'xianxia', 'romance', 'scifi', 'mystery', 'history', 'urban', 'game', 'horror', 'military', 'general']
        return validGenres.includes(value)
      })
      .withMessage('genre必须是有效的小说类型'),
    body('userEdits')
      .optional()
      .isArray()
      .withMessage('userEdits必须是数组')
  ],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (asyncHandler as any)(async (req: Request, res: Response) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map(e => e.msg).join('，')
      sendError(res, `请求参数错误：${errorMessages}`, HttpStatus.BAD_REQUEST)
      return
    }
    const {
      chapterId,
      chapterTitle,
      content,
      intensity = 'auto',
      genre,
      userEdits = []
    } = req.body

    try {
      logger.info('收到整章处理请求', {
        chapterId,
        chapterTitle,
        contentLength: content.length,
        intensity,
        genre
      })

      const options: HumanizeOptions = {
        intensity,
        genre: genre as NovelGenre
      }

      const result = await humanizeChapter(
        chapterId,
        chapterTitle,
        content,
        options,
        userEdits as UserEdit[]
      )

      sendSuccess(res, {
        chapterId: result.chapterId,
        chapterTitle: result.chapterTitle,
        processedText: result.result.processedText,
        originalScore: result.result.originalScore,
        processedScore: result.result.processedScore,
        improvement: result.result.improvement,
        paragraphCount: result.paragraphResults.length,
        paragraphResults: result.paragraphResults.map(p => ({
          index: p.index,
          scoreChange: p.scoreChange,
          modifications: p.modifications
        })),
        preservedUserEdits: result.preservedUserEdits.length,
        processingTime: result.result.processingTime,
        suggestions: result.result.suggestions
      })
    } catch (error) {
      logger.error('整章处理失败', { chapterId, error })
      sendError(
        res,
        '整章处理失败：' + (error instanceof Error ? error.message : '未知错误'),
        HttpStatus.INTERNAL_SERVER_ERROR
      )
    }
  })
)

/**
 * 快速处理
 * POST /api/humanize/quick
 * 
 * 请求体：
 * {
 *   "text": "需要处理的文本"
 * }
 */
router.post(
  '/quick',
  [
    body('text')
      .notEmpty()
      .withMessage('文本内容不能为空')
      .isString()
      .withMessage('文本必须是字符串')
      .isLength({ min: 10, max: 50000 })
      .withMessage('文本长度必须在10-50000字符之间')
  ],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (asyncHandler as any)(async (req: Request, res: Response) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map(e => e.msg).join('，')
      sendError(res, `请求参数错误：${errorMessages}`, HttpStatus.BAD_REQUEST)
      return
    }
    const { text } = req.body

    try {
      logger.info('收到快速处理请求', { textLength: text.length })

      const processedText = await quickHumanize(text)

      sendSuccess(res, {
        processedText,
        originalLength: text.length,
        processedLength: processedText.length
      })
    } catch (error) {
      logger.error('快速处理失败', error)
      sendError(
        res,
        '快速处理失败：' + (error instanceof Error ? error.message : '未知错误'),
        HttpStatus.INTERNAL_SERVER_ERROR
      )
    }
  })
)

/**
 * 获取AI特征类型列表
 * GET /api/humanize/features
 */
router.get('/features', (req: Request, res: Response) => {
  const features = [
    {
      type: 'repetitive_structure',
      name: '重复句式结构',
      description: '句子开头或结构过于重复，缺乏变化'
    },
    {
      type: 'transition_words',
      name: '生硬过渡词',
      description: '使用过多生硬的过渡词和连接词'
    },
    {
      type: 'formal_connectors',
      name: '正式连接词',
      description: '使用过多正式的连接词，如"首先"、"其次"等'
    },
    {
      type: 'empty_phrases',
      name: '空洞短语',
      description: '使用缺乏实质内容的修饰词，如"非常"、"十分"等'
    },
    {
      type: 'passive_voice',
      name: '被动语态',
      description: '使用过多被动语态，缺乏主动性'
    },
    {
      type: 'uniform_sentence_length',
      name: '句子长度一致',
      description: '句子长度过于一致，缺乏节奏变化'
    },
    {
      type: 'lack_of_emotion',
      name: '缺乏情感',
      description: '描述过于抽象，缺乏具体情感和细节'
    },
    {
      type: 'generic_descriptions',
      name: '通用描述',
      description: '使用套话和陈词滥调'
    }
  ]

  sendSuccess(res, { features })
})

/**
 * 获取处理强度说明
 * GET /api/humanize/intensity-levels
 */
router.get('/intensity-levels', (req: Request, res: Response) => {
  const levels = [
    {
      value: 'light',
      label: '轻度',
      description: '仅进行最小限度的修改，保留原文大部分表达方式',
      suitable: 'AI痕迹较轻的文本'
    },
    {
      value: 'medium',
      label: '中度',
      description: '进行适度的改写和优化，平衡自然度和原意保留',
      suitable: '一般AI生成文本'
    },
    {
      value: 'strong',
      label: '深度',
      description: '进行深度改写，大幅提升文本自然度',
      suitable: 'AI痕迹明显的文本'
    },
    {
      value: 'auto',
      label: '自动',
      description: '根据AI痕迹分数自动选择合适的处理强度',
      suitable: '不确定AI痕迹程度时使用'
    }
  ]

  sendSuccess(res, levels)
})

/**
 * 获取支持的小说类型
 * GET /api/humanize/genres
 */
router.get('/genres', (req: Request, res: Response) => {
  const genres = [
    {
      value: 'fantasy',
      label: '玄幻',
      description: '宏大场景、力量体系、修炼描写'
    },
    {
      value: 'wuxia',
      label: '武侠',
      description: '江湖气息、武功招式、侠义精神'
    },
    {
      value: 'xianxia',
      label: '仙侠',
      description: '修仙问道、法宝飞剑、洞天福地'
    },
    {
      value: 'romance',
      label: '言情',
      description: '细腻情感、心理描写、浪漫氛围'
    },
    {
      value: 'scifi',
      label: '科幻',
      description: '科技设定、未来世界、科学概念'
    },
    {
      value: 'mystery',
      label: '悬疑',
      description: '悬念设置、推理过程、紧张氛围'
    },
    {
      value: 'history',
      label: '历史',
      description: '历史背景、人物塑造、时代氛围'
    },
    {
      value: 'urban',
      label: '都市',
      description: '现代生活、职场竞争、人际关系'
    },
    {
      value: 'game',
      label: '游戏',
      description: '游戏设定、升级系统、虚拟世界'
    },
    {
      value: 'horror',
      label: '恐怖',
      description: '恐怖氛围、心理恐惧、悬疑惊悚'
    },
    {
      value: 'military',
      label: '军事',
      description: '战争场面、战术策略、军人精神'
    },
    {
      value: 'general',
      label: '一般',
      description: '平实叙述、清晰表达'
    }
  ]

  sendSuccess(res, genres)
})

export default router
