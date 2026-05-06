import { Router, type Request, type Response } from 'express'
import { qualityService } from '../services/qualityService.js'
import { sendSuccess, sendError, ErrorMessages, HttpStatus } from '../utils/response.js'
import logger from '../utils/logger.js'

const router = Router()

/**
 * 创建质量提升任务
 * POST /api/quality/task
 */
router.post('/task', async (req: Request, res: Response) => {
  try {
    const { novelId, type } = req.body
    
    if (!novelId || !type) {
      sendError(res, '请提供小说ID和任务类型', HttpStatus.BAD_REQUEST)
      return
    }

    const task = await qualityService.createTask(novelId, type)

    sendSuccess(res, task)
  } catch (error) {
    logger.error('创建质量提升任务失败', error)
    sendError(res, ErrorMessages.INTERNAL_ERROR, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

/**
 * 执行质量提升任务
 * POST /api/quality/task/:taskId/execute
 */
router.post('/task/:taskId/execute', async (req: Request, res: Response) => {
  let responseSent = false
  
  try {
    const { taskId } = req.params
    
    if (!taskId) {
      responseSent = true
      sendError(res, '请提供任务ID', HttpStatus.BAD_REQUEST)
      return
    }

    // 执行质量提升任务
    await qualityService.executeTask(taskId)

    // 检查响应是否已发送
    if (responseSent || res.headersSent) {
      logger.warn('响应已发送，跳过重复响应', { taskId })
      return
    }

    const task = qualityService.getTask(taskId)
    if (!task) {
      responseSent = true
      sendError(res, '任务不存在', HttpStatus.NOT_FOUND)
      return
    }

    responseSent = true
    sendSuccess(res, task)
  } catch (error) {
    if (!responseSent && !res.headersSent) {
      logger.error('执行质量提升任务失败', error)
      sendError(res, error instanceof Error ? error.message : ErrorMessages.INTERNAL_ERROR, HttpStatus.INTERNAL_SERVER_ERROR)
    } else {
      logger.error('执行质量提升任务失败（响应已发送）', error)
    }
  }
})

/**
 * 获取质量提升任务
 * GET /api/quality/task/:taskId
 */
router.get('/task/:taskId', async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params
    
    if (!taskId) {
      sendError(res, '请提供任务ID', HttpStatus.BAD_REQUEST)
      return
    }

    const task = await qualityService.getTask(taskId)

    if (!task) {
      sendError(res, '任务不存在', HttpStatus.NOT_FOUND)
      return
    }

    sendSuccess(res, task)
  } catch (error) {
    logger.error('获取质量提升任务失败', error)
    sendError(res, ErrorMessages.INTERNAL_ERROR, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

/**
 * 获取小说的质量提升结果
 * GET /api/quality/results/:novelId
 */
router.get('/results/:novelId', async (req: Request, res: Response) => {
  try {
    const { novelId } = req.params
    
    if (!novelId) {
      sendError(res, '请提供小说ID', HttpStatus.BAD_REQUEST)
      return
    }

    const results = await qualityService.getResults(novelId)

    sendSuccess(res, results)
  } catch (error) {
    logger.error('获取质量提升结果失败', error)
    sendError(res, ErrorMessages.INTERNAL_ERROR, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

/**
 * 获取单个质量提升结果
 * GET /api/quality/result/:resultId
 */
router.get('/result/:resultId', async (req: Request, res: Response) => {
  try {
    const { resultId } = req.params
    
    if (!resultId) {
      sendError(res, '请提供结果ID', HttpStatus.BAD_REQUEST)
      return
    }

    const result = await qualityService.getResultById(resultId)

    if (!result) {
      sendError(res, '结果不存在', HttpStatus.NOT_FOUND)
      return
    }

    sendSuccess(res, result)
  } catch (error) {
    logger.error('获取单个质量提升结果失败', error)
    sendError(res, ErrorMessages.INTERNAL_ERROR, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

export default router