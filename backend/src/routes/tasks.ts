import { Router, type Request, type Response } from 'express'
import { tasksService } from '../services/tasksService.js'
import { sendSuccess, sendError, ErrorMessages, HttpStatus } from '../utils/response.js'
import logger from '../utils/logger.js'

const router = Router()

/**
 * 获取任务列表
 * GET /api/tasks/list
 */
router.get('/list', async (req: Request, res: Response) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      type, 
      novelId 
    } = req.query

    const result = await tasksService.listTasks({
      page: Number(page),
      limit: Number(limit),
      status: status as string | undefined,
      type: type as string | undefined,
      novelId: novelId as string | undefined
    })

    sendSuccess(res, result)
  } catch (error) {
    logger.error('获取任务列表失败', error)
    const errorMessage = error instanceof Error ? error.message : ErrorMessages.INTERNAL_ERROR
    sendError(res, errorMessage, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

/**
 * 获取任务详情
 * GET /api/tasks/:id
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    if (!id) {
      sendError(res, '任务ID不能为空', HttpStatus.BAD_REQUEST)
      return
    }

    const result = await tasksService.getTask(id)

    if (!result) {
      sendError(res, '任务不存在', HttpStatus.NOT_FOUND)
      return
    }

    sendSuccess(res, result)
  } catch (error) {
    logger.error('获取任务详情失败', error)
    const errorMessage = error instanceof Error ? error.message : ErrorMessages.INTERNAL_ERROR
    sendError(res, errorMessage, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

/**
 * 重试失败任务
 * POST /api/tasks/:id/retry
 */
router.post('/:id/retry', async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    if (!id) {
      sendError(res, '任务ID不能为空', HttpStatus.BAD_REQUEST)
      return
    }

    logger.info('重试任务', { taskId: id })

    const result = await tasksService.retryTask(id)

    sendSuccess(res, result, '任务重试已启动')
  } catch (error) {
    logger.error('重试任务失败', error)
    const errorMessage = error instanceof Error ? error.message : ErrorMessages.INTERNAL_ERROR
    sendError(res, errorMessage, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

/**
 * 删除任务
 * DELETE /api/tasks/:id
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    if (!id) {
      sendError(res, '任务ID不能为空', HttpStatus.BAD_REQUEST)
      return
    }

    logger.info('删除任务', { taskId: id })

    const result = await tasksService.deleteTask(id)

    sendSuccess(res, { deleted: result }, '任务删除成功')
  } catch (error) {
    logger.error('删除任务失败', error)
    const errorMessage = error instanceof Error ? error.message : ErrorMessages.INTERNAL_ERROR
    sendError(res, errorMessage, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

/**
 * 取消任务
 * POST /api/tasks/:id/cancel
 */
router.post('/:id/cancel', async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    if (!id) {
      sendError(res, '任务ID不能为空', HttpStatus.BAD_REQUEST)
      return
    }

    logger.info('取消任务', { taskId: id })

    const result = await tasksService.cancelTask(id)

    sendSuccess(res, result, '任务已取消')
  } catch (error) {
    logger.error('取消任务失败', error)
    const errorMessage = error instanceof Error ? error.message : ErrorMessages.INTERNAL_ERROR
    sendError(res, errorMessage, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

/**
 * 获取任务统计
 * GET /api/tasks/stats
 */
router.get('/stats/overview', async (req: Request, res: Response) => {
  try {
    const { novelId } = req.query

    const result = await tasksService.getTaskStats(novelId as string | undefined)

    sendSuccess(res, result)
  } catch (error) {
    logger.error('获取任务统计失败', error)
    const errorMessage = error instanceof Error ? error.message : ErrorMessages.INTERNAL_ERROR
    sendError(res, errorMessage, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

/**
 * 批量删除任务
 * POST /api/tasks/batch-delete
 */
router.post('/batch-delete', async (req: Request, res: Response) => {
  try {
    const { taskIds, status } = req.body

    if (!taskIds && !status) {
      sendError(res, '请提供 taskIds 或 status 参数', HttpStatus.BAD_REQUEST)
      return
    }

    logger.info('批量删除任务', { taskIds, status })

    const result = await tasksService.batchDeleteTasks({
      taskIds: taskIds as string[] | undefined,
      status: status as string | undefined
    })

    sendSuccess(res, { deletedCount: result }, '批量删除成功')
  } catch (error) {
    logger.error('批量删除任务失败', error)
    const errorMessage = error instanceof Error ? error.message : ErrorMessages.INTERNAL_ERROR
    sendError(res, errorMessage, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

/**
 * 清理已完成/失败的任务
 * POST /api/tasks/cleanup
 */
router.post('/cleanup', async (req: Request, res: Response) => {
  try {
    const { olderThanDays = 7 } = req.body

    logger.info('清理任务', { olderThanDays })

    const result = await tasksService.cleanupTasks(olderThanDays as number)

    sendSuccess(res, { deletedCount: result }, '任务清理完成')
  } catch (error) {
    logger.error('清理任务失败', error)
    const errorMessage = error instanceof Error ? error.message : ErrorMessages.INTERNAL_ERROR
    sendError(res, errorMessage, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

/**
 * 获取任务执行日志
 * GET /api/tasks/:id/logs
 */
router.get('/:id/logs', async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    if (!id) {
      sendError(res, '任务ID不能为空', HttpStatus.BAD_REQUEST)
      return
    }

    const result = await tasksService.getTaskLogs(id)

    sendSuccess(res, result)
  } catch (error) {
    logger.error('获取任务日志失败', error)
    const errorMessage = error instanceof Error ? error.message : ErrorMessages.INTERNAL_ERROR
    sendError(res, errorMessage, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

/**
 * 获取失败任务恢复建议
 * GET /api/tasks/:id/recovery-suggestions
 */
router.get('/:id/recovery-suggestions', async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    if (!id) {
      sendError(res, '任务ID不能为空', HttpStatus.BAD_REQUEST)
      return
    }

    const result = await tasksService.getRecoverySuggestions(id)

    sendSuccess(res, result)
  } catch (error) {
    logger.error('获取恢复建议失败', error)
    const errorMessage = error instanceof Error ? error.message : ErrorMessages.INTERNAL_ERROR
    sendError(res, errorMessage, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

export default router
