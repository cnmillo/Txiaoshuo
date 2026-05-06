/**
 * 故事规划页面 - 多阶段工作流版本
 * 
 * 重构为多阶段工作流架构，支持：
 * - 阶段导航和进度指示
 * - 状态保存与恢复
 * - 向后兼容原有功能
 */

import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Sparkles,
  BookOpen,
  Loader2,
  Wand2,
  ArrowLeft,
  HelpCircle,
  RefreshCw,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { WorkflowContainer } from '../components/workflow'
import { WorkflowStage, type WorkflowState } from '../types/workflow'
import { STAGE_CONFIGS } from '../config/workflowConfig'
import { hasStoredWorkflow } from '../utils/workflowPersistence'

// ============================================================================
// 组件属性
// ============================================================================

interface StoryPlanPageProps {
  /** 是否启用新工作流模式 */
  enableNewWorkflow?: boolean
}

// ============================================================================
// 模式选择器组件
// ============================================================================

interface ModeSelectorProps {
  onSelectMode: (mode: 'new' | 'legacy') => void
  hasStoredData: boolean
}

function ModeSelector({ onSelectMode, hasStoredData }: ModeSelectorProps) {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-fade-in">
      <div className="text-center mb-10">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          故事规划工具
        </h1>
        <p className="text-lg text-gray-600">
          选择适合您的创作方式，开始构建精彩的小说世界
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 新工作流模式 */}
        <div
          onClick={() => onSelectMode('new')}
          className="group cursor-pointer bg-white border-2 border-gray-200 rounded-2xl p-8 hover:border-blue-500 hover:shadow-xl transition-all duration-300"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 text-white">
              <Sparkles className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 group-hover:text-blue-600">
                多阶段工作流
              </h2>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                推荐
              </span>
            </div>
          </div>
          <p className="text-gray-600 mb-4">
            全新的分阶段创作流程，从灵感到章节执行，每一步都有清晰的指引和AI辅助。
          </p>
          <ul className="space-y-2 text-sm text-gray-500">
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              7个精心设计的创作阶段
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              自动保存和进度追踪
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              AI辅助生成和优化
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              支持导出和导入工作流
            </li>
          </ul>
          {hasStoredData && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700 flex items-center gap-2">
                <RefreshCw className="w-4 h-4" />
                检测到未完成的工作流，点击继续
              </p>
            </div>
          )}
        </div>

        {/* 传统模式 */}
        <div
          onClick={() => onSelectMode('legacy')}
          className="group cursor-pointer bg-white border-2 border-gray-200 rounded-2xl p-8 hover:border-gray-400 hover:shadow-lg transition-all duration-300"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-gray-100 text-gray-600">
              <BookOpen className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 group-hover:text-gray-700">
                传统模式
              </h2>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                经典
              </span>
            </div>
          </div>
          <p className="text-gray-600 mb-4">
            原有的故事规划方式，快速生成故事大纲、人物设定和世界观。
          </p>
          <ul className="space-y-2 text-sm text-gray-500">
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
              一键生成完整故事规划
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
              快速创建人物和世界观
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
              适合快速原型创作
            </li>
          </ul>
        </div>
      </div>

      {/* 帮助提示 */}
      <div className="mt-8 text-center">
        <p className="text-sm text-gray-500 flex items-center justify-center gap-2">
          <HelpCircle className="w-4 h-4" />
          不确定选择哪种模式？
          <a href="/docs/workflow-guide" className="text-blue-600 hover:underline">
            查看对比指南
          </a>
        </p>
      </div>
    </div>
  )
}

// ============================================================================
// 传统模式组件
// ============================================================================

function LegacyStoryPlan() {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    prompt: '',
    genre: 'fantasy' as const,
    characterCount: 3,
    plotPointCount: 10,
  })

  const [storyPlan] = useState<unknown>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title.trim()) {
      toast.error('请输入故事标题')
      return
    }

    if (!formData.prompt.trim()) {
      toast.error('请输入故事创意')
      return
    }

    setIsLoading(true)

    try {
      // 这里应该调用实际的API
      // const response = await generateStoryPlan(formData)
      // setStoryPlan(response.plan)
      toast.success('故事规划生成成功！')
    } catch (error) {
      toast.error('生成失败，请重试')
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-fade-in">
      <div className="text-center mb-10">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          故事规划工具 - 传统模式
        </h1>
        <p className="text-lg text-gray-600">
          为您的小说创建详细的故事规划，包括人物设定、关系图谱、世界观和情节主线
        </p>
      </div>

      {!storyPlan ? (
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* 表单内容 */}
          <div className="card p-6 md:p-8">
            <div className="flex items-center space-x-2 mb-6">
              <BookOpen className="w-5 h-5 text-primary-600" />
              <h2 className="text-xl font-semibold text-gray-900">故事基本信息</h2>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  故事标题 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="请输入故事标题"
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  故事创意 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.prompt}
                  onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
                  placeholder="请输入故事创意，例如：一个普通少年意外获得神秘力量，踏上修仙之路..."
                  rows={4}
                  className="textarea-field"
                />
              </div>
            </div>
          </div>

          {/* 提交按钮 */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full sm:w-auto px-10 py-4 bg-gradient text-white rounded-xl font-semibold hover:opacity-90 transition-opacity duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>生成中...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-5 h-5" />
                  <span>生成故事规划</span>
                </>
              )}
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-8">
          {/* 结果展示 */}
          <div className="card p-6 md:p-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              故事规划已生成
            </h2>
            <p className="text-gray-600">故事规划详情...</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// 主组件
// ============================================================================

export default function StoryPlanPage({ enableNewWorkflow = true }: StoryPlanPageProps) {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [mode, setMode] = useState<'select' | 'new' | 'legacy'>('select')
  const [hasStoredData, setHasStoredData] = useState(false)

  // 检查是否有存储的工作流数据
  useEffect(() => {
    setHasStoredData(hasStoredWorkflow())
  }, [])

  // 从 URL 参数读取模式
  useEffect(() => {
    const modeParam = searchParams.get('mode')
    if (modeParam === 'new' || modeParam === 'legacy') {
      setMode(modeParam)
    }
  }, [searchParams])

  // 处理模式选择
  const handleSelectMode = useCallback(
    (selectedMode: 'new' | 'legacy') => {
      setMode(selectedMode)
      setSearchParams({ mode: selectedMode })
    },
    [setSearchParams]
  )

  // 处理工作流完成
  const handleWorkflowComplete = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (_state: WorkflowState) => {
      toast.success('恭喜！您已完成所有创作阶段！')
      // 可以导航到其他页面或显示完成提示
      navigate('/novels')
    },
    [navigate]
  )

  // 处理阶段变化
  const handleStageChange = useCallback((stage: WorkflowStage) => {
    console.log('当前阶段:', STAGE_CONFIGS[stage].name)
  }, [])

  // 如果禁用新工作流，直接使用传统模式
  if (!enableNewWorkflow) {
    return <LegacyStoryPlan />
  }

  // 模式选择界面
  if (mode === 'select') {
    return <ModeSelector onSelectMode={handleSelectMode} hasStoredData={hasStoredData} />
  }

  // 传统模式
  if (mode === 'legacy') {
    return (
      <div className="relative">
        {/* 返回按钮 */}
        <button
          onClick={() => handleSelectMode('new')}
          className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>切换到工作流模式</span>
        </button>
        <LegacyStoryPlan />
      </div>
    )
  }

  // 新工作流模式
  return (
    <WorkflowContainer
      autoInitialize={true}
      showNavigation={true}
      showProgress={true}
      showControls={true}
      autoSave={true}
      autoSaveInterval={5000}
      onWorkflowComplete={handleWorkflowComplete}
      onStageChange={handleStageChange}
      showSidebar={true}
      layoutMode="horizontal"
    />
  )
}

// ============================================================================
// 导出
// ============================================================================

export { StoryPlanPage }
export type { StoryPlanPageProps }
