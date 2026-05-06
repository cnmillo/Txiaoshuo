import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, FileText, Settings, Loader2, BookOpen, Wand2, BookMarked, Image as ImageIcon } from 'lucide-react'
import toast from 'react-hot-toast'
import { generateNovel, getGenerateProgress, generateOutlineAuto,
  cancelGenerate } from '../services/api'
import StyleSelector from '../components/StyleSelector'
import TemplateSelector from '../components/TemplateSelector'
import StyleGuide from '../components/StyleGuide'
import OutlineManager from '../components/OutlineManager'
import ImageUploader from '../components/ImageUploader'
import type { StyleConfig, OutlineNode } from '@shared/types'

const wordCounts = [
  { value: 5000, label: '5千字短篇' },
  { value: 10000, label: '1万字中篇' },
  { value: 50000, label: '5万字长篇' },
  { value: 100000, label: '10万字长篇' },
  { value: 500000, label: '50万字巨著' },
  { value: 1000000, label: '100万字巨著' },
]

const FORM_DATA_KEY = 'novel_generate_form_data'
const GENERATION_TASK_KEY = 'novel_generation_task'
const OUTLINE_TASK_KEY = 'novel_outline_task'
const OUTLINE_RESULT_KEY = 'novel_outline_result'

interface OutlineTask {
  title: string
  prompt: string
  templateId: string
  style: string
  styleConfig: StyleConfig | undefined
  wordCount: number
  timestamp: number
  status: 'pending' | 'completed' | 'failed'
}

let outlineGenerationPromise: Promise<{ outline: string }> | null = null

// 辅助函数:解析并显示大纲生成错误
const handleOutlineError = (error: unknown) => {
  // 解析错误信息
  const axiosError = error as { 
    response?: { 
      status?: number
      data?: { 
        message?: string
        code?: string
        attemptedModels?: number
        lastError?: string
      } 
    }
    message?: string
  }
  
  let errorTitle = '大纲生成失败'
  let errorDetails = ''
  let solution = ''
  
  // 根据错误类型提供不同的提示
  if (axiosError.response?.status === 401 || axiosError.response?.data?.code === 'UNAUTHORIZED') {
    errorTitle = 'AI服务认证失败'
    errorDetails = 'API密钥无效或已过期'
    solution = '请检查您的AI服务配置中的API密钥是否正确'
  } else if (axiosError.response?.status === 403 || axiosError.response?.data?.code === 'FORBIDDEN') {
    errorTitle = 'AI服务访问被拒绝'
    errorDetails = '您的账户权限不足或API密钥已被禁用'
    solution = '请检查您的AI服务账户状态'
  } else if (axiosError.response?.status === 429 || axiosError.response?.data?.code === 'RATE_LIMIT_EXCEEDED') {
    errorTitle = 'AI服务请求频率超限'
    errorDetails = '请求过于频繁，已达到API调用限制'
    solution = '请稍后再试，或升级您的API套餐'
  } else if (axiosError.message?.includes('timeout') || axiosError.response?.data?.code === 'TIMEOUT') {
    errorTitle = 'AI服务响应超时'
    errorDetails = 'AI模型处理时间过长，可能是网络问题或模型负载过高'
    solution = '请检查网络连接，或尝试使用更快的模型'
  } else if (axiosError.message?.includes('Network Error') || !axiosError.response) {
    errorTitle = '网络连接失败'
    errorDetails = '无法连接到AI服务，请检查网络设置'
    solution = '请检查网络连接，确保可以访问AI服务地址'
  } else if (axiosError.response?.data?.code === 'ALL_MODELS_FAILED') {
    errorTitle = '所有AI模型都无法响应'
    const attemptedModels = axiosError.response?.data?.attemptedModels || 0
    const lastError = axiosError.response?.data?.lastError || '未知错误'
    errorDetails = `已尝试 ${attemptedModels} 个模型，最后错误: ${lastError}`
    solution = '请检查模型配置或网络连接'
  } else if (axiosError.response?.data?.code === 'INVALID_AI_CONFIG') {
    errorTitle = 'AI配置无效'
    errorDetails = axiosError.response?.data?.message || '配置参数不正确'
    solution = '请检查您的AI服务配置'
  } else if (axiosError.response?.data?.code === 'AI_SERVICE_ERROR') {
    errorTitle = 'AI服务调用失败'
    errorDetails = axiosError.response?.data?.message || '服务暂时不可用'
    solution = '请稍后重试，或联系技术支持'
  } else {
    errorDetails = axiosError.response?.data?.message || axiosError.message || '未知错误'
    solution = '请重试或手动输入大纲'
  }
  
  // 显示详细的错误提示
  const errorMessage = `${errorTitle}\n${errorDetails}\n\n解决方案: ${solution}\n\n推荐模型配置:\n• 智谱AI GLM-4-Flash: https://open.bigmodel.cn/api/paas/v4/ (model: glm-4-flash)\n• DeepSeek: https://api.deepseek.com/v1 (model: deepseek-chat)\n\n提示: 您也可以手动输入大纲内容`
  
  toast.error(errorMessage, { 
    duration: 10000,
    style: {
      maxWidth: '600px',
      whiteSpace: 'pre-line'
    }
  })
  
  console.error('大纲生成失败详情:', {
    error: axiosError,
    status: axiosError.response?.status,
    data: axiosError.response?.data,
    message: axiosError.message
  })
}

interface FormData {
  title: string
  prompt: string
  templateId: string
  style: string
  styleConfig: StyleConfig | undefined
  wordCount: number
  outline: string
  structuredOutline: OutlineNode[]
  useOutline: boolean
  useStructuredOutline: boolean
  images: string[]
  imageDescriptions: string[]
  logicRequirements: string
}

const defaultFormData: FormData = {
  title: '',
  prompt: '',
  templateId: '',
  style: '',
  styleConfig: undefined,
  wordCount: 10000,
  outline: '',
  structuredOutline: [],
  useOutline: false,
  useStructuredOutline: false,
  images: [],
  imageDescriptions: [],
  logicRequirements: ''
}

const loadFormData = (): FormData => {
  try {
    const saved = localStorage.getItem(FORM_DATA_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      return { ...defaultFormData, ...parsed }
    }
  } catch (error) {
    console.error('加载表单数据失败:', error)
  }
  return defaultFormData
}

const saveFormData = (data: FormData): void => {
  try {
    localStorage.setItem(FORM_DATA_KEY, JSON.stringify(data))
  } catch (error) {
    console.error('保存表单数据失败:', error)
  }
}

export default function Generate() {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [isGeneratingOutline, setIsGeneratingOutline] = useState(false)
  const [generationStatus, setGenerationStatus] = useState<string>('')
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const [formData, setFormData] = useState<FormData>(loadFormData)

  const handleStyleChange = (styleId: string, config: StyleConfig) => {
    setFormData(prev => {
      const newData = { ...prev, style: styleId, styleConfig: config }
      saveFormData(newData)
      return newData
    })
  }

  const handleConfigChange = (config: StyleConfig) => {
    setFormData(prev => {
      const newData = { ...prev, style: '', styleConfig: config }
      saveFormData(newData)
      return newData
    })
  }

  const handleTemplateChange = (templateId: string) => {
    setFormData(prev => {
      const newData = { ...prev, templateId }
      saveFormData(newData)
      return newData
    })
  }

  const updateFormData = useCallback((updates: Partial<FormData>) => {
    setFormData(prev => {
      const newData = { ...prev, ...updates }
      console.log('updateFormData - 前一个状态:', prev)
      console.log('updateFormData - 更新:', updates)
      console.log('updateFormData - 新状态:', newData)
      saveFormData(newData)
      return newData
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const convertStructuredOutlineToString = (outline: OutlineNode[]): string => {
    const processNode = (node: OutlineNode, level: number = 0): string => {
      const indent = '  '.repeat(level)
      let result = `${indent}${node.title}\n`
      if (node.content) {
        result += `${indent}  ${node.content}\n`
      }
      for (const child of node.children) {
        result += processNode(child, level + 1)
      }
      return result
    }

    return outline.map(node => processNode(node)).join('')
  }

  const fillSampleData = () => {
    const sampleData: FormData = {
      ...defaultFormData,
      title: '星际探索者',
      prompt: '一个宇航员在太空中发现了一个神秘的外星文明，他们拥有超越人类的科技和智慧。宇航员必须与他们建立联系，同时解决地球上的危机。',
      templateId: 'template-novel-fantasy',
      style: 'style-default-scifi',
      wordCount: 50000,
      useOutline: true,
      outline: `第一章：太空任务
第二章：发现外星信号
第三章：首次接触
第四章：外星文明的秘密
第五章：返回地球
第六章：解决危机
第七章：新的开始`
    }
    setFormData(sampleData)
    saveFormData(sampleData)
    toast.success('已填充示例数据')
  }

  const handleAutoGenerateOutline = async () => {
    if (!formData.title.trim()) {
      toast.error('请先输入小说标题')
      return
    }
    if (!formData.prompt.trim()) {
      toast.error('请先输入创作提示')
      return
    }

    setIsGeneratingOutline(true)
    
    const outlineTask: OutlineTask = {
      title: formData.title,
      prompt: formData.prompt,
      templateId: formData.templateId,
      style: formData.style,
      styleConfig: formData.styleConfig,
      wordCount: formData.wordCount,
      timestamp: Date.now(),
      status: 'pending'
    }
    localStorage.setItem(OUTLINE_TASK_KEY, JSON.stringify(outlineTask))
    
    outlineGenerationPromise = generateOutlineAuto({
      title: formData.title,
      prompt: formData.prompt,
      templateId: formData.templateId,
      style: formData.style,
      styleConfig: formData.styleConfig,
      wordCount: formData.wordCount
    })
    
    try {
      const result = await outlineGenerationPromise
      
      console.log('大纲生成结果:', result)
      console.log('大纲内容:', result.outline)
      
      const newData = {
        outline: result.outline,
        useOutline: true,
        useStructuredOutline: false
      }
      
      console.log('更新表单数据:', newData)
      
      setFormData(prev => {
        const updatedData = { ...prev, ...newData }
        console.log('setFormData - 前一个状态:', prev)
        console.log('setFormData - 更新后状态:', updatedData)
        saveFormData(updatedData)
        return updatedData
      })
      
      const completedTask = { ...outlineTask, status: 'completed' as const }
      localStorage.setItem(OUTLINE_TASK_KEY, JSON.stringify(completedTask))
      localStorage.setItem(OUTLINE_RESULT_KEY, JSON.stringify(result))
      outlineGenerationPromise = null
      toast.success('大纲生成成功！已自动保存到本地', { duration: 3000 })
    } catch (error: unknown) {
      const failedTask = { ...outlineTask, status: 'failed' as const }
      localStorage.setItem(OUTLINE_TASK_KEY, JSON.stringify(failedTask))
      outlineGenerationPromise = null
      handleOutlineError(error)
    } finally {
      setIsGeneratingOutline(false)
    }
  }

  const validateForm = (): boolean => {
    if (!formData.title.trim()) {
      toast.error('请输入小说标题')
      return false
    }

    if (!formData.prompt.trim()) {
      toast.error('请输入创作提示')
      return false
    }

    if (formData.useOutline && !formData.useStructuredOutline && !formData.outline.trim()) {
      toast.error('请输入小说大纲')
      return false
    }

    return true
  }

  // 根据进度消息判断当前生成阶段
  const getGenerationPhase = (message: string, progress: number): { phase: number; label: string; color: string } => {
    if (message.includes('构思大纲') || progress <= 10) {
      return { phase: 1, label: '构思大纲', color: 'bg-blue-500' }
    } else if (message.includes('规划第') || (progress > 10 && progress <= 35)) {
      return { phase: 2, label: '规划内容', color: 'bg-purple-500' }
    } else {
      return { phase: 3, label: '撰写章节', color: 'bg-green-500' }
    }
  }

  const pollGenerationProgress = useCallback((taskId: string) => {
    setCurrentTaskId(taskId)
    localStorage.setItem(GENERATION_TASK_KEY, JSON.stringify({ taskId, timestamp: Date.now() }))

    let isWaiting429 = false
    let wait429Timer: ReturnType<typeof setTimeout> | null = null
    let retry429Count = 0
    const RETRY_WAIT_429 = [30000, 60000, 120000]
    const MAX_RETRY_429 = 3

    pollingRef.current = setInterval(async () => {
      if (isWaiting429) return

      try {
        const progress = await getGenerateProgress(taskId)
        retry429Count = 0

        // 检查轮询是否已经被清除
        if (!pollingRef.current) return

        if (progress.message) {
          setGenerationStatus(progress.message)
        } else if (progress.status === 'generating') {
          if (progress.currentChapter && progress.totalChapters) {
            setGenerationStatus(`正在生成第 ${progress.currentChapter} 章，共 ${progress.totalChapters} 章`)
          } else {
            setGenerationStatus(`生成进度: ${progress.progress}%`)
          }
        }

        if (progress.status === 'completed') {
          if (pollingRef.current) {
            clearInterval(pollingRef.current)
            pollingRef.current = null
          }
          if (wait429Timer) clearTimeout(wait429Timer)
          localStorage.removeItem(FORM_DATA_KEY)
          localStorage.removeItem(GENERATION_TASK_KEY)
          setCurrentTaskId(null)
          toast.success('小说生成成功！')
          if (progress.novelId) {
            navigate(`/novels/${progress.novelId}`)
          } else {
            toast.error('未获取到小说ID')
            setIsLoading(false)
          }
        } else if (progress.status === 'failed' || progress.status === 'cancelled') {
          if (pollingRef.current) {
            clearInterval(pollingRef.current)
            pollingRef.current = null
          }
          if (wait429Timer) clearTimeout(wait429Timer)
          localStorage.removeItem(GENERATION_TASK_KEY)
          setCurrentTaskId(null)
          toast.error(progress.status === 'cancelled' ? '生成已取消' : (progress.error || '生成失败'))
          setIsLoading(false)
        }
      } catch (error: unknown) {
        // 检查轮询是否已经被清除
        if (!pollingRef.current) return

        const axiosError = error as { response?: { status?: number } }
        if (axiosError.response?.status === 429) {
          retry429Count++
          
          if (retry429Count > MAX_RETRY_429) {
            if (pollingRef.current) {
              clearInterval(pollingRef.current)
              pollingRef.current = null
            }
            toast.error('请求频繁，已停止轮询。请稍后手动刷新页面查看进度。', { duration: 10000 })
            setIsLoading(false)
            return
          }
          
          const waitTime = RETRY_WAIT_429[retry429Count - 1]
          isWaiting429 = true
          console.log(`轮询收到429限流，第${retry429Count}次重试，等待${waitTime / 1000}秒...`)
          toast.loading(`请求限流，${waitTime / 1000}秒后重试(${retry429Count}/${MAX_RETRY_429})...`, { 
            id: 'polling-429', 
            duration: waitTime + 1000 
          })
          wait429Timer = setTimeout(() => {
            isWaiting429 = false
            toast.dismiss('polling-429')
          }, waitTime)
        } else {
          console.error('获取进度失败:', error)
        }
      }
    }, 2000)
  }, [navigate])

  const handleCancelGeneration = useCallback(async () => {
    if (!currentTaskId) return
    
    try {
      await cancelGenerate(currentTaskId)
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
      localStorage.removeItem(GENERATION_TASK_KEY)
      setCurrentTaskId(null)
      setIsLoading(false)
      setGenerationStatus('')
      toast.success('已取消生成')
    } catch (error) {
      console.error('取消生成失败:', error)
      toast.error('取消生成失败')
    }
  }, [currentTaskId])

  useEffect(() => {
    const restoreGenerationTask = async () => {
      const savedTask = localStorage.getItem(GENERATION_TASK_KEY)
      if (savedTask) {
        try {
          const { taskId, timestamp } = JSON.parse(savedTask)
          const taskAge = Date.now() - timestamp
          if (taskAge < 24 * 60 * 60 * 1000) {
            const progress = await getGenerateProgress(taskId)
            if (progress.status === 'generating' || progress.status === 'pending') {
              setIsLoading(true)
              setGenerationStatus(progress.message || '正在恢复生成任务...')
              pollGenerationProgress(taskId)
              return
            }
          }
          localStorage.removeItem(GENERATION_TASK_KEY)
        } catch {
          localStorage.removeItem(GENERATION_TASK_KEY)
        }
      }
    }
    
    const restoreOutlineTask = async () => {
      const savedOutlineTask = localStorage.getItem(OUTLINE_TASK_KEY)
      if (!savedOutlineTask) return
      
      try {
        const task: OutlineTask = JSON.parse(savedOutlineTask)
        const taskAge = Date.now() - task.timestamp
        
        if (taskAge > 10 * 60 * 1000) {
          localStorage.removeItem(OUTLINE_TASK_KEY)
          localStorage.removeItem(OUTLINE_RESULT_KEY)
          return
        }
        
        if (task.status === 'completed') {
          const savedResult = localStorage.getItem(OUTLINE_RESULT_KEY)
          if (savedResult) {
            const result = JSON.parse(savedResult)
            const newData = {
              outline: result.outline,
              useOutline: true,
              useStructuredOutline: false
            }
            
            console.log('恢复已完成的大纲任务:', newData)
            
            setFormData(prev => {
              const updatedData = { ...prev, ...newData }
              console.log('setFormData (恢复) - 前一个状态:', prev)
              console.log('setFormData (恢复) - 更新后状态:', updatedData)
              saveFormData(updatedData)
              return updatedData
            })
            
            localStorage.removeItem(OUTLINE_TASK_KEY)
            localStorage.removeItem(OUTLINE_RESULT_KEY)
            toast.success('大纲生成成功！已自动保存到本地', { duration: 3000 })
          }
          return
        }
        
        if (task.status === 'failed') {
          localStorage.removeItem(OUTLINE_TASK_KEY)
          localStorage.removeItem(OUTLINE_RESULT_KEY)
          return
        }
        
        setIsGeneratingOutline(true)
        toast.loading('正在恢复大纲生成任务...', { duration: 2000 })
        
        if (outlineGenerationPromise) {
          try {
            const result = await outlineGenerationPromise
            const newData = {
              outline: result.outline,
              useOutline: true,
              useStructuredOutline: false
            }
            
            console.log('恢复进行中的大纲任务:', newData)
            
            setFormData(prev => {
              const updatedData = { ...prev, ...newData }
              console.log('setFormData (恢复进行中) - 前一个状态:', prev)
              console.log('setFormData (恢复进行中) - 更新后状态:', updatedData)
              saveFormData(updatedData)
              return updatedData
            })
            
            const completedTask = { ...task, status: 'completed' as const }
            localStorage.setItem(OUTLINE_TASK_KEY, JSON.stringify(completedTask))
            localStorage.setItem(OUTLINE_RESULT_KEY, JSON.stringify(result))
            outlineGenerationPromise = null
            toast.success('大纲生成成功！已自动保存到本地', { duration: 3000 })
          } catch (error: unknown) {
            const failedTask = { ...task, status: 'failed' as const }
            localStorage.setItem(OUTLINE_TASK_KEY, JSON.stringify(failedTask))
            outlineGenerationPromise = null
            handleOutlineError(error)
          }
        } else {
          outlineGenerationPromise = generateOutlineAuto({
            title: task.title,
            prompt: task.prompt,
            templateId: task.templateId,
            style: task.style,
            styleConfig: task.styleConfig,
            wordCount: task.wordCount
          })
          
          try {
            const result = await outlineGenerationPromise
            const newData = {
              outline: result.outline,
              useOutline: true,
              useStructuredOutline: false
            }
            
            console.log('新大纲任务完成:', newData)
            
            setFormData(prev => {
              const updatedData = { ...prev, ...newData }
              console.log('setFormData (新任务) - 前一个状态:', prev)
              console.log('setFormData (新任务) - 更新后状态:', updatedData)
              saveFormData(updatedData)
              return updatedData
            })
            
            const completedTask = { ...task, status: 'completed' as const }
            localStorage.setItem(OUTLINE_TASK_KEY, JSON.stringify(completedTask))
            localStorage.setItem(OUTLINE_RESULT_KEY, JSON.stringify(result))
            outlineGenerationPromise = null
            toast.success('大纲生成成功！已自动保存到本地', { duration: 3000 })
          } catch (error: unknown) {
            const failedTask = { ...task, status: 'failed' as const }
            localStorage.setItem(OUTLINE_TASK_KEY, JSON.stringify(failedTask))
            outlineGenerationPromise = null
            handleOutlineError(error)
          }
        }
      } catch (error) {
        localStorage.removeItem(OUTLINE_TASK_KEY)
        localStorage.removeItem(OUTLINE_RESULT_KEY)
        console.error(error)
      } finally {
        setIsGeneratingOutline(false)
      }
    }
    
    restoreGenerationTask()
    restoreOutlineTask()
    
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
      }
    }
  }, [pollGenerationProgress, updateFormData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsLoading(true)
    setGenerationStatus('正在创建生成任务...')

    try {
      let outlineToSend = undefined
      if (formData.useOutline) {
        if (formData.useStructuredOutline) {
          outlineToSend = convertStructuredOutlineToString(formData.structuredOutline)
        } else {
          outlineToSend = formData.outline
        }
      }

      const response = await generateNovel({
        title: formData.title,
        prompt: formData.prompt,
        templateId: formData.templateId,
        style: formData.style,
        styleConfig: formData.styleConfig,
        wordCount: formData.wordCount,
        outline: outlineToSend,
        images: formData.images,
        imageDescriptions: formData.imageDescriptions,
        logicRequirements: formData.logicRequirements,
      })

      setGenerationStatus('正在生成中，请稍候...')
      pollGenerationProgress(response.id)
    } catch (error) {
      toast.error('生成失败，请重试')
      console.error(error)
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-fade-in">
      <div className="text-center mb-10">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          创作新小说
        </h1>
        <p className="text-lg text-gray-600">
          填写以下信息，让AI为您创作精彩小说
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* 基本信息 */}
        <div className="card p-6 md:p-8">
          <div className="flex items-center space-x-2 mb-6">
            <BookOpen className="w-5 h-5 text-primary-600" />
            <h2 className="text-xl font-semibold text-gray-900">基本信息</h2>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="title">
                小说标题 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="title"
                value={formData.title}
                onChange={(e) => updateFormData({ title: e.target.value })}
                placeholder="请输入小说标题"
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="prompt">
                创作提示 <span className="text-red-500">*</span>
              </label>
              <textarea
                id="prompt"
                value={formData.prompt}
                onChange={(e) => updateFormData({ prompt: e.target.value })}
                placeholder="请输入一句话描述您的小说创意，例如：一个普通少年意外获得神秘力量，踏上修仙之路..."
                rows={4}
                className="textarea-field"
              />
              <p className="mt-2 text-sm text-gray-500">
                提示越详细，生成的小说内容越符合您的期望
              </p>
            </div>
          </div>
        </div>

        {/* 模板选择 */}
        <div className="card p-6 md:p-8">
          <div className="flex items-center space-x-2 mb-6">
            <BookMarked className="w-5 h-5 text-primary-600" />
            <h2 className="text-xl font-semibold text-gray-900">写作模板</h2>
          </div>

          <TemplateSelector
            value={formData.templateId}
            onChange={handleTemplateChange}
          />
        </div>

        {/* 风格设置 */}
        <div className="card p-6 md:p-8">
          <div className="flex items-center space-x-2 mb-6">
            <Settings className="w-5 h-5 text-primary-600" />
            <h2 className="text-xl font-semibold text-gray-900">风格设置</h2>
          </div>

          <StyleSelector
            value={formData.style}
            config={formData.styleConfig}
            onChange={handleStyleChange}
            onConfigChange={handleConfigChange}
            showPreview={true}
          />

          <div className="mt-8">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              目标字数
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {wordCounts.map((count) => (
                <button
                  key={count.value}
                  type="button"
                  onClick={() => updateFormData({ wordCount: count.value })}
                  className={`px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all duration-200 ${
                    formData.wordCount === count.value
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 text-gray-700 hover:border-primary-200'
                  }`}
                >
                  {count.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 风格指南 */}
        {formData.templateId && (
          <div className="card p-6 md:p-8">
            <div className="flex items-center space-x-2 mb-6">
              <BookOpen className="w-5 h-5 text-primary-600" />
              <h2 className="text-xl font-semibold text-gray-900">风格指南</h2>
            </div>

            <StyleGuide
              templateId={formData.templateId}
              styleId={formData.style}
            />
          </div>
        )}

        {/* 图片上传 */}
        <div className="card p-6 md:p-8">
          <div className="flex items-center space-x-2 mb-6">
            <ImageIcon className="w-5 h-5 text-primary-600" />
            <h2 className="text-xl font-semibold text-gray-900">图片上传</h2>
          </div>

          <ImageUploader
            value={formData.images}
            onChange={(images) => updateFormData({ images })}
            label="上传图片（可选）"
          />
          <p className="mt-4 text-sm text-gray-500">
            上传图片可以帮助AI更好地理解您的创意场景，生成更符合您期望的内容
          </p>
        </div>

        {/* 大纲设置 */}
        <div className="card p-6 md:p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-primary-600" />
              <h2 className="text-xl font-semibold text-gray-900">大纲设置（可选）</h2>
            </div>
            <div className="flex items-center space-x-4">
              <button
                type="button"
                onClick={handleAutoGenerateOutline}
                disabled={isGeneratingOutline || isLoading}
                className="flex items-center space-x-2 px-3 py-1.5 text-sm bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGeneratingOutline ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>生成中...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    <span>自动生成</span>
                  </>
                )}
              </button>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="outlineType"
                  checked={formData.useOutline && !formData.useStructuredOutline}
                  onChange={(e) => updateFormData({ useOutline: e.target.checked, useStructuredOutline: false })}
                  className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">文本大纲</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="outlineType"
                  checked={formData.useStructuredOutline}
                  onChange={(e) => updateFormData({ useStructuredOutline: e.target.checked, useOutline: e.target.checked })}
                  className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">结构化大纲</span>
              </label>
            </div>
          </div>

          {formData.useOutline && !formData.useStructuredOutline && (
            <div className="animate-fade-in">
              <textarea
                value={formData.outline}
                onChange={(e) => updateFormData({ outline: e.target.value })}
                placeholder={`请输入小说大纲，例如：
第一章：主角登场
第二章：获得奇遇
第三章：修炼突破
...`}
                rows={8}
                className="textarea-field"
              />
              <p className="mt-2 text-sm text-gray-500">
                提供详细的大纲可以帮助AI生成更符合您期望的内容
              </p>
            </div>
          )}

          {formData.useStructuredOutline && (
            <div className="animate-fade-in">
              <OutlineManager
                outline={formData.structuredOutline}
                onOutlineChange={(outline) => updateFormData({ structuredOutline: outline })}
              />
              <p className="mt-2 text-sm text-gray-500">
                使用结构化大纲可以更清晰地组织小说内容结构
              </p>
            </div>
          )}
        </div>

        {/* 逻辑要求 */}
        <div className="card p-6 md:p-8">
          <div className="flex items-center space-x-2 mb-6">
            <Settings className="w-5 h-5 text-primary-600" />
            <h2 className="text-xl font-semibold text-gray-900">逻辑要求（可选）</h2>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="logicRequirements">
              逻辑限制条件
            </label>
            <textarea
              id="logicRequirements"
              value={formData.logicRequirements}
              onChange={(e) => updateFormData({ logicRequirements: e.target.value })}
              placeholder={`请输入小说的逻辑限制条件，例如：
- 1943年当兵没有火车
- 主角不能使用现代科技
- 历史事件必须符合真实历史
- 人物行为要符合当时的社会背景
...`}
              rows={4}
              className="textarea-field"
            />
            <p className="mt-2 text-sm text-gray-500">
              输入逻辑要求可以帮助AI生成更符合现实逻辑的内容，避免出现不合理的情节
            </p>
          </div>
        </div>

        {/* 提交按钮 */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            type="button"
            onClick={fillSampleData}
            disabled={isLoading}
            className="w-full sm:w-auto px-6 py-3 bg-gray-100 text-gray-800 rounded-xl font-semibold hover:bg-gray-200 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>填充示例数据</span>
          </button>
          {isLoading && currentTaskId ? (
            <button
              type="button"
              onClick={handleCancelGeneration}
              className="w-full sm:w-auto px-6 py-3 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 transition-colors duration-200 flex items-center justify-center space-x-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="9" y1="9" x2="15" y2="15"></line>
                <line x1="15" y1="9" x2="9" y2="15"></line>
              </svg>
              <span>停止生成</span>
            </button>
          ) : null}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full sm:w-auto px-10 py-4 bg-gradient text-white rounded-xl font-semibold hover:opacity-90 transition-opacity duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <div className="flex flex-col items-start">
                  <span>{generationStatus || '生成中...'}</span>
                  {/* 三阶段进度指示器 */}
                  <div className="flex items-center space-x-2 mt-1">
                    <div className={`h-1.5 w-12 rounded-full ${getGenerationPhase(generationStatus || '', 0).phase >= 1 ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
                    <div className={`h-1.5 w-12 rounded-full ${getGenerationPhase(generationStatus || '', 0).phase >= 2 ? 'bg-purple-500' : 'bg-gray-300'}`}></div>
                    <div className={`h-1.5 w-12 rounded-full ${getGenerationPhase(generationStatus || '', 0).phase >= 3 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    <span className="text-xs opacity-75 ml-2">
                      {getGenerationPhase(generationStatus || '', 0).label}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <Wand2 className="w-5 h-5" />
                <span>开始生成</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
