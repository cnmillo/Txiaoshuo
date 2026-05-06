/**
 * AI 导演模式主页面
 * 
 * 整合灵感输入、方案选择、推进方式选择等组件
 * 管理整个 AI 导演模式的流程状态
 */

import React, { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import InspirationInput from '../components/InspirationInput'
import DirectionCandidates from '../components/DirectionCandidates'
import ProgressModeSelector from '../components/ProgressModeSelector'
import {
  type DirectionCandidate,
  DirectorModeStatus,
  ProgressMode,
  IterationType,
  type AutoProgressConfig,
} from '../types/directorMode'
import {
  generateDirectionCandidates,
  modifyCandidate,
  selectCandidate,
  streamGenerateCandidates,
} from '../services/api'
import { useWorkflowStore } from '../stores/workflowStore'
import { WorkflowStage, type InspirationStageData } from '../types/workflow'

/**
 * AI 导演模式页面
 */
const AIDirectorPage: React.FC = () => {
  const navigate = useNavigate()
  const workflowStore = useWorkflowStore()

  // 状态管理
  const [status, setStatus] = useState<DirectorModeStatus>(DirectorModeStatus.IDLE)
  const [currentInspiration, setCurrentInspiration] = useState('')
  const [candidates, setCandidates] = useState<DirectionCandidate[]>([])
  const [currentRound, setCurrentRound] = useState(1)
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null)
  const [selectedCandidate, setSelectedCandidate] = useState<DirectionCandidate | null>(null)
  const [progressMode, setProgressMode] = useState<ProgressMode | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [currentOperation, setCurrentOperation] = useState('')

  // 初始化工作流
  useEffect(() => {
    workflowStore.initialize()
  }, [workflowStore])

  // 处理灵感提交
  const handleInspirationSubmit = useCallback(async (inspiration: string) => {
    setCurrentInspiration(inspiration)
    setStatus(DirectorModeStatus.GENERATING_CANDIDATES)
    setError(null)
    setCurrentOperation('正在生成创作方向候选...')

    try {
      // 使用流式生成
      const newCandidates: DirectionCandidate[] = []
      
      await streamGenerateCandidates({
        inspiration,
        count: 3,
        onCandidateGenerated: (candidate) => {
          newCandidates.push(candidate)
          setCandidates([...newCandidates])
          setCurrentOperation(`已生成 ${newCandidates.length} 个候选方案...`)
        },
        onComplete: (allCandidates) => {
          setCandidates(allCandidates)
          setStatus(DirectorModeStatus.WAITING_SELECTION)
          setCurrentOperation('')
          toast.success(`成功生成 ${allCandidates.length} 个候选方案`)
        },
        onError: (err) => {
          setError(err)
          setStatus(DirectorModeStatus.ERROR)
          setCurrentOperation('')
          toast.error(`生成失败: ${err}`)
        },
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '未知错误'
      setError(errorMessage)
      setStatus(DirectorModeStatus.ERROR)
      setCurrentOperation('')
      toast.error(`生成失败: ${errorMessage}`)
    }
  }, [])

  // 处理方案选择
  const handleCandidateSelect = useCallback((candidateId: string) => {
    setSelectedCandidateId(candidateId)
    const candidate = candidates.find(c => c.id === candidateId)
    if (candidate) {
      setSelectedCandidate(candidate)
      toast.success(`已选择方案: ${candidate.name}`)
    }
  }, [candidates])

  // 处理迭代操作
  const handleIterate = useCallback(async (type: IterationType, candidateId?: string, note?: string) => {
    setStatus(DirectorModeStatus.ITERATING)
    setError(null)

    try {
      switch (type) {
        case IterationType.REGENERATE_ALL: {
          setCurrentOperation('正在重新生成所有候选方案...')
          setCandidates([])
          setSelectedCandidateId(null)
          setSelectedCandidate(null)
          
          const regenerateResponse = await generateDirectionCandidates({
            inspiration: currentInspiration,
            count: 3,
          })
          
          setCandidates(regenerateResponse.candidates)
          setCurrentRound(prev => prev + 1)
          toast.success('已重新生成所有候选方案')
          break
        }

        case IterationType.GENERATE_MORE: {
          setCurrentOperation('正在生成更多候选方案...')
          
          const moreResponse = await generateDirectionCandidates({
            inspiration: currentInspiration,
            count: 2,
          })
          
          setCandidates(prev => [...prev, ...moreResponse.candidates])
          setCurrentRound(prev => prev + 1)
          toast.success(`已生成 ${moreResponse.candidates.length} 个新方案`)
          break
        }

        case IterationType.MODIFY_ONE: {
          if (!candidateId || !note) {
            throw new Error('缺少必要参数')
          }
          
          setCurrentOperation('正在修改方案...')
          
          const modifyResponse = await modifyCandidate({
            candidateId,
            modificationType: 'full',
            modificationNote: note,
          })
          
          setCandidates(prev =>
            prev.map(c => c.id === candidateId ? modifyResponse.candidate : c)
          )
          toast.success('方案修改成功')
          break
        }

        case IterationType.REDO_TITLES: {
          if (!candidateId) {
            throw new Error('缺少方案ID')
          }
          
          setCurrentOperation('正在重新生成标题...')
          
          const titleResponse = await modifyCandidate({
            candidateId,
            modificationType: 'titles',
            modificationNote: '重新生成标题组',
          })
          
          setCandidates(prev =>
            prev.map(c => c.id === candidateId ? titleResponse.candidate : c)
          )
          toast.success('标题重新生成成功')
          break
        }
      }

      setStatus(DirectorModeStatus.WAITING_SELECTION)
      setCurrentOperation('')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '未知错误'
      setError(errorMessage)
      setStatus(DirectorModeStatus.ERROR)
      setCurrentOperation('')
      toast.error(`操作失败: ${errorMessage}`)
    }
  }, [currentInspiration])

  // 处理推进方式选择
  const handleProgressModeSelect = useCallback(async (mode: ProgressMode, config?: AutoProgressConfig) => {
    if (!selectedCandidateId) {
      toast.error('请先选择一个候选方案')
      return
    }

    setStatus(DirectorModeStatus.PROGRESSING)
    setProgressMode(mode)
    setError(null)
    setCurrentOperation('正在启动工作流...')

    try {
      // 调用选择方案 API
      const response = await selectCandidate({
        candidateId: selectedCandidateId,
        progressMode: mode,
        autoProgressConfig: config,
      })

      if (response.success) {
        const inspirationData: InspirationStageData = {
          inspiration: currentInspiration,
          titleCandidates: selectedCandidate?.titleCandidates.map(t => t.title) || [],
          sellingPoints: selectedCandidate?.sellingPoints.map(s => s.title) || [],
          targetReaderFeeling: selectedCandidate?.targetReaderFeeling || '',
          first30ChaptersPromise: selectedCandidate?.first30ChaptersPromise[0]?.content || '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }

        workflowStore.setStageData(WorkflowStage.INSPIRATION, inspirationData)
        workflowStore.startStage(WorkflowStage.INSPIRATION)
        workflowStore.completeStage(WorkflowStage.INSPIRATION)

        if (response.workflowId) {
          const currentState = workflowStore.workflowState
          workflowStore.restore({
            ...currentState,
            id: response.workflowId,
          })
        }

        toast.success('工作流启动成功！')
        setStatus(DirectorModeStatus.COMPLETED)
        setCurrentOperation('')

        navigate('/story-plan')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '未知错误'
      setError(errorMessage)
      setStatus(DirectorModeStatus.ERROR)
      setCurrentOperation('')
      toast.error(`启动失败: ${errorMessage}`)
    }
  }, [selectedCandidateId, selectedCandidate, currentInspiration, workflowStore, navigate])

  // 返回选择方案
  const handleBackToSelection = useCallback(() => {
    setSelectedCandidateId(null)
    setSelectedCandidate(null)
    setProgressMode(null)
    setStatus(DirectorModeStatus.WAITING_SELECTION)
  }, [])

  // 渲染步骤指示器
  const renderStepIndicator = () => {
    const steps = [
      { key: 'inspiration', label: '输入灵感', active: status === DirectorModeStatus.IDLE || status === DirectorModeStatus.GENERATING_CANDIDATES },
      { key: 'candidates', label: '选择方案', active: status === DirectorModeStatus.WAITING_SELECTION || status === DirectorModeStatus.ITERATING },
      { key: 'progress', label: '选择推进方式', active: !!selectedCandidateId && !progressMode },
      { key: 'execute', label: '执行工作流', active: status === DirectorModeStatus.PROGRESSING },
    ]

    const currentStepIndex = steps.findIndex(s => s.active)

    return (
      <div className="flex items-center justify-center mb-8">
        {steps.map((step, index) => (
          <React.Fragment key={step.key}>
            <div className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-medium ${
                  index <= currentStepIndex
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                }`}
              >
                {index + 1}
              </div>
              <span className={`ml-2 text-sm ${
                index <= currentStepIndex
                  ? 'text-gray-900 dark:text-white font-medium'
                  : 'text-gray-500 dark:text-gray-400'
              }`}>
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className={`w-16 h-0.5 mx-4 ${
                index < currentStepIndex
                  ? 'bg-blue-500'
                  : 'bg-gray-200 dark:bg-gray-700'
              }`} />
            )}
          </React.Fragment>
        ))}
      </div>
    )
  }

  // 渲染错误信息
  const renderError = () => {
    if (!error) return null

    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-red-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h4 className="font-medium text-red-800 dark:text-red-200">操作失败</h4>
            <p className="text-sm text-red-600 dark:text-red-300 mt-1">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  // 渲染加载状态
  const renderLoading = () => {
    if (!currentOperation) return null

    return (
      <div className="fixed bottom-6 right-6 bg-blue-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3">
        <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span>{currentOperation}</span>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* 页面标题 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            AI 自动导演模式
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            从灵感到成稿，AI 全程辅助创作
          </p>
        </div>

        {/* 步骤指示器 */}
        {renderStepIndicator()}

        {/* 错误信息 */}
        {renderError()}

        {/* 主要内容区域 */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          {/* 步骤1: 灵感输入 */}
          {(status === DirectorModeStatus.IDLE || status === DirectorModeStatus.GENERATING_CANDIDATES) && (
            <InspirationInput
              onSubmit={handleInspirationSubmit}
              isLoading={status === DirectorModeStatus.GENERATING_CANDIDATES}
            />
          )}

          {/* 步骤2: 方案选择 */}
          {(status === DirectorModeStatus.WAITING_SELECTION || status === DirectorModeStatus.ITERATING) && !selectedCandidateId && (
            <DirectionCandidates
              candidates={candidates}
              currentRound={currentRound}
              isLoading={status === DirectorModeStatus.ITERATING}
              onSelect={handleCandidateSelect}
              onIterate={handleIterate}
              selectedCandidateId={selectedCandidateId}
            />
          )}

          {/* 步骤3: 推进方式选择 */}
          {selectedCandidateId && status !== DirectorModeStatus.PROGRESSING && status !== DirectorModeStatus.COMPLETED && (
            <ProgressModeSelector
              selectedCandidateName={selectedCandidate?.name || ''}
              isLoading={false}
              onSelect={handleProgressModeSelect}
              onBack={handleBackToSelection}
            />
          )}

          {/* 完成状态 */}
          {status === DirectorModeStatus.COMPLETED && (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                工作流启动成功！
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                AI 正在根据您的选择自动推进创作流程
              </p>
              <button
                onClick={() => navigate('/story-plan')}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all"
              >
                查看工作流进度
              </button>
            </div>
          )}
        </div>

        {/* 使用说明 */}
        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6">
          <h3 className="font-bold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            AI 导演模式说明
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-blue-800 dark:text-blue-200">
            <div>
              <h4 className="font-medium mb-1">1. 输入灵感</h4>
              <p>用一两句话描述您的创作想法，AI 会理解并扩展</p>
            </div>
            <div>
              <h4 className="font-medium mb-1">2. 选择方向</h4>
              <p>AI 生成多套完整的创作方向，您可以选择或继续迭代</p>
            </div>
            <div>
              <h4 className="font-medium mb-1">3. 自动推进</h4>
              <p>选择推进方式后，AI 会自动执行相应的工作流程</p>
            </div>
          </div>
        </div>
      </div>

      {/* 加载状态提示 */}
      {renderLoading()}
    </div>
  )
}

export default AIDirectorPage
