import { Router, type Request, type Response } from 'express'
import { knowledgeService } from '../services/knowledgeService.js'
import { sendSuccess, sendError, ErrorMessages, HttpStatus } from '../utils/response.js'
import logger from '../utils/logger.js'
import { z } from 'zod'

const router = Router()

// 请求验证 Schema
const BindWorldSchema = z.object({
  novelId: z.string().min(1, '小说ID不能为空'),
  worldviewId: z.string().min(1, '世界观ID不能为空'),
  bindingType: z.enum(['full', 'partial']).optional().default('full'),
  selectedElements: z.array(z.string()).optional()
})

const UnbindWorldSchema = z.object({
  novelId: z.string().min(1, '小说ID不能为空'),
  worldviewId: z.string().min(1, '世界观ID不能为空')
})

const ImportAnalysisSchema = z.object({
  novelId: z.string().min(1, '小说ID不能为空'),
  analysisData: z.object({
    title: z.string(),
    author: z.string().optional(),
    genre: z.string().optional(),
    summary: z.string().optional(),
    characters: z.array(z.record(z.unknown())).optional(),
    worldview: z.record(z.unknown()).optional(),
    plotStructure: z.record(z.unknown()).optional(),
    styleAnalysis: z.record(z.unknown()).optional(),
    keyElements: z.array(z.record(z.unknown())).optional()
  })
})

/**
 * 绑定世界观
 * POST /api/knowledge/bind-world
 */
router.post('/bind-world', async (req: Request, res: Response) => {
  try {
    const validation = BindWorldSchema.safeParse(req.body)
    
    if (!validation.success) {
      sendError(res, `请求参数错误: ${validation.error.errors.map((e: { message: string }) => e.message).join(', ')}`, HttpStatus.BAD_REQUEST)
      return
    }

    const { novelId, worldviewId, bindingType, selectedElements } = validation.data
    
    logger.info('绑定世界观', { novelId, worldviewId, bindingType })
    
    const result = await knowledgeService.bindWorldview({
      novelId,
      worldviewId,
      bindingType,
      selectedElements
    })
    
    sendSuccess(res, result, '世界观绑定成功')
  } catch (error) {
    logger.error('绑定世界观失败', error)
    const errorMessage = error instanceof Error ? error.message : ErrorMessages.INTERNAL_ERROR
    sendError(res, errorMessage, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

/**
 * 解绑世界观
 * POST /api/knowledge/unbind-world
 */
router.post('/unbind-world', async (req: Request, res: Response) => {
  try {
    const validation = UnbindWorldSchema.safeParse(req.body)
    
    if (!validation.success) {
      sendError(res, `请求参数错误: ${validation.error.errors.map((e: { message: string }) => e.message).join(', ')}`, HttpStatus.BAD_REQUEST)
      return
    }

    const { novelId, worldviewId } = validation.data
    
    logger.info('解绑世界观', { novelId, worldviewId })
    
    const result = await knowledgeService.unbindWorldview({
      novelId,
      worldviewId
    })
    
    sendSuccess(res, result, '世界观解绑成功')
  } catch (error) {
    logger.error('解绑世界观失败', error)
    const errorMessage = error instanceof Error ? error.message : ErrorMessages.INTERNAL_ERROR
    sendError(res, errorMessage, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

/**
 * 知识库检索
 * GET /api/knowledge/search
 */
router.get('/search', async (req: Request, res: Response) => {
  try {
    const { query: searchQuery, novelId, worldviewId, searchType, limit } = req.query
    
    if (!searchQuery) {
      sendError(res, '搜索关键词不能为空', HttpStatus.BAD_REQUEST)
      return
    }
    
    logger.info('知识库检索', { searchQuery, novelId, worldviewId, searchType })
    
    const result = await knowledgeService.searchKnowledge({
      query: searchQuery as string,
      novelId: novelId as string | undefined,
      worldviewId: worldviewId as string | undefined,
      searchType: (searchType as 'all' | 'characters' | 'worldview' | 'plot' | 'style') || 'all',
      limit: limit ? Number(limit) : 20
    })
    
    sendSuccess(res, result)
  } catch (error) {
    logger.error('知识库检索失败', error)
    const errorMessage = error instanceof Error ? error.message : ErrorMessages.INTERNAL_ERROR
    sendError(res, errorMessage, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

/**
 * 导入拆书结果
 * POST /api/knowledge/import-analysis
 */
router.post('/import-analysis', async (req: Request, res: Response) => {
  try {
    const validation = ImportAnalysisSchema.safeParse(req.body)
    
    if (!validation.success) {
      sendError(res, `请求参数错误: ${validation.error.errors.map((e: { message: string }) => e.message).join(', ')}`, HttpStatus.BAD_REQUEST)
      return
    }

    const { novelId, analysisData } = validation.data
    
    logger.info('导入拆书结果', { novelId, title: analysisData.title })
    
    const result = await knowledgeService.importAnalysis({
      novelId,
      analysisData
    })
    
    sendSuccess(res, result, '拆书结果导入成功')
  } catch (error) {
    logger.error('导入拆书结果失败', error)
    const errorMessage = error instanceof Error ? error.message : ErrorMessages.INTERNAL_ERROR
    sendError(res, errorMessage, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

/**
 * 获取小说关联的知识库
 * GET /api/knowledge/novel/:novelId
 */
router.get('/novel/:novelId', async (req: Request, res: Response) => {
  try {
    const { novelId } = req.params
    
    if (!novelId) {
      sendError(res, '小说ID不能为空', HttpStatus.BAD_REQUEST)
      return
    }
    
    const result = await knowledgeService.getNovelKnowledge(novelId)
    
    sendSuccess(res, result)
  } catch (error) {
    logger.error('获取小说知识库失败', error)
    const errorMessage = error instanceof Error ? error.message : ErrorMessages.INTERNAL_ERROR
    sendError(res, errorMessage, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

/**
 * 获取世界观详情
 * GET /api/knowledge/worldview/:worldviewId
 */
router.get('/worldview/:worldviewId', async (req: Request, res: Response) => {
  try {
    const { worldviewId } = req.params
    
    if (!worldviewId) {
      sendError(res, '世界观ID不能为空', HttpStatus.BAD_REQUEST)
      return
    }
    
    const result = await knowledgeService.getWorldview(worldviewId)
    
    if (!result) {
      sendError(res, '世界观不存在', HttpStatus.NOT_FOUND)
      return
    }
    
    sendSuccess(res, result)
  } catch (error) {
    logger.error('获取世界观详情失败', error)
    const errorMessage = error instanceof Error ? error.message : ErrorMessages.INTERNAL_ERROR
    sendError(res, errorMessage, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

/**
 * 创建世界观
 * POST /api/knowledge/worldview
 */
router.post('/worldview', async (req: Request, res: Response) => {
  try {
    const { name, description, setting, rules, factions } = req.body
    
    if (!name) {
      sendError(res, '世界观名称不能为空', HttpStatus.BAD_REQUEST)
      return
    }
    
    logger.info('创建世界观', { name })
    
    const result = await knowledgeService.createWorldview({
      name,
      description,
      setting,
      rules,
      factions
    })
    
    sendSuccess(res, result, '世界观创建成功')
  } catch (error) {
    logger.error('创建世界观失败', error)
    const errorMessage = error instanceof Error ? error.message : ErrorMessages.INTERNAL_ERROR
    sendError(res, errorMessage, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

/**
 * 更新世界观
 * PUT /api/knowledge/worldview/:worldviewId
 */
router.put('/worldview/:worldviewId', async (req: Request, res: Response) => {
  try {
    const { worldviewId } = req.params
    const { name, description, setting, rules, factions } = req.body
    
    if (!worldviewId) {
      sendError(res, '世界观ID不能为空', HttpStatus.BAD_REQUEST)
      return
    }
    
    logger.info('更新世界观', { worldviewId })
    
    const result = await knowledgeService.updateWorldview(worldviewId, {
      name,
      description,
      setting,
      rules,
      factions
    })
    
    sendSuccess(res, result, '世界观更新成功')
  } catch (error) {
    logger.error('更新世界观失败', error)
    const errorMessage = error instanceof Error ? error.message : ErrorMessages.INTERNAL_ERROR
    sendError(res, errorMessage, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

/**
 * 删除世界观
 * DELETE /api/knowledge/worldview/:worldviewId
 */
router.delete('/worldview/:worldviewId', async (req: Request, res: Response) => {
  try {
    const { worldviewId } = req.params
    
    if (!worldviewId) {
      sendError(res, '世界观ID不能为空', HttpStatus.BAD_REQUEST)
      return
    }
    
    logger.info('删除世界观', { worldviewId })
    
    const result = await knowledgeService.deleteWorldview(worldviewId)
    
    sendSuccess(res, { deleted: result }, '世界观删除成功')
  } catch (error) {
    logger.error('删除世界观失败', error)
    const errorMessage = error instanceof Error ? error.message : ErrorMessages.INTERNAL_ERROR
    sendError(res, errorMessage, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

/**
 * 获取世界观列表
 * GET /api/knowledge/worldviews
 */
router.get('/worldviews', async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, search } = req.query
    
    const result = await knowledgeService.listWorldviews({
      page: Number(page),
      limit: Number(limit),
      search: search as string | undefined
    })
    
    sendSuccess(res, result)
  } catch (error) {
    logger.error('获取世界观列表失败', error)
    const errorMessage = error instanceof Error ? error.message : ErrorMessages.INTERNAL_ERROR
    sendError(res, errorMessage, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

export default router
