import { Router, type Request, type Response } from 'express'
import { aiGenerationService } from '../services/aiGenerationService.js'
import { sendSuccess, sendError, ErrorMessages, HttpStatus } from '../utils/response.js'
import logger from '../utils/logger.js'
import { z } from 'zod'

const router = Router()

// 请求验证 Schema
const GenerateDirectionsSchema = z.object({
  inspiration: z.string().min(10, '灵感描述至少需要10个字符'),
  genre: z.string().optional(),
  count: z.number().min(1).max(10).optional().default(3)
})

const GenerateMacroPlanSchema = z.object({
  title: z.string().min(1, '书名不能为空'),
  genre: z.string(),
  coreSellingPoint: z.string().min(10, '核心卖点描述至少需要10个字符'),
  targetReaderFeeling: z.string().optional(),
  first30ChaptersPromise: z.string().optional()
})

const GenerateCharactersSchema = z.object({
  title: z.string().min(1, '书名不能为空'),
  genre: z.string(),
  macroPlan: z.string().optional(),
  mainCharacterCount: z.number().min(1).max(10).optional().default(3),
  supportingCharacterCount: z.number().min(0).max(20).optional().default(5)
})

const GenerateVolumePlanSchema = z.object({
  title: z.string().min(1, '书名不能为空'),
  genre: z.string(),
  macroPlan: z.string(),
  characters: z.array(z.record(z.unknown())).optional(),
  volumeCount: z.number().min(1).max(20).optional().default(3),
  estimatedTotalChapters: z.number().min(10).max(2000).optional().default(100)
})

const GenerateChaptersSchema = z.object({
  volumeId: z.string(),
  volumeName: z.string(),
  volumeMission: z.string(),
  startChapter: z.number().min(1),
  endChapter: z.number().min(1),
  macroPlan: z.string().optional(),
  characters: z.array(z.record(z.unknown())).optional(),
  previousChapters: z.array(z.record(z.unknown())).optional()
})

/**
 * 生成整本方向候选
 * POST /api/ai/generate-directions
 */
router.post('/generate-directions', async (req: Request, res: Response) => {
  try {
    const validation = GenerateDirectionsSchema.safeParse(req.body)
    
    if (!validation.success) {
      sendError(res, `请求参数错误: ${validation.error.errors.map((e: { message: string }) => e.message).join(', ')}`, HttpStatus.BAD_REQUEST)
      return
    }

    const { inspiration, genre, count } = validation.data
    
    logger.info('生成整本方向候选', { inspiration: inspiration.substring(0, 50), genre, count })
    
    const result = await aiGenerationService.generateDirections({
      inspiration,
      genre,
      count
    })
    
    sendSuccess(res, result)
  } catch (error) {
    logger.error('生成整本方向候选失败', error)
    const errorMessage = error instanceof Error ? error.message : ErrorMessages.INTERNAL_ERROR
    sendError(res, errorMessage, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

/**
 * 生成故事宏观规划
 * POST /api/ai/generate-macro-plan
 */
router.post('/generate-macro-plan', async (req: Request, res: Response) => {
  try {
    const validation = GenerateMacroPlanSchema.safeParse(req.body)
    
    if (!validation.success) {
      sendError(res, `请求参数错误: ${validation.error.errors.map((e: { message: string }) => e.message).join(', ')}`, HttpStatus.BAD_REQUEST)
      return
    }

    const { title, genre, coreSellingPoint, targetReaderFeeling, first30ChaptersPromise } = validation.data
    
    logger.info('生成故事宏观规划', { title, genre })
    
    const result = await aiGenerationService.generateMacroPlan({
      title,
      genre,
      coreSellingPoint,
      targetReaderFeeling,
      first30ChaptersPromise
    })
    
    sendSuccess(res, result)
  } catch (error) {
    logger.error('生成故事宏观规划失败', error)
    const errorMessage = error instanceof Error ? error.message : ErrorMessages.INTERNAL_ERROR
    sendError(res, errorMessage, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

/**
 * 生成角色阵容
 * POST /api/ai/generate-characters
 */
router.post('/generate-characters', async (req: Request, res: Response) => {
  try {
    const validation = GenerateCharactersSchema.safeParse(req.body)
    
    if (!validation.success) {
      sendError(res, `请求参数错误: ${validation.error.errors.map((e: { message: string }) => e.message).join(', ')}`, HttpStatus.BAD_REQUEST)
      return
    }

    const { title, genre, macroPlan, mainCharacterCount, supportingCharacterCount } = validation.data
    
    logger.info('生成角色阵容', { title, genre, mainCharacterCount, supportingCharacterCount })
    
    const result = await aiGenerationService.generateCharacters({
      title,
      genre,
      macroPlan,
      mainCharacterCount,
      supportingCharacterCount
    })
    
    sendSuccess(res, result)
  } catch (error) {
    logger.error('生成角色阵容失败', error)
    const errorMessage = error instanceof Error ? error.message : ErrorMessages.INTERNAL_ERROR
    sendError(res, errorMessage, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

/**
 * 生成卷战略
 * POST /api/ai/generate-volume-plan
 */
router.post('/generate-volume-plan', async (req: Request, res: Response) => {
  try {
    const validation = GenerateVolumePlanSchema.safeParse(req.body)
    
    if (!validation.success) {
      sendError(res, `请求参数错误: ${validation.error.errors.map((e: { message: string }) => e.message).join(', ')}`, HttpStatus.BAD_REQUEST)
      return
    }

    const { title, genre, macroPlan, characters, volumeCount, estimatedTotalChapters } = validation.data
    
    logger.info('生成卷战略', { title, genre, volumeCount, estimatedTotalChapters })
    
    const result = await aiGenerationService.generateVolumePlan({
      title,
      genre,
      macroPlan,
      characters,
      volumeCount,
      estimatedTotalChapters
    })
    
    sendSuccess(res, result)
  } catch (error) {
    logger.error('生成卷战略失败', error)
    const errorMessage = error instanceof Error ? error.message : ErrorMessages.INTERNAL_ERROR
    sendError(res, errorMessage, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

/**
 * 生成章节列表
 * POST /api/ai/generate-chapters
 */
router.post('/generate-chapters', async (req: Request, res: Response) => {
  try {
    const validation = GenerateChaptersSchema.safeParse(req.body)
    
    if (!validation.success) {
      sendError(res, `请求参数错误: ${validation.error.errors.map((e: { message: string }) => e.message).join(', ')}`, HttpStatus.BAD_REQUEST)
      return
    }

    const { volumeId, volumeName, volumeMission, startChapter, endChapter, macroPlan, characters, previousChapters } = validation.data
    
    logger.info('生成章节列表', { volumeId, volumeName, startChapter, endChapter })
    
    const result = await aiGenerationService.generateChapters({
      volumeId,
      volumeName,
      volumeMission,
      startChapter,
      endChapter,
      macroPlan,
      characters,
      previousChapters
    })
    
    sendSuccess(res, result)
  } catch (error) {
    logger.error('生成章节列表失败', error)
    const errorMessage = error instanceof Error ? error.message : ErrorMessages.INTERNAL_ERROR
    sendError(res, errorMessage, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

/**
 * 流式生成整本方向候选
 * POST /api/ai/generate-directions/stream
 */
router.post('/generate-directions/stream', async (req: Request, res: Response) => {
  try {
    const validation = GenerateDirectionsSchema.safeParse(req.body)
    
    if (!validation.success) {
      sendError(res, `请求参数错误: ${validation.error.errors.map((e: { message: string }) => e.message).join(', ')}`, HttpStatus.BAD_REQUEST)
      return
    }

    const { inspiration, genre, count } = validation.data
    
    logger.info('流式生成整本方向候选', { inspiration: inspiration.substring(0, 50), genre, count })
    
    // 设置 SSE 响应头
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    
    try {
      for await (const chunk of aiGenerationService.generateDirectionsStream({
        inspiration,
        genre,
        count
      })) {
        if (chunk.error) {
          res.write(`data: ${JSON.stringify({ error: chunk.error })}\n\n`)
          break
        }
        if (chunk.content) {
          res.write(`data: ${JSON.stringify({ content: chunk.content })}\n\n`)
        }
        if (chunk.done) {
          res.write(`data: ${JSON.stringify({ done: true })}\n\n`)
        }
      }
    } catch (streamError) {
      logger.error('流式生成失败', streamError)
      res.write(`data: ${JSON.stringify({ error: streamError instanceof Error ? streamError.message : '流式生成失败' })}\n\n`)
    }
    
    res.end()
  } catch (error) {
    logger.error('流式生成整本方向候选失败', error)
    if (!res.headersSent) {
      const errorMessage = error instanceof Error ? error.message : ErrorMessages.INTERNAL_ERROR
      sendError(res, errorMessage, HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }
})

/**
 * 流式生成故事宏观规划
 * POST /api/ai/generate-macro-plan/stream
 */
router.post('/generate-macro-plan/stream', async (req: Request, res: Response) => {
  try {
    const validation = GenerateMacroPlanSchema.safeParse(req.body)
    
    if (!validation.success) {
      sendError(res, `请求参数错误: ${validation.error.errors.map((e: { message: string }) => e.message).join(', ')}`, HttpStatus.BAD_REQUEST)
      return
    }

    const { title, genre, coreSellingPoint, targetReaderFeeling, first30ChaptersPromise } = validation.data
    
    logger.info('流式生成故事宏观规划', { title, genre })
    
    // 设置 SSE 响应头
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    
    try {
      for await (const chunk of aiGenerationService.generateMacroPlanStream({
        title,
        genre,
        coreSellingPoint,
        targetReaderFeeling,
        first30ChaptersPromise
      })) {
        if (chunk.error) {
          res.write(`data: ${JSON.stringify({ error: chunk.error })}\n\n`)
          break
        }
        if (chunk.content) {
          res.write(`data: ${JSON.stringify({ content: chunk.content })}\n\n`)
        }
        if (chunk.done) {
          res.write(`data: ${JSON.stringify({ done: true })}\n\n`)
        }
      }
    } catch (streamError) {
      logger.error('流式生成失败', streamError)
      res.write(`data: ${JSON.stringify({ error: streamError instanceof Error ? streamError.message : '流式生成失败' })}\n\n`)
    }
    
    res.end()
  } catch (error) {
    logger.error('流式生成故事宏观规划失败', error)
    if (!res.headersSent) {
      const errorMessage = error instanceof Error ? error.message : ErrorMessages.INTERNAL_ERROR
      sendError(res, errorMessage, HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }
})

export default router
