/**
 * 项目设定服务
 * 
 * 提供项目设定的数据库操作
 */

import { query, queryOne, run } from '../database/index.js'
import logger from '../utils/logger.js'

// 小说风格类型
export type NovelStyle = 
  | 'fantasy'          // 玄幻
  | 'wuxia'            // 武侠
  | 'xianxia'          // 仙侠
  | 'romance'          // 言情
  | 'scifi'            // 科幻
  | 'mystery'          // 悬疑
  | 'history'          // 历史
  | 'urban'            // 都市
  | 'game'             // 游戏
  | 'military'         // 军事
  | 'sports'           // 竞技
  | 'lifestyle'        // 生活
  | 'horror'           // 灵异
  | 'fantasy_western'  // 奇幻
  | 'other'            // 其他

// ============================================================================
// 类型定义
// ============================================================================

export interface ProjectSetting {
  id: string
  workflowId?: string
  title: string
  description?: string
  genre: NovelStyle
  coreSellingPoint: string
  targetReaderFeeling: string
  first30ChaptersPromise: string
  worldviewHint?: string
  styleHint?: string
  writingStyle?: string
  estimatedWordCount?: number
  oneLineSummary?: string
  createdAt: string
  updatedAt: string
}

export interface CreateProjectSettingInput {
  workflowId?: string
  title: string
  description?: string
  genre: NovelStyle
  coreSellingPoint: string
  targetReaderFeeling: string
  first30ChaptersPromise: string
  worldviewHint?: string
  styleHint?: string
  writingStyle?: string
  estimatedWordCount?: number
  oneLineSummary?: string
}

export interface UpdateProjectSettingInput {
  title?: string
  description?: string
  genre?: NovelStyle
  coreSellingPoint?: string
  targetReaderFeeling?: string
  first30ChaptersPromise?: string
  worldviewHint?: string
  styleHint?: string
  writingStyle?: string
  estimatedWordCount?: number
  oneLineSummary?: string
}

// ============================================================================
// 服务实现
// ============================================================================

class ProjectSettingService {
  /**
   * 初始化项目设定表
   */
  async initTable(): Promise<void> {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS project_settings (
        id TEXT PRIMARY KEY,
        workflow_id TEXT,
        title TEXT NOT NULL,
        description TEXT,
        genre TEXT NOT NULL,
        core_selling_point TEXT NOT NULL,
        target_reader_feeling TEXT NOT NULL,
        first_30_chapters_promise TEXT NOT NULL,
        worldview_hint TEXT,
        style_hint TEXT,
        writing_style TEXT,
        estimated_word_count INTEGER,
        one_line_summary TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `
    
    await run(createTableSQL)
    logger.info('项目设定表初始化完成')
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return `ps_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * 创建项目设定
   */
  async create(input: CreateProjectSettingInput): Promise<ProjectSetting> {
    const id = this.generateId()
    const now = new Date().toISOString()

    const sql = `
      INSERT INTO project_settings (
        id, workflow_id, title, description, genre, core_selling_point,
        target_reader_feeling, first_30_chapters_promise,
        worldview_hint, style_hint, writing_style, estimated_word_count, one_line_summary,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `

    await run(sql, [
      id,
      input.workflowId || null,
      input.title,
      input.description || null,
      input.genre,
      input.coreSellingPoint,
      input.targetReaderFeeling,
      input.first30ChaptersPromise,
      input.worldviewHint || null,
      input.styleHint || null,
      input.writingStyle || null,
      input.estimatedWordCount || null,
      input.oneLineSummary || null,
      now,
      now,
    ])

    const result = await this.getById(id)
    if (!result) {
      throw new Error('创建项目设定失败')
    }

    return result
  }

  /**
   * 根据ID获取项目设定
   */
  async getById(id: string): Promise<ProjectSetting | null> {
    const sql = `
      SELECT 
        id, workflow_id, title, description, genre, core_selling_point,
        target_reader_feeling, first_30_chapters_promise,
        worldview_hint, style_hint, writing_style, estimated_word_count, one_line_summary,
        created_at, updated_at
      FROM project_settings
      WHERE id = ?
    `

    const row = await queryOne<{
      id: string
      workflow_id: string | null
      title: string
      description: string | null
      genre: string
      core_selling_point: string
      target_reader_feeling: string
      first_30_chapters_promise: string
      worldview_hint: string | null
      style_hint: string | null
      writing_style: string | null
      estimated_word_count: number | null
      one_line_summary: string | null
      created_at: string
      updated_at: string
    }>(sql, [id])

    if (!row) {
      return null
    }

    return this.mapRowToProjectSetting(row)
  }

  /**
   * 根据工作流ID获取项目设定
   */
  async getByWorkflowId(workflowId: string): Promise<ProjectSetting | null> {
    const sql = `
      SELECT 
        id, workflow_id, title, description, genre, core_selling_point,
        target_reader_feeling, first_30_chapters_promise,
        worldview_hint, style_hint, writing_style, estimated_word_count, one_line_summary,
        created_at, updated_at
      FROM project_settings
      WHERE workflow_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `

    const row = await queryOne<{
      id: string
      workflow_id: string | null
      title: string
      description: string | null
      genre: string
      core_selling_point: string
      target_reader_feeling: string
      first_30_chapters_promise: string
      worldview_hint: string | null
      style_hint: string | null
      writing_style: string | null
      estimated_word_count: number | null
      one_line_summary: string | null
      created_at: string
      updated_at: string
    }>(sql, [workflowId])

    if (!row) {
      return null
    }

    return this.mapRowToProjectSetting(row)
  }

  /**
   * 更新项目设定
   */
  async update(id: string, input: UpdateProjectSettingInput): Promise<ProjectSetting> {
    const updates: string[] = []
    const values: (string | number | null)[] = []

    if (input.title !== undefined) {
      updates.push('title = ?')
      values.push(input.title)
    }
    if (input.description !== undefined) {
      updates.push('description = ?')
      values.push(input.description || null)
    }
    if (input.genre !== undefined) {
      updates.push('genre = ?')
      values.push(input.genre)
    }
    if (input.coreSellingPoint !== undefined) {
      updates.push('core_selling_point = ?')
      values.push(input.coreSellingPoint)
    }
    if (input.targetReaderFeeling !== undefined) {
      updates.push('target_reader_feeling = ?')
      values.push(input.targetReaderFeeling)
    }
    if (input.first30ChaptersPromise !== undefined) {
      updates.push('first_30_chapters_promise = ?')
      values.push(input.first30ChaptersPromise)
    }
    if (input.worldviewHint !== undefined) {
      updates.push('worldview_hint = ?')
      values.push(input.worldviewHint || null)
    }
    if (input.styleHint !== undefined) {
      updates.push('style_hint = ?')
      values.push(input.styleHint || null)
    }
    if (input.writingStyle !== undefined) {
      updates.push('writing_style = ?')
      values.push(input.writingStyle || null)
    }
    if (input.estimatedWordCount !== undefined) {
      updates.push('estimated_word_count = ?')
      values.push(input.estimatedWordCount || null)
    }
    if (input.oneLineSummary !== undefined) {
      updates.push('one_line_summary = ?')
      values.push(input.oneLineSummary || null)
    }

    if (updates.length === 0) {
      const result = await this.getById(id)
      if (!result) {
        throw new Error('项目设定不存在')
      }
      return result
    }

    updates.push('updated_at = ?')
    values.push(new Date().toISOString())
    values.push(id)

    const sql = `
      UPDATE project_settings
      SET ${updates.join(', ')}
      WHERE id = ?
    `

    await run(sql, values)

    const result = await this.getById(id)
    if (!result) {
      throw new Error('更新项目设定失败')
    }

    return result
  }

  /**
   * 删除项目设定
   */
  async delete(id: string): Promise<void> {
    const sql = 'DELETE FROM project_settings WHERE id = ?'
    await run(sql, [id])
  }

  /**
   * 获取所有项目设定
   */
  async getAll(limit: number = 50, offset: number = 0): Promise<ProjectSetting[]> {
    const sql = `
      SELECT 
        id, workflow_id, title, description, genre, core_selling_point,
        target_reader_feeling, first_30_chapters_promise,
        worldview_hint, style_hint, writing_style, estimated_word_count, one_line_summary,
        created_at, updated_at
      FROM project_settings
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `

    const rows = await query<{
      id: string
      workflow_id: string | null
      title: string
      description: string | null
      genre: string
      core_selling_point: string
      target_reader_feeling: string
      first_30_chapters_promise: string
      worldview_hint: string | null
      style_hint: string | null
      writing_style: string | null
      estimated_word_count: number | null
      one_line_summary: string | null
      created_at: string
      updated_at: string
    }>(sql, [limit, offset])

    return rows.map((row) => this.mapRowToProjectSetting(row))
  }

  private mapRowToProjectSetting(row: {
    id: string
    workflow_id: string | null
    title: string
    description: string | null
    genre: string
    core_selling_point: string
    target_reader_feeling: string
    first_30_chapters_promise: string
    worldview_hint: string | null
    style_hint: string | null
    writing_style: string | null
    estimated_word_count: number | null
    one_line_summary: string | null
    created_at: string
    updated_at: string
  }): ProjectSetting {
    return {
      id: row.id,
      workflowId: row.workflow_id || undefined,
      title: row.title,
      description: row.description || undefined,
      genre: row.genre as NovelStyle,
      coreSellingPoint: row.core_selling_point,
      targetReaderFeeling: row.target_reader_feeling,
      first30ChaptersPromise: row.first_30_chapters_promise,
      worldviewHint: row.worldview_hint || undefined,
      styleHint: row.style_hint || undefined,
      writingStyle: row.writing_style || undefined,
      estimatedWordCount: row.estimated_word_count || undefined,
      oneLineSummary: row.one_line_summary || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }
}

// 导出单例
export const projectSettingService = new ProjectSettingService()
