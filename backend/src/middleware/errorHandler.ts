import { Request, Response, NextFunction } from 'express'
import logger, { getRequestContext } from '../utils/logger.js'

// 错误类型识别
export class AppError extends Error {
  statusCode: number
  code: string
  isOperational: boolean
  details?: Record<string, unknown>

  constructor(message: string, statusCode: number = 500, code: string = 'INTERNAL_ERROR', details?: Record<string, unknown>) {
    super(message)
    this.statusCode = statusCode
    this.code = code
    this.isOperational = true
    this.details = details
    Error.captureStackTrace(this, this.constructor)
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 400, 'VALIDATION_ERROR', details)
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = '资源不存在') {
    super(message, 404, 'NOT_FOUND')
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = '未授权') {
    super(message, 401, 'UNAUTHORIZED')
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = '禁止访问') {
    super(message, 403, 'FORBIDDEN')
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 409, 'CONFLICT', details)
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = '请求过于频繁') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED')
  }
}

// 改进的错误处理中间件
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  // 获取请求上下文
  const context = getRequestContext()
  
  const statusCode = err instanceof AppError ? err.statusCode : 500
  const code = err instanceof AppError ? err.code : 'INTERNAL_ERROR'
  const message = err.message || '服务器内部错误'
  
  // 构建错误日志元数据
  const errorMeta: Record<string, unknown> = {
    statusCode,
    errorCode: code,
    method: req.method,
    path: req.path,
    query: Object.keys(req.query).length > 0 ? req.query : undefined,
    body: req.body && Object.keys(req.body).length > 0 ? 
      // 过滤敏感信息
      (() => {
        const sanitized = { ...req.body }
        if (sanitized.password) sanitized.password = '***'
        if (sanitized.token) sanitized.token = '***'
        if (sanitized.authorization) sanitized.authorization = '***'
        return sanitized
      })() : undefined
  }
  
  // 添加错误详情
  if (err instanceof AppError && err.details) {
    errorMeta.details = err.details
  }
  
  // 添加请求上下文信息
  if (context) {
    errorMeta.requestId = context.requestId
    if (context.userId) errorMeta.userId = context.userId
    if (context.ip) errorMeta.ip = context.ip
  }
  
  // 记录错误日志（包含完整的错误对象和堆栈信息）
  logger.error(
    `请求处理错误: ${message}`,
    err,
    errorMeta
  )
  
  // 构建响应对象
  const response: Record<string, unknown> = {
    success: false,
    message,
    code,
    requestId: context?.requestId // 返回请求ID便于追踪
  }
  
  // 开发环境返回详细错误信息
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack
    response.name = err.name
    if (err instanceof AppError && err.details) {
      response.details = err.details
    }
  }
  
  res.status(statusCode).json(response)
}

// 错误类型判断函数
export const isOperationalError = (error: Error): boolean => {
  return error instanceof AppError && error.isOperational
}

// 异步处理器
export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

// 创建错误工具函数
export const createError = (message: string, statusCode: number = 500, code?: string): AppError => {
  return new AppError(message, statusCode, code)
}
