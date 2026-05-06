import { Router, type Request, type Response } from 'express'
import { generateStoryPlanService, generateMacroPlanningService, generateCharacterCastService, generateInspirationService, generateProjectSettingService, generateVolumeStrategyService, generateRhythmBreakdownService, generateChapterContentService } from '../services/storyPlanService.js'
import { polishChapter, PolishIntensity, detectAIFeatures, generateStyleAudit } from '../services/contentPolishService.js'
import { sendSuccess, sendError, ErrorMessages, HttpStatus } from '../utils/response.js'
import logger from '../utils/logger.js'
import type { PolishMode } from '../types/index.js'

const router = Router()

/**
 * 生成故事规划
 * POST /api/story-plan
 */
router.post('/story-plan', async (req: Request, res: Response) => {
  try {
    const { title, prompt, genre, characterCount, plotPointCount } = req.body

    if (!title || !prompt || !genre) {
      sendError(res, ErrorMessages.INVALID_REQUEST, HttpStatus.BAD_REQUEST)
      return
    }

    const result = await generateStoryPlanService({
      title,
      prompt,
      genre,
      characterCount: characterCount || 3,
      plotPointCount: plotPointCount || 10
    })

    sendSuccess(res, result)
  } catch (error) {
    logger.error('生成故事规划失败', error)
    const errorMessage = error instanceof Error ? error.message : ErrorMessages.INTERNAL_ERROR
    sendError(res, errorMessage, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

/**
 * 生成故事宏观规划
 * POST /api/story-plan/macro-planning
 */
router.post('/story-plan/macro-planning', async (req: Request, res: Response) => {
  try {
    const { title, genre, coreSellingPoint, targetReaderFeeling, first30ChaptersPromise } = req.body

    if (!title || !genre || !coreSellingPoint) {
      sendError(res, '缺少必要参数', HttpStatus.BAD_REQUEST)
      return
    }

    const result = await generateMacroPlanningService({
      title,
      genre,
      coreSellingPoint,
      targetReaderFeeling: targetReaderFeeling || '',
      first30ChaptersPromise: first30ChaptersPromise || ''
    })

    sendSuccess(res, result)
  } catch (error) {
    logger.error('生成宏观规划失败', error)
    const errorMessage = error instanceof Error ? error.message : ErrorMessages.INTERNAL_ERROR
    sendError(res, errorMessage, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

/**
 * 保存宏观规划
 * POST /api/story-plan/macro-planning/save
 */
router.post('/story-plan/macro-planning/save', async (req: Request, res: Response) => {
  try {
    const { workflowId, overallDirection, coreConflict, theme, worldviewSummary, upgradeNodes, longTermPromises } = req.body

    if (!workflowId || !overallDirection || !coreConflict || !theme) {
      sendError(res, '缺少必要参数', HttpStatus.BAD_REQUEST)
      return
    }

    // 这里可以添加数据库保存逻辑
    const result = {
      id: `macro_${Date.now()}`,
      workflowId,
      overallDirection,
      coreConflict,
      theme,
      worldviewSummary,
      upgradeNodes: upgradeNodes || [],
      longTermPromises: longTermPromises || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    sendSuccess(res, result)
  } catch (error) {
    logger.error('保存宏观规划失败', error)
    const errorMessage = error instanceof Error ? error.message : ErrorMessages.INTERNAL_ERROR
    sendError(res, errorMessage, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

/**
 * 获取宏观规划
 * GET /api/story-plan/macro-planning/:workflowId
 */
router.get('/story-plan/macro-planning/:workflowId', async (req: Request, res: Response) => {
  try {
    const { workflowId } = req.params

    if (!workflowId) {
      sendError(res, '缺少工作流ID', HttpStatus.BAD_REQUEST)
      return
    }

    // 这里可以添加从数据库获取的逻辑
    // 目前返回 null 表示未找到
    sendSuccess(res, null)
  } catch (error) {
    logger.error('获取宏观规划失败', error)
    const errorMessage = error instanceof Error ? error.message : ErrorMessages.INTERNAL_ERROR
    sendError(res, errorMessage, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

/**
 * 生成角色阵容
 * POST /api/story-plan/character-cast
 */
router.post('/story-plan/character-cast', async (req: Request, res: Response) => {
  try {
    const { 
      title, 
      genre, 
      coreSellingPoint, 
      targetReaderFeeling, 
      overallDirection, 
      coreConflict, 
      theme, 
      worldviewSummary 
    } = req.body

    if (!title || !genre || !coreSellingPoint || !overallDirection) {
      sendError(res, '缺少必要参数', HttpStatus.BAD_REQUEST)
      return
    }

    // 调用 AI 服务生成角色阵容
    const result = await generateCharacterCastService({
      title,
      genre,
      coreSellingPoint,
      targetReaderFeeling: targetReaderFeeling || '',
      overallDirection,
      coreConflict,
      theme,
      worldviewSummary
    })

    sendSuccess(res, result)
  } catch (error) {
    logger.error('生成角色阵容失败', error)
    const errorMessage = error instanceof Error ? error.message : ErrorMessages.INTERNAL_ERROR
    sendError(res, errorMessage, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

/**
 * 保存角色准备数据
 * POST /api/story-plan/character-preparation/save
 */
router.post('/story-plan/character-preparation/save', async (req: Request, res: Response) => {
  try {
    const { 
      workflowId, 
      mainCharacters, 
      supportingCharacters, 
      relationships, 
      volumeResponsibilities 
    } = req.body

    if (!workflowId) {
      sendError(res, '缺少工作流ID', HttpStatus.BAD_REQUEST)
      return
    }

    // 这里可以添加数据库保存逻辑
    const result = {
      id: `char_prep_${Date.now()}`,
      workflowId,
      mainCharacters: mainCharacters || [],
      supportingCharacters: supportingCharacters || [],
      relationships: relationships || [],
      volumeResponsibilities: volumeResponsibilities || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    sendSuccess(res, result)
  } catch (error) {
    logger.error('保存角色准备数据失败', error)
    const errorMessage = error instanceof Error ? error.message : ErrorMessages.INTERNAL_ERROR
    sendError(res, errorMessage, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

/**
 * 获取角色准备数据
 * GET /api/story-plan/character-preparation/:workflowId
 */
router.get('/story-plan/character-preparation/:workflowId', async (req: Request, res: Response) => {
  try {
    const { workflowId } = req.params

    if (!workflowId) {
      sendError(res, '缺少工作流ID', HttpStatus.BAD_REQUEST)
      return
    }

    // 这里可以添加从数据库获取的逻辑
    // 目前返回 null 表示未找到
    sendSuccess(res, null)
  } catch (error) {
    logger.error('获取角色准备数据失败', error)
    const errorMessage = error instanceof Error ? error.message : ErrorMessages.INTERNAL_ERROR
    sendError(res, errorMessage, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

export default router

// ============================================================================
// 新增AI辅助生成路由
// ============================================================================

// 生成灵感方向
router.post('/story-plan/inspiration', async (req: Request, res: Response) => {
  try {
    const { keyword, genre } = req.body
    const result = await generateInspirationService({ keyword, genre })
    sendSuccess(res, result)
  } catch (error) {
    logger.error('生成灵感方向失败', error)
    sendError(res, error instanceof Error ? error.message : ErrorMessages.INTERNAL_ERROR, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

// 生成项目设定
router.post('/story-plan/project-setting', async (req: Request, res: Response) => {
  try {
    const { title, description, genre, inspiration } = req.body
    if (!title || !description) {
      sendError(res, '缺少必要参数', HttpStatus.BAD_REQUEST)
      return
    }
    const result = await generateProjectSettingService({ title, description, genre, inspiration })
    sendSuccess(res, result)
  } catch (error) {
    logger.error('生成项目设定失败', error)
    sendError(res, error instanceof Error ? error.message : ErrorMessages.INTERNAL_ERROR, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

// 生成卷战略
router.post('/story-plan/volume-strategy', async (req: Request, res: Response) => {
  try {
    const { title, genre, overallDirection, coreConflict, upgradeNodes } = req.body
    if (!title || !genre || !overallDirection) {
      sendError(res, '缺少必要参数', HttpStatus.BAD_REQUEST)
      return
    }
    const result = await generateVolumeStrategyService({ title, genre, overallDirection, coreConflict, upgradeNodes })
    sendSuccess(res, result)
  } catch (error) {
    logger.error('生成卷战略失败', error)
    sendError(res, error instanceof Error ? error.message : ErrorMessages.INTERNAL_ERROR, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

// 生成节奏拆章
router.post('/story-plan/rhythm-breakdown', async (req: Request, res: Response) => {
  try {
    const { title, genre, volumeName, volumeChapterRange, coreEvent, characterArc, tensionLevel, characters } = req.body
    if (!title || !volumeName || !volumeChapterRange) {
      sendError(res, '缺少必要参数', HttpStatus.BAD_REQUEST)
      return
    }
    const result = await generateRhythmBreakdownService({ title, genre, volumeName, volumeChapterRange, coreEvent, characterArc, tensionLevel, characters })
    sendSuccess(res, result)
  } catch (error) {
    logger.error('生成节奏拆章失败', error)
    sendError(res, error instanceof Error ? error.message : ErrorMessages.INTERNAL_ERROR, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

// 生成章节内容
router.post('/story-plan/chapter-content', async (req: Request, res: Response) => {
  try {
    const { title, genre, chapterTitle, chapterSummary, previousChapterSummary, characters, styleHint, targetWordCount, rhythmType, writingStyle, emotionalTone, specialRequirements, autoPolish, polishIntensity } = req.body
    if (!title || !chapterTitle || !chapterSummary) {
      sendError(res, '缺少必要参数', HttpStatus.BAD_REQUEST)
      return
    }
    const result = await generateChapterContentService({ 
      title, 
      genre, 
      chapterTitle, 
      chapterSummary, 
      previousChapterSummary, 
      characters, 
      styleHint, 
      targetWordCount: targetWordCount || 3000,
      rhythmType,
      writingStyle,
      emotionalTone,
      specialRequirements,
      autoPolish,
      polishIntensity
    })
    sendSuccess(res, result)
  } catch (error) {
    logger.error('生成章节内容失败', error)
    sendError(res, error instanceof Error ? error.message : ErrorMessages.INTERNAL_ERROR, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

// ============================================================================
// 内容润色路由
// ============================================================================

/**
 * 风格审计API
 * POST /api/story-plan/audit
 */
router.post('/story-plan/audit', async (req: Request, res: Response) => {
  try {
    const { content } = req.body

    if (!content || typeof content !== 'string') {
      sendError(res, '缺少必要参数: content', HttpStatus.BAD_REQUEST)
      return
    }

    logger.info('开始风格审计', {
      contentLength: content.length,
    })

    // 检测AI特征
    const aiFeatures = detectAIFeatures(content)
    
    // 生成风格审计结果
    const styleAudit = generateStyleAudit(aiFeatures, content)

    logger.info('风格审计完成', {
      overallScore: styleAudit.overallScore,
      aiFeatureCount: styleAudit.aiFeatureCount,
    })

    sendSuccess(res, styleAudit)
  } catch (error) {
    logger.error('风格审计失败', error)
    const errorMessage = error instanceof Error ? error.message : ErrorMessages.INTERNAL_ERROR
    sendError(res, errorMessage, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

/**
 * 润色章节内容
 * POST /api/story-plan/polish
 */
router.post('/story-plan/polish', async (req: Request, res: Response) => {
  try {
    const { content, chapterTitle, intensity, preserveKeywords, targetAudience, tone, mode } = req.body

    if (!content || typeof content !== 'string') {
      sendError(res, '缺少必要参数: content', HttpStatus.BAD_REQUEST)
      return
    }

    // 验证 intensity 参数
    const validIntensities: PolishIntensity[] = ['light', 'medium', 'deep']
    const polishIntensity: PolishIntensity = validIntensities.includes(intensity) ? intensity : 'medium'

    // 验证 mode 参数
    const validModes: PolishMode[] = ['good-writing', 'de-AI-writing']
    const polishMode: PolishMode = validModes.includes(mode) ? mode : 'de-AI-writing'

    logger.info('开始润色章节内容', {
      chapterTitle: chapterTitle || '未命名章节',
      intensity: polishIntensity,
      mode: polishMode,
      contentLength: content.length,
    })

    const result = await polishChapter(content, chapterTitle || '', {
      intensity: polishIntensity,
      preserveKeywords,
      targetAudience,
      tone,
      mode: polishMode,
    })

    // 添加风格审计结果
    const styleAudit = generateStyleAudit(result.aiFeaturesDetected, result.polishedContent)

    const extendedResult = {
      ...result,
      styleAudit,
      mode: polishMode,
    }

    sendSuccess(res, extendedResult)
  } catch (error) {
    logger.error('润色章节内容失败', error)
    const errorMessage = error instanceof Error ? error.message : ErrorMessages.INTERNAL_ERROR
    sendError(res, errorMessage, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

/**
 * 批量润色多个章节
 * POST /api/story-plan/polish-batch
 */
router.post('/story-plan/polish-batch', async (req: Request, res: Response) => {
  try {
    const { chapters, intensity, preserveKeywords, targetAudience, tone, mode } = req.body

    if (!chapters || !Array.isArray(chapters) || chapters.length === 0) {
      sendError(res, '缺少必要参数: chapters (非空数组)', HttpStatus.BAD_REQUEST)
      return
    }

    // 验证 intensity 参数
    const validIntensities: PolishIntensity[] = ['light', 'medium', 'deep']
    const polishIntensity: PolishIntensity = validIntensities.includes(intensity) ? intensity : 'medium'

    // 验证 mode 参数
    const validModes: PolishMode[] = ['good-writing', 'de-AI-writing']
    const polishMode: PolishMode = validModes.includes(mode) ? mode : 'de-AI-writing'

    logger.info('开始批量润色章节', {
      chapterCount: chapters.length,
      intensity: polishIntensity,
      mode: polishMode,
    })

    const results = []
    const errors = []

    for (let i = 0; i < chapters.length; i++) {
      const chapter = chapters[i]
      
      // 验证每个章节的数据结构
      if (!chapter.content || typeof chapter.content !== 'string') {
        errors.push({
          index: i,
          chapterTitle: chapter.chapterTitle || `章节 ${i + 1}`,
          error: '缺少 content 字段或格式不正确',
        })
        continue
      }

      try {
        const result = await polishChapter(chapter.content, chapter.chapterTitle || `章节 ${i + 1}`, {
          intensity: polishIntensity,
          preserveKeywords,
          targetAudience,
          tone,
          mode: polishMode,
        })
        
        // 添加风格审计结果
        const styleAudit = generateStyleAudit(result.aiFeaturesDetected, chapter.content)
        
        results.push({
          index: i,
          chapterTitle: chapter.chapterTitle || `章节 ${i + 1}`,
          ...result,
          styleAudit,
          mode: polishMode,
        })
      } catch (error) {
        logger.error(`润色章节 ${i + 1} 失败`, { error })
        errors.push({
          index: i,
          chapterTitle: chapter.chapterTitle || `章节 ${i + 1}`,
          error: error instanceof Error ? error.message : '润色失败',
        })
      }
    }

    logger.info('批量润色完成', {
      successCount: results.length,
      errorCount: errors.length,
    })

    sendSuccess(res, {
      results,
      errors,
      summary: {
        total: chapters.length,
        success: results.length,
        failed: errors.length,
      },
    })
  } catch (error) {
    logger.error('批量润色失败', error)
    const errorMessage = error instanceof Error ? error.message : ErrorMessages.INTERNAL_ERROR
    sendError(res, errorMessage, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})
