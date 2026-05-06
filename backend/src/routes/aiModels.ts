import { Router, Request, Response } from 'express'
import { logger } from '../utils/logger.js'
import { sendSuccess, sendError, HttpStatus, ErrorMessages } from '../utils/response.js'
import { asyncHandler } from '../middleware/errorHandler.js'
import { aiService } from '../services/aiService.js'
import { aiModelService } from '../services/aiModelService.js'

const router = Router()

router.get('/ai-models', asyncHandler(async (_req: Request, res: Response) => {
  const models = await aiModelService.getAll()
  sendSuccess(res, models)
}))

router.get('/ai-models/:id', asyncHandler(async (req: Request, res: Response) => {
  const model = await aiModelService.getById(req.params.id)
  if (!model) {
    sendError(res, ErrorMessages.NOT_FOUND, HttpStatus.NOT_FOUND)
    return
  }
  sendSuccess(res, model)
}))

router.post('/ai-models', asyncHandler(async (req: Request, res: Response) => {
  const { name, baseUrl, apiKey, modelId } = req.body
  
  if (!name || !baseUrl || !modelId) {
    sendError(res, '缺少必要参数', HttpStatus.BAD_REQUEST)
    return
  }

  try {
    const newModel = await aiModelService.create({
      name,
      baseUrl,
      apiKey,
      modelId
    })
    sendSuccess(res, newModel)
  } catch (error) {
    logger.error('创建AI模型失败', error)
    sendError(res, '创建失败', HttpStatus.INTERNAL_SERVER_ERROR)
  }
}))

router.put('/ai-models/:id', asyncHandler(async (req: Request, res: Response) => {
  const { name, baseUrl, apiKey, modelId } = req.body
  
  try {
    const updatedModel = await aiModelService.update(req.params.id, {
      name,
      baseUrl,
      apiKey,
      modelId
    })
    
    if (!updatedModel) {
      sendError(res, ErrorMessages.NOT_FOUND, HttpStatus.NOT_FOUND)
      return
    }
    
    sendSuccess(res, updatedModel)
  } catch (error) {
    logger.error('更新AI模型失败', error)
    sendError(res, '更新失败', HttpStatus.INTERNAL_SERVER_ERROR)
  }
}))

router.delete('/ai-models/:id', asyncHandler(async (req: Request, res: Response) => {
  const deleted = await aiModelService.delete(req.params.id)
  if (!deleted) {
    sendError(res, ErrorMessages.NOT_FOUND, HttpStatus.NOT_FOUND)
    return
  }
  sendSuccess(res, { message: '删除成功' })
}))

router.post('/ai-models/:id/test', asyncHandler(async (req: Request, res: Response) => {
  const model = await aiModelService.getById(req.params.id)
  if (!model) {
    sendError(res, ErrorMessages.NOT_FOUND, HttpStatus.NOT_FOUND)
    return
  }

  const startTime = Date.now()
  try {
    const result = await aiService.testConnection({
      baseUrl: model.baseUrl,
      apiKey: model.apiKey,
      model: model.modelId
    })

    const latency = Date.now() - startTime

    if (result.success) {
      await aiModelService.updateTestStatus(req.params.id, 'success', latency)
      sendSuccess(res, {
        success: true,
        message: '连接成功',
        latency
      })
    } else {
      await aiModelService.updateTestStatus(req.params.id, 'failed')
      sendSuccess(res, {
        success: false,
        message: result.message
      })
    }
  } catch (error) {
    await aiModelService.updateTestStatus(req.params.id, 'failed')
    sendSuccess(res, {
      success: false,
      message: error instanceof Error ? error.message : '连接失败'
    })
  }
}))

router.put('/ai-models/:id/active', asyncHandler(async (req: Request, res: Response) => {
  const model = await aiModelService.getById(req.params.id)
  if (!model) {
    sendError(res, ErrorMessages.NOT_FOUND, HttpStatus.NOT_FOUND)
    return
  }

  await aiModelService.setActive(req.params.id)
  sendSuccess(res, { message: '已设置为当前使用' })
}))

export default router
