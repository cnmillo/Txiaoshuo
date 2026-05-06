import React, { useState, useEffect, useCallback } from 'react'
import { createQualityTask, executeQualityTask, getQualityTask, getQualityResults } from '../services/api'

interface QualityImprovementProps {
  novelId: string
  onRefresh?: () => void
}

type QualityTaskType = 'plot_check' | 'detail_enhance' | 'ending_improve' | 'proofread'

interface TaskState {
  isProcessing: boolean
  progress: number
  taskId?: string
  error?: string
}

interface Result {
  id: string
  type: QualityTaskType
  originalContent?: string
  improvedContent?: string
  suggestions?: string[]
  issues?: string[]
  score?: number
  createdAt: string
}

const taskTypes: Record<QualityTaskType, { name: string; description: string; icon: string }> = {
  plot_check: {
    name: '情节线索完整性检查',
    description: '检查故事情节的连贯性、伏笔呼应和逻辑一致性',
    icon: '🔍'
  },
  detail_enhance: {
    name: '补充细节描述和情感渲染',
    description: '增强场景描写、人物情感和环境氛围',
    icon: '✨'
  },
  ending_improve: {
    name: '完善结局和后续伏笔',
    description: '优化结局设计，添加伏笔和悬念',
    icon: '🎯'
  },
  proofread: {
    name: '全文校对和格式统一',
    description: '检查错别字、标点符号和格式一致性',
    icon: '📝'
  }
}

interface TaskCardProps {
  type: QualityTaskType
  latestResult?: Result
  isProcessing: boolean
  currentProgress: number
  error?: string
  onExecute: () => void
}

const TaskCard: React.FC<TaskCardProps> = ({ type, latestResult, isProcessing, currentProgress, error, onExecute }) => {
  const taskInfo = taskTypes[type]
  const [showDetails, setShowDetails] = useState(false)

  return (
    <div className={`border rounded-lg p-5 transition-all duration-300 ${isProcessing ? 'border-blue-400 bg-blue-50 shadow-md' : 'border-gray-200 bg-white hover:shadow-md'}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{taskInfo.icon}</span>
          <div>
            <h3 className="font-semibold text-gray-800">{taskInfo.name}</h3>
            <p className="text-sm text-gray-500 mt-1">{taskInfo.description}</p>
          </div>
        </div>
        {latestResult?.score && (
          <div className="flex flex-col items-end">
            <span className="text-2xl font-bold text-green-600">{latestResult.score}</span>
            <span className="text-xs text-gray-500">评分</span>
          </div>
        )}
      </div>

      {error && !isProcessing && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-red-800">执行失败</p>
              <p className="text-xs text-red-600 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {isProcessing && (
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>正在处理...</span>
            <span>{currentProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${currentProgress}%` }}
            />
          </div>
        </div>
      )}

      {latestResult && !isProcessing && (
        <div className="mb-4 text-sm">
          <div className="flex items-center gap-2 text-gray-500">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>上次执行: {new Date(latestResult.createdAt).toLocaleString()}</span>
          </div>
          
          {(latestResult.issues && latestResult.issues.length > 0) && (
            <div className="mt-2">
              <div 
                className="flex items-center gap-1 cursor-pointer text-amber-600 hover:text-amber-700"
                onClick={() => setShowDetails(!showDetails)}
              >
                <span>发现 {latestResult.issues.length} 个问题</span>
                <svg className={`w-4 h-4 transition-transform ${showDetails ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              {showDetails && (
                <ul className="mt-2 space-y-1 text-gray-600 bg-amber-50 p-2 rounded">
                  {latestResult.issues.map((issue, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-amber-500 mt-0.5">•</span>
                      <span>{issue}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {(latestResult.suggestions && latestResult.suggestions.length > 0) && (
            <div className="mt-2">
              <div className="text-green-600">
                💡 {latestResult.suggestions.length} 条改进建议
              </div>
            </div>
          )}
        </div>
      )}

      <button
        onClick={onExecute}
        disabled={isProcessing}
        className={`w-full py-2.5 px-4 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
          isProcessing 
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
            : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98]'
        }`}
      >
        {isProcessing ? (
          <>
            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>处理中...</span>
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>执行</span>
          </>
        )}
      </button>
    </div>
  )
}

const QualityImprovement: React.FC<QualityImprovementProps> = ({ novelId, onRefresh }) => {
  const [results, setResults] = useState<Result[]>([])
  const [taskStates, setTaskStates] = useState<Record<QualityTaskType, TaskState>>({
    plot_check: { isProcessing: false, progress: 0 },
    detail_enhance: { isProcessing: false, progress: 0 },
    ending_improve: { isProcessing: false, progress: 0 },
    proofread: { isProcessing: false, progress: 0 }
  })

  const fetchResults = useCallback(async () => {
    try {
      const data = await getQualityResults(novelId)
      setResults(data.map(item => ({
        id: item.id,
        type: item.type as QualityTaskType,
        suggestions: item.suggestions,
        issues: item.issues,
        score: item.score,
        createdAt: item.createdAt
      })))
    } catch (error) {
      console.error('获取质量提升结果失败:', error)
    }
  }, [novelId])

  useEffect(() => {
    if (novelId) {
      fetchResults()
    }
  }, [fetchResults, novelId])

  const pollTaskStatus = useCallback(async (taskId: string, type: QualityTaskType) => {
    try {
      const data = await getQualityTask(taskId)
      const progress = data.status === 'completed' ? 100 : data.status === 'processing' ? 50 : 0
      
      setTaskStates(prev => ({
        ...prev,
        [type]: {
          isProcessing: data.status === 'processing',
          progress,
          taskId,
          error: data.status === 'failed' ? data.error : undefined
        }
      }))

      if (data.status === 'completed') {
        fetchResults()
        if (onRefresh) onRefresh()
        setTimeout(() => {
          setTaskStates(prev => ({
            ...prev,
            [type]: { isProcessing: false, progress: 100 }
          }))
        }, 1000)
      } else if (data.status === 'failed') {
        setTaskStates(prev => ({
          ...prev,
          [type]: { isProcessing: false, progress: 0, error: data.error }
        }))
      } else if (data.status === 'processing') {
        setTimeout(() => pollTaskStatus(taskId, type), 2000)
      }
    } catch (error) {
      console.error('获取任务状态失败:', error)
      setTaskStates(prev => ({
        ...prev,
        [type]: { isProcessing: false, progress: 0, error: error instanceof Error ? error.message : '获取任务状态失败' }
      }))
    }
  }, [fetchResults, onRefresh])

  const handleTaskExecute = async (type: QualityTaskType) => {
    setTaskStates(prev => ({
      ...prev,
      [type]: { isProcessing: true, progress: 5 }
    }))

    try {
      const task = await createQualityTask(novelId, type)
      
      setTaskStates(prev => ({
        ...prev,
        [type]: { isProcessing: true, progress: 10, taskId: task.id }
      }))

      executeQualityTask(task.id).catch(err => {
        console.error('执行质量提升任务失败:', err)
      })
      
      setTimeout(() => pollTaskStatus(task.id, type), 1000)
    } catch (error) {
      console.error('创建质量提升任务失败:', error)
      setTaskStates(prev => ({
        ...prev,
        [type]: { isProcessing: false, progress: 0, error: error instanceof Error ? error.message : '创建任务失败' }
      }))
    }
  }

  const getLatestResult = (type: QualityTaskType): Result | undefined => {
    return results
      .filter(result => result.type === type)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
  }

  const processingCount = Object.values(taskStates).filter(s => s.isProcessing).length

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800">质量提升</h2>
        {processingCount > 0 && (
          <span className="text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
            {processingCount} 个任务执行中
          </span>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(Object.keys(taskTypes) as QualityTaskType[]).map(type => (
          <TaskCard
            key={type}
            type={type}
            latestResult={getLatestResult(type)}
            isProcessing={taskStates[type].isProcessing}
            currentProgress={taskStates[type].progress}
            error={taskStates[type].error}
            onExecute={() => handleTaskExecute(type)}
          />
        ))}
      </div>

      {results.length > 0 && (
        <div className="mt-8">
          <h3 className="font-medium text-gray-700 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            历史记录
          </h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {results.slice(0, 10).map(result => (
              <div key={result.id} className="border border-gray-100 rounded-lg p-3 bg-gray-50">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{taskTypes[result.type].icon}</span>
                    <span className="font-medium text-gray-700">{taskTypes[result.type].name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {result.score && (
                      <span className="text-green-600 font-semibold">{result.score}分</span>
                    )}
                    <span className="text-sm text-gray-400">
                      {new Date(result.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default QualityImprovement
