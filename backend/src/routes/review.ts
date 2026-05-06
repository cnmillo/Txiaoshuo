import { Router, type Request, type Response } from 'express'
import { reviewService } from '../services/reviewService.js'
import { sendSuccess, sendError, ErrorMessages, HttpStatus } from '../utils/response.js'
import logger from '../utils/logger.js'

const router = Router()

/**
 * 检查是否需要回顾分析
 * GET /api/review/check/:novelId
 */
router.get('/check/:novelId', async (req: Request, res: Response) => {
  try {
    const { novelId } = req.params
    
    if (!novelId) {
      sendError(res, '请提供小说ID', HttpStatus.BAD_REQUEST)
      return
    }

    const shouldReview = await reviewService.shouldReview(novelId)

    sendSuccess(res, { shouldReview })
  } catch (error) {
    logger.error('检查回顾分析需求失败', error)
    sendError(res, ErrorMessages.INTERNAL_ERROR, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

/**
 * 执行回顾分析
 * POST /api/review/analyze/:novelId
 */
router.post('/analyze/:novelId', async (req: Request, res: Response) => {
  try {
    const { novelId } = req.params
    
    if (!novelId) {
      sendError(res, '请提供小说ID', HttpStatus.BAD_REQUEST)
      return
    }

    // 执行回顾分析
    const report = await reviewService.performReview(novelId)

    sendSuccess(res, report)
  } catch (error) {
    logger.error('执行回顾分析失败', error)
    sendError(res, error instanceof Error ? error.message : ErrorMessages.INTERNAL_ERROR, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

/**
 * 获取小说的回顾分析报告
 * GET /api/review/reports/:novelId
 */
router.get('/reports/:novelId', async (req: Request, res: Response) => {
  try {
    const { novelId } = req.params
    
    if (!novelId) {
      sendError(res, '请提供小说ID', HttpStatus.BAD_REQUEST)
      return
    }

    const reports = await reviewService.getReports(novelId)

    sendSuccess(res, reports)
  } catch (error) {
    logger.error('获取回顾分析报告失败', error)
    sendError(res, ErrorMessages.INTERNAL_ERROR, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

/**
 * 获取单个回顾分析报告
 * GET /api/review/report/:reportId
 */
router.get('/report/:reportId', async (req: Request, res: Response) => {
  try {
    const { reportId } = req.params
    
    if (!reportId) {
      sendError(res, '请提供报告ID', HttpStatus.BAD_REQUEST)
      return
    }

    const report = await reviewService.getReportById(reportId)

    if (!report) {
      sendError(res, '报告不存在', HttpStatus.NOT_FOUND)
      return
    }

    sendSuccess(res, report)
  } catch (error) {
    logger.error('获取单个回顾分析报告失败', error)
    sendError(res, ErrorMessages.INTERNAL_ERROR, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

export default router