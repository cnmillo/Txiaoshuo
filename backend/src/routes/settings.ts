import { Router } from 'express'
import { query, queryOne, run } from '../database/index.js'
import { asyncHandler, createError } from '../middleware/errorHandler.js'
import { settingsService } from '../services/settingsService.js'
import type { HumanizeConfig } from '../types/index.js'

const router = Router()

// 获取AI配置
router.get('/ai-config', asyncHandler(async (_req, res) => {
  const config = await settingsService.getAIConfig()
  res.json({ success: true, data: config })
}))

// 更新AI配置
router.put('/ai-config', asyncHandler(async (req, res) => {
  const config = req.body
  await settingsService.updateAIConfig(config)
  res.json({ success: true, message: 'AI配置已保存' })
}))

// 获取所有设置
router.get('/', asyncHandler(async (_req, res) => {
  const settings = await query<{ key: string; value: string }>('SELECT key, value FROM settings')

  const settingsMap: Record<string, unknown> = {}
  for (const setting of settings) {
    try {
      settingsMap[setting.key] = JSON.parse(setting.value)
    } catch {
      settingsMap[setting.key] = setting.value
    }
  }

  res.json({
    success: true,
    data: settingsMap
  })
}))

// 获取AI润色设置
router.get('/humanize-config', asyncHandler(async (_req, res) => {
  const config = await settingsService.getHumanizeConfig()
  res.json({ success: true, data: config })
}))

// 更新AI润色设置
router.put('/humanize-config', asyncHandler(async (req, res) => {
  const config = req.body as HumanizeConfig
  await settingsService.updateHumanizeConfig(config)
  res.json({ success: true, message: 'AI润色设置已保存' })
}))

router.get('/custom-models', asyncHandler(async (_req, res) => {
  const models = await settingsService.getCustomModels()
  res.json({ success: true, data: models })
}))

router.post('/custom-models', asyncHandler(async (req, res) => {
  const { name, baseUrl, apiKey, modelId } = req.body
  if (!name || !baseUrl || !apiKey || !modelId) {
    throw createError('缺少必要字段：name, baseUrl, apiKey, modelId', 400)
  }
  const model = await settingsService.addCustomModel({ name, baseUrl, apiKey, modelId })
  res.json({ success: true, data: model, message: '模型添加成功' })
}))

router.put('/custom-models/:id', asyncHandler(async (req, res) => {
  const { id } = req.params
  const data = req.body
  const model = await settingsService.updateCustomModel(id, data)
  if (!model) {
    throw createError('模型不存在', 404, 'NOT_FOUND')
  }
  res.json({ success: true, data: model, message: '模型更新成功' })
}))

router.delete('/custom-models/:id', asyncHandler(async (req, res) => {
  const { id } = req.params
  const deleted = await settingsService.deleteCustomModel(id)
  if (!deleted) {
    throw createError('模型不存在', 404, 'NOT_FOUND')
  }
  res.json({ success: true, message: '模型删除成功' })
}))

// 导出数据
router.get('/export', asyncHandler(async (_req, res) => {
  try {
    const data = await settingsService.exportAllData()
    res.json({
      success: true,
      data,
      message: `导出成功，共 ${data.stats.novels} 部小说、${data.stats.chapters} 章、${data.stats.settings} 条设置`
    })
  } catch (error: unknown) {
    const err = error as Error
    throw createError(`导出失败: ${err.message}`, 500)
  }
}))

// 导入数据
router.post('/import', asyncHandler(async (req, res) => {
  try {
    let importData: Record<string, unknown>

    if (typeof req.body === 'object' && req.body.data) {
      importData = req.body.data as Record<string, unknown>
    } else if (typeof req.body === 'object') {
      importData = req.body
    } else {
      throw createError('无效的请求数据格式', 400)
    }

    const results = await settingsService.importData(importData as { version?: string; tables?: Record<string, unknown[]> })

    const summary = Object.entries(results)
      .map(([table, count]) => `${count}条${table}`)
      .join('、')

    res.json({
      success: true,
      message: `导入成功：${summary}`,
      results
    })
  } catch (error: unknown) {
    const err = error as Error
    if (err.message.includes('无效的备份')) {
      throw createError(err.message, 400)
    }
    throw createError(`导入失败: ${err.message}`, 500)
  }
}))

// 测试自定义模型连接
router.post('/custom-models/:id/test', asyncHandler(async (req, res) => {
  const { id } = req.params
  const models = await settingsService.getCustomModels()
  const model = models.find(m => m.id === id)
  if (!model) {
    throw createError('模型不存在', 404, 'NOT_FOUND')
  }

  const startTime = Date.now()
  try {
    const { aiService } = await import('../services/aiService.js')
    const testPrompt = 'Reply with exactly: OK'
    const result = await aiService.generateTextWithCustomModel(model, testPrompt, { maxTokens: 10 })
    const latency = Date.now() - startTime
    
    res.json({ 
      success: true, 
      message: '连接成功，模型响应正常', 
      latency,
      preview: result.substring(0, 50),
      errorType: null
    })
  } catch (error: unknown) {
    const latency = Date.now() - startTime
    const err = error as Error & { code?: string; response?: { status?: number } }
    
    // 识别错误类型
    let errorType = 'unknown'
    let errorMessage = err.message || '连接失败'
    
    // 网络错误
    if (err.code === 'ECONNREFUSED') {
      errorType = 'network_refused'
      errorMessage = '网络连接被拒绝，无法连接到API服务器'
    } else if (err.code === 'ENOTFOUND') {
      errorType = 'network_not_found'
      errorMessage = '无法解析API地址，请检查URL是否正确'
    } else if (err.code === 'ETIMEDOUT' || err.code === 'ECONNABORTED') {
      errorType = 'timeout'
      errorMessage = '请求超时（30秒），服务器响应过慢或网络不稳定'
    }
    // HTTP状态码错误
    else if (err.response?.status) {
      const status = err.response.status
      if (status === 401) {
        errorType = 'auth_failed'
        errorMessage = '认证失败，API密钥无效或已过期'
      } else if (status === 403) {
        errorType = 'permission_denied'
        errorMessage = '权限不足，该API密钥无权访问此模型'
      } else if (status === 404) {
        errorType = 'model_not_found'
        errorMessage = '模型不存在，请检查模型ID是否正确'
      } else if (status === 429) {
        errorType = 'rate_limit'
        errorMessage = '请求频率超限，请稍后再试'
      } else if (status === 503) {
        errorType = 'service_unavailable'
        errorMessage = '服务暂时不可用，请稍后再试'
      } else if (status >= 500) {
        errorType = 'server_error'
        errorMessage = `服务器错误 (${status})，请稍后再试`
      } else if (status >= 400) {
        errorType = 'client_error'
        errorMessage = `请求错误 (${status})，请检查配置`
      }
    }
    
    res.status(200).json({ 
      success: false, 
      message: errorMessage,
      errorType,
      latency,
      details: err.message
    })
  }
}))

// 获取单个设置
router.get('/:key', asyncHandler(async (req, res) => {
  const { key } = req.params

  const setting = await queryOne<{ key: string; value: string }>('SELECT key, value FROM settings WHERE key = ?', [key])

  if (!setting) {
    throw createError('设置不存在', 404, 'NOT_FOUND')
  }

  let value: unknown
  try {
    value = JSON.parse(setting.value)
  } catch {
    value = setting.value
  }

  res.json({
    success: true,
    data: { key: setting.key, value }
  })
}))

// 更新设置
router.patch('/', asyncHandler(async (req, res) => {
  const updates = req.body
  const now = new Date().toISOString()

  for (const [key, value] of Object.entries(updates)) {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value)
    await run(`
      INSERT INTO settings (key, value, created_at, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
      value = excluded.value,
      updated_at = excluded.updated_at
    `, [key, stringValue, now, now])
  }

  res.json({
    success: true,
    message: '设置更新成功'
  })
}))

// 删除设置
router.delete('/:key', asyncHandler(async (req, res) => {
  const { key } = req.params

  const setting = await queryOne('SELECT key FROM settings WHERE key = ?', [key])
  if (!setting) {
    throw createError('设置不存在', 404, 'NOT_FOUND')
  }

  await run('DELETE FROM settings WHERE key = ?', [key])

  res.json({
    success: true,
    message: '设置删除成功'
  })
}))

export { router as settingsRoutes }
