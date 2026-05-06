import { queryOne, run, query } from '../database/index.js'
import type { AIConfig, AppSettings, CurlConfig, CustomModel, HumanizeConfig } from '../types/index.js'
import logger from '../utils/logger.js'
import { v4 as uuidv4 } from 'uuid'

/**
 * 设置服务
 */
export const settingsService = {
  /**
   * 获取所有设置
   */
  async getAllSettings(): Promise<AppSettings> {
    const settings: AppSettings = {}

    // 获取AI配置
    const aiConfigRow = await queryOne<{ value: string }>("SELECT value FROM settings WHERE key = 'ai_config'")
    if (aiConfigRow) {
      try {
        settings.aiConfig = JSON.parse(aiConfigRow.value) as AIConfig
      } catch {
        settings.aiConfig = undefined
      }
    }

    // 获取CURL配置
    const curlConfigRow = await queryOne<{ value: string }>("SELECT value FROM settings WHERE key = 'curl_config'")
    if (curlConfigRow) {
      try {
        settings.curlConfig = JSON.parse(curlConfigRow.value) as CurlConfig
      } catch {
        settings.curlConfig = undefined
      }
    }

    // 获取自定义模型列表
    const customModelsRow = await queryOne<{ value: string }>("SELECT value FROM settings WHERE key = 'custom_models'")
    if (customModelsRow) {
      try {
        settings.customModels = JSON.parse(customModelsRow.value) as CustomModel[]
      } catch {
        settings.customModels = undefined
      }
    }

    // 获取主题设置
    const themeRow = await queryOne<{ value: string }>("SELECT value FROM settings WHERE key = 'theme'")
    if (themeRow) {
      settings.theme = themeRow.value as 'light' | 'dark' | 'auto'
    }

    // 获取语言设置
    const languageRow = await queryOne<{ value: string }>("SELECT value FROM settings WHERE key = 'language'")
    if (languageRow) {
      settings.language = languageRow.value
    }

    // 获取AI润色设置
    const humanizeConfigRow = await queryOne<{ value: string }>("SELECT value FROM settings WHERE key = 'humanize_config'")
    if (humanizeConfigRow) {
      try {
        settings.humanizeConfig = JSON.parse(humanizeConfigRow.value) as HumanizeConfig
      } catch {
        settings.humanizeConfig = undefined
      }
    }

    return settings
  },

  /**
   * 获取单个设置
   */
  async getSetting<T>(key: string): Promise<T | undefined> {
    const row = await queryOne<{ value: string }>('SELECT value FROM settings WHERE key = ?', [key])
    if (!row) return undefined

    try {
      // 尝试解析JSON
      return JSON.parse(row.value) as T
    } catch {
      // 如果不是JSON，返回原始字符串
      return row.value as unknown as T
    }
  },

  /**
   * 更新设置
   */
  async updateSettings(settings: AppSettings): Promise<void> {
    if (settings.aiConfig !== undefined) {
      await this.setSetting('ai_config', settings.aiConfig)
    }

    if (settings.curlConfig !== undefined) {
      await this.setSetting('curl_config', settings.curlConfig)
    }

    if (settings.theme !== undefined) {
      await this.setSetting('theme', settings.theme)
    }

    if (settings.language !== undefined) {
      await this.setSetting('language', settings.language)
    }

    if (settings.customModels !== undefined) {
      await this.setSetting('custom_models', settings.customModels)
    }

    if (settings.humanizeConfig !== undefined) {
      await this.setSetting('humanize_config', settings.humanizeConfig)
    }

    logger.info('设置已更新')
  },

  /**
   * 设置单个配置项
   */
  async setSetting(key: string, value: unknown): Promise<void> {
    const valueStr = typeof value === 'string' ? value : JSON.stringify(value)
    const now = new Date().toISOString()
    await run(
      `INSERT OR REPLACE INTO settings (key, value, createdAt, updatedAt) 
       VALUES (?, ?, COALESCE((SELECT createdAt FROM settings WHERE key = ?), ?), ?)`,
      [key, valueStr, key, now, now]
    )
  },

  /**
   * 获取AI配置
   */
  async getAIConfig(): Promise<AIConfig> {
    const defaultConfig: AIConfig = {
      apiKey: process.env.AI_API_KEY || '',
      baseUrl: process.env.AI_BASE_URL || 'https://api.openai.com/v1',
      model: process.env.AI_MODEL || 'gpt-4',
      temperature: parseFloat(process.env.AI_TEMPERATURE || '0.7'),
      maxTokens: parseInt(process.env.AI_MAX_TOKENS || '4000', 10)
    }

    const storedConfig = await this.getSetting<AIConfig>('ai_config')
    if (storedConfig) {
      return { ...defaultConfig, ...storedConfig }
    }

    return defaultConfig
  },

  /**
   * 更新AI配置
   */
  async updateAIConfig(config: AIConfig): Promise<void> {
    await this.setSetting('ai_config', config)
    logger.info('AI配置已更新', { model: config.model, baseUrl: config.baseUrl })
  },

  /**
   * 获取CURL配置
   */
  async getCurlConfig(): Promise<CurlConfig> {
    const defaultConfig: CurlConfig = {
      useCustomCurl: false,
      curlCommand: ''
    }

    const storedConfig = await this.getSetting<CurlConfig>('curl_config')
    if (storedConfig) {
      return { ...defaultConfig, ...storedConfig }
    }

    return defaultConfig
  },

  /**
   * 更新CURL配置
   */
  async updateCurlConfig(config: CurlConfig): Promise<void> {
    await this.setSetting('curl_config', config)
    logger.info('CURL配置已更新')
  },

  /**
   * 获取AI润色配置
   */
  async getHumanizeConfig(): Promise<HumanizeConfig> {
    const defaultConfig: HumanizeConfig = {
      intensity: 'auto',
      enableStyleOptimization: true,
      genre: '',
      preservePhrases: [],
      targetAudience: 'general',
      mode: 'full',
      autoPolish: false,
      polishIntensity: 'medium'
    }

    const storedConfig = await this.getSetting<HumanizeConfig>('humanize_config')
    if (storedConfig) {
      return { ...defaultConfig, ...storedConfig }
    }

    return defaultConfig
  },

  /**
   * 更新AI润色配置
   */
  async updateHumanizeConfig(config: HumanizeConfig): Promise<void> {
    await this.setSetting('humanize_config', config)
    logger.info('AI润色配置已更新', { 
      intensity: config.intensity, 
      genre: config.genre,
      autoPolish: config.autoPolish,
      polishIntensity: config.polishIntensity
    })
  },

  /**
   * 重置设置为默认值
   */
  async resetSettings(): Promise<void> {
    const defaultSettings = {
      ai_config: {
        apiKey: '',
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-4',
        temperature: 0.7,
        maxTokens: 4000
      },
      curl_config: {
        useCustomCurl: false,
        curlCommand: ''
      },
      theme: 'auto',
      language: 'zh-CN'
    }

    for (const [key, value] of Object.entries(defaultSettings)) {
      await this.setSetting(key, value)
    }

    logger.info('设置已重置为默认值')
  },

  /**
   * 获取模板列表
   */
  async getTemplates(type?: string): Promise<{ id: string; name: string; type: string; content: string; createdAt: string }[]> {
    let sql = 'SELECT * FROM templates'
    const params: string[] = []

    if (type) {
      sql += ' WHERE type = ?'
      params.push(type)
    }

    sql += ' ORDER BY created_at DESC'

    const templates = await query<{
      id: string
      name: string
      type: string
      content: string
      created_at: string
    }>(sql, params)

    return templates.map((t: { id: string; name: string; type: string; content: string; created_at: string }) => ({
      id: t.id,
      name: t.name,
      type: t.type,
      content: t.content,
      createdAt: t.created_at
    }))
  },

  /**
   * 获取单个模板
   */
  async getTemplateById(id: string): Promise<{ id: string; name: string; type: string; content: string; createdAt: string } | null> {
    const template = await queryOne<{
      id: string
      name: string
      type: string
      content: string
      created_at: string
    }>('SELECT * FROM templates WHERE id = ?', [id])

    if (!template) return null

    return {
      id: template.id,
      name: template.name,
      type: template.type,
      content: template.content,
      createdAt: template.created_at
    }
  },

  /**
   * 创建模板
   */
  async createTemplate(data: { name: string; type: string; content: string }): Promise<{ id: string; name: string; type: string; content: string; createdAt: string }> {
    const id = uuidv4()
    const now = new Date().toISOString()

    await run(
      'INSERT INTO templates (id, name, type, content, created_at) VALUES (?, ?, ?, ?, ?)',
      [id, data.name, data.type, data.content, now]
    )

    logger.info('模板创建成功', { id, name: data.name })

    return {
      id,
      name: data.name,
      type: data.type,
      content: data.content,
      createdAt: now
    }
  },

  /**
   * 更新模板
   */
  async updateTemplate(id: string, data: Partial<{ name: string; type: string; content: string }>): Promise<boolean> {
    const template = await this.getTemplateById(id)
    if (!template) return false

    const updates: string[] = []
    const params: unknown[] = []

    if (data.name !== undefined) {
      updates.push('name = ?')
      params.push(data.name)
    }
    if (data.type !== undefined) {
      updates.push('type = ?')
      params.push(data.type)
    }
    if (data.content !== undefined) {
      updates.push('content = ?')
      params.push(data.content)
    }

    if (updates.length === 0) return true

    params.push(id)
    await run(`UPDATE templates SET ${updates.join(', ')} WHERE id = ?`, params)

    logger.info('模板更新成功', { id })
    return true
  },

  /**
   * 删除模板
   */
  async deleteTemplate(id: string): Promise<boolean> {
    const template = await this.getTemplateById(id)
    if (!template) return false

    await run('DELETE FROM templates WHERE id = ?', [id])

    logger.info('模板删除成功', { id })
    return true
  },

  async getCustomModels(): Promise<CustomModel[]> {
    const models = await this.getSetting<CustomModel[]>('custom_models')
    return models || []
  },

  async addCustomModel(model: Omit<CustomModel, 'id' | 'createdAt'>): Promise<CustomModel> {
    const id = uuidv4()
    const now = new Date().toISOString()
    const newModel: CustomModel = { ...model, id, createdAt: now }
    const list = await this.getCustomModels()
    list.push(newModel)
    await this.setSetting('custom_models', list)
    logger.info('自定义模型已添加', { id, name: model.name })
    return newModel
  },

  async updateCustomModel(id: string, data: Partial<Omit<CustomModel, 'id' | 'createdAt'>>): Promise<CustomModel | null> {
    const list = await this.getCustomModels()
    const index = list.findIndex(m => m.id === id)
    if (index === -1) return null
    list[index] = { ...list[index], ...data }
    await this.setSetting('custom_models', list)
    logger.info('自定义模型已更新', { id })
    return list[index]
  },

  async deleteCustomModel(id: string): Promise<boolean> {
    const list = await this.getCustomModels()
    const filtered = list.filter(m => m.id !== id)
    if (filtered.length === list.length) return false
    await this.setSetting('custom_models', filtered)
    logger.info('自定义模型已删除', { id })
    return true
  },

  async getHealthyModels(): Promise<CustomModel[]> {
    const models = await this.getCustomModels()
    return models.sort((a, b) => {
      const aHealthy = a.testStatus === 'success' ? 0 : a.testStatus === 'untested' ? 1 : 2
      const bHealthy = b.testStatus === 'success' ? 0 : b.testStatus === 'untested' ? 1 : 2
      if (aHealthy !== bHealthy) return aHealthy - bHealthy
      const aFailCount = a.failCount || 0
      const bFailCount = b.failCount || 0
      return aFailCount - bFailCount
    })
  },

  async updateModelHealth(id: string, success: boolean): Promise<void> {
    const list = await this.getCustomModels()
    const index = list.findIndex(m => m.id === id)
    if (index === -1) return
    
    const now = new Date().toISOString()
    if (success) {
      list[index] = {
        ...list[index],
        testStatus: 'success',
        lastTestAt: now,
        failCount: 0,
        lastFailAt: undefined
      }
    } else {
      const currentFailCount = (list[index].failCount || 0) + 1
      list[index] = {
        ...list[index],
        testStatus: 'failed',
        lastTestAt: now,
        failCount: currentFailCount,
        lastFailAt: now
      }
    }
    await this.setSetting('custom_models', list)
    logger.info('模型健康状态已更新', { id, success, failCount: list[index].failCount })
  },

  async exportAllData(): Promise<{
    version: string
    exportTime: string
    tables: {
      settings: unknown[]
      novels: unknown[]
      chapters: unknown[]
      styles: unknown[]
      templates: unknown[]
    }
    stats: {
      settings: number
      novels: number
      chapters: number
      styles: number
      templates: number
    }
  }> {
    const [settings, novels, chapters, styles, templates] = await Promise.all([
      query('SELECT * FROM settings').catch(() => []),
      query('SELECT * FROM novels').catch(() => []),
      query('SELECT * FROM chapters').catch(() => []),
      query('SELECT * FROM styles').catch(() => []),
      query('SELECT * FROM templates').catch(() => []),
    ])

    return {
      version: '1.0',
      exportTime: new Date().toISOString(),
      tables: {
        settings: settings || [],
        novels: novels || [],
        chapters: chapters || [],
        styles: styles || [],
        templates: templates || [],
      },
      stats: {
        settings: (settings || []).length,
        novels: (novels || []).length,
        chapters: (chapters || []).length,
        styles: (styles || []).length,
        templates: (templates || []).length,
      }
    }
  },

  async importData(data: { version?: string; tables?: Record<string, unknown[]> }): Promise<Record<string, number>> {
    if (!data.version || !data.tables) {
      throw new Error('无效的备份文件格式：缺少 version 或 tables 字段')
    }

    const results: Record<string, number> = {}
    const now = new Date().toISOString()

    if (Array.isArray(data.tables.settings)) {
      for (const row of data.tables.settings) {
        const r = row as Record<string, unknown>
        const key = String(r.key || '')
        const value = typeof r.value === 'string' ? r.value : JSON.stringify(r.value)
        if (key) {
          await run(`INSERT OR REPLACE INTO settings (key, value, createdAt, updatedAt) VALUES (?, ?, COALESCE((SELECT createdAt FROM settings WHERE key = ?), ?), ?)`,
            [key, value, key, now, now])
          results.settings = (results.settings || 0) + 1
        }
      }
    }

    if (Array.isArray(data.tables.novels)) {
      for (const row of data.tables.novels) {
        const r = row as Record<string, unknown>
        const id = String(r.id || '')
        if (!id) continue
        const cols = Object.keys(r).filter(k => k !== 'id').join(', ')
        const vals = Object.keys(r).filter(k => k !== 'id').map(k => r[k])
        const placeholders = vals.map(() => '?').join(', ')
        if (cols) {
          await run(`INSERT OR REPLACE INTO novels (id, ${cols}) VALUES (?, ${placeholders})`, [id, ...vals])
          results.novels = (results.novels || 0) + 1
        }
      }
    }

    if (Array.isArray(data.tables.chapters)) {
      for (const row of data.tables.chapters) {
        const r = row as Record<string, unknown>
        const id = String(r.id || '')
        if (!id) continue
        const cols = Object.keys(r).filter(k => k !== 'id').join(', ')
        const vals = Object.keys(r).filter(k => k !== 'id').map(k => r[k])
        const placeholders = vals.map(() => '?').join(', ')
        if (cols) {
          await run(`INSERT OR REPLACE INTO chapters (id, ${cols}) VALUES (?, ${placeholders})`, [id, ...vals])
          results.chapters = (results.chapters || 0) + 1
        }
      }
    }

    if (Array.isArray(data.tables.styles)) {
      try {
        for (const row of data.tables.styles) {
          const r = row as Record<string, unknown>
          const id = String(r.id || '')
          if (!id) continue
          const cols = Object.keys(r).filter(k => k !== 'id').join(', ')
          const vals = Object.keys(r).filter(k => k !== 'id').map(k => r[k])
          const placeholders = vals.map(() => '?').join(', ')
          if (cols) {
            await run(`INSERT OR REPLACE INTO styles (id, ${cols}) VALUES (?, ${placeholders})`, [id, ...vals])
            results.styles = (results.styles || 0) + 1
          }
        }
      } catch (error) {
        logger.warn('导入 styles 表数据失败（表可能不存在）', { message: (error as Error).message })
      }
    }

    if (Array.isArray(data.tables.templates)) {
      try {
        for (const row of data.tables.templates) {
          const r = row as Record<string, unknown>
          const id = String(r.id || '')
          if (!id) continue
          const cols = Object.keys(r).filter(k => k !== 'id').join(', ')
          const vals = Object.keys(r).filter(k => k !== 'id').map(k => r[k])
          const placeholders = vals.map(() => '?').join(', ')
          if (cols) {
            await run(`INSERT OR REPLACE INTO templates (id, ${cols}) VALUES (?, ${placeholders})`, [id, ...vals])
            results.templates = (results.templates || 0) + 1
          }
        }
      } catch (error) {
        logger.warn('导入 templates 表数据失败（表可能不存在）', { message: (error as Error).message })
      }
    }

    logger.info('数据导入完成', results)
    return results
  }
}

export default settingsService
