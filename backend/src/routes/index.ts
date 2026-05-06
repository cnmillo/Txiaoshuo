import { Router } from 'express'
import { query, queryOne } from '../database/index.js'
import { sendSuccess, sendError, ErrorMessages, HttpStatus } from '../utils/response.js'
import { novelService } from '../services/novelService.js'
import logger from '../utils/logger.js'
import type { StatsData } from '../types/index.js'

const router = Router()

/**
 * 健康检查
 * GET /api/health
 */
router.get('/health', async (req, res) => {
  try {
    // 检查数据库连接
    await queryOne('SELECT 1')

    sendSuccess(res, {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      uptime: process.uptime()
    })
  } catch (error) {
    logger.error('健康检查失败', error)
    res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
      success: false,
      status: 'unhealthy',
      message: '服务异常',
      timestamp: new Date().toISOString()
    })
  }
})

/**
 * 获取统计数据
 * GET /api/stats
 */
router.get('/stats', async (req, res) => {
  try {
    // 小说总数
    const novelCount = await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM novels')

    // 章节总数
    const chapterCount = await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM chapters')

    // 总字数
    const wordCount = await queryOne<{ total: number }>('SELECT COALESCE(SUM(word_count), 0) as total FROM novels')

    // 按状态统计小说
    const statusStats = await query<{ status: string; count: number }>(
      'SELECT status, COUNT(*) as count FROM novels GROUP BY status'
    )

    // 按类型统计小说
    const typeStats = await query<{ type: string; count: number }>(
      'SELECT type, COUNT(*) as count FROM novels GROUP BY type'
    )

    // 最近7天创建的小说数
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const recentNovels = await queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM novels WHERE created_at > ?',
      [sevenDaysAgo.toISOString()]
    )

    const novelsByStatus: Record<string, number> = {}
    for (const stat of statusStats) {
      novelsByStatus[stat.status] = stat.count
    }

    const novelsByType: Record<string, number> = {}
    for (const stat of typeStats) {
      novelsByType[stat.type] = stat.count
    }

    const stats: StatsData = {
      totalNovels: novelCount?.count || 0,
      totalChapters: chapterCount?.count || 0,
      totalWords: wordCount?.total || 0,
      novelsByStatus,
      novelsByType,
      recentNovels: recentNovels?.count || 0
    }

    sendSuccess(res, stats)
  } catch (error) {
    logger.error('获取统计数据失败', error)
    sendError(res, ErrorMessages.INTERNAL_ERROR, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

/**
 * 获取小说类型列表
 * GET /api/types
 */
router.get('/types', async (req, res) => {
  try {
    const types = await novelService.getNovelTypes()
    sendSuccess(res, types)
  } catch (error) {
    logger.error('获取小说类型失败', error)
    sendError(res, ErrorMessages.INTERNAL_ERROR, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

/**
 * 获取系统信息
 * GET /api/system
 */
router.get('/system', (req, res) => {
  try {
    const info = {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      memory: {
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024)
      },
      uptime: process.uptime(),
      pid: process.pid
    }

    sendSuccess(res, info)
  } catch (error) {
    logger.error('获取系统信息失败', error)
    sendError(res, ErrorMessages.INTERNAL_ERROR, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

export default router
