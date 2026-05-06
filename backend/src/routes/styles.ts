import { Router, type Request, type Response } from 'express'
import { styleService } from '../services/styleService.js'
import { sendSuccess, sendError, HttpStatus } from '../utils/response.js'
import logger from '../utils/logger.js'
import type {
  CreateStyleRequest,
  UpdateStyleRequest,
  StyleFilter,
  NovelGenre
} from '../types/shared.js'

const router = Router()

/**
 * 获取风格列表
 * GET /api/styles
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const filter: StyleFilter = {}

    if (req.query.genre) {
      filter.genre = String(req.query.genre) as NovelGenre
    }

    if (req.query.isCustom !== undefined) {
      filter.isCustom = req.query.isCustom === 'true'
    }

    if (req.query.search) {
      filter.search = String(req.query.search)
    }

    const styles = await styleService.getAllStyles(filter)

    sendSuccess(res, {
      items: styles,
      total: styles.length
    })
  } catch (error) {
    logger.error('获取风格列表失败', error)
    sendError(res, '获取风格列表失败', HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

/**
 * 获取风格模板列表
 * GET /api/styles/templates
 */
router.get('/templates', (req: Request, res: Response) => {
  try {
    const genre = req.query.genre as NovelGenre | undefined
    const templates = styleService.getStyleTemplates(genre)

    sendSuccess(res, {
      items: templates,
      total: templates.length
    })
  } catch (error) {
    logger.error('获取风格模板列表失败', error)
    sendError(res, '获取风格模板列表失败', HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

/**
 * 获取风格配置选项
 * GET /api/styles/options
 */
router.get('/options', (req: Request, res: Response) => {
  try {
    const options = styleService.getStyleConfigOptions()

    sendSuccess(res, options)
  } catch (error) {
    logger.error('获取风格配置选项失败', error)
    sendError(res, '获取风格配置选项失败', HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

/**
 * 获取风格统计
 * GET /api/styles/stats
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = await styleService.getStyleStats()

    sendSuccess(res, stats)
  } catch (error) {
    logger.error('获取风格统计失败', error)
    sendError(res, '获取风格统计失败', HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

/**
 * 获取默认风格
 * GET /api/styles/default
 */
router.get('/default', async (req: Request, res: Response) => {
  try {
    const style = await styleService.getDefaultStyle()

    sendSuccess(res, style)
  } catch (error) {
    logger.error('获取默认风格失败', error)
    sendError(res, '获取默认风格失败', HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

/**
 * 根据模板创建风格
 * POST /api/styles/from-template
 */
router.post('/from-template', async (req: Request, res: Response) => {
  try {
    const { templateId, name } = req.body

    if (!templateId) {
      sendError(res, '模板ID不能为空', HttpStatus.BAD_REQUEST)
      return
    }

    const style = await styleService.createStyleFromTemplate(templateId, name)

    sendSuccess(res, style, '从模板创建风格成功', HttpStatus.CREATED)
  } catch (error) {
    logger.error('从模板创建风格失败', error)
    const message = error instanceof Error ? error.message : '从模板创建风格失败'
    const status = message === '模板不存在' ? HttpStatus.NOT_FOUND : HttpStatus.INTERNAL_SERVER_ERROR
    sendError(res, message, status)
  }
})

/**
 * 预览风格配置
 * POST /api/styles/preview
 */
router.post('/preview', (req: Request, res: Response) => {
  try {
    const { config, additionalPrompt } = req.body

    if (!config) {
      sendError(res, '配置不能为空', HttpStatus.BAD_REQUEST)
      return
    }

    const prompt = styleService.generatePromptFromConfig(config, additionalPrompt)

    sendSuccess(res, {
      promptPreview: prompt,
      config
    })
  } catch (error) {
    logger.error('预览风格配置失败', error)
    sendError(res, '预览风格配置失败', HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

/**
 * 创建风格
 * POST /api/styles
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const request: CreateStyleRequest = req.body

    if (!request.name || !request.name.trim()) {
      sendError(res, '风格名称不能为空', HttpStatus.BAD_REQUEST)
      return
    }

    if (!request.config) {
      sendError(res, '风格配置不能为空', HttpStatus.BAD_REQUEST)
      return
    }

    const requiredConfigFields = ['genre', 'perspective', 'language', 'description', 'pacing', 'dialogue']
    for (const field of requiredConfigFields) {
      if (!request.config[field as keyof typeof request.config]) {
        sendError(res, `配置字段 ${field} 不能为空`, HttpStatus.BAD_REQUEST)
        return
      }
    }

    const style = await styleService.createStyle(request)

    sendSuccess(res, style, '创建风格成功', HttpStatus.CREATED)
  } catch (error) {
    logger.error('创建风格失败', error)
    const message = error instanceof Error ? error.message : '创建风格失败'
    sendError(res, message, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

/**
 * 获取风格详情
 * GET /api/styles/:id
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const style = await styleService.getStyleById(id)

    if (!style) {
      sendError(res, '风格不存在', HttpStatus.NOT_FOUND)
      return
    }

    sendSuccess(res, style)
  } catch (error) {
    logger.error(`获取风格详情失败: ${req.params.id}`, error)
    sendError(res, '获取风格详情失败', HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

/**
 * 更新风格
 * PUT /api/styles/:id
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const request: UpdateStyleRequest = req.body

    const style = await styleService.updateStyle(id, request)

    sendSuccess(res, style, '更新风格成功')
  } catch (error) {
    logger.error(`更新风格失败: ${req.params.id}`, error)
    const message = error instanceof Error ? error.message : '更新风格失败'
    const status = message === '风格不存在' ? HttpStatus.NOT_FOUND :
                   message === '默认风格不能修改' ? HttpStatus.FORBIDDEN :
                   HttpStatus.INTERNAL_SERVER_ERROR
    sendError(res, message, status)
  }
})

/**
 * 删除风格
 * DELETE /api/styles/:id
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    await styleService.deleteStyle(id)

    sendSuccess(res, null, '删除风格成功')
  } catch (error) {
    logger.error(`删除风格失败: ${req.params.id}`, error)
    const message = error instanceof Error ? error.message : '删除风格失败'
    const status = message === '风格不存在' ? HttpStatus.NOT_FOUND :
                   message === '默认风格不能删除' ? HttpStatus.FORBIDDEN :
                   HttpStatus.INTERNAL_SERVER_ERROR
    sendError(res, message, status)
  }
})

/**
 * 生成风格提示词
 * POST /api/styles/:id/generate-prompt
 */
router.post('/:id/generate-prompt', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { additionalPrompt } = req.body

    const prompt = await styleService.generateStylePrompt(id, additionalPrompt)

    sendSuccess(res, { prompt })
  } catch (error) {
    logger.error(`生成风格提示词失败: ${req.params.id}`, error)
    const message = error instanceof Error ? error.message : '生成风格提示词失败'
    const status = message === '风格不存在' ? HttpStatus.NOT_FOUND : HttpStatus.INTERNAL_SERVER_ERROR
    sendError(res, message, status)
  }
})

/**
 * 检查风格一致性
 * POST /api/styles/:id/check-consistency
 */
router.post('/:id/check-consistency', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { content } = req.body

    if (!content) {
      sendError(res, '内容不能为空', HttpStatus.BAD_REQUEST)
      return
    }

    const result = await styleService.checkStyleConsistency(id, content)

    sendSuccess(res, result)
  } catch (error) {
    logger.error(`检查风格一致性失败: ${req.params.id}`, error)
    const message = error instanceof Error ? error.message : '检查风格一致性失败'
    const status = message === '风格不存在' ? HttpStatus.NOT_FOUND : HttpStatus.INTERNAL_SERVER_ERROR
    sendError(res, message, status)
  }
})

/**
 * 设置默认风格
 * PUT /api/styles/:id/set-default
 */
router.put('/:id/set-default', async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    await styleService.setDefaultStyle(id)

    sendSuccess(res, null, '设置默认风格成功')
  } catch (error) {
    logger.error(`设置默认风格失败: ${req.params.id}`, error)
    const message = error instanceof Error ? error.message : '设置默认风格失败'
    const status = message === '风格不存在' ? HttpStatus.NOT_FOUND : HttpStatus.INTERNAL_SERVER_ERROR
    sendError(res, message, status)
  }
})

export default router
