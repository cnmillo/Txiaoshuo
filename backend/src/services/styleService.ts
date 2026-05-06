import { query, queryOne, run, transaction } from '../database/index.js'
import logger from '../utils/logger.js'
import type {
  Style,
  StyleConfig,
  StyleTemplate,
  CreateStyleRequest,
  UpdateStyleRequest,
  StyleFilter,
  StyleStats,
  StyleConsistencyCheck,
  NovelGenre
} from '../types/shared.js'
import {
  getAllStyleTemplates,
  getStyleTemplateById,
  getStyleTemplatesByGenre,
  generatePromptTemplate,
  getStyleConfigLabels,
  defaultStyleConfig,
  getStyleConfigOptions
} from './styleTemplates.js'
import { randomUUID } from 'crypto'

/**
 * 风格服务类
 * 处理风格的CRUD操作、模板管理和风格一致性检查
 */
class StyleService {
  /**
   * 初始化风格表
   */
  async initStylesTable(): Promise<void> {
    try {
      await run(`
        CREATE TABLE IF NOT EXISTS styles (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          genre TEXT NOT NULL DEFAULT 'general',
          perspective TEXT NOT NULL DEFAULT 'third_person',
          language TEXT NOT NULL DEFAULT 'modern',
          description_style TEXT NOT NULL DEFAULT 'vivid',
          pacing TEXT NOT NULL DEFAULT 'moderate',
          dialogue TEXT NOT NULL DEFAULT 'natural',
          prompt_template TEXT,
          sample_text TEXT,
          is_custom INTEGER DEFAULT 1,
          is_default INTEGER DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `)

      // 创建索引
      await run(`
        CREATE INDEX IF NOT EXISTS idx_styles_genre ON styles(genre);
        CREATE INDEX IF NOT EXISTS idx_styles_is_custom ON styles(is_custom);
        CREATE INDEX IF NOT EXISTS idx_styles_is_default ON styles(is_default);
      `)

      logger.info('风格表初始化完成')

      // 插入默认风格
      await this.insertDefaultStyles()
    } catch (error) {
      logger.error('初始化风格表失败', error)
      throw new Error('初始化风格表失败')
    }
  }

  /**
   * 插入默认风格
   */
  private async insertDefaultStyles(): Promise<void> {
    const defaultStyles: Array<{ id: string; name: string; description: string; config: StyleConfig; isDefault: boolean }> = [
      {
        id: 'style-default-general',
        name: '默认风格',
        description: '通用默认风格，适合大多数小说类型',
        config: defaultStyleConfig,
        isDefault: true
      },
      {
        id: 'style-default-fantasy',
        name: '玄幻风格',
        description: '适合玄幻小说，节奏快，场面宏大',
        config: {
          genre: 'fantasy',
          perspective: 'third_person',
          language: 'modern',
          description: 'vivid',
          pacing: 'fast',
          dialogue: 'dramatic'
        },
        isDefault: true
      },
      {
        id: 'style-default-romance',
        name: '言情风格',
        description: '适合言情小说，情感细腻，第一人称',
        config: {
          genre: 'romance',
          perspective: 'first_person',
          language: 'modern',
          description: 'detailed',
          pacing: 'moderate',
          dialogue: 'natural'
        },
        isDefault: true
      },
      {
        id: 'style-default-scifi',
        name: '科幻风格',
        description: '适合科幻小说，逻辑严密，简洁准确',
        config: {
          genre: 'scifi',
          perspective: 'third_person',
          language: 'modern',
          description: 'concise',
          pacing: 'moderate',
          dialogue: 'formal'
        },
        isDefault: true
      },
      {
        id: 'style-default-mystery',
        name: '悬疑风格',
        description: '适合悬疑小说，细节丰富，节奏变化',
        config: {
          genre: 'mystery',
          perspective: 'first_person',
          language: 'modern',
          description: 'detailed',
          pacing: 'variable',
          dialogue: 'witty'
        },
        isDefault: true
      }
    ]

    for (const style of defaultStyles) {
      try {
        await run(`
          INSERT OR IGNORE INTO styles (
            id, name, description, genre, perspective, language, description_style,
            pacing, dialogue, prompt_template, sample_text, is_custom, is_default, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          style.id,
          style.name,
          style.description || '',
          style.config.genre,
          style.config.perspective,
          style.config.language,
          style.config.description,
          style.config.pacing,
          style.config.dialogue,
          generatePromptTemplate(style.config),
          '',
          0,
          style.isDefault ? 1 : 0,
          new Date().toISOString(),
          new Date().toISOString()
        ])
      } catch (error) {
        logger.error(`插入默认风格失败: ${style.id}`, error)
      }
    }

    logger.info('默认风格插入完成')
  }

  /**
   * 将数据库记录转换为Style对象
   */
  private dbRecordToStyle(record: Record<string, unknown>): Style {
    return {
      id: String(record.id),
      name: String(record.name),
      description: record.description ? String(record.description) : undefined,
      config: {
        genre: String(record.genre) as NovelGenre,
        perspective: String(record.perspective) as StyleConfig['perspective'],
        language: String(record.language) as StyleConfig['language'],
        description: String(record.description_style) as StyleConfig['description'],
        pacing: String(record.pacing) as StyleConfig['pacing'],
        dialogue: String(record.dialogue) as StyleConfig['dialogue']
      },
      promptTemplate: record.prompt_template ? String(record.prompt_template) : undefined,
      sampleText: record.sample_text ? String(record.sample_text) : undefined,
      isCustom: Boolean(record.is_custom),
      isDefault: Boolean(record.is_default),
      createdAt: String(record.created_at),
      updatedAt: String(record.updated_at)
    }
  }

  /**
   * 获取所有风格
   */
  async getAllStyles(filter?: StyleFilter): Promise<Style[]> {
    try {
      let sql = 'SELECT * FROM styles WHERE 1=1'
      const params: unknown[] = []

      if (filter?.genre) {
        sql += ' AND genre = ?'
        params.push(filter.genre)
      }

      if (filter?.isCustom !== undefined) {
        sql += ' AND is_custom = ?'
        params.push(filter.isCustom ? 1 : 0)
      }

      if (filter?.search) {
        sql += ' AND (name LIKE ? OR description LIKE ?)'
        const searchPattern = `%${filter.search}%`
        params.push(searchPattern, searchPattern)
      }

      sql += ' ORDER BY is_default DESC, created_at DESC'

      const records = await query<Record<string, unknown>>(sql, params)
      return records.map(record => this.dbRecordToStyle(record))
    } catch (error) {
      logger.error('获取风格列表失败', error)
      throw new Error('获取风格列表失败')
    }
  }

  /**
   * 根据ID获取风格
   */
  async getStyleById(id: string): Promise<Style | undefined> {
    try {
      const record = await queryOne<Record<string, unknown>>(
        'SELECT * FROM styles WHERE id = ?',
        [id]
      )

      if (!record) {
        return undefined
      }

      return this.dbRecordToStyle(record)
    } catch (error) {
      logger.error(`获取风格失败: ${id}`, error)
      throw new Error('获取风格失败')
    }
  }

  /**
   * 创建风格
   */
  async createStyle(request: CreateStyleRequest): Promise<Style> {
    try {
      const id = randomUUID()
      const now = new Date().toISOString()

      // 生成提示词模板
      const promptTemplate = request.promptTemplate || generatePromptTemplate(request.config)

      await run(`
        INSERT INTO styles (
          id, name, description, genre, perspective, language, description_style,
          pacing, dialogue, prompt_template, sample_text, is_custom, is_default, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        id,
        request.name,
        request.description || '',
        request.config.genre,
        request.config.perspective,
        request.config.language,
        request.config.description,
        request.config.pacing,
        request.config.dialogue,
        promptTemplate,
        request.sampleText || '',
        1, // is_custom
        0, // is_default
        now,
        now
      ])

      logger.info(`创建风格成功: ${id}`)

      return {
        id,
        name: request.name,
        description: request.description,
        config: request.config,
        promptTemplate,
        sampleText: request.sampleText,
        isCustom: true,
        isDefault: false,
        createdAt: now,
        updatedAt: now
      }
    } catch (error) {
      logger.error('创建风格失败', error)
      throw new Error('创建风格失败')
    }
  }

  /**
   * 更新风格
   */
  async updateStyle(id: string, request: UpdateStyleRequest): Promise<Style> {
    try {
      const existingStyle = await this.getStyleById(id)
      if (!existingStyle) {
        throw new Error('风格不存在')
      }

      if (existingStyle.isDefault) {
        throw new Error('默认风格不能修改')
      }

      const updates: string[] = []
      const params: unknown[] = []

      if (request.name !== undefined) {
        updates.push('name = ?')
        params.push(request.name)
      }

      if (request.description !== undefined) {
        updates.push('description = ?')
        params.push(request.description)
      }

      if (request.config !== undefined) {
        const config = { ...existingStyle.config, ...request.config }
        updates.push('genre = ?', 'perspective = ?', 'language = ?', 'description_style = ?', 'pacing = ?', 'dialogue = ?')
        params.push(
          config.genre,
          config.perspective,
          config.language,
          config.description,
          config.pacing,
          config.dialogue
        )

        // 如果配置改变，重新生成提示词模板
        if (!request.promptTemplate) {
          updates.push('prompt_template = ?')
          params.push(generatePromptTemplate(config))
        }
      }

      if (request.promptTemplate !== undefined) {
        updates.push('prompt_template = ?')
        params.push(request.promptTemplate)
      }

      if (request.sampleText !== undefined) {
        updates.push('sample_text = ?')
        params.push(request.sampleText)
      }

      updates.push('updated_at = ?')
      params.push(new Date().toISOString())

      params.push(id)

      await run(`
        UPDATE styles SET ${updates.join(', ')} WHERE id = ?
      `, params)

      logger.info(`更新风格成功: ${id}`)

      const updatedStyle = await this.getStyleById(id)
      if (!updatedStyle) {
        throw new Error('更新后获取风格失败')
      }

      return updatedStyle
    } catch (error) {
      logger.error(`更新风格失败: ${id}`, error)
      throw error instanceof Error ? error : new Error('更新风格失败')
    }
  }

  /**
   * 删除风格
   */
  async deleteStyle(id: string): Promise<void> {
    try {
      const existingStyle = await this.getStyleById(id)
      if (!existingStyle) {
        throw new Error('风格不存在')
      }

      if (existingStyle.isDefault) {
        throw new Error('默认风格不能删除')
      }

      await run('DELETE FROM styles WHERE id = ?', [id])

      logger.info(`删除风格成功: ${id}`)
    } catch (error) {
      logger.error(`删除风格失败: ${id}`, error)
      throw error instanceof Error ? error : new Error('删除风格失败')
    }
  }

  /**
   * 获取风格模板列表
   */
  getStyleTemplates(genre?: NovelGenre): StyleTemplate[] {
    if (genre) {
      return getStyleTemplatesByGenre(genre)
    }
    return getAllStyleTemplates()
  }

  /**
   * 根据模板ID创建风格
   */
  async createStyleFromTemplate(templateId: string, customName?: string): Promise<Style> {
    const template = getStyleTemplateById(templateId)
    if (!template) {
      throw new Error('模板不存在')
    }

    return this.createStyle({
      name: customName || `${template.name} (自定义)`,
      description: template.description,
      config: template.config,
      promptTemplate: template.promptTemplate,
      sampleText: template.sampleText
    })
  }

  /**
   * 生成风格提示词
   */
  async generateStylePrompt(styleId: string, additionalPrompt?: string): Promise<string> {
    const style = await this.getStyleById(styleId)
    if (!style) {
      throw new Error('风格不存在')
    }

    let prompt = style.promptTemplate || generatePromptTemplate(style.config)

    if (additionalPrompt) {
      prompt += `\n\n额外要求：\n${additionalPrompt}`
    }

    return prompt
  }

  /**
   * 根据配置生成提示词
   */
  generatePromptFromConfig(config: StyleConfig, additionalPrompt?: string): string {
    let prompt = generatePromptTemplate(config)

    if (additionalPrompt) {
      prompt += `\n\n额外要求：\n${additionalPrompt}`
    }

    return prompt
  }

  /**
   * 获取风格统计
   */
  async getStyleStats(): Promise<StyleStats> {
    try {
      const totalResult = await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM styles')
      const customResult = await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM styles WHERE is_custom = 1')
      const defaultResult = await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM styles WHERE is_default = 1')
      const genreStats = await query<{ genre: string; count: number }>(
        'SELECT genre, COUNT(*) as count FROM styles GROUP BY genre'
      )

      const stylesByGenre: Record<NovelGenre, number> = {} as Record<NovelGenre, number>
      for (const stat of genreStats) {
        stylesByGenre[stat.genre as NovelGenre] = stat.count
      }

      return {
        totalStyles: totalResult?.count || 0,
        customStyles: customResult?.count || 0,
        defaultStyles: defaultResult?.count || 0,
        stylesByGenre
      }
    } catch (error) {
      logger.error('获取风格统计失败', error)
      throw new Error('获取风格统计失败')
    }
  }

  /**
   * 检查风格一致性
   */
  async checkStyleConsistency(styleId: string, content: string): Promise<StyleConsistencyCheck> {
    const style = await this.getStyleById(styleId)
    if (!style) {
      throw new Error('风格不存在')
    }

    const issues: string[] = []
    const suggestions: string[] = []

    getStyleConfigLabels(style.config)

    // 根据风格配置检查内容
    // 这里可以实现更复杂的检查逻辑

    // 检查叙事视角一致性
    if (style.config.perspective === 'first_person') {
      const firstPersonCount = (content.match(/我/g) || []).length
      const thirdPersonCount = (content.match(/他|她|它/g) || []).length
      if (firstPersonCount < thirdPersonCount) {
        issues.push('第一人称视角风格下，第三人称代词使用过多')
        suggestions.push('增加"我"的视角描述，减少"他/她"的使用')
      }
    }

    // 检查语言风格
    if (style.config.language === 'classical') {
      const modernWords = ['的', '了', '吗', '呢']
      let modernCount = 0
      for (const word of modernWords) {
        modernCount += (content.match(new RegExp(word, 'g')) || []).length
      }
      if (modernCount > content.length * 0.1) {
        issues.push('古典语言风格下，现代白话词汇使用过多')
        suggestions.push('使用更多文言色彩词汇，如"之"、"乎"、"者"、"也"等')
      }
    }

    // 检查节奏
    if (style.config.pacing === 'fast') {
      const paragraphCount = content.split('\n\n').length
      const avgParagraphLength = content.length / (paragraphCount || 1)
      if (avgParagraphLength > 200) {
        issues.push('快节奏风格下，段落过长')
        suggestions.push('缩短段落长度，加快叙事节奏')
      }
    }

    return {
      styleId,
      content,
      isConsistent: issues.length === 0,
      issues: issues.length > 0 ? issues : undefined,
      suggestions: suggestions.length > 0 ? suggestions : undefined
    }
  }

  /**
   * 获取风格配置选项
   */
  getStyleConfigOptions() {
    return getStyleConfigOptions()
  }

  /**
   * 获取默认风格
   */
  async getDefaultStyle(): Promise<Style> {
    const defaultStyle = await queryOne<Record<string, unknown>>(
      'SELECT * FROM styles WHERE is_default = 1 ORDER BY created_at LIMIT 1'
    )

    if (defaultStyle) {
      return this.dbRecordToStyle(defaultStyle)
    }

    // 如果没有默认风格，返回第一个风格
    const firstStyle = await queryOne<Record<string, unknown>>(
      'SELECT * FROM styles ORDER BY created_at LIMIT 1'
    )

    if (firstStyle) {
      return this.dbRecordToStyle(firstStyle)
    }

    // 如果数据库中没有风格，返回硬编码的默认风格
    return {
      id: 'style-default',
      name: '默认风格',
      description: '通用默认风格',
      config: defaultStyleConfig,
      isCustom: false,
      isDefault: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  }

  /**
   * 设置默认风格
   */
  async setDefaultStyle(id: string): Promise<void> {
    try {
      const style = await this.getStyleById(id)
      if (!style) {
        throw new Error('风格不存在')
      }

      await transaction(async () => {
        // 取消所有默认风格
        await run('UPDATE styles SET is_default = 0 WHERE is_default = 1')
        // 设置新的默认风格
        await run('UPDATE styles SET is_default = 1 WHERE id = ?', [id])
      })

      logger.info(`设置默认风格成功: ${id}`)
    } catch (error) {
      logger.error(`设置默认风格失败: ${id}`, error)
      throw error instanceof Error ? error : new Error('设置默认风格失败')
    }
  }
}

// 导出单例实例
export const styleService = new StyleService()

// 导出类型
export type { StyleService }
