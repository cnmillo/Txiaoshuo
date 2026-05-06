import { query, queryOne, run } from '../database/index.js'
import { calculateWordCount } from './novelService.js'
import logger from '../utils/logger.js'
import { randomUUID } from 'crypto'

interface WorkflowChapter {
  id: string
  workflow_id: string
  title: string
  content: string
  chapter_number: number
  word_count: number
  status: string
  created_at: string
  updated_at: string
}

export const chapterExecutionService = {
  async initTables(): Promise<void> {
    await run(`
      CREATE TABLE IF NOT EXISTS workflow_chapters (
        id TEXT PRIMARY KEY,
        workflow_id TEXT NOT NULL,
        title TEXT NOT NULL DEFAULT '',
        content TEXT NOT NULL DEFAULT '',
        chapter_number INTEGER NOT NULL DEFAULT 0,
        word_count INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (workflow_id) REFERENCES workflow_states(id) ON DELETE CASCADE
      )
    `)

    await run(`
      CREATE INDEX IF NOT EXISTS idx_workflow_chapters_workflow_id 
      ON workflow_chapters(workflow_id)
    `)

    await run(`
      CREATE INDEX IF NOT EXISTS idx_workflow_chapters_chapter_number 
      ON workflow_chapters(workflow_id, chapter_number)
    `)

    logger.info('章节执行表初始化完成')
  },

  async getChapterContent(chapterId: string): Promise<{ id: string; content: string; wordCount: number; updatedAt: string; title?: string; chapterNumber?: number } | null> {
    const chapter = await queryOne<WorkflowChapter>(
      'SELECT id, content, word_count, updated_at, title, chapter_number FROM workflow_chapters WHERE id = ?',
      [chapterId]
    )

    if (!chapter) {
      return null
    }

    return {
      id: chapter.id,
      content: chapter.content,
      wordCount: chapter.word_count,
      updatedAt: chapter.updated_at,
      title: chapter.title,
      chapterNumber: chapter.chapter_number
    }
  },

  async saveChapterContent(chapterId: string, content: string, meta?: { title?: string; chapterNumber?: number; auditResult?: Record<string, unknown> }): Promise<{ success: boolean; wordCount: number }> {
    const now = new Date().toISOString()
    const wordCount = calculateWordCount(content)

    const existing = await queryOne<WorkflowChapter>(
      'SELECT id FROM workflow_chapters WHERE id = ?',
      [chapterId]
    )

    if (existing) {
      const updates: string[] = ['content = ?', 'word_count = ?', 'status = \'completed\'', 'updated_at = ?']
      const params: unknown[] = [content, wordCount, now]

      if (meta?.title) {
        updates.push('title = ?')
        params.push(meta.title)
      }
      if (meta?.chapterNumber !== undefined && meta?.chapterNumber > 0) {
        updates.push('chapter_number = ?')
        params.push(meta.chapterNumber)
      }

      params.push(chapterId)
      await run(
        `UPDATE workflow_chapters SET ${updates.join(', ')} WHERE id = ?`,
        params
      )
    } else {
      let workflowId: string
      const latestWorkflow = await queryOne<{ id: string }>(
        'SELECT id FROM workflow_states ORDER BY created_at DESC LIMIT 1'
      )
      
      if (!latestWorkflow) {
        workflowId = randomUUID()
        await run(
          `INSERT INTO workflow_states (id, current_stage, stages, version, created_at, updated_at) VALUES (?, 'chapter_execution', '{}', 1, ?, ?)`,
          [workflowId, now, now]
        )
        logger.info('创建默认工作流', { workflowId })
      } else {
        workflowId = latestWorkflow.id
      }

      const title = meta?.title || ''
      const chapterNumber = meta?.chapterNumber || 1

      await run(
        `INSERT INTO workflow_chapters (id, workflow_id, title, content, chapter_number, word_count, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 'completed', ?, ?)`,
        [chapterId, workflowId, title, content, chapterNumber, wordCount, now, now]
      )
      logger.info('创建新章节', { chapterId, workflowId, title, chapterNumber })
    }

    return { success: true, wordCount }
  },

  async getChaptersByWorkflowId(workflowId: string): Promise<{
    chapters: Array<{
      id: string
      title: string
      chapterNumber: number
      wordCount: number
      status: string
      updatedAt: string
    }>
    stats: {
      totalChapters: number
      completedChapters: number
      totalWordCount: number
    }
  }> {
    const chapters = await query<WorkflowChapter>(
      'SELECT id, title, chapter_number, word_count, status, updated_at FROM workflow_chapters WHERE workflow_id = ? ORDER BY chapter_number ASC',
      [workflowId]
    )

    const totalChapters = chapters.length
    const completedChapters = chapters.filter(c => c.status === 'completed').length
    const totalWordCount = chapters.reduce((sum, c) => sum + c.word_count, 0)

    return {
      chapters: chapters.map(c => ({
        id: c.id,
        title: c.title,
        chapterNumber: c.chapter_number,
        wordCount: c.word_count,
        status: c.status,
        updatedAt: c.updated_at
      })),
      stats: {
        totalChapters,
        completedChapters,
        totalWordCount
      }
    }
  },

  async createChapter(data: {
    id: string
    workflowId: string
    title: string
    chapterNumber: number
    content?: string
  }): Promise<{ id: string }> {
    const now = new Date().toISOString()
    const content = data.content || ''
    const wordCount = calculateWordCount(content)

    await run(
      `INSERT INTO workflow_chapters (id, workflow_id, title, content, chapter_number, word_count, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
      [data.id, data.workflowId, data.title, content, data.chapterNumber, wordCount, now, now]
    )

    return { id: data.id }
  },

  async deleteChapter(chapterId: string): Promise<boolean> {
    const result = await run('DELETE FROM workflow_chapters WHERE id = ?', [chapterId])
    return result.changes > 0
  },

  async batchCreateChapters(workflowId: string, chapters: Array<{
    id: string
    title: string
    chapterNumber: number
  }>): Promise<{ createdCount: number }> {
    const now = new Date().toISOString()

    for (const chapter of chapters) {
      // 先尝试插入新记录（如果已存在则忽略）
      await run(
        `INSERT OR IGNORE INTO workflow_chapters (id, workflow_id, title, content, chapter_number, word_count, status, created_at, updated_at)
         VALUES (?, ?, ?, '', ?, 0, 'pending', ?, ?)`,
        [chapter.id, workflowId, chapter.title, chapter.chapterNumber, now, now]
      )

      // 对已存在的记录，仅更新 title 和 chapter_number（保留 content/word_count/status）
      await run(
        `UPDATE workflow_chapters SET title = ?, chapter_number = ?, updated_at = ? WHERE id = ?`,
        [chapter.title, chapter.chapterNumber, now, chapter.id]
      )
    }

    return { createdCount: chapters.length }
  }
}

export default chapterExecutionService
