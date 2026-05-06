import express from 'express'
import type { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import dotenv from 'dotenv'
import rateLimit from 'express-rate-limit'
import path from 'path'
import { fileURLToPath } from 'url'
import http from 'http'

import { errorHandler } from './middleware/errorHandler.js'
import { requestContextMiddleware } from './middleware/requestContext.js'
import { novelRoutes } from './routes/novels.js'
import { settingsRoutes } from './routes/settings.js'
import stylesRoutes from './routes/styles.js'
import templatesRoutes from './routes/templates.js'
import generateRoutes from './routes/generate.js'
import exportRoutes from './routes/export.js'
import humanizeRoutes from './routes/humanize.js'
import aiRoutes from './routes/ai.js'
import analyzeRoutes from './routes/analyze.js'
import storyPlanRoutes from './routes/storyPlan.js'
import projectSettingRoutes from './routes/projectSetting.js'
import reviewRoutes from './routes/review.js'
import qualityRoutes from './routes/quality.js'
import consistencyRoutes from './routes/consistency.js'
import indexRoutes from './routes/index.js'
import workflowRoutes from './routes/workflow.js'
import aiGenerationRoutes from './routes/aiGeneration.js'
import knowledgeRoutes from './routes/knowledge.js'
import tasksRoutes from './routes/tasks.js'
import directorRoutes from './routes/director.js'
import writingStylesRoutes from './routes/writingStyles.js'
import aiModelsRoutes from './routes/aiModels.js'
import { initDatabase, closeDatabase } from './database/index.js'
import { writingTemplateService } from './services/writingTemplateService.js'
import { styleService } from './services/styleService.js'
import { projectSettingService } from './services/projectSettingService.js'
import { workflowService } from './services/workflowService.js'
import { knowledgeService } from './services/knowledgeService.js'
import { tasksService } from './services/tasksService.js'
import { aiModelService } from './services/aiModelService.js'
import logger from './utils/logger.js'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express() as express.Application
const PORT = process.env.PORT || 3001

let server: http.Server | null = null
let isShuttingDown = false

// 请求超时中间件 - 弹性超时
const requestTimeout = (timeoutMs: number = 30000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // 根据请求类型和数据复杂度动态计算超时时间
    const calculateTimeout = (): number => {
      const path = req.path
      
      // 故事规划 - 角色阵容生成（根据卷数动态调整）
      if (path.includes('/story-plan/character-cast')) {
        const volumeCount = (req.body as { volumeCount?: number })?.volumeCount || 1
        return Math.min(300000 + volumeCount * 60000, 420000) // 5分钟 + 每卷1分钟，最多7分钟
      }
      
      // 故事规划 - 其他复杂生成
      if (path.includes('/story-plan/')) {
        return 300000 // 5分钟
      }
      
      // 大纲生成
      if (path.includes('/outline-auto')) {
        return 300000 // 5分钟
      }
      
      // 质量检测执行
      if (path.includes('/quality/task') && path.includes('/execute')) {
        return 300000 // 5分钟
      }
      
      // 润色相关（根据文本长度动态调整）
      if (path.includes('/humanize') || path.includes('/polish')) {
        const textLength = (req.body as { text?: string; content?: string })?.text?.length || 
                          (req.body as { content?: string })?.content?.length || 0
        return Math.min(120000 + Math.floor(textLength / 1000) * 10000, 180000) // 2分钟 + 每1000字10秒，最多3分钟
      }
      
      // 分析相关
      if (path.includes('/analyze')) {
        return 180000 // 3分钟
      }
      
      // 导演模式
      if (path.includes('/director/')) {
        return 120000 // 2分钟
      }
      
      // 模型测试
      if (path.includes('/custom-models/') && path.includes('/test')) {
        return 120000 // 2分钟
      }
      
      // 章节生成
      if (path.includes('/chapter-execution/')) {
        return 180000 // 3分钟
      }
      
      // 默认超时
      return timeoutMs
    }
    
    const actualTimeout = calculateTimeout()
    
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        res.status(408).json({
          success: false,
          message: '请求超时',
          code: 'REQUEST_TIMEOUT'
        })
      }
    }, actualTimeout)

    res.on('finish', () => clearTimeout(timer))
    res.on('close', () => clearTimeout(timer))
    
    next()
  }
}

// 内存监控
const logMemoryUsage = () => {
  const used = process.memoryUsage()
  const mb = (bytes: number) => Math.round(bytes / 1024 / 1024)
  
  logger.debug('内存使用情况', {
    rss: `${mb(used.rss)}MB`,
    heapTotal: `${mb(used.heapTotal)}MB`,
    heapUsed: `${mb(used.heapUsed)}MB`,
    external: `${mb(used.external)}MB`
  })
}

// 每5分钟记录一次内存使用
setInterval(logMemoryUsage, 5 * 60 * 1000)

const gracefulShutdown = (signal: string) => {
  if (isShuttingDown) return
  isShuttingDown = true
  logger.info(`收到 ${signal} 信号，开始优雅关闭...`)
  
  // 停止接受新请求
  if (server) {
    server.close(() => {
      logger.info('HTTP 服务器已关闭')
      
      // 关闭数据库连接
      closeDatabase().then(() => {
        logger.info('数据库连接已关闭')
        process.exit(0)
      }).catch((error) => {
        logger.error('关闭数据库连接失败', error)
        process.exit(1)
      })
    })
    
    // 强制关闭超时
    setTimeout(() => {
      logger.warn('强制关闭，等待超时')
      process.exit(1)
    }, 10000)
  } else {
    process.exit(0)
  }
}

process.on('unhandledRejection', (reason: unknown, _promise: Promise<unknown>) => {
  logger.error('未处理的 Promise 拒绝', reason instanceof Error ? reason : new Error(String(reason)))
})

process.on('uncaughtException', (error: Error) => {
  logger.error('未捕获的异常', error)
  if (!isShuttingDown) {
    gracefulShutdown('uncaughtException')
  }
})

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

// 异步初始化函数
const initializeApp = async () => {
  try {
    logger.info('开始初始化数据库...')
    await initDatabase()
    logger.info('数据库初始化完成')

    logger.info('开始初始化风格服务...')
    await styleService.initStylesTable()
    logger.info('风格服务初始化完成')

    logger.info('开始初始化写作模板服务...')
    await writingTemplateService.initWritingTemplates()
    logger.info('写作模板服务初始化完成')
    
    logger.info('开始初始化项目设定服务...')
    await projectSettingService.initTable()
    logger.info('项目设定服务初始化完成')
    
    // 初始化新增服务
    logger.info('开始初始化工作流服务...')
    await workflowService.initWorkflowTables()
    logger.info('工作流服务初始化完成')
    
    logger.info('开始初始化知识库服务...')
    await knowledgeService.initKnowledgeTables()
    logger.info('知识库服务初始化完成')
    
    logger.info('开始初始化任务管理服务...')
    await tasksService.initTasksTables()
    logger.info('任务管理服务初始化完成')
    
    logger.info('开始初始化AI模型服务...')
    await aiModelService.initTable()
    logger.info('AI模型服务初始化完成')
    
    logger.info('所有服务初始化完成')
  } catch (error) {
    logger.error('服务初始化失败', error)
    throw error
  }
}

// 安全中间件
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}))

// CORS配置
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['http://localhost:5173', 'http://localhost:4173']
    : '*',
  credentials: true
}))

// 请求上下文中间件（必须在其他中间件之前）
app.use(requestContextMiddleware)

// 请求超时中间件
app.use(requestTimeout(120000)) // 2分钟超时

// 请求日志（使用 morgan，但只记录到控制台，详细日志由 logger 处理）
app.use(morgan('dev'))

// 速率限制 - 进度查询和常用查询使用更宽松的限制
// 开发环境下不启用速率限制
const shouldSkipRateLimit = () => process.env.NODE_ENV !== 'production'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createLimiter = (options: any) => rateLimit(options)

const progressLimiter = createLimiter({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 5000, // 进度查询允许更多请求
  message: '请求过于频繁，请稍后再试',
  skip: shouldSkipRateLimit
})

const queryLimiter = createLimiter({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 5000, // 查询类接口允许较多请求
  message: '请求过于频繁，请稍后再试',
  skip: shouldSkipRateLimit
})

const generalLimiter = createLimiter({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 3000, // 限制每个IP 3000个请求（写入操作）
  message: '请求过于频繁，请稍后再试',
  skip: shouldSkipRateLimit
})

// 进度查询接口
app.use('/api/generate/progress', progressLimiter)
app.use('/api/generate/novel', progressLimiter)

// 查询类接口（读取操作）
app.use('/api/novels', queryLimiter)
app.use('/api/review/check', queryLimiter)
app.use('/api/review/reports', queryLimiter)
app.use('/api/review/report', queryLimiter)
app.use('/api/styles', queryLimiter)
app.use('/api/templates', queryLimiter)
app.use('/api/consistency', queryLimiter)
app.use('/api/quality/results', queryLimiter)
app.use('/api/quality/result', queryLimiter)

// 其他接口使用通用限制
app.use('/api/', generalLimiter)

// 解析JSON请求体
// eslint-disable-next-line @typescript-eslint/no-explicit-any
app.use((express as any).json({ limit: '50mb' }))
// eslint-disable-next-line @typescript-eslint/no-explicit-any
app.use((express as any).urlencoded({ extended: true, limit: '50mb' }))

// 静态文件服务
// eslint-disable-next-line @typescript-eslint/no-explicit-any
app.use('/uploads', (express as any).static(path.join(__dirname, '../uploads')))

// API路由
app.use('/api/novels', novelRoutes)
app.use('/api/settings', settingsRoutes)
app.use('/api/styles', stylesRoutes)
app.use('/api/templates', templatesRoutes)
app.use('/api/generate', generateRoutes)
app.use('/api/export', exportRoutes)
app.use('/api/humanize', humanizeRoutes)
app.use('/api/ai', aiRoutes)
app.use('/api/analyze', analyzeRoutes)
app.use('/api/review', reviewRoutes)
app.use('/api/quality', qualityRoutes)
app.use('/api/consistency', consistencyRoutes)
app.use('/api/project-setting', projectSettingRoutes)
// 新增路由
app.use('/api/workflow', workflowRoutes)
app.use('/api/ai', aiGenerationRoutes)
app.use('/api/knowledge', knowledgeRoutes)
app.use('/api/tasks', tasksRoutes)
app.use('/api/director', directorRoutes)
app.use('/api/writing-styles', writingStylesRoutes)
app.use('/api', aiModelsRoutes)
app.use('/api', storyPlanRoutes)
app.use('/api', indexRoutes)

// 健康检查
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  })
})

// 生产环境提供静态文件
if (process.env.NODE_ENV === 'production') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app.use((express as any).static(path.join(__dirname, '../../frontend/dist')))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app.get('*', (req: Request, res: any) => {
    res.sendFile(path.join(__dirname, '../../frontend/dist/index.html'))
  })
}

// 错误处理中间件
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  errorHandler(err, req, res, next)
})

// 启动服务器
const startServer = async () => {
  try {
    logger.info('开始初始化应用...')
    await initializeApp()
    
    server = app.listen(Number(PORT), () => {
      logger.info(`后端服务已启动: http://localhost:${PORT}`)
      console.log(`
  ╔════════════════════════════════════════════════════════╗
  ║                                                        ║
  ║     全自动小说生成器后端服务已启动                      ║
  ║                                                        ║
  ║     服务地址: http://localhost:${PORT}                   ║
  ║     API文档: http://localhost:${PORT}/api/health         ║
  ║                                                        ║
  ╚════════════════════════════════════════════════════════╝
  `)
    })
    
    // 添加服务器错误处理
    server.on('error', (error: Error) => {
      logger.error('服务器错误', error)
      if (!isShuttingDown) {
        gracefulShutdown('serverError')
      }
    })
  } catch (error) {
    logger.error('服务启动失败', error)
    process.exit(1)
  }
}

startServer()

export default app
