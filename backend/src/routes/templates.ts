import { Router, type Request, type Response } from 'express'
import { writingTemplateService } from '../services/writingTemplateService.js'
import { sendSuccess, sendError, HttpStatus } from '../utils/response.js'
import logger from '../utils/logger.js'
import type {
  WritingTemplateCreate,
  WritingTemplateUpdate,
  TemplateFilter
} from '../types/shared.js'

const router = Router()

/**
 * 获取写作模板列表
 * GET /api/templates
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const filter: TemplateFilter = {}

    if (req.query.type) {
      filter.type = String(req.query.type)
    }

    if (req.query.search) {
      filter.search = String(req.query.search)
    }

    const templates = writingTemplateService.getAllTemplates(filter)

    sendSuccess(res, {
      items: templates,
      total: templates.length
    })
  } catch (error) {
    logger.error('获取写作模板列表失败', error)
    sendError(res, '获取写作模板列表失败', HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

/**
 * 获取写作模板详情
 * GET /api/templates/:id
 */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const template = writingTemplateService.getTemplateById(id)

    if (!template) {
      sendError(res, '模板不存在', HttpStatus.NOT_FOUND)
      return
    }

    sendSuccess(res, template)
  } catch (error) {
    logger.error(`获取写作模板详情失败: ${req.params.id}`, error)
    sendError(res, '获取写作模板详情失败', HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

/**
 * 创建写作模板
 * POST /api/templates
 */
router.post('/', (req: Request, res: Response) => {
  try {
    const request: WritingTemplateCreate = req.body

    // 验证必填字段
    if (!request.name || !request.name.trim()) {
      sendError(res, '模板名称不能为空', HttpStatus.BAD_REQUEST)
      return
    }

    if (!request.type) {
      sendError(res, '模板类型不能为空', HttpStatus.BAD_REQUEST)
      return
    }

    if (!request.structure) {
      sendError(res, '模板结构不能为空', HttpStatus.BAD_REQUEST)
      return
    }

    const template = writingTemplateService.createTemplate(request)

    sendSuccess(res, template, '创建写作模板成功', HttpStatus.CREATED)
  } catch (error) {
    logger.error('创建写作模板失败', error)
    const message = error instanceof Error ? error.message : '创建写作模板失败'
    sendError(res, message, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

/**
 * 更新写作模板
 * PUT /api/templates/:id
 */
router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const request: WritingTemplateUpdate = req.body

    const template = writingTemplateService.updateTemplate(id, request)

    sendSuccess(res, template, '更新写作模板成功')
  } catch (error) {
    logger.error(`更新写作模板失败: ${req.params.id}`, error)
    const message = error instanceof Error ? error.message : '更新写作模板失败'
    const status = message === '模板不存在' ? HttpStatus.NOT_FOUND :
                   message === '默认模板不能修改' ? HttpStatus.FORBIDDEN :
                   HttpStatus.INTERNAL_SERVER_ERROR
    sendError(res, message, status)
  }
})

/**
 * 删除写作模板
 * DELETE /api/templates/:id
 */
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params

    writingTemplateService.deleteTemplate(id)

    sendSuccess(res, null, '删除写作模板成功')
  } catch (error) {
    logger.error(`删除写作模板失败: ${req.params.id}`, error)
    const message = error instanceof Error ? error.message : '删除写作模板失败'
    const status = message === '模板不存在' ? HttpStatus.NOT_FOUND :
                   message === '默认模板不能删除' ? HttpStatus.FORBIDDEN :
                   HttpStatus.INTERNAL_SERVER_ERROR
    sendError(res, message, status)
  }
})

/**
 * 生成风格指南
 * GET /api/templates/:id/style-guide
 */
router.get('/:id/style-guide', (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { styleId } = req.query

    const styleGuide = writingTemplateService.generateStyleGuide(id, styleId as string)

    sendSuccess(res, styleGuide)
  } catch (error) {
    logger.error(`生成风格指南失败: ${req.params.id}`, error)
    const message = error instanceof Error ? error.message : '生成风格指南失败'
    const status = message === '模板不存在' ? HttpStatus.NOT_FOUND : HttpStatus.INTERNAL_SERVER_ERROR
    sendError(res, message, status)
  }
})

export default router
