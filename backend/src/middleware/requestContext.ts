import { Request, Response, NextFunction } from 'express'
import logger, { setRequestContext, updateRequestContext, generateRequestId } from '../utils/logger.js'

/**
 * 请求上下文中间件
 * 为每个请求生成唯一的请求ID，并存储请求上下文信息
 */
export const requestContextMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // 从请求头获取请求ID（支持分布式追踪），或生成新的请求ID
  const requestId = (req.headers['x-request-id'] as string) || 
                    (req.headers['x-correlation-id'] as string) || 
                    generateRequestId()
  
  // 提取客户端IP
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
             req.headers['x-real-ip'] as string ||
             req.socket.remoteAddress ||
             'unknown'
  
  // 创建请求上下文
  const context = {
    requestId,
    ip,
    method: req.method,
    path: req.path,
    userAgent: req.headers['user-agent']
  }
  
  // 设置请求上下文
  setRequestContext(context)
  
  // 将请求ID添加到响应头，便于客户端追踪
  res.setHeader('X-Request-ID', requestId)
  
  // 记录请求开始
  logger.info('请求开始', {
    method: req.method,
    path: req.path,
    query: Object.keys(req.query).length > 0 ? req.query : undefined,
    ip
  })
  
  // 记录请求结束
  const startTime = Date.now()
  res.on('finish', () => {
    const duration = Date.now() - startTime
    const logMeta = {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`
    }
    
    // 根据状态码选择日志级别
    if (res.statusCode >= 400) {
      logger.warn('请求完成（错误）', logMeta)
    } else {
      logger.info('请求完成', logMeta)
    }
  })
  
  next()
}

/**
 * 用户ID中间件
 * 在认证后更新请求上下文中的用户ID
 */
export const setUserIdContext = (userId: string) => {
  updateRequestContext({ userId })
}

declare module 'express' {
  interface Request {
    requestId?: string
  }
}
