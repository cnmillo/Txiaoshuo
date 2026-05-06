import { Router } from 'express'
import { aiService } from '../services/aiService.js'
import { generateService } from '../services/generateService.js'
import { settingsService } from '../services/settingsService.js'
import { asyncHandler, createError } from '../middleware/errorHandler.js'
import { sendSuccess, sendError, ErrorMessages, HttpStatus } from '../utils/response.js'
import {
  validate,
  aiGenerateSchema,
  aiConfigSchema,
  generateOutlineSchema,
  generateFromOutlineSchema
} from '../utils/validation.js'
import type { AIConfig, NovelGenre, NovelLength } from '../types/index.js'
import logger from '../utils/logger.js'

const router = Router()

/**
 * 获取支持的AI提供商列表
 * GET /api/ai/providers
 */
router.get('/providers', (req, res) => {
  try {
    const providers = aiService.getProviders()
    sendSuccess(res, providers)
  } catch (error) {
    logger.error('获取AI提供商列表失败', error)
    sendError(res, '获取AI提供商列表失败', HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

/**
 * 调用AI生成文本
 * POST /api/ai/generate
 */
router.post('/generate', async (req, res) => {
  try {
    const validation = validate(aiGenerateSchema, req.body)
    if (!validation.success) {
      sendError(res, `请求参数错误: ${validation.errors.join(', ')}`, HttpStatus.BAD_REQUEST)
      return
    }

    const data = validation.data as { prompt: string; systemPrompt?: string; temperature?: number; maxTokens?: number }
    const { prompt, systemPrompt, temperature, maxTokens } = data

    // 使用标准AI配置
    const content = await aiService.generateText(prompt, {
      systemPrompt,
      temperature,
      maxTokens
    })

    sendSuccess(res, { content })
  } catch (error) {
    logger.error('AI生成失败', error)
    const message = error instanceof Error ? error.message : ErrorMessages.AI_SERVICE_ERROR
    sendError(res, message, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

/**
 * 流式AI生成
 * POST /api/ai/generate-stream
 */
router.post('/generate-stream', async (req, res) => {
  try {
    const validation = validate(aiGenerateSchema, req.body)
    if (!validation.success) {
      sendError(res, `请求参数错误: ${validation.errors.join(', ')}`, HttpStatus.BAD_REQUEST)
      return
    }

    const data = validation.data as { prompt: string; systemPrompt?: string; temperature?: number; maxTokens?: number }
    const { prompt, systemPrompt, temperature, maxTokens } = data

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')

    const healthyModels = await settingsService.getHealthyModels()
    
    if (healthyModels.length > 0) {
      logger.info('使用自定义模型进行流式生成', { modelCount: healthyModels.length })
      
      const generator = aiService.generateTextStreamWithFailover(prompt, {
        systemPrompt,
        temperature,
        maxTokens
      })

      for await (const chunk of generator) {
        if (chunk.error) {
          res.write(`data: ${JSON.stringify({ error: chunk.error })}

`)
          break
        }
        if (chunk.done) {
          res.write('data: [DONE]\n\n')
          break
        }
        if (chunk.content) {
          res.write(`data: ${JSON.stringify({ content: chunk.content })}

`)
        }
      }
    } else {
      const generator = aiService.generateTextStream(prompt, {
        systemPrompt,
        temperature,
        maxTokens
      })

      for await (const chunk of generator) {
        if (chunk.error) {
          res.write(`data: ${JSON.stringify({ error: chunk.error })}

`)
          break
        }
        if (chunk.done) {
          res.write('data: [DONE]\n\n')
          break
        }
        if (chunk.content) {
          res.write(`data: ${JSON.stringify({ content: chunk.content })}

`)
        }
      }
    }

    res.end()
  } catch (error) {
    logger.error('AI流式生成失败', error)
    const message = error instanceof Error ? error.message : ErrorMessages.AI_SERVICE_ERROR
    res.write(`data: ${JSON.stringify({ error: message })}

`)
    res.end()
  }
})

/**
 * 获取AI配置
 * GET /api/ai/config
 */
router.get('/config', async (req, res) => {
  try {
    const config = await aiService.getSettings()
    // 隐藏API密钥
    const safeConfig = {
      ...config,
      apiKey: config.apiKey ? '********' : ''
    }
    sendSuccess(res, safeConfig)
  } catch (error) {
    logger.error('获取AI配置失败', error)
    sendError(res, ErrorMessages.INTERNAL_ERROR, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

/**
 * 更新AI配置
 * PUT /api/ai/config
 */
router.put('/config', async (req, res) => {
  try {
    const validation = validate(aiConfigSchema, req.body)
    if (!validation.success) {
      sendError(res, `配置错误: ${validation.errors.join(', ')}`, HttpStatus.BAD_REQUEST)
      return
    }

    const validatedData = validation.data as Record<string, unknown>
    const currentConfig = await aiService.getSettings()
    const newConfig = { ...currentConfig, ...validatedData }

    // 如果apiKey是掩码或为空，保留原值
    if (newConfig.apiKey === '********' || !newConfig.apiKey) {
      newConfig.apiKey = currentConfig.apiKey
    }

    await settingsService.updateAIConfig(newConfig)

    sendSuccess(res, { ...newConfig, apiKey: '********' }, 'AI配置更新成功')
  } catch (error) {
    logger.error('更新AI配置失败', error)
    sendError(res, ErrorMessages.SETTINGS_UPDATE_FAILED, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

/**
 * 测试AI连接
 * POST /api/ai/test
 */
router.post('/test', async (req, res) => {
  try {
    const { config } = req.body

    let testConfig: AIConfig | undefined
    if (config) {
      const validation = validate(aiConfigSchema.partial(), config)
      if (!validation.success) {
        sendError(res, `配置错误: ${validation.errors.join(', ')}`, HttpStatus.BAD_REQUEST)
        return
      }
      testConfig = validation.data as AIConfig
    }

    const result = await aiService.testConfig(testConfig)

    if (result.success) {
      sendSuccess(res, null, result.message)
    } else {
      sendError(res, result.message, HttpStatus.BAD_REQUEST)
    }
  } catch (error) {
    logger.error('测试AI连接失败', error)
    const message = error instanceof Error ? error.message : '测试失败'
    sendError(res, message, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

/**
 * 生成大纲
 * POST /api/ai/generate-outline
 */
router.post('/generate-outline', async (req, res) => {
  try {
    const validation = validate(generateOutlineSchema, req.body)
    if (!validation.success) {
      sendError(res, `请求参数错误: ${validation.errors.join(', ')}`, HttpStatus.BAD_REQUEST)
      return
    }

    const data = validation.data as { title: string; prompt: string; genre?: string; length?: string }
    const { title, prompt, genre, length } = data

    const outline = await generateService.generateOutline(title, prompt, genre as NovelGenre, length as NovelLength)

    sendSuccess(res, { outline })
  } catch (error) {
    logger.error('生成大纲失败', error)
    const message = error instanceof Error ? error.message : '生成大纲失败'
    sendError(res, message, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

/**
 * 从一句话生成大纲
 * POST /api/ai/generate-outline-from-sentence
 */
router.post('/generate-outline-from-sentence', async (req, res) => {
  try {
    const validation = validate(generateOutlineSchema, req.body)
    if (!validation.success) {
      sendError(res, `请求参数错误: ${validation.errors.join(', ')}`, HttpStatus.BAD_REQUEST)
      return
    }

    const data = validation.data as { title: string; prompt: string; genre?: string; length?: string }
    const { title, prompt, genre, length } = data

    const outline = await generateService.generateOutlineFromSentence(prompt, genre as NovelGenre, length as NovelLength)

    sendSuccess(res, { outline, title })
  } catch (error) {
    logger.error('从一句话生成大纲失败', error)
    const message = error instanceof Error ? error.message : '生成大纲失败'
    sendError(res, message, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

/**
 * 生成单章内容
 * POST /api/ai/generate-chapter
 */
router.post('/generate-chapter', async (req, res) => {
  try {
    const validation = validate(generateFromOutlineSchema, req.body)
    if (!validation.success) {
      sendError(res, `请求参数错误: ${validation.errors.join(', ')}`, HttpStatus.BAD_REQUEST)
      return
    }

    const data = validation.data as {
      title: string;
      chapterNumber: number;
      chapterTitle: string;
      outline: string;
      previousContent?: string;
      targetWords?: number;
      genre?: string
    }
    const {
      title,
      chapterNumber,
      chapterTitle,
      outline,
      previousContent,
      targetWords,
      genre
    } = data

    const content = await generateService.generateChapter(
      title,
      chapterNumber,
      chapterTitle,
      outline,
      previousContent || '',
      targetWords || 3000,
      genre as NovelGenre
    )

    sendSuccess(res, { content })
  } catch (error) {
    logger.error('生成章节失败', error)
    const message = error instanceof Error ? error.message : '生成章节失败'
    sendError(res, message, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

router.post('/parse-code', asyncHandler(async (req, res) => {
  const { code } = req.body
  if (!code || typeof code !== 'string') {
    throw createError('请提供要解析的代码内容', 400)
  }

  let baseUrl = ''
  let apiKey = ''
  let modelId = ''

  try {
    const { parseCurlCommand } = await import('../utils/curlParser.js')
    const parsed = parseCurlCommand(code)

    if (parsed.success && parsed.data) {
      const cmdData = parsed.data
      if (cmdData.url) baseUrl = cmdData.url.replace(/\/$/, '')
      if (cmdData.headers) {
        for (const [key, value] of Object.entries(cmdData.headers)) {
          if (key.toLowerCase() === 'authorization') {
            const authVal = String(value || '')
            const match = authVal.match(/(?:Bearer|sk-|api_key|ms-)\s*(.+)/i)
            if (match) apiKey = match[1].trim()
          }
        }
      }
      if (typeof cmdData.body === 'string' && cmdData.body) {
        try {
          const bodyObj = JSON.parse(cmdData.body)
          if (bodyObj.model) modelId = bodyObj.model
        } catch {
          void 0
        }
      }
    }
  } catch {
    void 0
  }

  if (!baseUrl && !apiKey && !modelId) {
    const baseMatch = code.match(/base_url\s*=\s*["'](.+?)["']/i)
    if (baseMatch) baseUrl = baseMatch[1].replace(/\/$/, '')

    const keyPatterns = [
      /api_key\s*=\s*["']([^"']+?)["']/i,
      /api_key['":\s]*["']([^"']+?)["']/i,
      /api_key\s*=\s*os\.environ\[['"]([^'"]+?)['"]\]/i,
    ]
    for (const pat of keyPatterns) {
      const m = code.match(pat)
      if (m) { apiKey = m[1].replace(/\s*#\s.*$/, '').trim(); break }
    }

    // 清理提取值中的反引号和多余空白
    if (baseUrl) baseUrl = baseUrl.replace(/[`'\s]/g, '')
    if (apiKey) apiKey = apiKey.replace(/[`']/g, '').trim()

    const modelPatterns = [
      /model\s*=\s*["'](.+?)["']/i,
      /model['":\s]*["'](.+?)["']/i,
    ]
    for (const pat of modelPatterns) {
      const m = code.match(pat)
      if (m) { modelId = m[1]; break }
    }
  }

  if (!baseUrl && !apiKey && !modelId) {
    return res.status(200).json({ success: false, message: '无法识别API配置，请检查格式是否包含 base_url/api_key/model' })
  }

  res.json({ success: true, data: { baseUrl: baseUrl || '', apiKey: apiKey || '', modelId: modelId || '' }, message: '解析成功' })
}))

router.post('/test-connection', asyncHandler(async (req, res) => {
  const { apiKey, baseUrl, model } = req.body
  if (!apiKey || !baseUrl || !model) {
    throw createError('缺少必要参数：apiKey, baseUrl, model', 400)
  }

  const startTime = Date.now()
  try {
    const axios = (await import('axios')).default
    const url = `${baseUrl.replace(/\/$/, '')}/chat/completions`
    const response = await axios.post(url, {
      model,
      messages: [{ role: 'user', content: 'Reply with exactly: OK' }],
      max_tokens: 10,
      stream: false
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      timeout: 30000
    })

    const latency = Date.now() - startTime
    let content = ''
    if (response.data?.choices?.[0]?.message?.content) {
      content = response.data.choices[0].message.content
    } else if (response.data?.choices?.[0]?.delta?.content) {
      content = response.data.choices[0].delta.content
    }

    res.json({ success: true, message: '连接成功，模型响应正常', latency, model, preview: content.substring(0, 50) })
  } catch (error: unknown) {
    const latency = Date.now() - startTime
    const err = error instanceof Error ? error : new Error(String(error))
    const axiosError = error as { response?: { status?: number; data?: { error?: { message?: string } } } }
    const status = axiosError.response?.status || 500
    const errMsg = axiosError.response?.data?.error?.message || err.message || '未知错误'
    res.status(200).json({ success: false, message: `连接失败 [${status}]: ${errMsg}`, latency })
  }
}))

export default router
