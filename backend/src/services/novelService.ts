import { v4 as uuidv4 } from 'uuid'
import { query, queryOne, run, transaction } from '../database/index.js'
import type {
  DatabaseNovel,
  DatabaseChapter,
  NovelFilter,
  PaginationParams,
  PaginatedResponse,
  StyleConfig
} from '../types/index.js'
import logger from '../utils/logger.js'

/**
 * 计算文本字数（中文字符 + 英文单词）
 */
function calculateWordCount(text: string): number {
  if (!text) return 0
  // 中文字符数
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length
  // 英文单词数
  const englishWords = (text.match(/[a-zA-Z]+/g) || []).length
  return chineseChars + englishWords
}

/**
 * 转换数据库小说对象为API响应格式
 */
function mapNovelToResponse(novel: DatabaseNovel) {
  return {
    id: novel.id,
    title: novel.title,
    type: novel.type,
    status: novel.status,
    wordCount: novel.word_count,
    targetWordCount: novel.target_word_count,
    prompt: novel.prompt,
    content: novel.content,
    outline: novel.outline,
    description: novel.description,
    style: novel.style,
    styleConfig: novel.styleConfig ? JSON.parse(novel.styleConfig) : undefined,
    error: novel.error,
    totalChapterCount: novel.totalChapterCount,
    generatedChapterCount: novel.generatedChapterCount,
    lastFailedChapterIndex: novel.lastFailedChapterIndex,
    lastFailureReason: novel.lastFailureReason,
    createdAt: novel.created_at,
    updatedAt: novel.updated_at
  }
}

/**
 * 转换数据库章节对象为API响应格式
 */
function mapChapterToResponse(chapter: DatabaseChapter) {
  return {
    id: chapter.id,
    novelId: chapter.novel_id,
    title: chapter.title,
    content: chapter.content,
    description: chapter.description,
    orderIndex: chapter.order_index,
    wordCount: chapter.word_count,
    createdAt: chapter.created_at,
    updatedAt: chapter.updated_at
  }
}

/**
 * 小说服务
 */
export const novelService = {
  /**
   * 获取小说列表
   */
  async getNovels(filter: NovelFilter, pagination: PaginationParams): Promise<PaginatedResponse<ReturnType<typeof mapNovelToResponse>>> {
    const { search, type, status, sortBy = 'created_at', sortOrder = 'desc' } = filter
    const { page, limit } = pagination
    const offset = (page - 1) * limit

    // 构建查询条件
    const conditions: string[] = []
    const params: unknown[] = []

    if (search) {
      conditions.push('(title LIKE ? OR description LIKE ?)')
      params.push(`%${search}%`, `%${search}%`)
    }

    if (type) {
      conditions.push('type = ?')
      params.push(type)
    }

    if (status) {
      conditions.push('status = ?')
      params.push(status)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    // 获取总数
    const countResult = await queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM novels ${whereClause}`,
      params.length > 0 ? params : undefined
    )
    const total = countResult?.count || 0

    // 获取数据
    const validSortColumns = ['created_at', 'updated_at', 'word_count', 'title']
    const orderColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at'
    const orderDirection = sortOrder === 'asc' ? 'ASC' : 'DESC'

    const novels = await query<DatabaseNovel>(
      `SELECT * FROM novels ${whereClause} ORDER BY ${orderColumn} ${orderDirection} LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    )

    return {
      data: novels.map(mapNovelToResponse),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  },

  /**
   * 获取小说详情
   */
  async getNovelById(id: string): Promise<ReturnType<typeof mapNovelToResponse> | null> {
    const novel = await queryOne<DatabaseNovel>('SELECT * FROM novels WHERE id = ?', [id])
    return novel ? mapNovelToResponse(novel) : null
  },

  /**
   * 创建小说
   */
  async createNovel(data: {
    title: string
    type?: string
    description?: string
    prompt?: string
    outline?: string
    style?: string
    styleConfig?: StyleConfig
    targetWordCount?: number
    status?: string
  }): Promise<ReturnType<typeof mapNovelToResponse>> {
    const id = uuidv4()
    const now = new Date().toISOString()

    const novelData: DatabaseNovel = {
      id,
      title: data.title,
      type: data.type || 'general',
      status: (data.status as DatabaseNovel['status']) || 'draft',
      word_count: 0,
      target_word_count: data.targetWordCount || 50000,
      prompt: data.prompt,
      outline: data.outline,
      description: data.description,
      style: data.style,
      styleConfig: data.styleConfig ? JSON.stringify(data.styleConfig) : undefined,
      created_at: now,
      updated_at: now
    }

    await run(
      `INSERT INTO novels (id, title, type, status, word_count, target_word_count, prompt, outline, description, style, styleConfig, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        novelData.id,
        novelData.title,
        novelData.type,
        novelData.status,
        novelData.word_count,
        novelData.target_word_count,
        novelData.prompt,
        novelData.outline,
        novelData.description,
        novelData.style,
        novelData.styleConfig,
        novelData.created_at,
        novelData.updated_at
      ]
    )

    logger.info('小说创建成功', { id, title: data.title })
    return mapNovelToResponse(novelData)
  },

  /**
   * 更新小说
   */
  async updateNovel(id: string, data: Partial<{
    title: string
    type: string
    description: string
    prompt: string
    content: string
    outline: string
    style: string
    styleConfig?: StyleConfig
    wordCount: number
    targetWordCount: number
    status: string
    error: string
    totalChapterCount: number
    generatedChapterCount: number
    lastFailedChapterIndex: number | null
    lastFailureReason: string | null
  }>): Promise<ReturnType<typeof mapNovelToResponse> | null> {
    const novel = await queryOne<DatabaseNovel>('SELECT * FROM novels WHERE id = ?', [id])
    if (!novel) return null

    const updates: string[] = []
    const params: unknown[] = []

    if (data.title !== undefined) {
      updates.push('title = ?')
      params.push(data.title)
    }
    if (data.type !== undefined) {
      updates.push('type = ?')
      params.push(data.type)
    }
    if (data.description !== undefined) {
      updates.push('description = ?')
      params.push(data.description)
    }
    if (data.prompt !== undefined) {
      updates.push('prompt = ?')
      params.push(data.prompt)
    }
    if (data.content !== undefined) {
      updates.push('content = ?')
      params.push(data.content)
    }
    if (data.outline !== undefined) {
      updates.push('outline = ?')
      params.push(data.outline)
    }
    if (data.style !== undefined) {
      updates.push('style = ?')
      params.push(data.style)
    }
    if (data.error !== undefined) {
      updates.push('error = ?')
      params.push(data.error)
    }
    if (data.styleConfig !== undefined) {
      updates.push('styleConfig = ?')
      params.push(data.styleConfig ? JSON.stringify(data.styleConfig) : null)
    }
    if (data.wordCount !== undefined) {
      updates.push('word_count = ?')
      params.push(data.wordCount)
    }
    if (data.targetWordCount !== undefined) {
      updates.push('target_word_count = ?')
      params.push(data.targetWordCount)
    }
    if (data.status !== undefined) {
      updates.push('status = ?')
      params.push(data.status)
    }
    if (data.totalChapterCount !== undefined) {
      updates.push('totalChapterCount = ?')
      params.push(data.totalChapterCount)
    }
    if (data.generatedChapterCount !== undefined) {
      updates.push('generatedChapterCount = ?')
      params.push(data.generatedChapterCount)
    }
    if (data.lastFailedChapterIndex !== undefined) {
      updates.push('lastFailedChapterIndex = ?')
      params.push(data.lastFailedChapterIndex)
    }
    if (data.lastFailureReason !== undefined) {
      updates.push('lastFailureReason = ?')
      params.push(data.lastFailureReason)
    }

    updates.push('updated_at = ?')
    params.push(new Date().toISOString())
    params.push(id)

    await run(`UPDATE novels SET ${updates.join(', ')} WHERE id = ?`, params)

    logger.info('小说更新成功', { id })
    return await this.getNovelById(id)
  },

  /**
   * 删除小说
   */
  async deleteNovel(id: string): Promise<boolean> {
    const novel = await queryOne<DatabaseNovel>('SELECT * FROM novels WHERE id = ?', [id])
    if (!novel) return false

    // 级联删除会在数据库层面处理
    await run('DELETE FROM novels WHERE id = ?', [id])

    logger.info('小说删除成功', { id })
    return true
  },

  /**
   * 更新小说字数
   */
  async updateWordCount(novelId: string): Promise<void> {
    const result = await queryOne<{ total: number }>(
      'SELECT COALESCE(SUM(word_count), 0) as total FROM chapters WHERE novel_id = ?',
      [novelId]
    )

    const wordCount = result?.total || 0
    await run('UPDATE novels SET word_count = ?, updated_at = ? WHERE id = ?', [
      wordCount,
      new Date().toISOString(),
      novelId
    ])

    logger.debug('小说字数更新', { novelId, wordCount })
  },

  /**
   * 获取章节列表
   */
  async getChapters(novelId: string): Promise<ReturnType<typeof mapChapterToResponse>[]> {
    const chapters = await query<DatabaseChapter>(
      'SELECT * FROM chapters WHERE novel_id = ? ORDER BY order_index ASC, created_at ASC',
      [novelId]
    )
    return chapters.map(mapChapterToResponse)
  },

  /**
   * 获取单个章节
   */
  async getChapterById(novelId: string, chapterId: string): Promise<ReturnType<typeof mapChapterToResponse> | null> {
    const chapter = await queryOne<DatabaseChapter>(
      'SELECT * FROM chapters WHERE id = ? AND novel_id = ?',
      [chapterId, novelId]
    )
    return chapter ? mapChapterToResponse(chapter) : null
  },

  /**
   * 创建章节
   */
  async createChapter(novelId: string, data: {
    title: string
    content?: string
    description?: string
    orderIndex?: number
  }): Promise<ReturnType<typeof mapChapterToResponse>> {
    const id = uuidv4()
    const now = new Date().toISOString()

    // 如果没有指定排序索引，获取当前最大索引 + 1
    let orderIndex = data.orderIndex
    if (orderIndex === undefined) {
      const result = await queryOne<{ maxOrder: number }>(
        'SELECT COALESCE(MAX(order_index), -1) as maxOrder FROM chapters WHERE novel_id = ?',
        [novelId]
      )
      orderIndex = (result?.maxOrder ?? -1) + 1
    }

    const content = data.content || ''
    const wordCount = calculateWordCount(content)

    const chapterData: DatabaseChapter = {
      id,
      novel_id: novelId,
      title: data.title,
      content,
      description: data.description,
      order_index: orderIndex,
      word_count: wordCount,
      created_at: now,
      updated_at: now
    }

    await run(
      `INSERT INTO chapters (id, novel_id, title, content, description, order_index, word_count, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        chapterData.id,
        chapterData.novel_id,
        chapterData.title,
        chapterData.content,
        chapterData.description,
        chapterData.order_index,
        chapterData.word_count,
        chapterData.created_at,
        chapterData.updated_at
      ]
    )

    // 更新小说字数
    await this.updateWordCount(novelId)

    logger.info('章节创建成功', { id, novelId, title: data.title })
    return mapChapterToResponse(chapterData)
  },

  /**
   * 更新章节
   */
  async updateChapter(novelId: string, chapterId: string, data: Partial<{
    title: string
    content: string
    description: string
    orderIndex: number
  }>): Promise<ReturnType<typeof mapChapterToResponse> | null> {
    const chapter = await queryOne<DatabaseChapter>(
      'SELECT * FROM chapters WHERE id = ? AND novel_id = ?',
      [chapterId, novelId]
    )
    if (!chapter) return null

    const updates: string[] = []
    const params: unknown[] = []

    if (data.title !== undefined) {
      updates.push('title = ?')
      params.push(data.title)
    }
    if (data.content !== undefined) {
      updates.push('content = ?')
      params.push(data.content)
      updates.push('word_count = ?')
      params.push(calculateWordCount(data.content))
    }
    if (data.description !== undefined) {
      updates.push('description = ?')
      params.push(data.description)
    }
    if (data.orderIndex !== undefined) {
      updates.push('order_index = ?')
      params.push(data.orderIndex)
    }

    updates.push('updated_at = ?')
    params.push(new Date().toISOString())
    params.push(chapterId)
    params.push(novelId)

    await run(`UPDATE chapters SET ${updates.join(', ')} WHERE id = ? AND novel_id = ?`, params)

    // 更新小说字数
    await this.updateWordCount(novelId)

    logger.info('章节更新成功', { chapterId, novelId })
    return await this.getChapterById(novelId, chapterId)
  },

  /**
   * 删除章节
   */
  async deleteChapter(novelId: string, chapterId: string): Promise<boolean> {
    const chapter = await queryOne<DatabaseChapter>(
      'SELECT * FROM chapters WHERE id = ? AND novel_id = ?',
      [chapterId, novelId]
    )
    if (!chapter) return false

    await run('DELETE FROM chapters WHERE id = ? AND novel_id = ?', [chapterId, novelId])

    // 更新小说字数
    await this.updateWordCount(novelId)

    logger.info('章节删除成功', { chapterId, novelId })
    return true
  },

  /**
   * 批量创建章节
   */
  async batchCreateChapters(novelId: string, chapters: { title: string; content: string }[]): Promise<void> {
    const now = new Date().toISOString()

    await transaction(async () => {
      for (let i = 0; i < chapters.length; i++) {
        const chapter = chapters[i]
        const id = uuidv4()
        const wordCount = calculateWordCount(chapter.content)

        await run(`
          INSERT INTO chapters (id, novel_id, title, content, order_index, word_count, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [id, novelId, chapter.title, chapter.content, i + 1, wordCount, now, now])
      }
    })

    // 更新小说字数
    await this.updateWordCount(novelId)

    logger.info('批量创建章节成功', { novelId, count: chapters.length })
  },

  /**
   * 获取所有小说类型
   */
  async getNovelTypes(): Promise<string[]> {
    const results = await query<{ type: string }>('SELECT DISTINCT type FROM novels WHERE type IS NOT NULL')
    return results.map((r: { type: string }) => r.type)
  },

  /**
   * 检查小说标题是否存在
   */
  async isTitleExists(title: string, excludeId?: string): Promise<boolean> {
    const sql = excludeId
      ? 'SELECT COUNT(*) as count FROM novels WHERE title = ? AND id != ?'
      : 'SELECT COUNT(*) as count FROM novels WHERE title = ?'
    const params = excludeId ? [title, excludeId] : [title]

    const result = await queryOne<{ count: number }>(sql, params)
    return (result?.count || 0) > 0
  }
}

export default novelService
