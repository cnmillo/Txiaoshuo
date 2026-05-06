/**
 * 项目设定 API 路由
 * 
 * 提供项目设定的 CRUD 操作
 */

import { Router, type Request, type Response } from 'express'
import { projectSettingService } from '../services/projectSettingService.js'
import { sendError, ErrorMessages, HttpStatus, handleApiRequest } from '../utils/response.js'
import logger from '../utils/logger.js'
import { z } from 'zod'

const router = Router()

// ============================================================================
// 验证 Schema
// ============================================================================

const ProjectSettingSchema = z.object({
  title: z.string().min(2, '书名至少需要2个字符').max(50, '书名不能超过50个字符'),
  description: z.string().max(500, '简介不能超过500个字符').optional(),
  genre: z.enum(['fantasy', 'wuxia', 'xianxia', 'romance', 'scifi', 'mystery', 'history', 'urban', 'game', 'military', 'sports', 'lifestyle', 'horror', 'fantasy_western', 'other']),
  coreSellingPoint: z.string().min(10, '核心卖点至少需要10个字符').max(500, '核心卖点不能超过500个字符'),
  targetReaderFeeling: z.string().min(10, '目标读者感受至少需要10个字符').max(500, '目标读者感受不能超过500个字符'),
  first30ChaptersPromise: z.string().min(10, '前30章承诺至少需要10个字符').max(1000, '前30章承诺不能超过1000个字符'),
  worldviewHint: z.string().max(200, '世界观提示不能超过200个字符').optional(),
  styleHint: z.string().max(200, '风格提示不能超过200个字符').optional(),
  writingStyle: z.string().optional(),
  estimatedWordCount: z.number().positive().optional(),
  oneLineSummary: z.string().max(100).optional(),
})

const UpdateProjectSettingSchema = ProjectSettingSchema.partial()

// ============================================================================
// 路由处理
// ============================================================================

/**
 * 创建项目设定
 * POST /api/project-setting
 */
router.post('/', async (req: Request, res: Response) => {
  await handleApiRequest(req, res, async () => {
    const validatedData = ProjectSettingSchema.parse(req.body)
    const result = await projectSettingService.create(validatedData)
    logger.info('创建项目设定成功', { id: result.id })
    return result
  }, '项目设定创建成功')
})

/**
 * 获取项目设定
 * GET /api/project-setting/:id
 */
router.get('/:id', async (req: Request, res: Response) => {
  await handleApiRequest(req, res, async () => {
    const { id } = req.params
    const result = await projectSettingService.getById(id)
    
    if (!result) {
      sendError(res, ErrorMessages.NOT_FOUND, HttpStatus.NOT_FOUND)
      return
    }
    
    return result
  })
})

/**
 * 根据工作流ID获取项目设定
 * GET /api/project-setting/workflow/:workflowId
 */
router.get('/workflow/:workflowId', async (req: Request, res: Response) => {
  await handleApiRequest(req, res, async () => {
    const { workflowId } = req.params
    const result = await projectSettingService.getByWorkflowId(workflowId)
    
    if (!result) {
      sendError(res, ErrorMessages.NOT_FOUND, HttpStatus.NOT_FOUND)
      return
    }
    
    return result
  })
})

/**
 * 更新项目设定
 * PUT /api/project-setting/:id
 */
router.put('/:id', async (req: Request, res: Response) => {
  await handleApiRequest(req, res, async () => {
    const { id } = req.params
    const validatedData = UpdateProjectSettingSchema.parse(req.body)
    
    const existing = await projectSettingService.getById(id)
    if (!existing) {
      sendError(res, ErrorMessages.NOT_FOUND, HttpStatus.NOT_FOUND)
      return
    }
    
    const result = await projectSettingService.update(id, validatedData)
    logger.info('更新项目设定成功', { id })
    return result
  }, '项目设定更新成功')
})

/**
 * 删除项目设定
 * DELETE /api/project-setting/:id
 */
router.delete('/:id', async (req: Request, res: Response) => {
  await handleApiRequest(req, res, async () => {
    const { id } = req.params
    
    const existing = await projectSettingService.getById(id)
    if (!existing) {
      sendError(res, ErrorMessages.NOT_FOUND, HttpStatus.NOT_FOUND)
      return
    }
    
    await projectSettingService.delete(id)
    logger.info('删除项目设定成功', { id })
    return { success: true }
  }, '项目设定删除成功')
})

/**
 * 验证项目设定数据
 * POST /api/project-setting/validate
 */
router.post('/validate', async (req: Request, res: Response) => {
  await handleApiRequest(req, res, async () => {
    const validatedData = ProjectSettingSchema.parse(req.body)
    return { 
      valid: true, 
      data: validatedData,
      message: '数据验证通过'
    }
  })
})

export default router
