import { query, queryOne, run } from '../database/index.js'
import { v4 as uuidv4 } from 'uuid'
import logger from '../utils/logger.js'

export interface AIModelConfig {
  id: string
  name: string
  baseUrl: string
  apiKey: string
  modelId: string
  isActive: boolean
  testStatus: 'success' | 'failed' | 'pending'
  lastTestAt?: string
  latency?: number
  createdAt: string
  updatedAt: string
}

export interface CreateAIModelRequest {
  name: string
  baseUrl: string
  apiKey?: string
  modelId: string
}

export interface UpdateAIModelRequest {
  name?: string
  baseUrl?: string
  apiKey?: string
  modelId?: string
}

let isInitialized = false

export const aiModelService = {
  async initTable(): Promise<void> {
    if (isInitialized) return
    
    try {
      await run(`
        CREATE TABLE IF NOT EXISTS ai_models (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          baseUrl TEXT NOT NULL,
          apiKey TEXT DEFAULT '',
          modelId TEXT NOT NULL,
          isActive INTEGER DEFAULT 0,
          testStatus TEXT DEFAULT 'pending',
          lastTestAt TEXT,
          latency INTEGER,
          createdAt TEXT NOT NULL,
          updatedAt TEXT NOT NULL
        )
      `)
      isInitialized = true
      logger.info('AI模型表初始化完成')
    } catch (error) {
      logger.error('AI模型表初始化失败', error)
      throw error
    }
  },

  async getAll(): Promise<AIModelConfig[]> {
    await this.initTable()
    const rows = await query<{
      id: string
      name: string
      baseUrl: string
      apiKey: string
      modelId: string
      isActive: number
      testStatus: string
      lastTestAt: string | null
      latency: number | null
      createdAt: string
      updatedAt: string
    }>('SELECT * FROM ai_models ORDER BY createdAt DESC')

    return rows.map(row => ({
      id: row.id,
      name: row.name,
      baseUrl: row.baseUrl,
      apiKey: row.apiKey,
      modelId: row.modelId,
      isActive: row.isActive === 1,
      testStatus: row.testStatus as 'success' | 'failed' | 'pending',
      lastTestAt: row.lastTestAt || undefined,
      latency: row.latency || undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    }))
  },

  async getById(id: string): Promise<AIModelConfig | null> {
    await this.initTable()
    const row = await queryOne<{
      id: string
      name: string
      baseUrl: string
      apiKey: string
      modelId: string
      isActive: number
      testStatus: string
      lastTestAt: string | null
      latency: number | null
      createdAt: string
      updatedAt: string
    }>('SELECT * FROM ai_models WHERE id = ?', [id])

    if (!row) return null

    return {
      id: row.id,
      name: row.name,
      baseUrl: row.baseUrl,
      apiKey: row.apiKey,
      modelId: row.modelId,
      isActive: row.isActive === 1,
      testStatus: row.testStatus as 'success' | 'failed' | 'pending',
      lastTestAt: row.lastTestAt || undefined,
      latency: row.latency || undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    }
  },

  async create(data: CreateAIModelRequest): Promise<AIModelConfig> {
    await this.initTable()
    const now = new Date().toISOString()
    const id = uuidv4()

    await run(
      `INSERT INTO ai_models (id, name, baseUrl, apiKey, modelId, isActive, testStatus, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, 0, 'pending', ?, ?)`,
      [id, data.name, data.baseUrl, data.apiKey || '', data.modelId, now, now]
    )

    return {
      id,
      name: data.name,
      baseUrl: data.baseUrl,
      apiKey: data.apiKey || '',
      modelId: data.modelId,
      isActive: false,
      testStatus: 'pending',
      createdAt: now,
      updatedAt: now
    }
  },

  async update(id: string, data: UpdateAIModelRequest): Promise<AIModelConfig | null> {
    await this.initTable()
    const existing = await this.getById(id)
    if (!existing) return null

    const now = new Date().toISOString()
    const updates: string[] = []
    const values: (string | number)[] = []

    if (data.name !== undefined) {
      updates.push('name = ?')
      values.push(data.name)
    }
    if (data.baseUrl !== undefined) {
      updates.push('baseUrl = ?')
      values.push(data.baseUrl)
    }
    if (data.apiKey !== undefined) {
      updates.push('apiKey = ?')
      values.push(data.apiKey)
    }
    if (data.modelId !== undefined) {
      updates.push('modelId = ?')
      values.push(data.modelId)
    }

    if (updates.length > 0) {
      updates.push('updatedAt = ?')
      values.push(now)
      values.push(id)

      await run(
        `UPDATE ai_models SET ${updates.join(', ')} WHERE id = ?`,
        values
      )
    }

    return this.getById(id)
  },

  async delete(id: string): Promise<boolean> {
    await this.initTable()
    const result = await run('DELETE FROM ai_models WHERE id = ?', [id])
    return result.changes > 0
  },

  async updateTestStatus(id: string, status: 'success' | 'failed', latency?: number): Promise<void> {
    await this.initTable()
    const now = new Date().toISOString()
    
    if (latency !== undefined) {
      await run(
        'UPDATE ai_models SET testStatus = ?, lastTestAt = ?, latency = ?, updatedAt = ? WHERE id = ?',
        [status, now, latency, now, id]
      )
    } else {
      await run(
        'UPDATE ai_models SET testStatus = ?, lastTestAt = ?, updatedAt = ? WHERE id = ?',
        [status, now, now, id]
      )
    }
  },

  async setActive(id: string): Promise<void> {
    await this.initTable()
    const now = new Date().toISOString()
    
    await run('UPDATE ai_models SET isActive = 0, updatedAt = ? WHERE isActive = 1', [now])
    await run('UPDATE ai_models SET isActive = 1, updatedAt = ? WHERE id = ?', [now, id])
  },

  async getActive(): Promise<AIModelConfig | null> {
    await this.initTable()
    const row = await queryOne<{
      id: string
      name: string
      baseUrl: string
      apiKey: string
      modelId: string
      isActive: number
      testStatus: string
      lastTestAt: string | null
      latency: number | null
      createdAt: string
      updatedAt: string
    }>('SELECT * FROM ai_models WHERE isActive = 1 LIMIT 1')

    if (!row) return null

    return {
      id: row.id,
      name: row.name,
      baseUrl: row.baseUrl,
      apiKey: row.apiKey,
      modelId: row.modelId,
      isActive: row.isActive === 1,
      testStatus: row.testStatus as 'success' | 'failed' | 'pending',
      lastTestAt: row.lastTestAt || undefined,
      latency: row.latency || undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    }
  }
}
