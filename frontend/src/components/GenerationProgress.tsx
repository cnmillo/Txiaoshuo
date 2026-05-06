import { useEffect, useState, useCallback, useRef } from 'react'
import { Loader2, BookOpen, Clock, CheckCircle, XCircle } from 'lucide-react'
import { getGenerateProgress } from '../services/api'

interface GenerationProgressProps {
  taskId: string
  onComplete?: () => void
  onFail?: (error: string) => void
}

interface ProgressData {
  id: string
  novelId: string
  status: 'pending' | 'generating' | 'completed' | 'failed' | 'cancelled'
  progress: number
  currentChapter?: number
  totalChapters?: number
  message?: string
  error?: string
  estimatedTimeRemaining?: number
  createdAt: string
  updatedAt: string
}

function formatTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}秒`
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60)
    return `约${minutes}分钟`
  } else {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `约${hours}小时${minutes > 0 ? minutes + '分钟' : ''}`
  }
}

export default function GenerationProgress({ taskId, onComplete, onFail }: GenerationProgressProps) {
  const [progress, setProgress] = useState<ProgressData | null>(null)
  const [displayText, setDisplayText] = useState('')
  const [errorCount, setErrorCount] = useState(0)
  const [hasError, setHasError] = useState(false)
  const [isFinished, setIsFinished] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const fetchProgress = useCallback(async () => {
    if (hasError || isFinished) return
    
    try {
      const data = await getGenerateProgress(taskId)
      
      // 再次检查状态，防止竞态条件
      if (hasError || isFinished) return
      
      setErrorCount(0)
      setProgress(data)
      
      if (data.status === 'completed') {
        setIsFinished(true)
        // 清除轮询
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
        onComplete?.()
      } else if (data.status === 'failed' || data.status === 'cancelled') {
        setIsFinished(true)
        // 清除轮询，确保只调用一次 onFail
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
        onFail?.(data.status === 'cancelled' ? '生成已取消' : (data.error || '生成失败'))
      }
    } catch (error) {
      console.error('获取进度失败', error)
      
      // 再次检查状态，防止竞态条件
      if (hasError || isFinished) return
      
      const newErrorCount = errorCount + 1
      setErrorCount(newErrorCount)
      
      if (newErrorCount >= 3) {
        setHasError(true)
        // 清除轮询
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
        onFail?.('无法获取生成进度，请刷新页面重试')
      }
    }
  }, [taskId, onComplete, onFail, errorCount, hasError, isFinished])

  useEffect(() => {
    if (hasError || isFinished) return
    fetchProgress()
    intervalRef.current = setInterval(fetchProgress, 2000)
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [fetchProgress, hasError, isFinished])

  useEffect(() => {
    if (progress?.message) {
      setDisplayText(progress.message)
    }
  }, [progress?.message])

  if (!progress) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
        <p className="text-gray-600">加载进度中...</p>
      </div>
    )
  }

  const getStatusIcon = () => {
    switch (progress.status) {
      case 'completed':
        return <CheckCircle className="w-8 h-8 text-green-500" />
      case 'failed':
      case 'cancelled':
        return <XCircle className="w-8 h-8 text-red-500" />
      default:
        return <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
    }
  }

  const getStatusText = () => {
    switch (progress.status) {
      case 'pending':
        return '准备中...'
      case 'generating':
        return '生成中'
      case 'completed':
        return '生成完成'
      case 'failed':
        return '生成失败'
      case 'cancelled':
        return '已取消'
      default:
        return ''
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          {getStatusIcon()}
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{getStatusText()}</h3>
            {progress.status === 'generating' && progress.estimatedTimeRemaining && (
              <p className="text-sm text-gray-500 flex items-center mt-1">
                <Clock className="w-4 h-4 mr-1" />
                预计剩余时间：{formatTime(progress.estimatedTimeRemaining)}
              </p>
            )}
          </div>
        </div>
        <div className="text-right">
          <span className="text-3xl font-bold text-primary-600">{progress.progress}%</span>
        </div>
      </div>

      <div className="mb-6">
        <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary-500 to-primary-600 transition-all duration-500 ease-out relative"
            style={{ width: `${progress.progress}%` }}
          >
            <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
          </div>
        </div>
      </div>

      {progress.currentChapter && progress.totalChapters && (
        <div className="flex items-center justify-between mb-4 text-sm text-gray-600">
          <div className="flex items-center space-x-2">
            <BookOpen className="w-4 h-4" />
            <span>
              {progress.currentChapter > progress.totalChapters 
                ? `正在生成第 ${progress.currentChapter} 章（原计划 ${progress.totalChapters} 章）`
                : `章节：${progress.currentChapter} / ${progress.totalChapters}`
              }
            </span>
          </div>
          <span>
            {progress.progress}% 完成
          </span>
        </div>
      )}

      {displayText && (
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <p className="text-sm text-gray-700">{displayText}</p>
        </div>
      )}

      {progress.status === 'generating' && (
        <div className="mt-6">
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <div className="flex space-x-1">
              <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
              <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
              <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
            </div>
            <span>正在努力创作中，请稍候...</span>
          </div>
        </div>
      )}

      {progress.error && (
        <div className="mt-4 p-4 bg-red-50 rounded-lg">
          <p className="text-sm text-red-600">{progress.error}</p>
        </div>
      )}
    </div>
  )
}
