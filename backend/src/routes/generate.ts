import { Router, type Request, type Response } from 'express'
import { generateService } from '../services/generateService.js'
import { aiService } from '../services/aiService.js'
import { novelService } from '../services/novelService.js'
import { sendSuccess, sendError, HttpStatus, asyncHandler } from '../utils/response.js'
import {
  generateRequestSchema,
  outlineGenerateSchema,
  cancelGenerateSchema,
  batchGenerateSchema,
  continueNovelSchema,
  autoOutlineGenerateSchema
} from '../utils/validation.js'
import type { StyleConfig } from '../types/shared.d.ts'
import logger from '../utils/logger.js'

const router = Router()

/**
 * 生成小说
 * POST /api/generate
 */
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  // 验证请求数据
  const data = generateRequestSchema.parse(req.body)

  // 检查AI配置
  const settings = await aiService.getSettings()
  const curlConfig = await aiService.getCurlConfig()
  if (!settings.apiKey && !curlConfig.useCustomCurl) {
    sendError(res, '请先配置AI API密钥或自定义CURL', HttpStatus.BAD_REQUEST)
    return
  }

  // 创建生成任务
  const task = generateService.createTask()

  // 异步开始生成
  generateService.generateNovel(task.id, data)
    .catch(error => {
      logger.error('生成小说失败', error)
    })

  sendSuccess(res, { id: task.id, message: '生成任务已创建' }, undefined, HttpStatus.ACCEPTED)
}))

/**
 * 根据大纲生成
 * POST /api/generate/outline
 */
router.post('/outline', asyncHandler(async (req: Request, res: Response) => {
  // 验证请求数据
  const data = outlineGenerateSchema.parse(req.body)

  // 检查AI配置
  const settings = await aiService.getSettings()
  const curlConfig = await aiService.getCurlConfig()
  if (!settings.apiKey && !curlConfig.useCustomCurl) {
    sendError(res, '请先配置AI API密钥或自定义CURL', HttpStatus.BAD_REQUEST)
    return
  }

  // 创建生成任务
  const task = generateService.createTask(data.novelId)

  // 异步开始生成
  generateService.generateFromOutline(task.id, data)
    .catch(error => {
      logger.error('根据大纲生成小说失败', error)
    })

  sendSuccess(res, { id: task.id, message: '生成任务已创建' }, undefined, HttpStatus.ACCEPTED)
}))

/**
 * 批量生成章节
 * POST /api/generate/batch
 */
router.post('/batch', asyncHandler(async (req: Request, res: Response) => {
  // 验证请求数据
  const data = batchGenerateSchema.parse(req.body)

  // 检查AI配置
  const settings = await aiService.getSettings()
  const curlConfig = await aiService.getCurlConfig()
  if (!settings.apiKey && !curlConfig.useCustomCurl) {
    sendError(res, '请先配置AI API密钥或自定义CURL', HttpStatus.BAD_REQUEST)
    return
  }

  // 创建生成任务
  const task = generateService.createTask(data.novelId)

  // 异步开始生成
  generateService.batchGenerateChapters(task.id, data)
    .catch(error => {
      logger.error('批量生成章节失败', error)
    })

  sendSuccess(res, { id: task.id, message: '批量生成任务已创建' }, undefined, HttpStatus.ACCEPTED)
}))

/**
 * 从失败章节继续生成（SubTask 2.1）
 * POST /api/generate/continue/:novelId
 */
router.post('/continue/:novelId', asyncHandler(async (req: Request, res: Response) => {
  const { novelId } = req.params

  if (!novelId) {
    sendError(res, '小说ID不能为空', HttpStatus.BAD_REQUEST)
    return
  }

  // 检查AI配置
  const settings = await aiService.getSettings()
  const curlConfig = await aiService.getCurlConfig()
  if (!settings.apiKey && !curlConfig.useCustomCurl) {
    sendError(res, '请先配置AI API密钥或自定义CURL', HttpStatus.BAD_REQUEST)
    return
  }

  // 检查小说是否存在
  const novel = await novelService.getNovelById(novelId)
  if (!novel) {
    sendError(res, '小说不存在', HttpStatus.NOT_FOUND)
    return
  }

  // 创建生成任务
  const task = generateService.createTask(novelId)

  // 异步开始继续生成
  generateService.continueGeneration(task.id, novelId)
    .catch(error => {
      logger.error('继续生成小说失败', error)
    })

  sendSuccess(res, { 
    id: task.id, 
    novelId,
    message: '继续生成任务已创建' 
  }, undefined, HttpStatus.ACCEPTED)
}))

/**
 * 续写小说
 * POST /api/generate/continue
 */
router.post('/continue', asyncHandler(async (req: Request, res: Response) => {
  // 验证请求数据
  const data = continueNovelSchema.parse(req.body)

  // 检查AI配置
  const settings = await aiService.getSettings()
  const curlConfig = await aiService.getCurlConfig()
  if (!settings.apiKey && !curlConfig.useCustomCurl) {
    sendError(res, '请先配置AI API密钥或自定义CURL', HttpStatus.BAD_REQUEST)
    return
  }

  // 创建生成任务
  const task = generateService.createTask(data.novelId)

  // 异步开始生成
  generateService.continueNovel(task.id, data)
    .catch(error => {
      logger.error('续写小说失败', error)
    })

  sendSuccess(res, { id: task.id, message: '续写任务已创建' }, undefined, HttpStatus.ACCEPTED)
}))

/**
 * 重新生成单章内容（基于description）
 * POST /api/generate/regenerate/:novelId/:chapterId
 */
router.post('/regenerate/:novelId/:chapterId', asyncHandler(async (req: Request, res: Response) => {
  const { novelId, chapterId } = req.params

  if (!novelId || !chapterId) {
    sendError(res, '小说ID和章节ID不能为空', HttpStatus.BAD_REQUEST)
    return
  }

  // 检查AI配置
  const settings = await aiService.getSettings()
  const curlConfig = await aiService.getCurlConfig()
  if (!settings.apiKey && !curlConfig.useCustomCurl) {
    sendError(res, '请先配置AI API密钥或自定义CURL', HttpStatus.BAD_REQUEST)
    return
  }

  // 检查小说是否存在
  const novel = await novelService.getNovelById(novelId)
  if (!novel) {
    sendError(res, '小说不存在', HttpStatus.NOT_FOUND)
    return
  }

  // 获取章节信息以确定章节索引和标题
  const chapters = await novelService.getChapters(novelId)
  const targetChapterIndex = chapters.findIndex(ch => ch.id === chapterId)

  if (targetChapterIndex === -1) {
    sendError(res, '章节不存在', HttpStatus.NOT_FOUND)
    return
  }

  const targetChapter = chapters[targetChapterIndex]

  // 创建生成任务
  const task = generateService.createTask(novelId)

  // 异步开始重新生成
  generateService.regenerateChapter(task.id, novelId, chapterId, targetChapterIndex, targetChapter.title || `第${targetChapterIndex + 1}章`)
    .catch(error => {
      logger.error('重新生成单章失败', error)
    })

  sendSuccess(res, {
    id: task.id,
    novelId,
    chapterId,
    message: '单章重新生成任务已创建'
  }, undefined, HttpStatus.ACCEPTED)
}))

/**
 * 获取生成进度
 * GET /api/generate/progress/:id
 */
router.get('/progress/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  
  try {
    const task = await generateService.getTask(id)

    if (!task) {
      sendError(res, '生成任务不存在或已过期', HttpStatus.NOT_FOUND)
      return
    }

    sendSuccess(res, task)
  } catch (error) {
    logger.error('获取生成进度失败', { id, error })
    sendError(res, '获取进度失败，请刷新页面重试', HttpStatus.INTERNAL_SERVER_ERROR)
  }
}))

/**
 * 获取小说的生成任务
 * GET /api/generate/novel/:novelId
 */
router.get('/novel/:novelId', asyncHandler(async (req: Request, res: Response) => {
  const { novelId } = req.params
  const task = await generateService.getTaskByNovelId(novelId)

  if (!task) {
    sendSuccess(res, null)
    return
  }

  sendSuccess(res, task)
}))

/**
 * 取消生成
 * POST /api/generate/cancel
 */
router.post('/cancel', asyncHandler(async (req: Request, res: Response) => {
  // 验证请求数据
  const data = cancelGenerateSchema.parse(req.body)

  const success = await generateService.cancelTask(data.id)

  if (!success) {
    sendError(res, '生成任务不存在', HttpStatus.NOT_FOUND)
    return
  }

  sendSuccess(res, null, '生成任务已取消')
}))

/**
 * 自动生成大纲
 * POST /api/generate/outline-auto
 */
router.post('/outline-auto', asyncHandler(async (req: Request, res: Response) => {
  // 验证请求数据
  const data = autoOutlineGenerateSchema.parse(req.body)

  // 检查AI配置
  const settings = await aiService.getSettings()
  const curlConfig = await aiService.getCurlConfig()
  if (!settings.apiKey && !curlConfig.useCustomCurl) {
    sendError(res, '请先配置AI API密钥或自定义CURL', HttpStatus.BAD_REQUEST)
    return
  }

  // 检测请求是否被中止
  let isAborted = false
  req.on('close', () => {
    if (!res.headersSent) {
      isAborted = true
      logger.warn('大纲生成请求被客户端中止', { title: data.title })
    }
  })

  try {
    // 确定大纲长度
    const outlineLength = data.wordCount > 100000 ? 'epic' : data.wordCount > 50000 ? 'long' : data.length

    // 调用大纲生成服务
    const outline = await generateService.generateOutline(
      data.title,
      data.prompt,
      data.type,
      outlineLength,
      data.style,
      data.styleConfig as StyleConfig | undefined,
      [],
      data.templateId
    )

    // 检查请求是否已被中止
    if (isAborted) {
      logger.info('大纲生成完成但请求已被中止，不发送响应', { title: data.title })
      return
    }

    // 检查响应是否已经发送（超时情况）
    if (!res.headersSent) {
      sendSuccess(res, { outline })
    }
  } catch (error) {
    logger.error('自动生成大纲失败', error)
    
    // 如果请求已被中止，不发送响应
    if (isAborted) {
      return
    }
    
    // 检查响应是否已经发送（超时情况）
    if (!res.headersSent) {
      const errorMessage = error instanceof Error ? error.message : '生成大纲失败'
      
      // 提供更详细的错误信息和解决方案
      let detailedMessage = errorMessage
      if (errorMessage.includes('timeout') || errorMessage.includes('超时')) {
        detailedMessage = `请求超时：AI模型响应时间过长。\n\n解决方案：\n1. 检查网络连接是否稳定\n2. 尝试使用更快的模型（如智谱AI GLM-4-Flash）\n3. 减少目标字数\n4. 稍后重试`
      } else if (errorMessage.includes('API') || errorMessage.includes('密钥')) {
        detailedMessage = `API配置错误：${errorMessage}\n\n解决方案：\n1. 检查API密钥是否正确\n2. 检查API地址是否正确\n3. 检查账户余额是否充足`
      } else if (errorMessage.includes('network') || errorMessage.includes('网络')) {
        detailedMessage = `网络连接失败：无法连接到AI服务。\n\n解决方案：\n1. 检查网络连接\n2. 检查防火墙设置\n3. 检查代理配置`
      }
      
      sendError(res, detailedMessage, HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }
}))

/**
 * 获取小说生成状态
 * GET /api/generate/status/:novelId
 */
router.get('/status/:novelId', asyncHandler(async (req: Request, res: Response) => {
  const { novelId } = req.params
  
  try {
    const novel = await novelService.getNovelById(novelId)

    if (!novel) {
      sendError(res, '小说不存在', HttpStatus.NOT_FOUND)
      return
    }

    const totalChapterCount = novel.totalChapterCount || 0
    const generatedChapterCount = novel.generatedChapterCount || 0
    const lastFailedChapterIndex = novel.lastFailedChapterIndex || null
    const lastFailureReason = novel.lastFailureReason || null
    const isComplete = totalChapterCount > 0 && generatedChapterCount >= totalChapterCount

    sendSuccess(res, {
      totalChapterCount,
      generatedChapterCount,
      lastFailedChapterIndex,
      lastFailureReason,
      isComplete,
      status: novel.status
    })
  } catch (error) {
    logger.error('获取小说生成状态失败', { novelId, error })
    sendError(res, '获取生成状态失败', HttpStatus.INTERNAL_SERVER_ERROR)
  }
}))

export default router
