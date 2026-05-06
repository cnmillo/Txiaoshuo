import { Router } from 'express'
import { sendSuccess, sendError, ErrorMessages, HttpStatus } from '../utils/response.js'
import { characterService } from '../services/characterService.js'
import { versionService } from '../services/versionService.js'
import { consistencyService } from '../services/consistencyService.js'
import logger from '../utils/logger.js'

const router = Router()

// 角色管理路由

/**
 * 创建角色
 * POST /api/consistency/characters
 */
router.post('/characters', (req, res) => {
  try {
    const { novelId, ...characterData } = req.body
    
    if (!novelId) {
      return sendError(res, '缺少小说ID', HttpStatus.BAD_REQUEST)
    }
    
    const character = characterService.createCharacter(novelId, characterData)
    sendSuccess(res, character)
  } catch (error) {
    logger.error('创建角色失败', error)
    sendError(res, ErrorMessages.INTERNAL_ERROR, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

/**
 * 获取小说的所有角色
 * GET /api/consistency/characters/:novelId
 */
router.get('/characters/:novelId', (req, res) => {
  try {
    const { novelId } = req.params
    const characters = characterService.getCharactersByNovelId(novelId)
    sendSuccess(res, characters)
  } catch (error) {
    logger.error('获取角色失败', error)
    sendError(res, ErrorMessages.INTERNAL_ERROR, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

/**
 * 获取单个角色
 * GET /api/consistency/character/:id
 */
router.get('/character/:id', (req, res) => {
  try {
    const { id } = req.params
    const character = characterService.getCharacterById(id)
    
    if (!character) {
      return sendError(res, '角色不存在', HttpStatus.NOT_FOUND)
    }
    
    sendSuccess(res, character)
  } catch (error) {
    logger.error('获取角色失败', error)
    sendError(res, ErrorMessages.INTERNAL_ERROR, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

/**
 * 更新角色
 * PUT /api/consistency/character/:id
 */
router.put('/character/:id', (req, res) => {
  try {
    const { id } = req.params
    const characterData = req.body
    
    const character = characterService.updateCharacter(id, characterData)
    
    if (!character) {
      return sendError(res, '角色不存在', HttpStatus.NOT_FOUND)
    }
    
    sendSuccess(res, character)
  } catch (error) {
    logger.error('更新角色失败', error)
    sendError(res, ErrorMessages.INTERNAL_ERROR, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

/**
 * 删除角色
 * DELETE /api/consistency/character/:id
 */
router.delete('/character/:id', (req, res) => {
  try {
    const { id } = req.params
    const success = characterService.deleteCharacter(id)
    
    if (!success) {
      return sendError(res, '角色不存在', HttpStatus.NOT_FOUND)
    }
    
    sendSuccess(res, { success: true })
  } catch (error) {
    logger.error('删除角色失败', error)
    sendError(res, ErrorMessages.INTERNAL_ERROR, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

// 关系管理路由

/**
 * 创建关系
 * POST /api/consistency/relationships
 */
router.post('/relationships', (req, res) => {
  try {
    const { novelId, ...relationshipData } = req.body
    
    if (!novelId) {
      return sendError(res, '缺少小说ID', HttpStatus.BAD_REQUEST)
    }
    
    const relationship = characterService.createRelationship(novelId, relationshipData)
    sendSuccess(res, relationship)
  } catch (error) {
    logger.error('创建关系失败', error)
    sendError(res, ErrorMessages.INTERNAL_ERROR, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

/**
 * 获取小说的所有关系
 * GET /api/consistency/relationships/:novelId
 */
router.get('/relationships/:novelId', (req, res) => {
  try {
    const { novelId } = req.params
    const relationships = characterService.getRelationshipsByNovelId(novelId)
    sendSuccess(res, relationships)
  } catch (error) {
    logger.error('获取关系失败', error)
    sendError(res, ErrorMessages.INTERNAL_ERROR, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

// 世界观管理路由

/**
 * 创建世界观
 * POST /api/consistency/worldview
 */
router.post('/worldview', (req, res) => {
  try {
    const { novelId, ...worldviewData } = req.body
    
    if (!novelId) {
      return sendError(res, '缺少小说ID', HttpStatus.BAD_REQUEST)
    }
    
    const worldview = characterService.createWorldview(novelId, worldviewData)
    sendSuccess(res, worldview)
  } catch (error) {
    logger.error('创建世界观失败', error)
    sendError(res, ErrorMessages.INTERNAL_ERROR, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

/**
 * 获取小说的世界观
 * GET /api/consistency/worldview/:novelId
 */
router.get('/worldview/:novelId', (req, res) => {
  try {
    const { novelId } = req.params
    const worldview = characterService.getWorldviewByNovelId(novelId)
    sendSuccess(res, worldview)
  } catch (error) {
    logger.error('获取世界观失败', error)
    sendError(res, ErrorMessages.INTERNAL_ERROR, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

// 版本控制路由

/**
 * 创建章节版本
 * POST /api/consistency/versions
 */
router.post('/versions', (req, res) => {
  try {
    const { chapterId, content, description, createdBy } = req.body
    
    if (!chapterId || !content) {
      return sendError(res, '缺少章节ID或内容', HttpStatus.BAD_REQUEST)
    }
    
    const version = versionService.createChapterVersion(chapterId, content, description, createdBy)
    sendSuccess(res, version)
  } catch (error) {
    logger.error('创建版本失败', error)
    sendError(res, ErrorMessages.INTERNAL_ERROR, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

/**
 * 获取章节的所有版本
 * GET /api/consistency/versions/:chapterId
 */
router.get('/versions/:chapterId', (req, res) => {
  try {
    const { chapterId } = req.params
    const versions = versionService.getChapterVersions(chapterId)
    sendSuccess(res, versions)
  } catch (error) {
    logger.error('获取版本失败', error)
    sendError(res, ErrorMessages.INTERNAL_ERROR, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

/**
 * 获取特定版本
 * GET /api/consistency/version/:id
 */
router.get('/version/:id', (req, res) => {
  try {
    const { id } = req.params
    const version = versionService.getChapterVersion(id)
    
    if (!version) {
      return sendError(res, '版本不存在', HttpStatus.NOT_FOUND)
    }
    
    sendSuccess(res, version)
  } catch (error) {
    logger.error('获取版本失败', error)
    sendError(res, ErrorMessages.INTERNAL_ERROR, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

// 一致性检查路由

/**
 * 执行一致性检查
 * POST /api/consistency/check
 */
router.post('/check', (req, res) => {
  try {
    const { novelId, chapterId, checkType } = req.body
    
    if (!novelId) {
      return sendError(res, '缺少小说ID', HttpStatus.BAD_REQUEST)
    }
    
    const checkResult = consistencyService.runConsistencyCheck(novelId, chapterId, checkType)
    sendSuccess(res, checkResult)
  } catch (error) {
    logger.error('执行一致性检查失败', error)
    sendError(res, ErrorMessages.INTERNAL_ERROR, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

/**
 * 获取一致性检查历史
 * GET /api/consistency/checks/:novelId
 */
router.get('/checks/:novelId', (req, res) => {
  try {
    const { novelId } = req.params
    const { chapterId } = req.query
    
    const checks = consistencyService.getConsistencyChecks(novelId, chapterId as string)
    sendSuccess(res, checks)
  } catch (error) {
    logger.error('获取一致性检查历史失败', error)
    sendError(res, ErrorMessages.INTERNAL_ERROR, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

// 审核标准路由

/**
 * 创建审核标准
 * POST /api/consistency/criteria
 */
router.post('/criteria', (req, res) => {
  try {
    const { novelId, name, description, type, threshold } = req.body
    
    if (!novelId || !name || !type) {
      return sendError(res, '缺少必要参数', HttpStatus.BAD_REQUEST)
    }
    
    const criteria = consistencyService.createReviewCriteria(novelId, name, description, type, threshold)
    sendSuccess(res, criteria)
  } catch (error) {
    logger.error('创建审核标准失败', error)
    sendError(res, ErrorMessages.INTERNAL_ERROR, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

/**
 * 获取小说的审核标准
 * GET /api/consistency/criteria/:novelId
 */
router.get('/criteria/:novelId', (req, res) => {
  try {
    const { novelId } = req.params
    const criteria = consistencyService.getReviewCriteriaByNovelId(novelId)
    sendSuccess(res, criteria)
  } catch (error) {
    logger.error('获取审核标准失败', error)
    sendError(res, ErrorMessages.INTERNAL_ERROR, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

/**
 * 更新审核标准
 * PUT /api/consistency/criteria/:id
 */
router.put('/criteria/:id', (req, res) => {
  try {
    const { id } = req.params
    const criteriaData = req.body
    
    const criteria = consistencyService.updateReviewCriteria(id, criteriaData)
    
    if (!criteria) {
      return sendError(res, '审核标准不存在', HttpStatus.NOT_FOUND)
    }
    
    sendSuccess(res, criteria)
  } catch (error) {
    logger.error('更新审核标准失败', error)
    sendError(res, ErrorMessages.INTERNAL_ERROR, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

/**
 * 删除审核标准
 * DELETE /api/consistency/criteria/:id
 */
router.delete('/criteria/:id', (req, res) => {
  try {
    const { id } = req.params
    const success = consistencyService.deleteReviewCriteria(id)
    
    if (!success) {
      return sendError(res, '审核标准不存在', HttpStatus.NOT_FOUND)
    }
    
    sendSuccess(res, { success: true })
  } catch (error) {
    logger.error('删除审核标准失败', error)
    sendError(res, ErrorMessages.INTERNAL_ERROR, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

export default router
