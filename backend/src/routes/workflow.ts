import { Router, type Request, type Response } from 'express'
import { workflowService } from '../services/workflowService.js'
import { sendSuccess, sendError, ErrorMessages, HttpStatus } from '../utils/response.js'
import logger from '../utils/logger.js'
import { z } from 'zod'

const router = Router()

// 请求验证 Schema
const SaveWorkflowSchema = z.object({
  workflowId: z.string().optional(),
  novelId: z.string().optional(),
  state: z.object({
    id: z.string(),
    novelId: z.string().optional(),
    currentStage: z.string(),
    stages: z.record(z.unknown()),
    version: z.number(),
    createdAt: z.string(),
    updatedAt: z.string()
  })
})

/**
 * 保存工作流状态
 * POST /api/workflow/save
 */
router.post('/save', async (req: Request, res: Response) => {
  try {
    const validation = SaveWorkflowSchema.safeParse(req.body)
    
    if (!validation.success) {
      sendError(res, `请求参数错误: ${validation.error.errors.map((e: { message: string }) => e.message).join(', ')}`, HttpStatus.BAD_REQUEST)
      return
    }

    const { workflowId, novelId, state } = validation.data
    
    logger.info('保存工作流状态', { workflowId, novelId, currentStage: state.currentStage })
    
    const result = await workflowService.saveWorkflow({
      workflowId,
      novelId,
      state
    })
    
    sendSuccess(res, result, '工作流状态保存成功')
  } catch (error) {
    logger.error('保存工作流状态失败', error)
    const errorMessage = error instanceof Error ? error.message : ErrorMessages.INTERNAL_ERROR
    sendError(res, errorMessage, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

/**
 * 加载工作流状态
 * GET /api/workflow/load
 */
router.get('/load', async (req: Request, res: Response) => {
  try {
    const { workflowId, novelId } = req.query
    
    if (!workflowId && !novelId) {
      sendError(res, '请提供 workflowId 或 novelId 参数', HttpStatus.BAD_REQUEST)
      return
    }
    
    logger.info('加载工作流状态', { workflowId, novelId })
    
    const result = await workflowService.loadWorkflow({
      workflowId: workflowId as string | undefined,
      novelId: novelId as string | undefined
    })
    
    if (!result) {
      sendSuccess(res, null, '未找到工作流状态')
      return
    }
    
    sendSuccess(res, result)
  } catch (error) {
    logger.error('加载工作流状态失败', error)
    const errorMessage = error instanceof Error ? error.message : ErrorMessages.INTERNAL_ERROR
    sendError(res, errorMessage, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

/**
 * 清除工作流状态
 * DELETE /api/workflow/clear
 */
router.delete('/clear', async (req: Request, res: Response) => {
  try {
    const { workflowId, novelId } = req.query
    
    if (!workflowId && !novelId) {
      sendError(res, '请提供 workflowId 或 novelId 参数', HttpStatus.BAD_REQUEST)
      return
    }
    
    logger.info('清除工作流状态', { workflowId, novelId })
    
    const result = await workflowService.clearWorkflow({
      workflowId: workflowId as string | undefined,
      novelId: novelId as string | undefined
    })
    
    sendSuccess(res, { cleared: result }, '工作流状态清除成功')
  } catch (error) {
    logger.error('清除工作流状态失败', error)
    const errorMessage = error instanceof Error ? error.message : ErrorMessages.INTERNAL_ERROR
    sendError(res, errorMessage, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

/**
 * 获取工作流列表
 * GET /api/workflow/list
 */
router.get('/list', async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, status } = req.query
    
    const result = await workflowService.listWorkflows({
      page: Number(page),
      limit: Number(limit),
      status: status as string | undefined
    })
    
    sendSuccess(res, result)
  } catch (error) {
    logger.error('获取工作流列表失败', error)
    const errorMessage = error instanceof Error ? error.message : ErrorMessages.INTERNAL_ERROR
    sendError(res, errorMessage, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

/**
 * 获取工作流快照列表
 * GET /api/workflow/snapshots
 */
router.get('/snapshots', async (req: Request, res: Response) => {
  try {
    const { workflowId } = req.query
    
    if (!workflowId) {
      sendError(res, '请提供 workflowId 参数', HttpStatus.BAD_REQUEST)
      return
    }
    
    const result = await workflowService.getWorkflowSnapshots(workflowId as string)
    
    sendSuccess(res, result)
  } catch (error) {
    logger.error('获取工作流快照失败', error)
    const errorMessage = error instanceof Error ? error.message : ErrorMessages.INTERNAL_ERROR
    sendError(res, errorMessage, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

/**
 * 恢复工作流到指定快照
 * POST /api/workflow/restore
 */
router.post('/restore', async (req: Request, res: Response) => {
  try {
    const { workflowId, snapshotId } = req.body
    
    if (!workflowId || !snapshotId) {
      sendError(res, '请提供 workflowId 和 snapshotId 参数', HttpStatus.BAD_REQUEST)
      return
    }
    
    logger.info('恢复工作流快照', { workflowId, snapshotId })
    
    const result = await workflowService.restoreWorkflow(workflowId, snapshotId)
    
    sendSuccess(res, result, '工作流恢复成功')
  } catch (error) {
    logger.error('恢复工作流快照失败', error)
    const errorMessage = error instanceof Error ? error.message : ErrorMessages.INTERNAL_ERROR
    sendError(res, errorMessage, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

export default router
