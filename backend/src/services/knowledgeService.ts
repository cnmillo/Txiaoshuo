import { v4 as uuidv4 } from 'uuid'
import { query, queryOne, run } from '../database/index.js'
import logger from '../utils/logger.js'

// 世界观设定接口
export interface WorldviewSetting {
  time: string
  location: string
  technologyLevel: string
  magicSystem?: string
  socialStructure: string
  keyElements: string[]
}

// 派系接口
export interface Faction {
  id: string
  name: string
  description: string
  leader?: string
  goals: string[]
  allies: string[]
  enemies: string[]
}

// 世界观接口
export interface Worldview {
  id: string
  novelId?: string
  name: string
  description: string
  setting: WorldviewSetting
  rules: string[]
  factions: Faction[]
  createdAt: string
  updatedAt: string
}

// 知识库绑定接口
export interface KnowledgeBinding {
  id: string
  novelId: string
  worldviewId: string
  bindingType: 'full' | 'partial'
  selectedElements: string[]
  createdAt: string
}

// 拆书分析数据接口
export interface AnalysisData {
  title: string
  author?: string
  genre?: string
  summary?: string
  characters?: unknown[]
  worldview?: unknown
  plotStructure?: unknown
  styleAnalysis?: unknown
  keyElements?: unknown[]
}

// 搜索结果接口
export interface SearchResult {
  type: 'character' | 'worldview' | 'plot' | 'style' | 'element'
  id: string
  title: string
  content: string
  relevance: number
  source: string
}

// 数据库世界观记录
interface DatabaseWorldview {
  id: string
  novel_id: string | null
  name: string
  description: string
  setting: string // JSON string
  rules: string // JSON string
  factions: string // JSON string
  created_at: string
  updated_at: string
}

// 数据库绑定记录
interface DatabaseBinding {
  id: string
  novel_id: string
  worldview_id: string
  binding_type: string
  selected_elements: string // JSON string
  created_at: string
}

// 绑定世界观参数
interface BindWorldviewParams {
  novelId: string
  worldviewId: string
  bindingType: 'full' | 'partial'
  selectedElements?: string[]
}

// 解绑世界观参数
interface UnbindWorldviewParams {
  novelId: string
  worldviewId: string
}

// 搜索参数
interface SearchParams {
  query: string
  novelId?: string
  worldviewId?: string
  searchType: 'all' | 'characters' | 'worldview' | 'plot' | 'style'
  limit: number
}

// 导入分析参数
interface ImportAnalysisParams {
  novelId: string
  analysisData: AnalysisData
}

// 列表参数
interface ListParams {
  page: number
  limit: number
  search?: string
}

/**
 * 知识库服务
 */
export const knowledgeService = {
  /**
   * 初始化知识库表
   */
  async initKnowledgeTables(): Promise<void> {
    // 创建世界观表（如果不存在）
    await run(`
      CREATE TABLE IF NOT EXISTS worldviews (
        id TEXT PRIMARY KEY,
        novel_id TEXT,
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

    // 创建知识库绑定表
    await run(`
      CREATE TABLE IF NOT EXISTS knowledge_bindings (
        id TEXT PRIMARY KEY,
        novel_id TEXT NOT NULL,
        worldview_id TEXT NOT NULL,
        binding_type TEXT NOT NULL,
        selected_elements TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE,
        FOREIGN KEY (worldview_id) REFERENCES worldviews(id) ON DELETE CASCADE
      )
    `)

    // 创建知识库索引
    await run(`
      CREATE INDEX IF NOT EXISTS idx_knowledge_bindings_novel 
      ON knowledge_bindings(novel_id)
    `)

    await run(`
      CREATE INDEX IF NOT EXISTS idx_knowledge_bindings_worldview 
      ON knowledge_bindings(worldview_id)
    `)

    // 创建拆书分析结果表
    await run(`
      CREATE TABLE IF NOT EXISTS book_analyses (
        id TEXT PRIMARY KEY,
        novel_id TEXT NOT NULL,
        title TEXT NOT NULL,
        author TEXT,
        genre TEXT,
        summary TEXT,
        characters TEXT,
        worldview TEXT,
        plot_structure TEXT,
        style_analysis TEXT,
        key_elements TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE
      )
    `)

    logger.info('知识库表初始化完成')
  },

  /**
   * 绑定世界观
   */
  async bindWorldview(params: BindWorldviewParams): Promise<KnowledgeBinding> {
    const { novelId, worldviewId, bindingType, selectedElements } = params

    // 检查是否已绑定
    const existing = await queryOne<DatabaseBinding>(
      'SELECT * FROM knowledge_bindings WHERE novel_id = ? AND worldview_id = ?',
      [novelId, worldviewId]
    )

    if (existing) {
      // 更新绑定
      await run(
        `UPDATE knowledge_bindings 
         SET binding_type = ?, selected_elements = ?
         WHERE novel_id = ? AND worldview_id = ?`,
        [bindingType, JSON.stringify(selectedElements || []), novelId, worldviewId]
      )

      return {
        id: existing.id,
        novelId: existing.novel_id,
        worldviewId: existing.worldview_id,
        bindingType: existing.binding_type as 'full' | 'partial',
        selectedElements: JSON.parse(existing.selected_elements || '[]'),
        createdAt: existing.created_at
      }
    }

    // 创建新绑定
    const bindingId = uuidv4()
    const now = new Date().toISOString()

    await run(
      `INSERT INTO knowledge_bindings (id, novel_id, worldview_id, binding_type, selected_elements, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [bindingId, novelId, worldviewId, bindingType, JSON.stringify(selectedElements || []), now]
    )

    return {
      id: bindingId,
      novelId,
      worldviewId,
      bindingType,
      selectedElements: selectedElements || [],
      createdAt: now
    }
  },

  /**
   * 解绑世界观
   */
  async unbindWorldview(params: UnbindWorldviewParams): Promise<boolean> {
    const { novelId, worldviewId } = params

    const result = await run(
      'DELETE FROM knowledge_bindings WHERE novel_id = ? AND worldview_id = ?',
      [novelId, worldviewId]
    )

    return result.changes > 0
  },

  /**
   * 搜索知识库
   */
  async searchKnowledge(params: SearchParams): Promise<{
    results: SearchResult[]
    total: number
  }> {
    const { query: searchQuery, novelId, worldviewId, searchType, limit } = params
    const results: SearchResult[] = []
    const searchLower = searchQuery.toLowerCase()

    // 搜索角色
    if (searchType === 'all' || searchType === 'characters') {
      let characterQuery = `
        SELECT c.id, c.name, c.personality, c.background, n.title as novel_title
        FROM characters c
        LEFT JOIN novels n ON c.novel_id = n.id
        WHERE (c.name LIKE ? OR c.personality LIKE ? OR c.background LIKE ?)
      `
      const queryParams: unknown[] = [`%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`]

      if (novelId) {
        characterQuery += ' AND c.novel_id = ?'
        queryParams.push(novelId)
      }

      const characters = await query<{
        id: string
        name: string
        personality: string
        background: string
        novel_title: string
      }>(characterQuery, queryParams)

      characters.forEach(char => {
        const relevance = this.calculateRelevance(searchLower, [char.name, char.personality, char.background])
        results.push({
          type: 'character',
          id: char.id,
          title: char.name,
          content: `${char.personality} ${char.background}`,
          relevance,
          source: char.novel_title || '未知来源'
        })
      })
    }

    // 搜索世界观
    if (searchType === 'all' || searchType === 'worldview') {
      let worldviewQuery = `
        SELECT w.id, w.name, w.description, w.setting, w.rules
        FROM worldviews w
        WHERE (w.name LIKE ? OR w.description LIKE ?)
      `
      const queryParams: unknown[] = [`%${searchQuery}%`, `%${searchQuery}%`]

      if (worldviewId) {
        worldviewQuery += ' AND w.id = ?'
        queryParams.push(worldviewId)
      }

      const worldviews = await query<{
        id: string
        name: string
        description: string
        setting: string
        rules: string
      }>(worldviewQuery, queryParams)

      worldviews.forEach(wv => {
        const setting = JSON.parse(wv.setting || '{}')
        const rules = JSON.parse(wv.rules || '[]')
        const content = `${wv.description} ${JSON.stringify(setting)} ${rules.join(' ')}`
        const relevance = this.calculateRelevance(searchLower, [wv.name, wv.description, content])

        results.push({
          type: 'worldview',
          id: wv.id,
          title: wv.name,
          content: wv.description,
          relevance,
          source: '世界观库'
        })
      })
    }

    // 搜索小说内容（情节）
    if (searchType === 'all' || searchType === 'plot') {
      let novelQuery = `
        SELECT n.id, n.title, n.outline, n.description
        FROM novels n
        WHERE (n.title LIKE ? OR n.outline LIKE ? OR n.description LIKE ?)
      `
      const queryParams: unknown[] = [`%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`]

      if (novelId) {
        novelQuery += ' AND n.id = ?'
        queryParams.push(novelId)
      }

      const novels = await query<{
        id: string
        title: string
        outline: string | null
        description: string | null
      }>(novelQuery, queryParams)

      novels.forEach(novel => {
        const content = `${novel.outline || ''} ${novel.description || ''}`
        const relevance = this.calculateRelevance(searchLower, [novel.title, content])

        results.push({
          type: 'plot',
          id: novel.id,
          title: novel.title,
          content: content.substring(0, 500),
          relevance,
          source: novel.title
        })
      })
    }

    // 按相关性排序并限制数量
    results.sort((a, b) => b.relevance - a.relevance)
    const limitedResults = results.slice(0, limit)

    return {
      results: limitedResults,
      total: results.length
    }
  },

  /**
   * 计算相关性分数
   */
  calculateRelevance(searchQuery: string, contents: string[]): number {
    let score = 0
    contents.forEach(content => {
      if (!content) return
      const contentLower = content.toLowerCase()
      if (contentLower.includes(searchQuery)) {
        score += 10
        // 完全匹配加分
        if (contentLower === searchQuery) {
          score += 20
        }
        // 标题开头匹配加分
        if (contentLower.startsWith(searchQuery)) {
          score += 15
        }
      }
    })
    return score
  },

  /**
   * 导入拆书结果
   */
  async importAnalysis(params: ImportAnalysisParams): Promise<{
    analysisId: string
    importedElements: {
      characters: number
      worldview: boolean
      plotStructure: boolean
      styleAnalysis: boolean
    }
  }> {
    const { novelId, analysisData } = params
    const analysisId = uuidv4()
    const now = new Date().toISOString()

    // 保存分析结果
    await run(
      `INSERT INTO book_analyses 
       (id, novel_id, title, author, genre, summary, characters, worldview, plot_structure, style_analysis, key_elements, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        analysisId,
        novelId,
        analysisData.title,
        analysisData.author || null,
        analysisData.genre || null,
        analysisData.summary || null,
        JSON.stringify(analysisData.characters || []),
        JSON.stringify(analysisData.worldview || {}),
        JSON.stringify(analysisData.plotStructure || {}),
        JSON.stringify(analysisData.styleAnalysis || {}),
        JSON.stringify(analysisData.keyElements || []),
        now,
        now
      ]
    )

    // 导入角色
    let importedCharacters = 0
    if (analysisData.characters && Array.isArray(analysisData.characters)) {
      for (const char of analysisData.characters) {
        const charData = char as Record<string, unknown>
        const charId = uuidv4()
        await run(
          `INSERT INTO characters 
           (id, novel_id, name, age, gender, personality, background, appearance, goals, fears, skills, role, importance, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            charId,
            novelId,
            charData.name || '未命名角色',
            charData.age || 20,
            charData.gender || 'male',
            charData.personality || '',
            charData.background || '',
            charData.appearance || '',
            JSON.stringify(charData.goals || []),
            JSON.stringify(charData.fears || []),
            JSON.stringify(charData.skills || []),
            charData.role || '配角',
            charData.importance || 'supporting',
            now,
            now
          ]
        )
        importedCharacters++
      }
    }

    // 导入世界观
    let importedWorldview = false
    if (analysisData.worldview) {
      const wvData = analysisData.worldview as Record<string, unknown>
      const worldviewId = uuidv4()
      await run(
        `INSERT INTO worldviews 
         (id, novel_id, name, description, setting, rules, factions, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          worldviewId,
          novelId,
          (wvData.name as string) || '导入的世界观',
          (wvData.description as string) || '',
          JSON.stringify(wvData.setting || {}),
          JSON.stringify(wvData.rules || []),
          JSON.stringify(wvData.factions || []),
          now,
          now
        ]
      )
      importedWorldview = true
    }

    return {
      analysisId,
      importedElements: {
        characters: importedCharacters,
        worldview: importedWorldview,
        plotStructure: !!analysisData.plotStructure,
        styleAnalysis: !!analysisData.styleAnalysis
      }
    }
  },

  /**
   * 获取小说关联的知识库
   */
  async getNovelKnowledge(novelId: string): Promise<{
    worldviews: Worldview[]
    bindings: KnowledgeBinding[]
  }> {
    // 获取绑定的世界观
    const bindings = await query<DatabaseBinding>(
      'SELECT * FROM knowledge_bindings WHERE novel_id = ?',
      [novelId]
    )

    const worldviewIds = bindings.map(b => b.worldview_id)

    let worldviews: Worldview[] = []
    if (worldviewIds.length > 0) {
      const placeholders = worldviewIds.map(() => '?').join(',')
      const dbWorldviews = await query<DatabaseWorldview>(
        `SELECT * FROM worldviews WHERE id IN (${placeholders})`,
        worldviewIds
      )

      worldviews = dbWorldviews.map(wv => this.mapDatabaseToWorldview(wv))
    }

    return {
      worldviews,
      bindings: bindings.map(b => ({
        id: b.id,
        novelId: b.novel_id,
        worldviewId: b.worldview_id,
        bindingType: b.binding_type as 'full' | 'partial',
        selectedElements: JSON.parse(b.selected_elements || '[]'),
        createdAt: b.created_at
      }))
    }
  },

  /**
   * 获取世界观详情
   */
  async getWorldview(worldviewId: string): Promise<Worldview | null> {
    const dbWorldview = await queryOne<DatabaseWorldview>(
      'SELECT * FROM worldviews WHERE id = ?',
      [worldviewId]
    )

    if (!dbWorldview) {
      return null
    }

    return this.mapDatabaseToWorldview(dbWorldview)
  },

  /**
   * 创建世界观
   */
  async createWorldview(params: {
    name: string
    description?: string
    setting?: WorldviewSetting
    rules?: string[]
    factions?: Faction[]
  }): Promise<Worldview> {
    const { name, description, setting, rules, factions } = params
    const worldviewId = uuidv4()
    const now = new Date().toISOString()

    const defaultSetting: WorldviewSetting = {
      time: '现代',
      location: '地球',
      technologyLevel: '现代科技',
      socialStructure: '现代社会',
      keyElements: []
    }

    await run(
      `INSERT INTO worldviews 
       (id, name, description, setting, rules, factions, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        worldviewId,
        name,
        description || '',
        JSON.stringify(setting || defaultSetting),
        JSON.stringify(rules || []),
        JSON.stringify(factions || []),
        now,
        now
      ]
    )

    return {
      id: worldviewId,
      name,
      description: description || '',
      setting: setting || defaultSetting,
      rules: rules || [],
      factions: factions || [],
      createdAt: now,
      updatedAt: now
    }
  },

  /**
   * 更新世界观
   */
  async updateWorldview(
    worldviewId: string,
    params: {
      name?: string
      description?: string
      setting?: WorldviewSetting
      rules?: string[]
      factions?: Faction[]
    }
  ): Promise<Worldview> {
    const existing = await this.getWorldview(worldviewId)

    if (!existing) {
      throw new Error(`世界观不存在: ${worldviewId}`)
    }

    const now = new Date().toISOString()
    const updated = {
      name: params.name || existing.name,
      description: params.description ?? existing.description,
      setting: params.setting || existing.setting,
      rules: params.rules || existing.rules,
      factions: params.factions || existing.factions
    }

    await run(
      `UPDATE worldviews 
       SET name = ?, description = ?, setting = ?, rules = ?, factions = ?, updated_at = ?
       WHERE id = ?`,
      [
        updated.name,
        updated.description,
        JSON.stringify(updated.setting),
        JSON.stringify(updated.rules),
        JSON.stringify(updated.factions),
        now,
        worldviewId
      ]
    )

    return {
      ...existing,
      ...updated,
      updatedAt: now
    }
  },

  /**
   * 删除世界观
   */
  async deleteWorldview(worldviewId: string): Promise<boolean> {
    // 先删除绑定关系
    await run('DELETE FROM knowledge_bindings WHERE worldview_id = ?', [worldviewId])

    // 删除世界观
    const result = await run('DELETE FROM worldviews WHERE id = ?', [worldviewId])

    return result.changes > 0
  },

  /**
   * 获取世界观列表
   */
  async listWorldviews(params: ListParams): Promise<{
    data: Worldview[]
    total: number
    page: number
    limit: number
  }> {
    const { page, limit, search } = params
    const offset = (page - 1) * limit

    let whereClause = ''
    const queryParams: unknown[] = []

    if (search) {
      whereClause = 'WHERE name LIKE ? OR description LIKE ?'
      queryParams.push(`%${search}%`, `%${search}%`)
    }

    // 获取总数
    const countResult = await queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM worldviews ${whereClause}`,
      queryParams
    )
    const total = countResult?.count || 0

    // 获取列表
    const dbWorldviews = await query<DatabaseWorldview>(
      `SELECT * FROM worldviews ${whereClause} ORDER BY updated_at DESC LIMIT ? OFFSET ?`,
      [...queryParams, limit, offset]
    )

    return {
      data: dbWorldviews.map(wv => this.mapDatabaseToWorldview(wv)),
      total,
      page,
      limit
    }
  },

  /**
   * 数据库记录映射到世界观对象
   */
  mapDatabaseToWorldview(db: DatabaseWorldview): Worldview {
    return {
      id: db.id,
      novelId: db.novel_id || undefined,
      name: db.name,
      description: db.description || '',
      setting: JSON.parse(db.setting || '{}'),
      rules: JSON.parse(db.rules || '[]'),
      factions: JSON.parse(db.factions || '[]'),
      createdAt: db.created_at,
      updatedAt: db.updated_at
    }
  }
}

export default knowledgeService
