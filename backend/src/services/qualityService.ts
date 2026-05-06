import { v4 as uuidv4 } from 'uuid'
import { query, run } from '../database/index.js'
import { aiService } from './aiService.js'
import novelService from './novelService.js'
import logger from '../utils/logger.js'
import type { QualityTask, QualityResult } from '../types/index.js'

/**
 * 质量提升服务
 */
export const qualityService = {
  /**
   * 创建质量提升任务
   */
  async createTask(novelId: string, type: QualityTask['type']): Promise<QualityTask> {
    const id = uuidv4()
    const now = new Date().toISOString()

    const task: QualityTask = {
      id,
      novelId,
      type,
      status: 'pending',
      progress: 0,
      createdAt: now,
      updatedAt: now
    }

    await run(
      `INSERT INTO quality_tasks (id, novel_id, type, status, progress, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [task.id, task.novelId, task.type, task.status, task.progress, task.createdAt, task.updatedAt]
    )

    logger.info('质量提升任务创建成功', { id, novelId, type })
    return task
  },

  /**
   * 获取质量提升任务
   */
  async getTask(id: string): Promise<QualityTask | null> {
    const tasks = await query<{ id: string; novel_id: string; type: string; status: string; progress: number; result: string | null; error: string | null; created_at: string; updated_at: string }>('SELECT * FROM quality_tasks WHERE id = ?', [id])
    const task = tasks[0]
    if (!task) return null

    return {
      id: task.id,
      novelId: task.novel_id,
      type: task.type as QualityTask['type'],
      status: task.status as QualityTask['status'],
      progress: task.progress,
      result: task.result || undefined,
      error: task.error || undefined,
      createdAt: task.created_at,
      updatedAt: task.updated_at
    }
  },

  /**
   * 更新质量提升任务
   */
  async updateTask(id: string, updates: Partial<QualityTask>): Promise<void> {
    const sets: string[] = []
    const params: unknown[] = []

    if (updates.status !== undefined) {
      sets.push('status = ?')
      params.push(updates.status)
    }
    if (updates.progress !== undefined) {
      sets.push('progress = ?')
      params.push(updates.progress)
    }
    if (updates.result !== undefined) {
      sets.push('result = ?')
      params.push(updates.result)
    }
    if (updates.error !== undefined) {
      sets.push('error = ?')
      params.push(updates.error)
    }

    sets.push('updated_at = ?')
    params.push(new Date().toISOString())
    params.push(id)

    await run(`UPDATE quality_tasks SET ${sets.join(', ')} WHERE id = ?`, params)
  },

  /**
   * 截断内容到指定长度
   */
  truncateContent(content: string, maxLength: number = 8000): string {
    if (content.length <= maxLength) {
      return content
    }
    return content.substring(0, maxLength) + '\n\n[...内容已截断，仅分析部分内容...]'
  },

  /**
   * 情节线索完整性检查
   */
  async checkPlotConsistency(novelId: string): Promise<QualityResult> {
    const novel = await novelService.getNovelById(novelId)
    if (!novel) {
      throw new Error('小说不存在')
    }

    const chapters = await novelService.getChapters(novelId)
    if (chapters.length === 0) {
      throw new Error('小说没有章节内容')
    }

    // 构建章节内容摘要（限制长度）
    const chapterSummaries = chapters.map(chapter => 
      `章节 ${chapter.orderIndex + 1}: ${chapter.title}\n${chapter.content ? chapter.content.substring(0, 500) + '...' : '(无内容)'}`
    ).join('\n\n')
    
    // 如果章节太多，只分析部分
    const limitedSummaries = this.truncateContent(chapterSummaries, 10000)

    const prompt = `请对以下小说进行情节线索完整性检查，重点关注：\n\n` +
      `1. 情节线索是否完整，是否有未回收的伏笔\n` +
      `2. 情节发展是否连贯，是否有逻辑矛盾\n` +
      `3. 角色行为是否符合性格设定\n` +
      `4. 情节转折是否合理自然\n\n` +
      `请指出存在的问题，并提供具体的改进建议。\n\n` +
      `小说标题：${novel.title}\n` +
      `小说类型：${novel.type}\n` +
      `小说大纲：${novel.outline || '无'}\n\n` +
      `章节摘要：\n${limitedSummaries}`

    try {
      const analysis = await aiService.generateText(prompt, {
        systemPrompt: '你是一位专业的文学编辑，擅长分析小说的情节结构和逻辑连贯性。请对提供的小说内容进行全面的情节线索完整性检查，并提供具体的改进建议。',
        maxTokens: 4000
      })

      const result: QualityResult = {
        id: `quality_${Date.now()}`,
        novelId,
        type: 'plot_check',
        suggestions: this.extractSuggestions(analysis),
        issues: this.extractIssues(analysis),
        score: this.calculateScore(analysis),
        createdAt: new Date().toISOString()
      }

      await this.saveResult(result)
      return result
    } catch (error) {
      logger.error('情节线索完整性检查失败', { novelId, error })
      throw error
    }
  },

  /**
   * 补充细节描述和情感渲染
   */
  async enhanceDetails(novelId: string): Promise<QualityResult> {
    const novel = await novelService.getNovelById(novelId)
    if (!novel) {
      throw new Error('小说不存在')
    }

    const chapters = await novelService.getChapters(novelId)
    if (chapters.length === 0) {
      throw new Error('小说没有章节内容')
    }

    // 限制内容长度，只处理前几章或截断内容
    const maxChapters = Math.min(chapters.length, 3)
    const selectedChapters = chapters.slice(0, maxChapters)
    const chapterContents = selectedChapters.map(chapter => 
      `章节 ${chapter.orderIndex + 1}: ${chapter.title}\n${this.truncateContent(chapter.content || '', 3000)}`
    ).join('\n\n')

    const prompt = `请对以下小说的前${maxChapters}章进行细节描述和情感渲染的补充，重点关注：\n\n` +
      `1. 增加环境描写，增强场景的画面感\n` +
      `2. 补充角色的心理活动，增强情感表达\n` +
      `3. 丰富对话细节，使人物形象更加立体\n` +
      `4. 增强感官描写，调动读者的视觉、听觉、触觉等感受\n\n` +
      `请保持原有的情节和风格，只在适当的地方添加细节描写和情感渲染。\n\n` +
      `小说标题：${novel.title}\n` +
      `小说类型：${novel.type}\n` +
      `章节内容：\n${chapterContents}`

    try {
      const enhancedContent = await aiService.generateText(prompt, {
        systemPrompt: '你是一位擅长细节描写和情感渲染的文学编辑。请对提供的小说内容进行细节补充和情感增强，使故事更加生动感人。',
        maxTokens: 6000
      })

      const result: QualityResult = {
        id: `quality_${Date.now()}`,
        novelId,
        type: 'detail_enhance',
        originalContent: chapterContents,
        improvedContent: enhancedContent,
        createdAt: new Date().toISOString()
      }

      await this.saveResult(result)
      return result
    } catch (error) {
      logger.error('补充细节描述和情感渲染失败', { novelId, error })
      throw error
    }
  },

  /**
   * 完善结局和后续伏笔
   */
  async improveEnding(novelId: string): Promise<QualityResult> {
    const novel = await novelService.getNovelById(novelId)
    if (!novel) {
      throw new Error('小说不存在')
    }

    const chapters = await novelService.getChapters(novelId)
    if (chapters.length === 0) {
      throw new Error('小说没有章节内容')
    }

    // 获取最后几章内容（最多3章）
    const lastChapters = chapters.slice(-3)
    const endingContent = lastChapters.map(chapter => 
      `章节 ${chapter.orderIndex + 1}: ${chapter.title}\n${this.truncateContent(chapter.content || '', 3000)}`
    ).join('\n\n')

    const prompt = `请对以下小说的结局进行完善，并为后续故事埋下伏笔，重点关注：\n\n` +
      `1. 确保结局逻辑合理，符合人物性格和情节发展\n` +
      `2. 为主要角色的命运提供合理的交代\n` +
      `3. 适当留下悬念，为可能的续作埋下伏笔\n` +
      `4. 增强结局的情感冲击力\n\n` +
      `小说标题：${novel.title}\n` +
      `小说类型：${novel.type}\n` +
      `结局内容：\n${endingContent}`

    try {
      const improvedEnding = await aiService.generateText(prompt, {
        systemPrompt: '你是一位擅长构建故事结局和伏笔的文学编辑。请对提供的小说结局进行完善，并为后续故事埋下合理的伏笔。',
        maxTokens: 4000
      })

      const result: QualityResult = {
        id: `quality_${Date.now()}`,
        novelId,
        type: 'ending_improve',
        originalContent: endingContent,
        improvedContent: improvedEnding,
        createdAt: new Date().toISOString()
      }

      await this.saveResult(result)
      return result
    } catch (error) {
      logger.error('完善结局和后续伏笔失败', { novelId, error })
      throw error
    }
  },

  /**
   * 全文校对和格式统一
   */
  async proofread(novelId: string): Promise<QualityResult> {
    const novel = await novelService.getNovelById(novelId)
    if (!novel) {
      throw new Error('小说不存在')
    }

    const chapters = await novelService.getChapters(novelId)
    if (chapters.length === 0) {
      throw new Error('小说没有章节内容')
    }

    // 构建章节内容摘要（限制长度）
    const chapterSummaries = chapters.map(chapter => 
      `章节 ${chapter.orderIndex + 1}: ${chapter.title}\n${this.truncateContent(chapter.content || '', 1000)}`
    ).join('\n\n')
    
    const limitedContent = this.truncateContent(chapterSummaries, 12000)

    const prompt = `请对以下小说进行全文校对和格式统一，重点关注：\n\n` +
      `1. 修正错别字和语法错误\n` +
      `2. 统一标点符号和格式\n` +
      `3. 调整句子结构，提高可读性\n` +
      `4. 确保风格一致性\n\n` +
      `请保持原有的情节和内容，只进行校对和格式调整。\n\n` +
      `小说标题：${novel.title}\n` +
      `章节内容摘要：\n${limitedContent}`

    try {
      const proofreadContent = await aiService.generateText(prompt, {
        systemPrompt: '你是一位专业的校对编辑，擅长修正文字错误和统一格式。请对提供的小说内容进行全面的校对和格式统一。',
        maxTokens: 4000
      })

      const result: QualityResult = {
        id: `quality_${Date.now()}`,
        novelId,
        type: 'proofread',
        originalContent: limitedContent,
        improvedContent: proofreadContent,
        createdAt: new Date().toISOString()
      }

      await this.saveResult(result)
      return result
    } catch (error) {
      logger.error('全文校对和格式统一失败', { novelId, error })
      throw error
    }
  },

  /**
   * 执行质量提升任务
   */
  async executeTask(taskId: string): Promise<void> {
    const task = await this.getTask(taskId)
    if (!task) {
      throw new Error('任务不存在')
    }

    await this.updateTask(taskId, {
      status: 'processing',
      progress: 0
    })

    try {
      let result
      switch (task.type) {
        case 'plot_check':
          result = await this.checkPlotConsistency(task.novelId)
          break
        case 'detail_enhance':
          result = await this.enhanceDetails(task.novelId)
          break
        case 'ending_improve':
          result = await this.improveEnding(task.novelId)
          break
        case 'proofread':
          result = await this.proofread(task.novelId)
          break
        default:
          throw new Error('未知的任务类型')
      }

      await this.updateTask(taskId, {
        status: 'completed',
        progress: 100,
        result: JSON.stringify(result)
      })

      logger.info('质量提升任务完成', { taskId, type: task.type, novelId: task.novelId })
    } catch (error) {
      await this.updateTask(taskId, {
        status: 'failed',
        error: error instanceof Error ? error.message : '任务执行失败'
      })

      logger.error('质量提升任务失败', { taskId, error })
      throw error
    }
  },

  /**
   * 提取建议
   */
  extractSuggestions(analysis: string): string[] {
    // 简化实现，实际应该根据AI返回的格式进行更详细的解析
    const suggestions: string[] = []
    const lines = analysis.split('\n')
    let capture = false

    for (const line of lines) {
      if (line.includes('建议') || line.includes('改进')) {
        capture = true
      }
      if (capture && line.trim()) {
        suggestions.push(line.trim())
      }
    }

    return suggestions
  },

  /**
   * 提取问题
   */
  extractIssues(analysis: string): string[] {
    // 简化实现，实际应该根据AI返回的格式进行更详细的解析
    const issues: string[] = []
    const lines = analysis.split('\n')
    let capture = false

    for (const line of lines) {
      if (line.includes('问题') || line.includes('不足')) {
        capture = true
      }
      if (capture && line.trim()) {
        issues.push(line.trim())
      }
    }

    return issues
  },

  /**
   * 计算评分
   */
  calculateScore(_analysis: string): number {
    // 简化实现，实际应该根据AI返回的格式进行更详细的解析
    // 这里返回一个默认值
    return 85
  },

  /**
   * 保存质量提升结果
   */
  async saveResult(result: QualityResult): Promise<void> {
    await run(
      `INSERT INTO quality_results (id, novel_id, type, original_content, improved_content, suggestions, issues, score, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        result.id,
        result.novelId,
        result.type,
        result.originalContent || null,
        result.improvedContent || null,
        result.suggestions ? JSON.stringify(result.suggestions) : null,
        result.issues ? JSON.stringify(result.issues) : null,
        result.score || null,
        result.createdAt
      ]
    )
    logger.info('保存质量提升结果', { novelId: result.novelId, type: result.type })
  },

  /**
   * 获取小说的质量提升结果
   */
  async getResults(novelId: string): Promise<QualityResult[]> {
    const results = await query<{ id: string; novel_id: string; type: string; original_content: string | null; improved_content: string | null; suggestions: string | null; issues: string | null; score: number | null; created_at: string }>(
      'SELECT * FROM quality_results WHERE novel_id = ? ORDER BY created_at DESC',
      [novelId]
    )
    return results.map((result: { id: string; novel_id: string; type: string; original_content: string | null; improved_content: string | null; suggestions: string | null; issues: string | null; score: number | null; created_at: string }) => ({
      id: result.id,
      novelId: result.novel_id,
      type: result.type as QualityResult['type'],
      originalContent: result.original_content || undefined,
      improvedContent: result.improved_content || undefined,
      suggestions: result.suggestions ? JSON.parse(result.suggestions) : undefined,
      issues: result.issues ? JSON.parse(result.issues) : undefined,
      score: result.score || undefined,
      createdAt: result.created_at
    }))
  },

  /**
   * 获取单个质量提升结果
   */
  async getResultById(resultId: string): Promise<QualityResult | null> {
    const results = await query<{ id: string; novel_id: string; type: string; original_content: string | null; improved_content: string | null; suggestions: string | null; issues: string | null; score: number | null; created_at: string }>('SELECT * FROM quality_results WHERE id = ?', [resultId])
    const result = results[0]
    if (!result) return null
    return {
      id: result.id,
      novelId: result.novel_id,
      type: result.type as QualityResult['type'],
      originalContent: result.original_content || undefined,
      improvedContent: result.improved_content || undefined,
      suggestions: result.suggestions ? JSON.parse(result.suggestions) : undefined,
      issues: result.issues ? JSON.parse(result.issues) : undefined,
      score: result.score || undefined,
      createdAt: result.created_at
    }
  }
}

export default qualityService