import { run, query, queryOne } from '../database/index.js'
import { v4 as uuidv4 } from 'uuid'
import { characterService } from './characterService.js'

interface ConsistencyCheck {
  id: string
  novelId: string
  chapterId?: string
  checkType: string
  result: string
  issues: string
  score: number
  createdAt: string
}

interface DatabaseConsistencyCheck {
  id: string
  novel_id: string
  chapter_id: string | null
  check_type: string
  result: string
  issues: string | null
  score: number
  created_at: string
}

interface ReviewCriteria {
  id: string
  novelId: string
  name: string
  description?: string
  type: string
  threshold: number
  createdAt: string
  updatedAt: string
}

interface DatabaseReviewCriteria {
  id: string
  novel_id: string
  name: string
  description: string | null
  type: string
  threshold: number
  created_at: string
  updated_at: string
}

function mapCheckToResponse(check: DatabaseConsistencyCheck): ConsistencyCheck {
  return {
    id: check.id,
    novelId: check.novel_id,
    chapterId: check.chapter_id || undefined,
    checkType: check.check_type,
    result: check.result,
    issues: check.issues || '',
    score: check.score,
    createdAt: check.created_at
  }
}

function mapCriteriaToResponse(criteria: DatabaseReviewCriteria): ReviewCriteria {
  return {
    id: criteria.id,
    novelId: criteria.novel_id,
    name: criteria.name,
    description: criteria.description || undefined,
    type: criteria.type,
    threshold: criteria.threshold,
    createdAt: criteria.created_at,
    updatedAt: criteria.updated_at
  }
}

export const consistencyService = {
  // 执行一致性检查
  runConsistencyCheck: async (novelId: string, chapterId?: string, checkType: string = 'full'): Promise<ConsistencyCheck> => {
    const id = uuidv4()
    const now = new Date().toISOString()
    
    // 获取小说的角色信息
    const characters = await characterService.getCharactersByNovelId(novelId)
    const worldview = await characterService.getWorldviewByNovelId(novelId)
    
    // 模拟一致性检查逻辑
    const issues: string[] = []
    let score = 100
    
    // 检查角色一致性
    if (characters.length > 0) {
      // 这里可以添加更复杂的角色一致性检查逻辑
      if (characters.some(char => char.age < 0 || char.age > 150)) {
        issues.push('角色年龄不合理')
        score -= 10
      }
    }
    
    // 检查世界观一致性
    if (worldview) {
      // 这里可以添加更复杂的世界观一致性检查逻辑
      if (!worldview.setting?.time || !worldview.setting?.location) {
        issues.push('世界观设定不完整')
        score -= 15
      }
    }
    
    // 生成检查结果
    const result = issues.length > 0 ? '存在一致性问题' : '内容一致'
    
    await run(
      `INSERT INTO consistency_checks (id, novel_id, chapter_id, check_type, result, issues, score, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, novelId, chapterId || null, checkType, result, JSON.stringify(issues), score, now]
    )
    
    return {
      id,
      novelId,
      chapterId,
      checkType,
      result,
      issues: JSON.stringify(issues),
      score,
      createdAt: now
    }
  },
  
  // 获取一致性检查历史
  getConsistencyChecks: async (novelId: string, chapterId?: string): Promise<ConsistencyCheck[]> => {
    let sql = `SELECT * FROM consistency_checks WHERE novel_id = ?`
    const params: (string | null)[] = [novelId]
    
    if (chapterId) {
      sql += ` AND chapter_id = ?`
      params.push(chapterId)
    }
    
    sql += ` ORDER BY created_at DESC`
    
    const checks = await query<DatabaseConsistencyCheck>(sql, params)
    return checks.map(mapCheckToResponse)
  },
  
  // 获取最新的一致性检查结果
  getLatestConsistencyCheck: async (novelId: string, chapterId?: string): Promise<ConsistencyCheck | undefined> => {
    let sql = `SELECT * FROM consistency_checks WHERE novel_id = ?`
    const params: (string | null)[] = [novelId]
    
    if (chapterId) {
      sql += ` AND chapter_id = ?`
      params.push(chapterId)
    }
    
    sql += ` ORDER BY created_at DESC LIMIT 1`
    
    const check = await queryOne<DatabaseConsistencyCheck>(sql, params)
    return check ? mapCheckToResponse(check) : undefined
  },
  
  // 创建审核标准
  createReviewCriteria: async (novelId: string, name: string, description: string, type: string, threshold: number): Promise<ReviewCriteria> => {
    const id = uuidv4()
    const now = new Date().toISOString()
    
    await run(
      `INSERT INTO review_criteria (id, novel_id, name, description, type, threshold, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, novelId, name, description, type, threshold, now, now]
    )
    
    return {
      id,
      novelId,
      name,
      description,
      type,
      threshold,
      createdAt: now,
      updatedAt: now
    }
  },
  
  // 获取小说的审核标准
  getReviewCriteriaByNovelId: async (novelId: string): Promise<ReviewCriteria[]> => {
    const criteria = await query<DatabaseReviewCriteria>(`SELECT * FROM review_criteria WHERE novel_id = ?`, [novelId])
    return criteria.map(mapCriteriaToResponse)
  },
  
  // 更新审核标准
  updateReviewCriteria: async (id: string, criteria: Partial<{ name: string, description: string, type: string, threshold: number }>): Promise<ReviewCriteria | undefined> => {
    const now = new Date().toISOString()
    const existingCriteria = await queryOne<DatabaseReviewCriteria>(`SELECT * FROM review_criteria WHERE id = ?`, [id])
    if (!existingCriteria) return undefined
    
    const updatedCriteria = {
      ...existingCriteria,
      ...criteria,
      updated_at: now
    }
    
    await run(
      `UPDATE review_criteria SET name = ?, description = ?, type = ?, threshold = ?, updated_at = ? WHERE id = ?`,
      [updatedCriteria.name, updatedCriteria.description, updatedCriteria.type, updatedCriteria.threshold, now, id]
    )
    
    return mapCriteriaToResponse(updatedCriteria)
  },
  
  // 删除审核标准
  deleteReviewCriteria: async (id: string): Promise<boolean> => {
    const result = await run(`DELETE FROM review_criteria WHERE id = ?`, [id])
    return result.changes !== undefined && result.changes > 0
  }
}
