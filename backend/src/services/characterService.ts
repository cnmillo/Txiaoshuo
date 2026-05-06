import { run, query, queryOne } from '../database/index.js'
import type { Character, Relationship, Worldview, Faction } from '../types/index.js'
import { v4 as uuidv4 } from 'uuid'

// API 响应类型 - 使用 Partial 使可选字段真正可选
type CharacterWithTimestamps = {
  id: string
  novelId?: string
  name: string
  age: number
  gender: 'male' | 'female' | 'other'
  personality?: string
  background?: string
  appearance?: string
  goals: string[]
  fears: string[]
  skills: string[]
  relationships: string[]
  role?: string
  importance?: 'main' | 'supporting' | 'minor'
  createdAt?: string
  updatedAt?: string
}
type RelationshipWithTimestamps = {
  id: string
  novelId?: string
  character1Id: string
  character2Id: string
  type: 'family' | 'friend' | 'enemy' | 'lover' | 'colleague' | 'other'
  description?: string
  strength?: number
  createdAt?: string
  updatedAt?: string
}
type WorldviewWithTimestamps = {
  id: string
  novelId?: string
  name: string
  description?: string
  setting: {
    time: string
    location: string
    technologyLevel: string
    magicSystem?: string
    socialStructure: string
    keyElements: string[]
  }
  rules: string[]
  factions: Faction[]
  createdAt?: string
  updatedAt?: string
}

// 数据库类型
interface DatabaseCharacter {
  id: string
  novel_id: string
  name: string
  age: number
  gender: string
  personality: string | null
  background: string | null
  appearance: string | null
  goals: string
  fears: string
  skills: string
  relationships: string
  role: string | null
  importance: string | null
  created_at: string
  updated_at: string
}

interface DatabaseRelationship {
  id: string
  novel_id: string
  character1_id: string
  character2_id: string
  type: string
  description: string | null
  strength: number | null
  created_at: string
  updated_at: string
}

interface DatabaseWorldview {
  id: string
  novel_id: string
  name: string
  description: string | null
  setting: string
  rules: string
  factions: string
  created_at: string
  updated_at: string
}

function mapCharacterToResponse(char: DatabaseCharacter): CharacterWithTimestamps {
  return {
    id: char.id,
    novelId: char.novel_id,
    name: char.name,
    age: char.age,
    gender: char.gender as 'male' | 'female' | 'other',
    personality: char.personality || undefined,
    background: char.background || undefined,
    appearance: char.appearance || undefined,
    goals: JSON.parse(char.goals || '[]'),
    fears: JSON.parse(char.fears || '[]'),
    skills: JSON.parse(char.skills || '[]'),
    relationships: JSON.parse(char.relationships || '[]'),
    role: char.role || undefined,
    importance: (char.importance || undefined) as 'main' | 'supporting' | 'minor' | undefined,
    createdAt: char.created_at,
    updatedAt: char.updated_at
  }
}

function mapRelationshipToResponse(rel: DatabaseRelationship): RelationshipWithTimestamps {
  return {
    id: rel.id,
    novelId: rel.novel_id,
    character1Id: rel.character1_id,
    character2Id: rel.character2_id,
    type: rel.type as 'family' | 'friend' | 'enemy' | 'lover' | 'colleague' | 'other',
    description: rel.description || undefined,
    strength: rel.strength || undefined,
    createdAt: rel.created_at,
    updatedAt: rel.updated_at
  }
}

function mapWorldviewToResponse(wv: DatabaseWorldview): WorldviewWithTimestamps {
  return {
    id: wv.id,
    novelId: wv.novel_id,
    name: wv.name,
    description: wv.description || undefined,
    setting: JSON.parse(wv.setting || '{}'),
    rules: JSON.parse(wv.rules || '[]'),
    factions: JSON.parse(wv.factions || '[]'),
    createdAt: wv.created_at,
    updatedAt: wv.updated_at
  }
}

export const characterService = {
  // 创建角色
  createCharacter: async (novelId: string, character: Omit<Character, 'id'>): Promise<CharacterWithTimestamps> => {
    const id = uuidv4()
    const now = new Date().toISOString()
    
    await run(
      `INSERT INTO characters (id, novel_id, name, age, gender, personality, background, appearance, goals, fears, skills, relationships, role, importance, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, novelId, character.name, character.age, character.gender, character.personality || null, character.background || null, 
       character.appearance || null, JSON.stringify(character.goals), JSON.stringify(character.fears), 
       JSON.stringify(character.skills), JSON.stringify(character.relationships), 
       character.role || null, character.importance || null, now, now]
    )
    
    return {
      ...character,
      id,
      novelId,
      createdAt: now,
      updatedAt: now
    }
  },
  
  // 获取小说的所有角色
  getCharactersByNovelId: async (novelId: string): Promise<CharacterWithTimestamps[]> => {
    const characters = await query<DatabaseCharacter>(`SELECT * FROM characters WHERE novel_id = ? ORDER BY name`, [novelId])
    return characters.map(mapCharacterToResponse)
  },

  // 获取单个角色
  getCharacterById: async (id: string): Promise<CharacterWithTimestamps | undefined> => {
    const character = await queryOne<DatabaseCharacter>(`SELECT * FROM characters WHERE id = ?`, [id])
    if (!character) return undefined
    return mapCharacterToResponse(character)
  },
  
  // 更新角色
  updateCharacter: async (id: string, character: Partial<Character>): Promise<CharacterWithTimestamps | undefined> => {
    const now = new Date().toISOString()
    const existingCharacter = await characterService.getCharacterById(id)
    if (!existingCharacter) return undefined
    
    const updatedCharacter = {
      ...existingCharacter,
      ...character,
      updatedAt: now
    }
    
    await run(
      `UPDATE characters SET name = ?, age = ?, gender = ?, personality = ?, background = ?, appearance = ?, 
       goals = ?, fears = ?, skills = ?, relationships = ?, role = ?, importance = ?, updated_at = ? 
       WHERE id = ?`,
      [updatedCharacter.name, updatedCharacter.age, updatedCharacter.gender, updatedCharacter.personality || null, 
       updatedCharacter.background || null, updatedCharacter.appearance || null, JSON.stringify(updatedCharacter.goals), 
       JSON.stringify(updatedCharacter.fears), JSON.stringify(updatedCharacter.skills), 
       JSON.stringify(updatedCharacter.relationships), updatedCharacter.role || null, 
       updatedCharacter.importance || null, now, id]
    )
    
    return updatedCharacter
  },
  
  // 删除角色
  deleteCharacter: async (id: string): Promise<boolean> => {
    const result = await run(`DELETE FROM characters WHERE id = ?`, [id])
    return result.changes > 0
  },
  
  // 创建关系
  createRelationship: async (novelId: string, relationship: Omit<Relationship, 'id'>): Promise<RelationshipWithTimestamps> => {
    const id = uuidv4()
    const now = new Date().toISOString()
    
    await run(
      `INSERT INTO relationships (id, novel_id, character1_id, character2_id, type, description, strength, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, novelId, relationship.character1Id, relationship.character2Id, relationship.type, 
       relationship.description || null, relationship.strength || null, now, now]
    )
    
    return {
      ...relationship,
      id,
      novelId,
      createdAt: now,
      updatedAt: now
    }
  },
  
  // 获取小说的所有关系
  getRelationshipsByNovelId: async (novelId: string): Promise<RelationshipWithTimestamps[]> => {
    const relationships = await query<DatabaseRelationship>(`SELECT * FROM relationships WHERE novel_id = ?`, [novelId])
    return relationships.map(mapRelationshipToResponse)
  },
  
  // 创建世界观
  createWorldview: async (novelId: string, worldview: Omit<Worldview, 'id'>): Promise<WorldviewWithTimestamps> => {
    const id = uuidv4()
    const now = new Date().toISOString()
    
    await run(
      `INSERT INTO worldviews (id, novel_id, name, description, setting, rules, factions, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, novelId, worldview.name, worldview.description || null, JSON.stringify(worldview.setting), 
       JSON.stringify(worldview.rules), JSON.stringify(worldview.factions), now, now]
    )
    
    return {
      ...worldview,
      id,
      novelId,
      createdAt: now,
      updatedAt: now
    }
  },
  
  // 获取小说的世界观
  getWorldviewByNovelId: async (novelId: string): Promise<WorldviewWithTimestamps | undefined> => {
    const worldview = await queryOne<DatabaseWorldview>(`SELECT * FROM worldviews WHERE novel_id = ?`, [novelId])
    if (!worldview) return undefined
    return mapWorldviewToResponse(worldview)
  }
}
