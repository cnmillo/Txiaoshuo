import { run, query, queryOne } from '../database/index.js'
import { v4 as uuidv4 } from 'uuid'

interface ChapterVersion {
  id: string
  chapterId: string
  content: string
  version: number
  description: string
  createdAt: string
  createdBy: string
}

interface DatabaseChapterVersion {
  id: string
  chapter_id: string
  content: string
  version: number
  description: string
  created_at: string
  created_by: string
}

function mapVersionToResponse(version: DatabaseChapterVersion): ChapterVersion {
  return {
    id: version.id,
    chapterId: version.chapter_id,
    content: version.content,
    version: version.version,
    description: version.description,
    createdAt: version.created_at,
    createdBy: version.created_by || ''
  }
}

export const versionService = {
  // 创建章节版本
  createChapterVersion: async (chapterId: string, content: string, description: string, createdBy?: string): Promise<ChapterVersion> => {
    const id = uuidv4()
    const now = new Date().toISOString()
    
    // 获取当前最大版本号
    const maxVersion = await queryOne<{ maxVersion: number }>(
      `SELECT COALESCE(MAX(version), 0) as maxVersion FROM chapter_versions WHERE chapter_id = ?`,
      [chapterId]
    )
    
    const version = (maxVersion?.maxVersion || 0) + 1
    
    await run(
      `INSERT INTO chapter_versions (id, chapter_id, content, version, description, created_at, created_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, chapterId, content, version, description, now, createdBy]
    )
    
    return {
      id,
      chapterId,
      content,
      version,
      description,
      createdAt: now,
      createdBy: createdBy || ''
    }
  },
  
  // 获取章节的所有版本
  getChapterVersions: async (chapterId: string): Promise<ChapterVersion[]> => {
    const versions = await query<DatabaseChapterVersion>(
      `SELECT * FROM chapter_versions WHERE chapter_id = ? ORDER BY version DESC`,
      [chapterId]
    )
    return versions.map(mapVersionToResponse)
  },
  
  // 获取特定版本
  getChapterVersion: async (id: string): Promise<ChapterVersion | undefined> => {
    const version = await queryOne<DatabaseChapterVersion>(`SELECT * FROM chapter_versions WHERE id = ?`, [id])
    return version ? mapVersionToResponse(version) : undefined
  },
  
  // 获取最新版本
  getLatestChapterVersion: async (chapterId: string): Promise<ChapterVersion | undefined> => {
    const version = await queryOne<DatabaseChapterVersion>(
      `SELECT * FROM chapter_versions WHERE chapter_id = ? ORDER BY version DESC LIMIT 1`,
      [chapterId]
    )
    return version ? mapVersionToResponse(version) : undefined
  },
  
  // 删除版本
  deleteChapterVersion: async (id: string): Promise<boolean> => {
    const result = await run(`DELETE FROM chapter_versions WHERE id = ?`, [id])
    return (result.changes ?? 0) > 0
  }
}
