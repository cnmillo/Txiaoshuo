/**
 * 项目设定表单组件
 * 
 * 用于收集项目设定的必填和可选信息
 * 集成工作流状态管理，支持表单验证和实时保存
 */

import { useState, useEffect, useCallback } from 'react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { Save, AlertCircle, CheckCircle, Info, ChevronDown, Sparkles } from 'lucide-react'
import { useWorkflowStore } from '../stores/workflowStore'
import { WorkflowStage } from '../types/workflow'
import type { NovelStyle } from '@shared/types'
import type { ProjectSettingStageData } from '../types/workflow'
import { generateProjectSetting } from '../services/api'
import toast from 'react-hot-toast'

// ============================================================================
// 工具函数
// ============================================================================

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ============================================================================
// 题材选项配置
// ============================================================================

const GENRE_OPTIONS: { value: NovelStyle; label: string; description: string }[] = [
  { value: 'fantasy', label: '玄幻', description: '奇幻修仙、异世大陆、东方玄幻等' },
  { value: 'wuxia', label: '武侠', description: '江湖恩怨、武林争霸、传统武侠等' },
  { value: 'xianxia', label: '仙侠', description: '修真问道、仙界纷争、飞升成仙等' },
  { value: 'romance', label: '言情', description: '都市情感、古代言情、甜宠虐恋等' },
  { value: 'scifi', label: '科幻', description: '未来世界、太空探索、赛博朋克等' },
  { value: 'mystery', label: '悬疑', description: '推理破案、惊悚悬疑、刑侦探案等' },
  { value: 'history', label: '历史', description: '历史演义、穿越历史、架空历史等' },
  { value: 'urban', label: '都市', description: '现代都市生活、职场商战、都市异能等' },
  { value: 'game', label: '游戏', description: '网游、电竞、虚拟现实、游戏异界等' },
  { value: 'military', label: '军事', description: '战争军事、军旅生涯、热血军魂等' },
  { value: 'sports', label: '竞技', description: '体育竞技、热血运动、赛场拼搏等' },
  { value: 'lifestyle', label: '生活', description: '现实题材、家长里短、都市生活等' },
  { value: 'horror', label: '灵异', description: '鬼怪灵异、恐怖惊悚、民间传说等' },
  { value: 'fantasy_western', label: '奇幻', description: '西方奇幻、魔法世界、龙与地下城等' },
  { value: 'other', label: '其他', description: '其他类型或跨类型作品' },
]

// 写作风格选项
const WRITING_STYLE_OPTIONS = [
  { value: '轻松幽默', label: '轻松幽默' },
  { value: '热血激昂', label: '热血激昂' },
  { value: '细腻温情', label: '细腻温情' },
  { value: '悬疑烧脑', label: '悬疑烧脑' },
  { value: '暗黑压抑', label: '暗黑压抑' },
  { value: '爽文快节奏', label: '爽文快节奏' },
  { value: '慢热治愈', label: '慢热治愈' },
  { value: '史诗宏大', label: '史诗宏大' },
]

// 预计字数选项
const WORD_COUNT_OPTIONS = [
  { value: 50000, label: '5万字（短篇）' },
  { value: 100000, label: '10万字（中短篇）' },
  { value: 200000, label: '20万字（中篇）' },
  { value: 300000, label: '30万字（中长篇）' },
  { value: 500000, label: '50万字（长篇）' },
  { value: 1000000, label: '100万字（超长篇）' },
  { value: 2000000, label: '200万字（巨著）' },
  { value: 3000000, label: '300万字（史诗巨著）' },
]

// ============================================================================
// 表单数据类型
// ============================================================================

interface FormData {
  title: string
  description: string
  genre: NovelStyle | ''
  coreSellingPoint: string
  targetReaderFeeling: string
  first30ChaptersPromise: string
  worldviewHint?: string
  styleHint?: string
  writingStyle: string
  estimatedWordCount: number | ''
  estimatedChapterCount: number | ''
}

interface FormErrors {
  title?: string
  genre?: string
  coreSellingPoint?: string
  targetReaderFeeling?: string
  first30ChaptersPromise?: string
}

// ============================================================================
// 验证函数
// ============================================================================

function validateFormData(data: FormData): FormErrors {
  const errors: FormErrors = {}

  // 书名验证
  if (!data.title.trim()) {
    errors.title = '请输入书名'
  } else if (data.title.length < 2) {
    errors.title = '书名至少需要2个字符'
  } else if (data.title.length > 50) {
    errors.title = '书名不能超过50个字符'
  }

  // 题材验证
  if (!data.genre) {
    errors.genre = '请选择题材'
  }

  // 核心卖点验证
  if (!data.coreSellingPoint.trim()) {
    errors.coreSellingPoint = '请输入核心卖点'
  } else if (data.coreSellingPoint.length < 10) {
    errors.coreSellingPoint = '核心卖点至少需要10个字符'
  } else if (data.coreSellingPoint.length > 500) {
    errors.coreSellingPoint = '核心卖点不能超过500个字符'
  }

  // 目标读者感受验证
  if (!data.targetReaderFeeling.trim()) {
    errors.targetReaderFeeling = '请输入目标读者感受'
  } else if (data.targetReaderFeeling.length < 10) {
    errors.targetReaderFeeling = '目标读者感受至少需要10个字符'
  } else if (data.targetReaderFeeling.length > 500) {
    errors.targetReaderFeeling = '目标读者感受不能超过500个字符'
  }

  // 前30章承诺验证
  if (!data.first30ChaptersPromise.trim()) {
    errors.first30ChaptersPromise = '请输入前30章承诺'
  } else if (data.first30ChaptersPromise.length < 10) {
    errors.first30ChaptersPromise = '前30章承诺至少需要10个字符'
  } else if (data.first30ChaptersPromise.length > 1000) {
    errors.first30ChaptersPromise = '前30章承诺不能超过1000个字符'
  }

  return errors
}

// ============================================================================
// 组件属性
// ============================================================================

interface ProjectSettingFormProps {
  /** 初始数据（用于编辑模式） */
  initialData?: Partial<ProjectSettingStageData>
  /** 保存回调 */
  onSave?: (data: ProjectSettingStageData) => Promise<void> | void
  /** 完成回调（工作流接口） */
  onComplete?: () => Promise<void>
  /** 保存成功回调 */
  onSaveSuccess?: () => void
  /** 保存失败回调 */
  onSaveError?: (error: Error) => void
  /** 是否显示保存按钮 */
  showSaveButton?: boolean
  /** 是否禁用表单 */
  disabled?: boolean
  /** 自定义类名 */
  className?: string
}

// ============================================================================
// 主组件
// ============================================================================

export default function ProjectSettingForm({
  initialData,
  onSave,
  onComplete,
  onSaveSuccess,
  onSaveError,
  showSaveButton = true,
  disabled = false,
  className,
}: ProjectSettingFormProps) {
  // 从工作流 store 获取数据
  const { updateStageData, getStageData, completeStage } = useWorkflowStore()
  const existingData = getStageData(WorkflowStage.PROJECT_SETTING)
  const inspirationData = getStageData(WorkflowStage.INSPIRATION)

  // 表单状态
  const [formData, setFormData] = useState<FormData>({
    title: initialData?.title || existingData?.title || '',
    description: initialData?.description || existingData?.description || '',
    genre: initialData?.genre || existingData?.genre || '',
    coreSellingPoint: initialData?.coreSellingPoint || existingData?.coreSellingPoint || '',
    targetReaderFeeling: initialData?.targetReaderFeeling || existingData?.targetReaderFeeling || '',
    first30ChaptersPromise: initialData?.first30ChaptersPromise || existingData?.first30ChaptersPromise || '',
    worldviewHint: initialData?.worldviewHint || existingData?.worldviewHint || '',
    styleHint: initialData?.styleHint || existingData?.styleHint || '',
    writingStyle: initialData?.writingStyle || existingData?.writingStyle || '',
    estimatedWordCount: initialData?.estimatedWordCount || existingData?.estimatedWordCount || '',
    estimatedChapterCount: '',
  })

  const [errors, setErrors] = useState<FormErrors>({})
  const [touched, setTouched] = useState<Set<string>>(new Set())
  const [isSaving, setIsSaving] = useState(false)
  const [isAIGenerating, setIsAIGenerating] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // 实时验证
  useEffect(() => {
    if (touched.size > 0) {
      const validationErrors = validateFormData(formData)
      // 只显示已触碰字段的错误
      const filteredErrors: FormErrors = {}
      touched.forEach((field) => {
        if (validationErrors[field as keyof FormErrors]) {
          filteredErrors[field as keyof FormErrors] = validationErrors[field as keyof FormErrors]
        }
      })
      setErrors(filteredErrors)
    }
  }, [formData, touched])

  // 处理字段变化
  const handleFieldChange = useCallback((field: keyof FormData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setTouched((prev) => new Set(prev).add(field))
    setSaveSuccess(false)
  }, [])

  // 处理字段失焦
  const handleFieldBlur = useCallback((field: keyof FormData) => {
    setTouched((prev) => new Set(prev).add(field))
  }, [])

  // 保存数据
  const handleSave = useCallback(async (): Promise<boolean> => {
    // 验证所有字段
    const validationErrors = validateFormData(formData)
    setErrors(validationErrors)
    setTouched(new Set(Object.keys(formData)))

    if (Object.keys(validationErrors).length > 0) {
      return false
    }

    setIsSaving(true)
    setSaveSuccess(false)

    try {
      const projectData: ProjectSettingStageData = {
        title: formData.title,
        description: formData.description,
        genre: formData.genre as NovelStyle,
        coreSellingPoint: formData.coreSellingPoint,
        targetReaderFeeling: formData.targetReaderFeeling,
        first30ChaptersPromise: formData.first30ChaptersPromise,
        worldviewHint: formData.worldviewHint,
        styleHint: formData.styleHint,
        writingStyle: formData.writingStyle || undefined,
        estimatedWordCount: formData.estimatedWordCount || undefined,
        oneLineSummary: undefined,
        createdAt: existingData?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      // 更新工作流状态
      updateStageData(WorkflowStage.PROJECT_SETTING, projectData)

      // 调用外部保存回调
      if (onSave) {
        await onSave(projectData)
      }

      setSaveSuccess(true)
      onSaveSuccess?.()
      return true
    } catch (error) {
      console.error('保存项目设定失败:', error)
      onSaveError?.(error instanceof Error ? error : new Error('保存失败'))
      return false
    } finally {
      setIsSaving(false)
    }
  }, [formData, existingData, updateStageData, onSave, onSaveSuccess, onSaveError])

  // 完成阶段
  const handleComplete = useCallback(async () => {
    console.log('handleComplete called')
    const validationErrors = validateFormData(formData)
    console.log('Validation errors:', validationErrors)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      setTouched(new Set(Object.keys(formData)))
      return
    }
    
    const saved = await handleSave()
    console.log('Save result:', saved)
    if (!saved) {
      console.error('保存失败，无法完成阶段')
      return
    }
    
    try {
      // 调用工作流的 onComplete 回调
      if (onComplete) {
        console.log('Calling onComplete callback')
        await onComplete()
      } else {
        // 如果没有 onComplete，直接调用 completeStage
        console.log('Calling completeStage directly')
        completeStage(WorkflowStage.PROJECT_SETTING)
      }
    } catch (error) {
      console.error('完成阶段失败:', error)
    }
  }, [handleSave, formData, completeStage, onComplete])

  // AI辅助生成项目设定
  const handleAIGenerate = useCallback(async () => {
    const hasInspiration = inspirationData?.inspiration && inspirationData.inspiration.trim().length > 0
    const hasTitleAndDesc = formData.title.trim() && formData.description.trim()
    
    if (!hasInspiration && !hasTitleAndDesc) {
      toast.error('请先在灵感输入阶段填写灵感，或手动填写作品标题和简介')
      return
    }
    
    setIsAIGenerating(true)
    try {
      const result = await generateProjectSetting({
        title: formData.title || '待定',
        description: formData.description || '待定',
        genre: formData.genre || undefined,
        inspiration: inspirationData?.inspiration || undefined
      })
      setFormData(prev => ({
        ...prev,
        title: result.title || prev.title || '',
        description: result.description || prev.description || '',
        genre: (result.genre as NovelStyle) || prev.genre,
        coreSellingPoint: result.coreSellingPoint || prev.coreSellingPoint,
        targetReaderFeeling: result.targetReaderFeeling || prev.targetReaderFeeling,
        first30ChaptersPromise: result.first30ChaptersPromise || prev.first30ChaptersPromise,
        worldviewHint: result.worldviewHint || prev.worldviewHint,
        styleHint: result.styleHint || prev.styleHint
      }))
      toast.success('AI已生成项目设定，请查看并调整')
    } catch (error) {
      console.error('AI生成项目设定失败:', error)
      toast.error('AI生成失败，请检查模型配置')
    } finally {
      setIsAIGenerating(false)
    }
  }, [formData.title, formData.description, formData.genre, inspirationData?.inspiration])

  // 渲染字段错误提示
  const renderFieldError = (field: keyof FormErrors) => {
    if (errors[field]) {
      return (
        <div className="flex items-center mt-1.5 text-sm text-red-500">
          <AlertCircle className="w-4 h-4 mr-1 flex-shrink-0" />
          <span>{errors[field]}</span>
        </div>
      )
    }
    return null
  }

  // 渲染字段提示
  const renderFieldHint = (hint: string) => (
    <div className="flex items-start mt-1.5 text-sm text-gray-500">
      <Info className="w-4 h-4 mr-1 flex-shrink-0 mt-0.5" />
      <span>{hint}</span>
    </div>
  )

  return (
    <div className={cn('space-y-6', className)}>
      {/* 表单标题 */}
      <div className="border-b border-gray-200 pb-4">
        <h2 className="text-xl font-semibold text-gray-900">项目设定</h2>
        <p className="mt-1 text-sm text-gray-500">
          明确题材、卖点、目标读者感受和前30章承诺，为后续创作奠定基础
        </p>
      </div>

      {/* 表单内容 */}
      <div className="space-y-6">
        {/* 书名 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            书名 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => handleFieldChange('title', e.target.value)}
            onBlur={() => handleFieldBlur('title')}
            disabled={disabled}
            placeholder="请输入书名"
            className={cn(
              'w-full px-4 py-2.5 rounded-lg border transition-colors duration-200',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
              errors.title
                ? 'border-red-300 bg-red-50'
                : 'border-gray-300 hover:border-gray-400',
              disabled && 'bg-gray-100 cursor-not-allowed'
            )}
          />
          {renderFieldError('title')}
          {!errors.title && renderFieldHint('建议使用2-10个字，简洁有力，能体现作品特色')}
        </div>

        {/* 题材选择 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            题材 <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <select
              value={formData.genre}
              onChange={(e) => handleFieldChange('genre', e.target.value)}
              onBlur={() => handleFieldBlur('genre')}
              disabled={disabled}
              className={cn(
                'w-full px-4 py-2.5 rounded-lg border appearance-none transition-colors duration-200',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                errors.genre
                  ? 'border-red-300 bg-red-50'
                  : 'border-gray-300 hover:border-gray-400',
                disabled && 'bg-gray-100 cursor-not-allowed'
              )}
            >
              <option value="">请选择题材</option>
              {GENRE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          </div>
          {renderFieldError('genre')}
          {!errors.genre && formData.genre && (
            <div className="mt-2 text-sm text-gray-600">
              {GENRE_OPTIONS.find((o) => o.value === formData.genre)?.description}
            </div>
          )}
        </div>

        {/* 核心卖点 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            核心卖点 <span className="text-red-500">*</span>
          </label>
          <textarea
            value={formData.coreSellingPoint}
            onChange={(e) => handleFieldChange('coreSellingPoint', e.target.value)}
            onBlur={() => handleFieldBlur('coreSellingPoint')}
            disabled={disabled}
            placeholder="例如：&#10;• 独特设定：主角拥有时间回溯能力，每次死亡都能回到关键节点&#10;• 创新元素：将修仙与科技结合，打造赛博修仙新世界&#10;• 核心看点：从废材逆袭到巅峰，爽点密集，节奏紧凑&#10;• 差异化：反套路设计，主角不是天选之子而是幕后推手&#10;&#10;更多示例：&#10;• 金手指设定：主角获得神秘传承/系统/空间，拥有独特优势&#10;• 世界观亮点：独创的修炼体系/势力架构/种族设定&#10;• 人物特色：主角性格鲜明，配角立体，反派有魅力&#10;• 情节设计：悬念迭起，反转不断，高潮迭起&#10;• 情感共鸣：亲情/友情/爱情的细腻刻画，触动读者内心"
            rows={4}
            className={cn(
              'w-full px-4 py-2.5 rounded-lg border transition-colors duration-200 resize-none',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
              errors.coreSellingPoint
                ? 'border-red-300 bg-red-50'
                : 'border-gray-300 hover:border-gray-400',
              disabled && 'bg-gray-100 cursor-not-allowed'
            )}
          />
          <div className="flex justify-between mt-1">
            {renderFieldError('coreSellingPoint')}
            <span className="text-xs text-gray-400 ml-auto">
              {formData.coreSellingPoint.length}/500
            </span>
          </div>
          {!errors.coreSellingPoint && renderFieldHint('描述作品最吸引读者的核心元素，如独特设定、创新玩法、爽点设计、差异化卖点等')}
        </div>

        {/* 目标读者感受 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            目标读者感受 <span className="text-red-500">*</span>
          </label>
          <textarea
            value={formData.targetReaderFeeling}
            onChange={(e) => handleFieldChange('targetReaderFeeling', e.target.value)}
            onBlur={() => handleFieldBlur('targetReaderFeeling')}
            disabled={disabled}
            placeholder="例如：&#10;• 爽感：主角一路碾压敌人，让读者获得强烈的成就感和满足感&#10;• 紧张刺激：悬念迭起，情节反转不断，让读者欲罢不能&#10;• 感动：人物命运跌宕起伏，情感真挚，让读者产生共鸣&#10;• 新奇：世界观独特，设定新颖，让读者大开眼界&#10;&#10;更多示例：&#10;• 成长感：见证主角从弱小到强大，获得自我提升的动力&#10;• 期待感：每章结尾留悬念，让读者迫不及待想看下一章&#10;• 代入感：主角经历与读者生活有共鸣，产生身临其境的体验&#10;• 治愈感：温馨治愈的情节，抚慰读者心灵&#10;• 热血感：燃点密集，让读者心潮澎湃&#10;• 悬疑感：谜团层层剥开，满足读者的好奇心"
            rows={4}
            className={cn(
              'w-full px-4 py-2.5 rounded-lg border transition-colors duration-200 resize-none',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
              errors.targetReaderFeeling
                ? 'border-red-300 bg-red-50'
                : 'border-gray-300 hover:border-gray-400',
              disabled && 'bg-gray-100 cursor-not-allowed'
            )}
          />
          <div className="flex justify-between mt-1">
            {renderFieldError('targetReaderFeeling')}
            <span className="text-xs text-gray-400 ml-auto">
              {formData.targetReaderFeeling.length}/500
            </span>
          </div>
          {!errors.targetReaderFeeling && renderFieldHint('明确读者阅读时应该获得的情感体验，如爽感、感动、紧张刺激、新奇等')}
        </div>

        {/* 前30章承诺 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            前30章承诺 <span className="text-red-500">*</span>
          </label>
          <textarea
            value={formData.first30ChaptersPromise}
            onChange={(e) => handleFieldChange('first30ChaptersPromise', e.target.value)}
            onBlur={() => handleFieldBlur('first30ChaptersPromise')}
            disabled={disabled}
            placeholder="前30章是留住读者的关键，请明确承诺：&#10;&#10;• 主线走向：前30章要展现怎样的故事主线？主角的目标是什么？&#10;• 核心看点：有哪些让读者欲罢不能的看点？（如金手指初显、第一次逆袭、重要转折等）&#10;• 期待兑现：要向读者承诺什么？（如主角将获得什么成就、解决什么问题）&#10;• 情感钩子：如何让读者产生情感投入？&#10;&#10;更多要点：&#10;• 开篇钩子：第1-3章如何抓住读者眼球？&#10;• 金手指展示：主角的特殊能力/身份如何在前期展现？&#10;• 第一次冲突：前10章内安排第一次冲突/危机，让读者看到主角的潜力&#10;• 第一次逆袭：前20章内完成第一次逆袭，让读者获得爽感&#10;• 重要配角登场：前15章内让主要配角陆续登场&#10;• 世界观铺垫：逐步展现独特的世界观设定&#10;&#10;示例：前30章将展现主角从废材到天才的转变过程，完成第一次逆袭，让读者看到主角的潜力和未来的可能性。同时埋下身世之谜的伏笔，让读者期待后续发展。"
            rows={6}
            className={cn(
              'w-full px-4 py-2.5 rounded-lg border transition-colors duration-200 resize-none',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
              errors.first30ChaptersPromise
                ? 'border-red-300 bg-red-50'
                : 'border-gray-300 hover:border-gray-400',
              disabled && 'bg-gray-100 cursor-not-allowed'
            )}
          />
          <div className="flex justify-between mt-1">
            {renderFieldError('first30ChaptersPromise')}
            <span className="text-xs text-gray-400 ml-auto">
              {formData.first30ChaptersPromise.length}/1000
            </span>
          </div>
          {!errors.first30ChaptersPromise && renderFieldHint('前30章是留住读者的黄金期，明确要展现的主线、看点、期待和情感钩子')}
        </div>

        {/* 可选字段分隔线 */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-sm font-medium text-gray-700 mb-4">可选设置</h3>
          
          <div className="space-y-6">
            {/* 写作风格 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                写作风格
              </label>
              <div className="relative">
                <select
                  value={formData.writingStyle}
                  onChange={(e) => handleFieldChange('writingStyle', e.target.value)}
                  disabled={disabled}
                  className={cn(
                    'w-full px-4 py-2.5 rounded-lg border appearance-none transition-colors duration-200',
                    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                    'border-gray-300 hover:border-gray-400',
                    disabled && 'bg-gray-100 cursor-not-allowed'
                  )}
                >
                  <option value="">请选择写作风格（可选）</option>
                  {WRITING_STYLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
              {renderFieldHint('选择作品的叙事风格和基调')}
            </div>

            {/* 预计字数 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                预计字数
              </label>
              <div className="relative">
                <select
                  value={formData.estimatedWordCount}
                  onChange={(e) => handleFieldChange('estimatedWordCount', Number(e.target.value))}
                  disabled={disabled}
                  className={cn(
                    'w-full px-4 py-2.5 rounded-lg border appearance-none transition-colors duration-200',
                    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                    'border-gray-300 hover:border-gray-400',
                    disabled && 'bg-gray-100 cursor-not-allowed'
                  )}
                >
                  <option value="">请选择预计字数（可选）</option>
                  {WORD_COUNT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
              {renderFieldHint('设定目标字数，帮助规划创作进度')}
            </div>

            {/* 预计完结章节数 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                预计完结章节数
              </label>
              <input
                type="number"
                value={formData.estimatedChapterCount}
                onChange={(e) => handleFieldChange('estimatedChapterCount', e.target.value ? Number(e.target.value) : '')}
                disabled={disabled}
                placeholder="请输入预计章节数（可选）"
                min={1}
                max={5000}
                className={cn(
                  'w-full px-4 py-2.5 rounded-lg border transition-colors duration-200',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                  'border-gray-300 hover:border-gray-400',
                  disabled && 'bg-gray-100 cursor-not-allowed'
                )}
              />
              {renderFieldHint('设定目标章节数，帮助规划故事节奏')}
            </div>
          </div>
        </div>
      </div>

      {/* 操作按钮 */}
      {showSaveButton && (
        <div className="flex items-center justify-between pt-6 border-t border-gray-200">
          <div className="flex items-center space-x-2">
            {saveSuccess && (
              <div className="flex items-center text-sm text-green-600">
                <CheckCircle className="w-4 h-4 mr-1" />
                <span>保存成功</span>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleAIGenerate}
              disabled={disabled || isAIGenerating || (!inspirationData?.inspiration?.trim() && (!formData.title.trim() || !formData.description.trim()))}
              className={cn(
                'flex items-center px-4 py-2 rounded-lg font-medium transition-colors duration-200',
                'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600',
                'disabled:bg-gray-300 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed'
              )}
            >
              {isAIGenerating ? (
                <>
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  AI 生成中...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  AI 辅助生成
                </>
              )}
            </button>
            <button
              onClick={handleSave}
              disabled={disabled || isSaving}
              className={cn(
                'flex items-center px-4 py-2 rounded-lg font-medium transition-colors duration-200',
                'bg-blue-600 text-white hover:bg-blue-700',
                'disabled:bg-gray-300 disabled:cursor-not-allowed'
              )}
            >
              {isSaving ? (
                <>
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  保存中...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  保存设定
                </>
              )}
            </button>
            <button
              onClick={handleComplete}
              disabled={disabled || isSaving}
              className={cn(
                'flex items-center px-4 py-2 rounded-lg font-medium transition-colors duration-200',
                'bg-green-600 text-white hover:bg-green-700',
                'disabled:bg-gray-300 disabled:cursor-not-allowed'
              )}
            >
              完成并继续
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// 辅助组件：表单字段包装器
// ============================================================================

interface FormFieldWrapperProps {
  label: string
  required?: boolean
  error?: string
  hint?: string
  children: React.ReactNode
}

export function FormFieldWrapper({
  label,
  required = false,
  error,
  hint,
  children,
}: FormFieldWrapperProps) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {error && (
        <div className="flex items-center text-sm text-red-500">
          <AlertCircle className="w-4 h-4 mr-1" />
          <span>{error}</span>
        </div>
      )}
      {hint && !error && (
        <div className="flex items-start text-sm text-gray-500">
          <Info className="w-4 h-4 mr-1 flex-shrink-0 mt-0.5" />
          <span>{hint}</span>
        </div>
      )}
    </div>
  )
}
