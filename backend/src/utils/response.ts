import type { Response, Request } from 'express'
import type { ApiResponse } from '../types/index.js'

/**
 * 发送成功响应
 */
export function sendSuccess<T>(res: Response, data: T, message?: string, statusCode: number = 200): void {
  const response: ApiResponse<T> = {
    success: true,
    data,
    message
  }
  res.status(statusCode).json(response)
}

/**
 * 发送错误响应
 */
export function sendError(res: Response, message: string, statusCode: number = 400, code?: string): void {
  const response: ApiResponse = {
    success: false,
    message,
    code
  }
  res.status(statusCode).json(response)
}

/**
 * 发送分页响应
 */
export function sendPaginated<T>(res: Response, data: T[], total: number, page: number, limit: number): void {
  const totalPages = Math.ceil(total / limit)
  const response = {
    success: true,
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  }
  res.status(200).json(response)
}

/**
 * 处理 Zod 验证错误
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function handleZodError(res: Response, error: any): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const errorMessages = error.errors.map((err: any) => `${err.path.join('.')}: ${err.message}`)
  sendError(res, `请求参数错误：${errorMessages.join(', ')}`, 400)
}

/**
 * 自动处理API请求
 */
export async function handleApiRequest<T>(
  req: Request,
  res: Response,
  handler: () => Promise<T>,
  successMessage?: string
): Promise<void> {
  try {
    const data = await handler()
    sendSuccess(res, data, successMessage)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    if (error?.name === 'ZodError') {
      handleZodError(res, error)
    } else {
      // 增强日志记录
      console.error('API 请求处理失败:', {
        method: req.method,
        url: req.url,
        body: req.body,
        query: req.query,
        params: req.params,
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name
        }
      })
      
      // 提供更具体的错误信息
      const errorMessage = error.message || ErrorMessages.INTERNAL_ERROR
      sendError(res, errorMessage, 500, error.name)
    }
  }
}

/**
 * 自动处理异步 API 请求
 */
export function asyncHandler<T>(
  handler: (req: Request, res: Response) => Promise<T>
): // eslint-disable-next-line @typescript-eslint/no-explicit-any
any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return async (req: Request, res: Response, next: any) => {
    try {
      await handler(req, res)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      if (error?.name === 'ZodError') {
        handleZodError(res, error)
      } else {
        // 增强日志记录
        console.error('API 请求处理失败:', {
          method: req.method,
          url: req.url,
          body: req.body,
          query: req.query,
          params: req.params,
          error: {
            message: error.message,
            stack: error.stack,
            name: error.name
          }
        })
        next(error)
      }
    }
  }
}

/**
 * 常见错误消息
 */
export const ErrorMessages = {
  // 通用错误
  INTERNAL_ERROR: '服务器内部错误，请稍后重试',
  INVALID_REQUEST: '无效的请求参数',
  UNAUTHORIZED: '未授权访问',
  FORBIDDEN: '禁止访问',
  NOT_FOUND: '资源不存在',
  METHOD_NOT_ALLOWED: '请求方法不允许',
  TIMEOUT: '请求超时',

  // 小说相关错误
  NOVEL_NOT_FOUND: '小说不存在',
  NOVEL_CREATE_FAILED: '创建小说失败',
  NOVEL_UPDATE_FAILED: '更新小说失败',
  NOVEL_DELETE_FAILED: '删除小说失败',
  INVALID_NOVEL_DATA: '无效的小说数据',
  DUPLICATE_NOVEL_TITLE: '小说标题已存在',

  // 章节相关错误
  CHAPTER_NOT_FOUND: '章节不存在',
  CHAPTER_CREATE_FAILED: '创建章节失败',
  CHAPTER_UPDATE_FAILED: '更新章节失败',
  CHAPTER_DELETE_FAILED: '删除章节失败',
  INVALID_CHAPTER_DATA: '无效的章节数据',

  // 生成相关错误
  GENERATION_NOT_FOUND: '生成任务不存在',
  GENERATION_FAILED: '生成失败',
  GENERATION_CANCELLED: '生成已取消',
  AI_SERVICE_ERROR: 'AI服务调用失败',
  INVALID_AI_CONFIG: 'AI配置无效',

  // 导出相关错误
  EXPORT_FAILED: '导出失败',
  INVALID_EXPORT_FORMAT: '无效的导出格式',

  // 设置相关错误
  SETTINGS_NOT_FOUND: '设置不存在',
  SETTINGS_UPDATE_FAILED: '更新设置失败',
  INVALID_SETTINGS: '无效的设置数据',

  // 数据库错误
  DATABASE_ERROR: '数据库操作失败',
  DATABASE_CONNECTION_ERROR: '数据库连接失败'
} as const

/**
 * HTTP状态码
 */
export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
} as const
