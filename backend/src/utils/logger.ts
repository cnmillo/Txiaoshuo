import { createWriteStream, existsSync, mkdirSync, statSync, renameSync, readdirSync, unlinkSync } from 'fs'
import { join } from 'path'
import { AsyncLocalStorage } from 'async_hooks'

// 日志级别
enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

// 颜色代码（用于控制台输出）
const Colors = {
  RESET: '\x1b[0m',
  BRIGHT: '\x1b[1m',
  DIM: '\x1b[2m',
  RED: '\x1b[31m',
  GREEN: '\x1b[32m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  MAGENTA: '\x1b[35m',
  CYAN: '\x1b[36m',
  WHITE: '\x1b[37m'
}

// 日志级别对应的颜色
const LevelColors: Record<string, string> = {
  DEBUG: Colors.CYAN,
  INFO: Colors.GREEN,
  WARN: Colors.YELLOW,
  ERROR: Colors.RED
}

// 请求上下文存储
interface RequestContext {
  requestId: string
  userId?: string
  ip?: string
  method?: string
  path?: string
  userAgent?: string
  [key: string]: unknown
}

// 使用 AsyncLocalStorage 存储请求上下文
const asyncLocalStorage = new AsyncLocalStorage<RequestContext>()

/**
 * 生成请求ID
 */
function generateRequestId(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 10)
  return `${timestamp}-${random}`
}

/**
 * 获取当前请求上下文
 */
export function getRequestContext(): RequestContext | undefined {
  return asyncLocalStorage.getStore()
}

/**
 * 设置请求上下文
 */
export function setRequestContext(context: RequestContext): void {
  asyncLocalStorage.enterWith(context)
}

/**
 * 更新请求上下文
 */
export function updateRequestContext(updates: Partial<RequestContext>): void {
  const current = asyncLocalStorage.getStore()
  if (current) {
    Object.assign(current, updates)
  }
}

/**
 * 深度序列化错误对象
 * 能够处理 Error 对象、嵌套错误、循环引用和自定义错误属性
 */
function serializeError(error: unknown, seen: WeakSet<object> = new WeakSet()): Record<string, unknown> {
  // 处理基本类型和 null
  if (error === null || error === undefined) {
    return { value: error }
  }

  if (typeof error !== 'object') {
    return { value: error }
  }

  // 处理循环引用
  if (seen.has(error as object)) {
    return { circularReference: true }
  }

  seen.add(error as object)

  // 处理 Error 对象
  if (error instanceof Error) {
    const serialized: Record<string, unknown> = {
      name: error.name,
      message: error.message,
      stack: error.stack
    }

    // 处理自定义错误属性
    const errorObj = error as unknown as Record<string, unknown>
    for (const key of Object.keys(errorObj)) {
      if (!['name', 'message', 'stack'].includes(key)) {
        const value = errorObj[key]
        // 递归处理嵌套对象和错误
        if (value instanceof Error) {
          serialized[key] = serializeError(value, seen)
        } else if (typeof value === 'object' && value !== null) {
          serialized[key] = serializeError(value, seen)
        } else {
          serialized[key] = value
        }
      }
    }

    // 处理 cause 属性（Error Cause 提案）
    if ('cause' in error && error.cause !== undefined) {
      serialized.cause = serializeError(error.cause, seen)
    }

    return serialized
  }

  // 处理普通对象
  const result: Record<string, unknown> = {}
  const obj = error as Record<string, unknown>

  for (const key of Object.keys(obj)) {
    const value = obj[key]
    if (value instanceof Error) {
      result[key] = serializeError(value, seen)
    } else if (typeof value === 'object' && value !== null) {
      result[key] = serializeError(value, seen)
    } else {
      result[key] = value
    }
  }

  return result
}

// 当前日志级别
const currentLogLevel = process.env.LOG_LEVEL
  ? LogLevel[process.env.LOG_LEVEL.toUpperCase() as keyof typeof LogLevel] ?? LogLevel.INFO
  : LogLevel.INFO

// 日志目录
const LOG_DIR = process.env.LOG_DIR || './logs'

// 日志文件最大大小（默认 10MB）
const MAX_LOG_SIZE = parseInt(process.env.MAX_LOG_SIZE || '10485760', 10)

// 日志文件最大数量（默认 5个）
const MAX_LOG_FILES = parseInt(process.env.MAX_LOG_FILES || '5', 10)

// 是否为测试环境
const IS_TEST_ENV = process.env.NODE_ENV === 'test'

// 确保日志目录存在（非测试环境）
if (!IS_TEST_ENV && !existsSync(LOG_DIR)) {
  mkdirSync(LOG_DIR, { recursive: true })
}

/**
 * 获取当前日期字符串（YYYY-MM-DD）
 */
function getDateString(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

/**
 * 检查并轮转日志文件
 */
function checkLogRotation(filePath: string): void {
  try {
    if (!existsSync(filePath)) return

    const stats = statSync(filePath)
    if (stats.size >= MAX_LOG_SIZE) {
      // 轮转日志文件
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const rotatedPath = filePath.replace('.log', `-${timestamp}.log`)
      renameSync(filePath, rotatedPath)

      // 清理旧日志文件（保留最新的 MAX_LOG_FILES 个）
      cleanOldLogFiles(LOG_DIR)
    }
  } catch (error) {
    console.error('日志轮转失败:', error)
  }
}

/**
 * 清理旧日志文件，保留最新的 MAX_LOG_FILES 个
 */
function cleanOldLogFiles(logDir: string): void {
  try {
    const files = readdirSync(logDir)
      .filter(f => f.endsWith('.log'))
      .map(f => ({
        name: f,
        path: join(logDir, f),
        time: statSync(join(logDir, f)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time)

    // 删除超出保留数量的旧日志文件
    if (files.length > MAX_LOG_FILES) {
      files.slice(MAX_LOG_FILES).forEach(f => {
        try {
          unlinkSync(f.path)
          console.log(`已清理旧日志文件: ${f.name}`)
        } catch {
          // 忽略删除失败
        }
      })
    }
  } catch (error) {
    console.error('清理旧日志文件失败:', error)
  }
}

// 日志文件流（非测试环境）
const getLogFilePath = (filename: string) => join(LOG_DIR, `${getDateString()}-${filename}`)
const logFile = IS_TEST_ENV ? null : createWriteStream(getLogFilePath('app.log'), { flags: 'a' })
const errorFile = IS_TEST_ENV ? null : createWriteStream(getLogFilePath('error.log'), { flags: 'a' })

/**
 * 格式化时间戳
 */
function formatTimestamp(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')
  const ms = String(now.getMilliseconds()).padStart(3, '0')
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${ms}`
}

/**
 * 获取调用位置信息
 */
function getCallerInfo(): string {
  const stack = new Error().stack
  if (!stack) return ''

  const lines = stack.split('\n')
  // 查找第一个非 logger.ts 的调用位置
  for (let i = 3; i < lines.length; i++) {
    const line = lines[i]
    if (line && !line.includes('logger.ts')) {
      const match = line.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/)
      if (match) {
        const [, , file, lineNum] = match
        const fileName = file.split('/').pop() || file.split('\\').pop() || file
        return `${fileName}:${lineNum}`
      }
      // 简化格式
      const simpleMatch = line.match(/at\s+(.+?):(\d+):(\d+)/)
      if (simpleMatch) {
        const [, file, lineNum] = simpleMatch
        const fileName = file.split('/').pop() || file.split('\\').pop() || file
        return `${fileName}:${lineNum}`
      }
    }
  }
  
  return ''
}

/**
 * 格式化日志消息（JSON格式，便于日志分析）
 */
function formatLogMessage(level: string, message: string, meta?: Record<string, unknown>): string {
  const timestamp = formatTimestamp()
  const context = getRequestContext()
  const caller = getCallerInfo()
  
  const logEntry: Record<string, unknown> = {
    timestamp,
    level,
    message,
    pid: process.pid,
    ...meta
  }

  // 添加请求上下文
  if (context) {
    logEntry.requestId = context.requestId
    if (context.userId) logEntry.userId = context.userId
    if (context.ip) logEntry.ip = context.ip
    if (context.method) logEntry.method = context.method
    if (context.path) logEntry.path = context.path
  }

  // 添加调用位置
  if (caller) {
    logEntry.caller = caller
  }

  return JSON.stringify(logEntry) + '\n'
}

/**
 * 格式化控制台日志（带颜色和更易读的格式）
 */
function formatConsoleMessage(level: string, message: string, meta?: Record<string, unknown>): string {
  const timestamp = formatTimestamp()
  const context = getRequestContext()
  const color = LevelColors[level] || Colors.WHITE
  
  // 构建基础消息
  let output = `${Colors.DIM}${timestamp}${Colors.RESET} `
  output += `${color}${Colors.BRIGHT}[${level.padEnd(5)}]${Colors.RESET} `
  
  // 添加请求ID
  if (context?.requestId) {
    output += `${Colors.MAGENTA}[${context.requestId}]${Colors.RESET} `
  }
  
  output += message
  
  // 添加元数据
  if (meta && Object.keys(meta).length > 0) {
    output += ` ${Colors.DIM}${JSON.stringify(meta)}${Colors.RESET}`
  }
  
  return output
}

/**
 * 写入日志
 */
function writeLog(level: string, message: string, meta?: Record<string, unknown>): void {
  // 检查日志轮转（非测试环境）
  if (!IS_TEST_ENV) {
    checkLogRotation(getLogFilePath('app.log'))
    if (level === 'ERROR') {
      checkLogRotation(getLogFilePath('error.log'))
    }
  }
  
  const formatted = formatLogMessage(level, message, meta)
  const consoleFormatted = formatConsoleMessage(level, message, meta)

  // 写入控制台
  if (level === 'ERROR') {
    console.error(consoleFormatted)
    if (!IS_TEST_ENV && errorFile) {
      errorFile.write(formatted)
    }
  } else if (level === 'WARN') {
    console.warn(consoleFormatted)
  } else {
    console.log(consoleFormatted)
  }

  // 写入日志文件（非测试环境）
  if (!IS_TEST_ENV && logFile) {
    logFile.write(formatted)
  }
}

/**
 * 创建子日志器（带固定上下文）
 */
export function createLogger(context: Record<string, unknown>) {
  return {
    debug: (message: string, meta?: Record<string, unknown>): void => {
      if (currentLogLevel <= LogLevel.DEBUG) {
        writeLog('DEBUG', message, { ...context, ...meta })
      }
    },

    info: (message: string, meta?: Record<string, unknown>): void => {
      if (currentLogLevel <= LogLevel.INFO) {
        writeLog('INFO', message, { ...context, ...meta })
      }
    },

    warn: (message: string, meta?: Record<string, unknown>): void => {
      if (currentLogLevel <= LogLevel.WARN) {
        writeLog('WARN', message, { ...context, ...meta })
      }
    },

    error: (message: string, error?: Error | unknown, meta?: Record<string, unknown>): void => {
      if (currentLogLevel <= LogLevel.ERROR) {
        const errorMeta: Record<string, unknown> = { ...context, ...meta }

        if (error !== undefined) {
          errorMeta.error = serializeError(error)
        }

        writeLog('ERROR', message, errorMeta)
      }
    }
  }
}

/**
 * 日志对象
 */
export const logger = {
  debug: (message: string, meta?: Record<string, unknown>): void => {
    if (currentLogLevel <= LogLevel.DEBUG) {
      writeLog('DEBUG', message, meta)
    }
  },

  info: (message: string, meta?: Record<string, unknown>): void => {
    if (currentLogLevel <= LogLevel.INFO) {
      writeLog('INFO', message, meta)
    }
  },

  warn: (message: string, meta?: Record<string, unknown>): void => {
    if (currentLogLevel <= LogLevel.WARN) {
      writeLog('WARN', message, meta)
    }
  },

  error: (message: string, error?: Error | unknown, meta?: Record<string, unknown>): void => {
    if (currentLogLevel <= LogLevel.ERROR) {
      const errorMeta: Record<string, unknown> = { ...meta }

      if (error !== undefined) {
        // 使用 serializeError 函数深度序列化错误对象
        errorMeta.error = serializeError(error)
      }

      writeLog('ERROR', message, errorMeta)
    }
  },

  // 创建子日志器
  child: createLogger,

  // 性能追踪
  time: (label: string): void => {
    const startTime = Date.now()
    const context = getRequestContext()
    const requestId = context?.requestId
    
    // 存储开始时间
    const key = `time_${label}_${requestId || 'global'}`
    ;(global as Record<string, unknown>)[key] = startTime
  },

  timeEnd: (label: string, meta?: Record<string, unknown>): void => {
    const context = getRequestContext()
    const requestId = context?.requestId
    const key = `time_${label}_${requestId || 'global'}`
    const startTime = (global as Record<string, unknown>)[key] as number
    
    if (startTime) {
      const duration = Date.now() - startTime
      writeLog('INFO', `${label} 完成`, { duration: `${duration}ms`, ...meta })
      delete (global as Record<string, unknown>)[key]
    }
  }
}

export default logger
export { generateRequestId, LogLevel }
