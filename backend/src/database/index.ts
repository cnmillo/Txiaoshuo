import sqlite3 from 'sqlite3'
import { open, Database } from 'sqlite'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DB_PATH = path.join(__dirname, '../../data/novel-generator.db')

// 确保数据目录存在
const dataDir = path.dirname(DB_PATH)
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

let db: Database<sqlite3.Database, sqlite3.Statement> | null = null

const MAX_RETRIES = 3
const RETRY_DELAY = 1000

export const getDatabase = async (): Promise<Database<sqlite3.Database, sqlite3.Statement>> => {
  if (!db) {
    let lastError: Error | null = null
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        db = await open({
          filename: DB_PATH,
          driver: sqlite3.Database
        })
        console.log('数据库连接成功')
        return db
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        console.error(`数据库连接失败 (尝试 ${attempt}/${MAX_RETRIES}):`, lastError.message)
        if (attempt < MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt))
        }
      }
    }
    throw lastError || new Error('数据库连接失败')
  }
  return db
}

export const query = async <T>(sql: string, params: unknown[] = []): Promise<T[]> => {
  try {
    const database = await getDatabase()
    return database.all<T[]>(sql, params)
  } catch (error) {
    console.error('数据库查询错误:', { sql, params, error })
    throw error
  }
}

export const queryWithTimeout = async <T>(
  sql: string, 
  params: unknown[] = [], 
  timeoutMs: number = 30000
): Promise<T[]> => {
  return Promise.race([
    query<T>(sql, params),
    new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('数据库查询超时')), timeoutMs)
    )
  ])
}

export const queryOne = async <T>(sql: string, params: unknown[] = []): Promise<T | undefined> => {
  const database = await getDatabase()
  return database.get<T>(sql, params)
}

export const run = async (sql: string, params: unknown[] = []): Promise<{ changes: number; lastInsertRowid: number }> => {
  const database = await getDatabase()
  const result = await database.run(sql, params)
  return { 
    changes: result.changes || 0, 
    lastInsertRowid: result.lastID || 0 
  }
}

export const transaction = async <T>(callback: () => Promise<T>): Promise<T> => {
  const database = await getDatabase()
  await database.run('BEGIN TRANSACTION')
  try {
    const result = await callback()
    await database.run('COMMIT')
    return result
  } catch (error) {
    await database.run('ROLLBACK')
    throw error
  }
}

/**
 * 数据库迁移：检查并添加缺失的列
 */
const runMigrations = async (database: Database<sqlite3.Database, sqlite3.Statement>) => {
  // 检查 settings 表是否有 createdAt 和 updatedAt 列
  try {
    const settingsTableInfo = await database.all("PRAGMA table_info(settings)") as Array<{ name: string }>
    const settingsColumns = settingsTableInfo.map(col => col.name)
    
    if (settingsColumns.length > 0 && !settingsColumns.includes('createdAt')) {
      console.log('迁移: 添加 settings 表的 createdAt 列')
      await database.exec('ALTER TABLE settings ADD COLUMN createdAt TEXT')
      console.log('迁移: settings 表 createdAt 列添加完成')
    }
    
    if (settingsColumns.length > 0 && !settingsColumns.includes('updatedAt')) {
      console.log('迁移: 添加 settings 表的 updatedAt 列')
      await database.exec('ALTER TABLE settings ADD COLUMN updatedAt TEXT')
      console.log('迁移: settings 表 updatedAt 列添加完成')
    }
  } catch {
    console.log('迁移检查跳过 (settings 表可能不存在)')
  }

  // 检查 novels 表是否有 error 列
  try {
    const novelsTableInfo = await database.all("PRAGMA table_info(novels)") as Array<{ name: string }>
    const novelsColumns = novelsTableInfo.map(col => col.name)
    
    if (novelsColumns.length > 0 && !novelsColumns.includes('error')) {
      console.log('迁移: 添加 novels 表的 error 列')
      await database.exec('ALTER TABLE novels ADD COLUMN error TEXT')
      console.log('迁移: novels 表 error 列添加完成')
    }
    
    // 添加章节生成进度相关字段
    if (novelsColumns.length > 0 && !novelsColumns.includes('totalChapterCount')) {
      console.log('迁移: 添加 novels 表的 totalChapterCount 列')
      await database.exec('ALTER TABLE novels ADD COLUMN totalChapterCount INTEGER DEFAULT 0')
      console.log('迁移: novels 表 totalChapterCount 列添加完成')
    }
    
    if (novelsColumns.length > 0 && !novelsColumns.includes('generatedChapterCount')) {
      console.log('迁移: 添加 novels 表的 generatedChapterCount 列')
      await database.exec('ALTER TABLE novels ADD COLUMN generatedChapterCount INTEGER DEFAULT 0')
      console.log('迁移: novels 表 generatedChapterCount 列添加完成')
    }
    
    if (novelsColumns.length > 0 && !novelsColumns.includes('lastFailedChapterIndex')) {
      console.log('迁移: 添加 novels 表的 lastFailedChapterIndex 列')
      await database.exec('ALTER TABLE novels ADD COLUMN lastFailedChapterIndex INTEGER')
      console.log('迁移: novels 表 lastFailedChapterIndex 列添加完成')
    }
    
    if (novelsColumns.length > 0 && !novelsColumns.includes('lastFailureReason')) {
      console.log('迁移: 添加 novels 表的 lastFailureReason 列')
      await database.exec('ALTER TABLE novels ADD COLUMN lastFailureReason TEXT')
      console.log('迁移: novels 表 lastFailureReason 列添加完成')
    }
  } catch {
    console.log('迁移检查跳过 (novels 表可能不存在)')
  }

  // 检查 chapters 表是否有 description 列
  try {
    const chaptersTableInfo = await database.all("PRAGMA table_info(chapters)") as Array<{ name: string }>
    const chaptersColumns = chaptersTableInfo.map(col => col.name)

    if (chaptersColumns.length > 0 && !chaptersColumns.includes('description')) {
      console.log('迁移: 添加 chapters 表的 description 列')
      await database.exec('ALTER TABLE chapters ADD COLUMN description TEXT')
      console.log('迁移: chapters 表 description 列添加完成')
    }
  } catch {
    console.log('迁移检查跳过 (chapters 表可能不存在)')
  }

  // 检查 review_reports 表是否有 novel_id 列
  try {
    const tableInfo = await database.all("PRAGMA table_info(review_reports)") as Array<{ name: string }>
    const columns = tableInfo.map(col => col.name)
    
    // 如果 review_reports 表存在但没有 novel_id 列，需要重建表
    if (columns.length > 0 && !columns.includes('novel_id')) {
      console.log('迁移: 重建 review_reports 表以添加 novel_id 列')
      
      // 删除旧表
      await database.exec('DROP TABLE IF EXISTS review_reports')
      
      // 重新创建表
      await database.exec(`
        CREATE TABLE review_reports (
          id TEXT PRIMARY KEY,
          novel_id TEXT NOT NULL,
          word_count INTEGER NOT NULL,
          consistency_score INTEGER NOT NULL,
          character_consistency TEXT NOT NULL,
          plot_consistency TEXT NOT NULL,
          style_consistency TEXT NOT NULL,
          pacing TEXT NOT NULL,
          suggestions TEXT NOT NULL,
          created_at TEXT NOT NULL,
          FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE
        )
      `)
      
      console.log('迁移: review_reports 表重建完成')
    }
  } catch {
    console.log('迁移检查跳过 (表可能不存在)')
  }

  // 检查 quality_results 表是否有 novel_id 列
  try {
    const tableInfo = await database.all("PRAGMA table_info(quality_results)") as Array<{ name: string }>
    const columns = tableInfo.map(col => col.name)
    
    // 如果 quality_results 表存在但没有 novel_id 列，需要重建表
    if (columns.length > 0 && !columns.includes('novel_id')) {
      console.log('迁移: 重建 quality_results 表以添加 novel_id 列')
      
      // 删除旧表
      await database.exec('DROP TABLE IF EXISTS quality_results')
      
      // 重新创建表
      await database.exec(`
        CREATE TABLE quality_results (
          id TEXT PRIMARY KEY,
          novel_id TEXT NOT NULL,
          type TEXT NOT NULL,
          original_content TEXT,
          improved_content TEXT,
          suggestions TEXT,
          issues TEXT,
          score INTEGER,
          created_at TEXT NOT NULL,
          FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE
        )
      `)
      
      console.log('迁移: quality_results 表重建完成')
    }
  } catch {
    console.log('迁移检查跳过 (quality_results 表可能不存在)')
  }

  // 检查 styles 表是否是新版本结构
  try {
    const stylesTableInfo = await database.all("PRAGMA table_info(styles)") as Array<{ name: string }>
    const stylesColumns = stylesTableInfo.map(col => col.name)
    
    // 如果 styles 表存在但没有 genre 列，需要重建表
    if (stylesColumns.length > 0 && !stylesColumns.includes('genre')) {
      console.log('迁移: 重建 styles 表以更新结构')
      
      // 删除旧表
      await database.exec('DROP TABLE IF EXISTS styles')
      
      console.log('迁移: styles 表重建完成')
    }
  } catch {
    console.log('迁移检查跳过 (styles 表可能不存在)')
  }
}

export const initDatabase = async () => {
  const database = await getDatabase()

  // 创建小说表
  await database.exec(`
    CREATE TABLE IF NOT EXISTS novels (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      type TEXT DEFAULT 'general',
      status TEXT DEFAULT 'draft',
      prompt TEXT NOT NULL,
      content TEXT,
      outline TEXT,
      structuredOutline TEXT,
      description TEXT,
      style TEXT DEFAULT 'fantasy',
      styleConfig TEXT,
      word_count INTEGER DEFAULT 0,
      target_word_count INTEGER DEFAULT 10000,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `)

  // 创建设置表
  await database.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      value TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    )
  `)

  // 创建章节表
  await database.exec(`
    CREATE TABLE IF NOT EXISTS chapters (
      id TEXT PRIMARY KEY,
      novel_id TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT,
      order_index INTEGER NOT NULL,
      word_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE
    )
  `)

  // 创建回顾分析报告表
  await database.exec(`
    CREATE TABLE IF NOT EXISTS review_reports (
      id TEXT PRIMARY KEY,
      novel_id TEXT NOT NULL,
      word_count INTEGER NOT NULL,
      consistency_score INTEGER NOT NULL,
      character_consistency TEXT NOT NULL,
      plot_consistency TEXT NOT NULL,
      style_consistency TEXT NOT NULL,
      pacing TEXT NOT NULL,
      suggestions TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE
    )
  `)

  // 数据库迁移：检查并添加缺失的列
  await runMigrations(database)

  // 创建质量提升任务表
  await database.exec(`
    CREATE TABLE IF NOT EXISTS quality_tasks (
      id TEXT PRIMARY KEY,
      novel_id TEXT NOT NULL,
      type TEXT NOT NULL,
      status TEXT NOT NULL,
      progress INTEGER NOT NULL,
      result TEXT,
      error TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE
    )
  `)

  // 创建生成任务表
  await database.exec(`
    CREATE TABLE IF NOT EXISTS generate_tasks (
      id TEXT PRIMARY KEY,
      novel_id TEXT,
      status TEXT NOT NULL,
      progress INTEGER NOT NULL DEFAULT 0,
      current_chapter INTEGER,
      total_chapters INTEGER,
      message TEXT,
      error TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `)

  // 创建质量提升结果表
  await database.exec(`
    CREATE TABLE IF NOT EXISTS quality_results (
      id TEXT PRIMARY KEY,
      novel_id TEXT NOT NULL,
      type TEXT NOT NULL,
      original_content TEXT,
      improved_content TEXT,
      suggestions TEXT,
      issues TEXT,
      score INTEGER,
      created_at TEXT NOT NULL,
      FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE
    )
  `)

  // 创建角色表
  await database.exec(`
    CREATE TABLE IF NOT EXISTS characters (
      id TEXT PRIMARY KEY,
      novel_id TEXT NOT NULL,
      name TEXT NOT NULL,
      age INTEGER NOT NULL,
      gender TEXT NOT NULL,
      personality TEXT,
      background TEXT,
      appearance TEXT,
      goals TEXT,
      fears TEXT,
      skills TEXT,
      relationships TEXT,
      role TEXT,
      importance TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE
    )
  `)

  // 创建关系表
  await database.exec(`
    CREATE TABLE IF NOT EXISTS relationships (
      id TEXT PRIMARY KEY,
      novel_id TEXT NOT NULL,
      character1_id TEXT NOT NULL,
      character2_id TEXT NOT NULL,
      type TEXT NOT NULL,
      description TEXT,
      strength INTEGER,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE
    )
  `)

  // 创建世界观表
  await database.exec(`
    CREATE TABLE IF NOT EXISTS worldviews (
      id TEXT PRIMARY KEY,
      novel_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      setting TEXT,
      rules TEXT,
      factions TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE
    )
  `)

  // 创建章节版本表
  await database.exec(`
    CREATE TABLE IF NOT EXISTS chapter_versions (
      id TEXT PRIMARY KEY,
      chapter_id TEXT NOT NULL,
      content TEXT NOT NULL,
      version INTEGER NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL,
      created_by TEXT,
      FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
    )
  `)

  // 创建一致性检查表
  await database.exec(`
    CREATE TABLE IF NOT EXISTS consistency_checks (
      id TEXT PRIMARY KEY,
      novel_id TEXT NOT NULL,
      chapter_id TEXT,
      check_type TEXT NOT NULL,
      result TEXT NOT NULL,
      issues TEXT,
      score INTEGER,
      created_at TEXT NOT NULL,
      FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE,
      FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
    )
  `)

  // 创建审核标准表
  await database.exec(`
    CREATE TABLE IF NOT EXISTS review_criteria (
      id TEXT PRIMARY KEY,
      novel_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      type TEXT NOT NULL,
      threshold INTEGER,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE
    )
  `)

  // 创建风格表
  await database.exec(`
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

  // 创建写作模板表
  await database.exec(`
    CREATE TABLE IF NOT EXISTS writing_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      type TEXT NOT NULL,
      structure TEXT,
      guidelines TEXT,
      is_default INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `)

  // 创建模板表（用于设置服务中的模板管理）
  await database.exec(`
    CREATE TABLE IF NOT EXISTS templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `)

  console.log('数据库初始化完成')
}

export const closeDatabase = async () => {
  if (db) {
    await db.close()
    db = null
  }
}
