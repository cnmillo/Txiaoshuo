import { Router, type Request, type Response } from 'express'
import { aiService } from '../services/aiService.js'
import { sendSuccess, sendError, ErrorMessages, HttpStatus } from '../utils/response.js'
import logger from '../utils/logger.js'

const router = Router()

/**
 * 分析图片
 * POST /api/analyze-image
 */
router.post('/image', async (req: Request, res: Response) => {
  try {
    const { image } = req.body

    if (!image) {
      sendError(res, '请提供图片', HttpStatus.BAD_REQUEST)
      return
    }

    // 检查AI配置
    const settings = await aiService.getSettings()
    const curlConfig = await aiService.getCurlConfig()
    if (!settings.apiKey && !curlConfig.useCustomCurl) {
      sendError(res, '请先配置AI API密钥或自定义CURL', HttpStatus.BAD_REQUEST)
      return
    }

    // 分析图片
    const description = await aiService.analyzeImage(image)

    sendSuccess(res, { description })
  } catch (error) {
    logger.error('分析图片失败', error)
    sendError(res, ErrorMessages.INTERNAL_ERROR, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

export default router
