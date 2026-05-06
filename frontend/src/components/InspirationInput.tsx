/**
 * 灵感输入组件
 * 
 * 提供美观的灵感输入界面，支持用户输入模糊灵感
 * 包含输入提示和示例，集成到工作流的第一阶段
 */

import React, { useState, useCallback, useEffect, useRef } from 'react'
import { INSPIRATION_PROMPTS, type InspirationPrompt } from '../types/directorMode'
import { useWorkflowStore } from '../stores/workflowStore'
import { WorkflowStage } from '../types/workflow'
import { generateInspiration, type GenerateInspirationResponse } from '../services/api'
import toast from 'react-hot-toast'

interface InspirationInputProps {
  /** 初始值 */
  initialValue?: string
  /** 提交回调（兼容旧接口） */
  onSubmit?: (inspiration: string) => void
  /** 保存回调（工作流接口） */
  onSave?: (data: unknown) => Promise<void>
  /** 完成回调（工作流接口） */
  onComplete?: () => Promise<void>
  /** 是否正在加载 */
  isLoading?: boolean
  /** 占位符文本 */
  placeholder?: string
  /** 最大字符数 */
  maxLength?: number
  /** 最小字符数 */
  minLength?: number
}

/**
 * 灵感输入组件
 */
const InspirationInput: React.FC<InspirationInputProps> = ({
  initialValue = '',
  onSubmit,
  onSave,
  onComplete,
  isLoading = false,
  placeholder = '请输入您的创作灵感，例如：一个普通少年意外获得神秘力量，踏上修仙之路...',
  maxLength = 500,
  minLength = 10,
}) => {
  // 从工作流 store 获取已保存的数据
  const { getStageData, updateStageData } = useWorkflowStore()
  const savedData = getStageData(WorkflowStage.INSPIRATION)
  
  // 使用已保存的数据或初始值
  const [inspiration, setInspiration] = useState(savedData?.inspiration || initialValue)
  const [selectedPrompt, setSelectedPrompt] = useState<InspirationPrompt | null>(null)
  const [showPrompts, setShowPrompts] = useState(true)
  const [isGeneratingAI, setIsGeneratingAI] = useState(false)
  const [aiDirections, setAiDirections] = useState<GenerateInspirationResponse['directions'] | null>(null)
  
  // 防抖保存
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isInitializedRef = useRef(false)

  // 初始化时，如果有已保存的数据，隐藏模板区域
  useEffect(() => {
    if (savedData?.inspiration && savedData.inspiration.length > 0) {
      setShowPrompts(false)
    }
    isInitializedRef.current = true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 自动保存（防抖）
  useEffect(() => {
    if (!isInitializedRef.current) return
    
    // 清除之前的定时器
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    
    // 设置新的定时器，500ms 后保存
    saveTimeoutRef.current = setTimeout(() => {
      if (inspiration.trim().length > 0) {
        updateStageData(WorkflowStage.INSPIRATION, { inspiration: inspiration.trim() })
      }
    }, 500)
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [inspiration, updateStageData])

  // 处理输入变化
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    if (value.length <= maxLength) {
      setInspiration(value)
      setSelectedPrompt(null)
    }
  }, [maxLength])

  // 选择预设提示
  const handlePromptSelect = useCallback((prompt: InspirationPrompt) => {
    setInspiration(prompt.example)
    setSelectedPrompt(prompt)
    setShowPrompts(false)
    // 立即保存选择的内容
    updateStageData(WorkflowStage.INSPIRATION, { inspiration: prompt.example })
  }, [updateStageData])

  // 提交灵感
  const handleSubmit = useCallback(async () => {
    if (inspiration.trim().length >= minLength) {
      const trimmedInspiration = inspiration.trim()
      
      try {
        updateStageData(WorkflowStage.INSPIRATION, { inspiration: trimmedInspiration })
        
        if (onSubmit) {
          onSubmit(trimmedInspiration)
        }
        
        if (onSave) {
          await onSave({ inspiration: trimmedInspiration })
        }
        
        if (onComplete) {
          await onComplete()
        }
      } catch (error) {
        console.error('提交灵感失败:', error)
      }
    }
  }, [inspiration, minLength, onSubmit, onSave, onComplete, updateStageData])

  // AI生成灵感方向
  const handleAIGenerate = useCallback(async () => {
    setIsGeneratingAI(true)
    setAiDirections(null)
    try {
      const result = await generateInspiration({
        keyword: inspiration.trim() || undefined,
        genre: undefined
      })
      setAiDirections(result.directions)
      if (result.directions.length === 0) {
        toast.error('AI未能生成灵感方向，请尝试输入更多关键词')
      }
    } catch (error) {
      console.error('AI生成灵感失败:', error)
      toast.error('AI生成灵感失败，请检查模型配置')
    } finally {
      setIsGeneratingAI(false)
    }
  }, [inspiration])

  // 选择AI生成的方向
  const handleSelectDirection = useCallback((direction: GenerateInspirationResponse['directions'][0]) => {
    const text = `${direction.title}\n\n${direction.description}\n\n核心卖点：${direction.coreSellingPoint}\n目标感受：${direction.targetReaderFeeling}`
    setInspiration(text)
    updateStageData(WorkflowStage.INSPIRATION, { inspiration: text })
    setAiDirections(null)
    setShowPrompts(false)
    toast.success(`已选择方向：${direction.title}`)
  }, [updateStageData])

  // 按键处理
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSubmit()
    }
  }, [handleSubmit])

  // 字符计数
  const charCount = inspiration.length
  const isValid = inspiration.trim().length >= minLength
  const progress = Math.min((charCount / maxLength) * 100, 100)

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* 标题区域 */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          输入您的创作灵感
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          用一两句话描述您想要创作的故事核心，AI 将为您生成多套完整的创作方向
        </p>
      </div>

      {/* 预设提示区域 */}
      {showPrompts && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              快速开始 - 选择一个灵感模板
            </h3>
            <button
              onClick={() => setShowPrompts(false)}
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              隐藏模板
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {INSPIRATION_PROMPTS.map((prompt) => (
              <button
                key={prompt.title}
                onClick={() => handlePromptSelect(prompt)}
                className={`p-4 text-left rounded-lg border-2 transition-all duration-200 ${
                  selectedPrompt?.title === prompt.title
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 bg-white dark:bg-gray-800'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    prompt.category === 'character' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' :
                    prompt.category === 'plot' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                    prompt.category === 'setting' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' :
                    prompt.category === 'theme' ? 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300' :
                    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                  }`}>
                    {prompt.category === 'character' ? '角色' :
                     prompt.category === 'plot' ? '情节' :
                     prompt.category === 'setting' ? '设定' :
                     prompt.category === 'theme' ? '主题' : '风格'}
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {prompt.title}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                  {prompt.description}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 输入区域 */}
      <div className="space-y-3">
        <div className="relative">
          <textarea
            value={inspiration}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isLoading}
            rows={4}
            className={`w-full px-4 py-3 text-lg rounded-xl border-2 resize-none transition-all duration-200 ${
              isLoading
                ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed border-gray-200 dark:border-gray-700'
                : isValid
                ? 'border-green-300 dark:border-green-600 bg-white dark:bg-gray-800 focus:border-green-500 focus:ring-2 focus:ring-green-200 dark:focus:ring-green-800'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800'
            } text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500`}
          />
          
          {/* 字符计数和进度条 */}
          <div className="absolute bottom-3 right-3 flex items-center gap-2">
            <div className="w-20 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-200 ${
                  charCount > maxLength * 0.9
                    ? 'bg-red-500'
                    : charCount > maxLength * 0.7
                    ? 'bg-yellow-500'
                    : 'bg-blue-500'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className={`text-xs ${
              charCount > maxLength
                ? 'text-red-500'
                : charCount > maxLength * 0.9
                ? 'text-yellow-500'
                : 'text-gray-400 dark:text-gray-500'
            }`}>
              {charCount}/{maxLength}
            </span>
          </div>
        </div>

        {/* 提示信息 */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            {isValid ? (
              <>
                <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-green-600 dark:text-green-400">
                  灵感描述完整，可以开始生成
                </span>
              </>
            ) : (
              <span className="text-gray-500 dark:text-gray-400">
                至少需要 {minLength} 个字符（当前 {charCount} 个）
              </span>
            )}
          </div>
          
          <span className="text-gray-400 dark:text-gray-500">
            按 Ctrl/Cmd + Enter 快速提交
          </span>
        </div>
      </div>

      {/* 提交按钮 */}
      <div className="flex justify-center gap-3">
        <button
          onClick={handleAIGenerate}
          disabled={isGeneratingAI || isLoading}
          className={`px-6 py-3 text-base font-medium rounded-xl transition-all duration-200 flex items-center gap-2 ${
            isGeneratingAI
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
          }`}
        >
          {isGeneratingAI ? (
            <>
              <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>AI 生成中...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
              <span>AI 生成灵感</span>
            </>
          )}
        </button>
        <button
          onClick={handleSubmit}
          disabled={!isValid || isLoading}
          className={`px-8 py-3 text-lg font-medium rounded-xl transition-all duration-200 flex items-center gap-3 ${
            isValid && !isLoading
              ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
          }`}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>AI 正在思考中...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>开始生成创作方向</span>
            </>
          )}
        </button>
      </div>

      {/* AI生成的方向选择 */}
      {aiDirections && aiDirections.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-purple-700 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
              AI 为您生成了 {aiDirections.length} 个创作方向
            </h3>
            <button onClick={() => setAiDirections(null)} className="text-sm text-gray-500 hover:text-gray-700">关闭</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {aiDirections.map((direction, index) => (
              <button
                key={index}
                onClick={() => handleSelectDirection(direction)}
                className="p-4 text-left rounded-lg border-2 border-purple-200 hover:border-purple-400 bg-white hover:bg-purple-50 transition-all duration-200"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-700">{direction.genre}</span>
                  <span className="font-medium text-gray-900">{direction.title}</span>
                </div>
                <p className="text-sm text-gray-600 line-clamp-3 mb-2">{direction.description}</p>
                <div className="text-xs text-purple-600">
                  <span>卖点：{direction.coreSellingPoint}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 使用提示 */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 space-y-2">
        <h4 className="font-medium text-blue-900 dark:text-blue-100 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          灵感输入小贴士
        </h4>
        <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
          <li>• 描述主角的核心特征和故事起点</li>
          <li>• 提及故事的主要冲突或目标</li>
          <li>• 可以包含您想要的故事风格或氛围</li>
          <li>• 不必过于详细，AI 会帮您扩展和完善</li>
        </ul>
      </div>
    </div>
  )
}

export default InspirationInput
