import axios from 'axios'
import toast from 'react-hot-toast'
import { logger } from '../utils/logger'

declare module 'axios' {
  interface AxiosRequestConfig {
    __retryCount?: number
    __connRetryCount?: number
  }
}

import type {
  Novel,
  GenerateNovelRequest,
  GenerateNovelResponse,
  Style,
  StyleTemplate,
  StyleConfig,
  StyleConfigOptions,
  StyleStats,
  CreateStyleRequest,
  UpdateStyleRequest,
  StyleFilter,
  NovelGenre,
  GenerateStoryPlanRequest,
  GenerateStoryPlanResponse,
  Character,
  Relationship,
  Worldview,
  Template,
  TemplateFilter,
  StyleGuideData,
  ReviewReportData,
  ReviewCriteria,
  AIFeatures,
  RewriteResult,
  OptimizeResult,
  HumanizeResult,
  HumanizeParagraphsResult,
  HumanizeChapterResult,
  FeatureOption,
  IntensityLevel,
  GenreOption,
  QualityTask,
  QualityResult,
  ChapterVersion,
  ConsistencyCheck
} from '@shared/types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

let loadingCount = 0

const showLoading = () => {
  loadingCount++
  if (loadingCount === 1) {
    logger.log('开始加载')
  }
}

const hideLoading = () => {
  loadingCount--
  if (loadingCount === 0) {
    logger.log('加载完成')
  }
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use(
  (config) => {
    logger.log('API请求开始:', {
      url: config.url,
      method: config.method,
      params: config.params,
      data: config.data
    })
    showLoading()
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    return config
  },
  (error) => {
    logger.error('API请求配置错误:', error)
    hideLoading()
    return Promise.reject(error)
  }
)

const RETRY_WAIT_TIMES_429 = [30000, 60000, 120000]
const RETRY_WAIT_TIMES_CONN = [2000, 4000, 8000]
const MAX_CONN_RETRIES = 3

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

api.interceptors.response.use(
  (response) => {
    logger.log('API请求成功:', {
      url: response.config.url,
      method: response.config.method,
      status: response.status,
      statusText: response.statusText
    })
    hideLoading()
    if (response.config.responseType === 'blob') {
      return response.data
    }
    return response.data
  },
  async (error) => {
    const status = error.response?.status
    const config = error.config
    
    // 进度轮询请求不在这里重试，由轮询逻辑自己处理
    const isProgressRequest = config?.url?.includes('/generate/progress')
    
    if (status === 429 && config && !isProgressRequest) {
      const retryCount = config.__retryCount || 0
      
      if (retryCount < 3) {
        config.__retryCount = retryCount + 1
        const waitTime = RETRY_WAIT_TIMES_429[retryCount]
        
        logger.log(`API请求429限流，第${retryCount + 1}次重试，等待${waitTime / 1000}秒...`)
        toast.loading(`请求限流，${waitTime / 1000}秒后重试(${retryCount + 1}/3)...`, { 
          id: 'retry-429',
          duration: waitTime + 1000 
        })
        
        await sleep(waitTime)
        toast.dismiss('retry-429')
        
        return api(config)
      } else {
        logger.error('API请求429限流，已达到最大重试次数')
        toast.error('请求频繁，请稍后再试')
        hideLoading()
        return Promise.reject(new Error('请求频繁，请稍后再试'))
      }
    }
    
    logger.error('API请求失败:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
      stack: error.stack
    })
    hideLoading()
    
    // 处理网络连接错误（后端不可用）
    const isNetworkError = !error.response && (error.code === 'ECONNREFUSED' || error.message.includes('Network Error') || error.message.includes('ECONNREFUSED'))
    
    if (isNetworkError && config) {
      const connRetryCount = config.__connRetryCount || 0
      
      if (connRetryCount < MAX_CONN_RETRIES) {
        config.__connRetryCount = connRetryCount + 1
        const waitTime = RETRY_WAIT_TIMES_CONN[connRetryCount]
        
        logger.log(`后端连接失败，第${connRetryCount + 1}次重试，等待${waitTime / 1000}秒...`)
        toast.loading(`正在连接服务器...(${connRetryCount + 1}/${MAX_CONN_RETRIES})`, { 
          id: 'conn-retry',
          duration: waitTime + 1000 
        })
        
        await sleep(waitTime)
        toast.dismiss('conn-retry')
        
        return api(config)
      } else {
        logger.error('后端连接失败，已达到最大重试次数')
        toast.error('服务器暂时不可用，请稍后刷新页面重试', { duration: 5000 })
        return Promise.reject(new Error('服务器暂时不可用'))
      }
    }
    
    let message = '请求失败'
    let errorCode = error.response?.data?.code || ''
    
    if (error.response?.data instanceof Blob) {
      try {
        const text = await error.response.data.text()
        const json = JSON.parse(text)
        message = json.message || message
        errorCode = json.code || ''
      } catch {
        message = error.response?.statusText || message
      }
    } else {
      message = error.response?.data?.message || message
      errorCode = error.response?.data?.code || ''
    }
    
    // 为不同类型的错误提供更具体的错误信息和解决方案
    let friendlyMessage = message
    let solution = ''
    
    switch (errorCode) {
      case 'AI_SERVICE_ERROR':
        friendlyMessage = 'AI服务调用失败'
        solution = '请检查网络连接或稍后重试'
        break
      case 'INVALID_AI_CONFIG':
        friendlyMessage = 'AI配置无效'
        solution = '请检查您的AI服务配置'
        break
      case 'GENERATION_FAILED':
        friendlyMessage = '生成失败'
        solution = '请检查输入内容或稍后重试'
        break
      case 'NOVEL_NOT_FOUND':
        friendlyMessage = '小说不存在'
        solution = '请检查小说ID是否正确'
        break
      case 'DATABASE_ERROR':
        friendlyMessage = '数据库操作失败'
        solution = '请稍后重试'
        break
      case 'UNAUTHORIZED':
        friendlyMessage = '未授权访问'
        solution = '请重新登录'
        break
      case 'FORBIDDEN':
        friendlyMessage = '禁止访问'
        solution = '您没有权限执行此操作'
        break
      case 'NOT_FOUND':
        friendlyMessage = '资源不存在'
        solution = '请检查请求的资源是否存在'
        break
      case 'BAD_REQUEST':
        friendlyMessage = '请求参数错误'
        solution = '请检查输入内容是否正确'
        break
      case 'INTERNAL_SERVER_ERROR':
        friendlyMessage = '服务器内部错误'
        solution = '请稍后重试'
        break
      default:
        // 处理网络错误
        if (error.message.includes('Network Error')) {
          friendlyMessage = '网络连接失败'
          solution = '请检查网络连接后重试'
        } else if (error.message.includes('timeout')) {
          friendlyMessage = '请求超时'
          solution = '请检查网络连接或稍后重试'
        }
    }
    
    // 显示友好的错误信息
    if (solution) {
      toast.error(`${friendlyMessage}\n${solution}`)
    } else {
      toast.error(friendlyMessage)
    }
    
    return Promise.reject(new Error(friendlyMessage))
  }
)

export const generateNovel = async (data: GenerateNovelRequest): Promise<GenerateNovelResponse> => {
  const response = await api.post('/generate', data)
  return (response as unknown as { success: boolean; data: GenerateNovelResponse }).data
}

export const generateStoryPlan = async (data: GenerateStoryPlanRequest): Promise<GenerateStoryPlanResponse> => {
  const response = await api.post('/story-plan', data)
  return (response as unknown as { success: boolean; data: GenerateStoryPlanResponse }).data
}

export interface GenerateOutlineAutoRequest {
  title: string
  prompt: string
  templateId?: string
  style?: string
  styleConfig?: StyleConfig
  wordCount?: number
}

export const generateOutlineAuto = async (data: GenerateOutlineAutoRequest): Promise<{ outline: string }> => {
  const response = await api.post('/generate/outline-auto', data)
  return (response as unknown as { success: boolean; data: { outline: string } }).data
}

export const getNovels = async (): Promise<Novel[]> => {
  const response = await api.get('/novels')
  return (response as unknown as { success: boolean; data: Novel[] }).data || []
}

export const getNovel = async (id: string): Promise<Novel> => {
  const response = await api.get(`/novels/${id}`)
  return (response as unknown as { success: boolean; data: Novel }).data
}

export const deleteNovel = async (id: string): Promise<void> => {
  await api.delete(`/novels/${id}`)
}

export const createNovel = async (data: { title: string; prompt?: string; style?: string }): Promise<{ id: string }> => {
  const response = await api.post('/novels', data)
  return (response as unknown as { success: boolean; data: { id: string } }).data
}

export const updateNovel = async (id: string, data: Partial<Novel>): Promise<Novel> => {
  const response = await api.patch(`/novels/${id}`, data)
  return (response as unknown as { success: boolean; data: Novel }).data
}

export const exportNovel = async (id: string, format: 'txt' | 'pdf' | 'epub'): Promise<Blob> => {
  const response = await api.get(`/novels/${id}/export`, {
    params: { format },
    responseType: 'blob',
  })

  const blob = new Blob([response as unknown as ArrayBuffer])
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `novel-${id}.${format}`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)

  return blob
}

export const getSettings = async (): Promise<Record<string, unknown>> => {
  const response = await api.get('/settings')
  return (response as unknown as { success: boolean; data: Record<string, unknown> }).data
}

export const updateSettings = async (data: unknown): Promise<void> => {
  await api.patch('/settings', data)
}

export interface HumanizeConfig {
  intensity?: 'light' | 'medium' | 'strong' | 'auto'
  enableStyleOptimization?: boolean
  genre?: string
  preservePhrases?: string[]
  targetAudience?: 'young' | 'adult' | 'general'
  mode?: 'rewrite' | 'optimize' | 'full'
  autoPolish?: boolean
  polishIntensity?: 'light' | 'medium' | 'deep'
  polishMode?: 'style_reproduction' | 'remove_ai_flavor'
}

export const getHumanizeConfig = async (): Promise<HumanizeConfig> => {
  const response = await api.get('/settings/humanize-config')
  return (response as unknown as { success: boolean; data: HumanizeConfig }).data
}

export const updateHumanizeConfig = async (config: HumanizeConfig): Promise<void> => {
  await api.put('/settings/humanize-config', config)
}

export const getStyles = async (filter?: StyleFilter): Promise<{ items: Style[]; total: number }> => {
  const params = new URLSearchParams()
  if (filter?.genre) params.append('genre', filter.genre)
  if (filter?.isCustom !== undefined) params.append('isCustom', String(filter.isCustom))
  if (filter?.search) params.append('search', filter.search)

  const response = await api.get(`/styles?${params.toString()}`)
  return (response as unknown as { success: boolean; data: { items: Style[]; total: number } }).data
}

export const getStyle = async (id: string): Promise<Style> => {
  const response = await api.get(`/styles/${id}`)
  return (response as unknown as { success: boolean; data: Style }).data
}

export const createStyle = async (data: CreateStyleRequest): Promise<Style> => {
  const response = await api.post('/styles', data)
  return (response as unknown as { success: boolean; data: Style }).data
}

export const updateStyle = async (id: string, data: UpdateStyleRequest): Promise<Style> => {
  const response = await api.put(`/styles/${id}`, data)
  return (response as unknown as { success: boolean; data: Style }).data
}

export const deleteStyle = async (id: string): Promise<void> => {
  await api.delete(`/styles/${id}`)
}

export const getStyleTemplates = async (genre?: NovelGenre): Promise<{ items: StyleTemplate[]; total: number }> => {
  const params = genre ? `?genre=${genre}` : ''
  const response = await api.get(`/styles/templates${params}`)
  return (response as unknown as { success: boolean; data: { items: StyleTemplate[]; total: number } }).data
}

export const createStyleFromTemplate = async (templateId: string, name?: string): Promise<Style> => {
  const response = await api.post('/styles/from-template', { templateId, name })
  return (response as unknown as { success: boolean; data: Style }).data
}

export const getStyleConfigOptions = async (): Promise<StyleConfigOptions> => {
  const response = await api.get('/styles/options')
  return (response as unknown as { success: boolean; data: StyleConfigOptions }).data
}

export const generateStylePrompt = async (id: string, additionalPrompt?: string): Promise<{ prompt: string }> => {
  const response = await api.post(`/styles/${id}/generate-prompt`, { additionalPrompt })
  return (response as unknown as { success: boolean; data: { prompt: string } }).data
}

export const previewStyleConfig = async (config: StyleConfig, additionalPrompt?: string): Promise<{ promptPreview: string; config: StyleConfig }> => {
  const response = await api.post('/styles/preview', { config, additionalPrompt })
  return (response as unknown as { success: boolean; data: { promptPreview: string; config: StyleConfig } }).data
}

export const checkStyleConsistency = async (id: string, content: string): Promise<{ isConsistent: boolean; issues?: string[]; suggestions?: string[] }> => {
  const response = await api.post(`/styles/${id}/check-consistency`, { content })
  return (response as unknown as { success: boolean; data: { isConsistent: boolean; issues?: string[]; suggestions?: string[] } }).data
}

export const getStyleStats = async (): Promise<StyleStats> => {
  const response = await api.get('/styles/stats')
  return (response as unknown as { success: boolean; data: StyleStats }).data
}

export const getDefaultStyle = async (): Promise<Style> => {
  const response = await api.get('/styles/default')
  return (response as unknown as { success: boolean; data: Style }).data
}

export const setDefaultStyle = async (id: string): Promise<void> => {
  await api.put(`/styles/${id}/set-default`, {})
}

export const getTemplates = async (filter?: TemplateFilter): Promise<{ items: Template[]; total: number }> => {
  const params = new URLSearchParams()
  if (filter?.type) params.append('type', filter.type)
  if (filter?.search) params.append('search', filter.search)

  const response = await api.get(`/templates?${params.toString()}`)
  return (response as unknown as { success: boolean; data: { items: Template[]; total: number } }).data
}

export const getTemplate = async (id: string): Promise<Template> => {
  const response = await api.get(`/templates/${id}`)
  return (response as unknown as { success: boolean; data: Template }).data
}

export const createTemplate = async (data: Omit<Template, 'id' | 'createdAt' | 'updatedAt'>): Promise<Template> => {
  const response = await api.post('/templates', data)
  return (response as unknown as { success: boolean; data: Template }).data
}

export const updateTemplate = async (id: string, data: Partial<Template>): Promise<Template> => {
  const response = await api.put(`/templates/${id}`, data)
  return (response as unknown as { success: boolean; data: Template }).data
}

export const deleteTemplate = async (id: string): Promise<void> => {
  await api.delete(`/templates/${id}`)
}

export const getStyleGuide = async (templateId: string, styleId?: string): Promise<StyleGuideData> => {
  const params = styleId ? `?styleId=${styleId}` : ''
  const response = await api.get(`/templates/${templateId}/style-guide${params}`)
  return (response as unknown as { success: boolean; data: StyleGuideData }).data
}

export const analyzeImage = async (image: string): Promise<{ description: string }> => {
  const response = await api.post('/analyze-image', { image })
  return (response as unknown as { success: boolean; data: { description: string } }).data
}

export const batchGenerateChapters = async (data: {
  novelId: string
  startChapter: number
  endChapter: number
  outline: string
  contentBlockSize?: number
}): Promise<{ id: string; message: string }> => {
  const response = await api.post('/generate/batch', data)
  return (response as unknown as { success: boolean; data: { id: string; message: string } }).data
}

export const getGenerateProgress = async (taskId: string): Promise<{
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
}> => {
  const response = await api.get(`/generate/progress/${taskId}`)
  return (response as unknown as { success: boolean; data: {
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
  } }).data
}

export const cancelGenerate = async (taskId: string): Promise<void> => {
  await api.post('/generate/cancel', { id: taskId })
}

export const getGenerateTaskByNovelId = async (novelId: string): Promise<{
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
} | null> => {
  const response = await api.get(`/generate/novel/${novelId}`)
  return (response as unknown as { success: boolean; data: {
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
  } | null }).data
}

export const getGenerateStatus = async (novelId: string): Promise<{
  totalChapterCount: number
  generatedChapterCount: number
  lastFailedChapterIndex: number | null
  lastFailureReason: string | null
  isComplete: boolean
  status: string
}> => {
  const response = await api.get(`/generate/status/${novelId}`)
  return (response as unknown as { success: boolean; data: {
    totalChapterCount: number
    generatedChapterCount: number
    lastFailedChapterIndex: number | null
    lastFailureReason: string | null
    isComplete: boolean
    status: string
  } }).data
}

export const continueGeneration = async (novelId: string): Promise<{
  id: string
  novelId: string
  message: string
}> => {
  const response = await api.post(`/generate/continue/${novelId}`)
  return (response as unknown as { success: boolean; data: {
    id: string
    novelId: string
    message: string
  } }).data
}

export const regenerateChapter = async (novelId: string, chapterId: string): Promise<{
  id: string
  novelId: string
  chapterId: string
  message: string
}> => {
  const response = await api.post(`/generate/regenerate/${novelId}/${chapterId}`)
  return (response as unknown as { success: boolean; data: {
    id: string
    novelId: string
    chapterId: string
    message: string
  } }).data
}

export const updateChapter = async (novelId: string, chapterId: string, data: {
  title?: string
  content?: string
  description?: string
}): Promise<{
  id: string
  novelId: string
  title: string
  content: string
  description?: string
  wordCount: number
}> => {
  const response = await api.patch(`/novels/${novelId}/chapters/${chapterId}`, data)
  return (response as unknown as { success: boolean; data: {
    id: string
    novelId: string
    title: string
    content: string
    description?: string
    wordCount: number
  } }).data
}

export const checkReviewNeeded = async (novelId: string): Promise<{ shouldReview: boolean }> => {
  const response = await api.get(`/review/check/${novelId}`)
  return (response as unknown as { success: boolean; data: { shouldReview: boolean } }).data
}

export const performReview = async (novelId: string): Promise<ReviewReportData> => {
  const response = await api.post(`/review/analyze/${novelId}`)
  return (response as unknown as { success: boolean; data: ReviewReportData }).data
}

export const getReviewReports = async (novelId: string): Promise<ReviewReportData[]> => {
  const response = await api.get(`/review/reports/${novelId}`)
  return (response as unknown as { success: boolean; data: ReviewReportData[] }).data
}

export const getReviewReport = async (reportId: string): Promise<ReviewReportData> => {
  const response = await api.get(`/review/report/${reportId}`)
  return (response as unknown as { success: boolean; data: ReviewReportData }).data
}

export const analyzeAIFeatures = async (text: string, detailed: boolean = true): Promise<AIFeatures> => {
  const response = await api.post('/humanize/analyze', { text, detailed })
  return (response as unknown as { success: boolean; data: AIFeatures }).data
}

export const rewriteText = async (text: string, options?: {
  intensity?: 'light' | 'medium' | 'strong' | 'auto'
  preservePhrases?: string[]
  targetStyle?: 'natural' | 'vivid' | 'concise' | 'literary'
}): Promise<RewriteResult> => {
  const response = await api.post('/humanize/rewrite', { text, ...options })
  return (response as unknown as { success: boolean; data: RewriteResult }).data
}

export const optimizeStyle = async (text: string, options?: {
  genre?: string
  intensity?: 'light' | 'medium' | 'strong'
  focus?: string[]
}): Promise<OptimizeResult> => {
  const response = await api.post('/humanize/optimize', { text, ...options })
  return (response as unknown as { success: boolean; data: OptimizeResult }).data
}

export const humanizeText = async (text: string, options?: {
  intensity?: 'light' | 'medium' | 'strong' | 'auto'
  genre?: string
  enableStyleOptimization?: boolean
  preservePhrases?: string[]
  targetAudience?: 'young' | 'adult' | 'general'
  mode?: 'rewrite' | 'optimize' | 'full'
}): Promise<HumanizeResult> => {
  const response = await api.post('/humanize', { text, ...options })
  return (response as unknown as { success: boolean; data: HumanizeResult }).data
}

export const humanizeParagraphs = async (text: string, intensity: 'light' | 'medium' | 'strong' | 'auto' = 'auto'): Promise<HumanizeParagraphsResult> => {
  const response = await api.post('/humanize/paragraphs', { text, intensity })
  return (response as unknown as { success: boolean; data: HumanizeParagraphsResult }).data
}

export const humanizeChapter = async (data: {
  chapterId: string
  chapterTitle: string
  content: string
  intensity?: 'light' | 'medium' | 'strong' | 'auto'
  genre?: string
  userEdits?: Array<{
    position: number
    originalContent: string
    userContent: string
    editTime: string
  }>
}): Promise<HumanizeChapterResult> => {
  const response = await api.post('/humanize/chapter', data)
  return (response as unknown as { success: boolean; data: HumanizeChapterResult }).data
}

export const getAIFeatures = async (): Promise<FeatureOption[]> => {
  const response = await api.get('/humanize/features')
  return (response as unknown as { success: boolean; data: FeatureOption[] }).data
}

export const getIntensityLevels = async (): Promise<IntensityLevel[]> => {
  const response = await api.get('/humanize/intensity-levels')
  return (response as unknown as { success: boolean; data: IntensityLevel[] }).data
}

export const getHumanizeGenres = async (): Promise<GenreOption[]> => {
  const response = await api.get('/humanize/genres')
  return (response as unknown as { success: boolean; data: GenreOption[] }).data
}

export const createQualityTask = async (novelId: string, type: 'plot_check' | 'detail_enhance' | 'ending_improve' | 'proofread'): Promise<QualityTask> => {
  const response = await api.post('/quality/task', { novelId, type })
  return (response as unknown as { success: boolean; data: QualityTask }).data
}

export const executeQualityTask = async (taskId: string): Promise<QualityTask> => {
  const response = await api.post(`/quality/task/${taskId}/execute`, {})
  return (response as unknown as { success: boolean; data: QualityTask }).data
}

export const getQualityTask = async (taskId: string): Promise<QualityTask> => {
  const response = await api.get(`/quality/task/${taskId}`)
  return (response as unknown as { success: boolean; data: QualityTask }).data
}

export const getQualityResults = async (novelId: string): Promise<QualityResult[]> => {
  const response = await api.get(`/quality/results/${novelId}`)
  return (response as unknown as { success: boolean; data: QualityResult[] }).data
}

export const getQualityResult = async (resultId: string): Promise<QualityResult> => {
  const response = await api.get(`/quality/result/${resultId}`)
  return (response as unknown as { success: boolean; data: QualityResult }).data
}

export const createCharacter = async (novelId: string, character: Omit<Character, 'id' | 'createdAt' | 'updatedAt'>): Promise<Character> => {
  const response = await api.post('/consistency/characters', { novelId, ...character })
  return (response as unknown as { success: boolean; data: Character }).data
}

export const getCharacters = async (novelId: string): Promise<Character[]> => {
  const response = await api.get(`/consistency/characters/${novelId}`)
  return (response as unknown as { success: boolean; data: Character[] }).data
}

export const getCharacter = async (id: string): Promise<Character> => {
  const response = await api.get(`/consistency/character/${id}`)
  return (response as unknown as { success: boolean; data: Character }).data
}

export const updateCharacter = async (id: string, character: Partial<Character>): Promise<Character> => {
  const response = await api.put(`/consistency/character/${id}`, character)
  return (response as unknown as { success: boolean; data: Character }).data
}

export const deleteCharacter = async (id: string): Promise<{ success: boolean }> => {
  const response = await api.delete(`/consistency/character/${id}`)
  return (response as unknown as { success: boolean; data: { success: boolean } }).data
}

export const createRelationship = async (novelId: string, relationship: Omit<Relationship, 'id' | 'createdAt' | 'updatedAt'>): Promise<Relationship> => {
  const response = await api.post('/consistency/relationships', { novelId, ...relationship })
  return (response as unknown as { success: boolean; data: Relationship }).data
}

export const getRelationships = async (novelId: string): Promise<Relationship[]> => {
  const response = await api.get(`/consistency/relationships/${novelId}`)
  return (response as unknown as { success: boolean; data: Relationship[] }).data
}

export const createWorldview = async (novelId: string, worldview: Omit<Worldview, 'id' | 'createdAt' | 'updatedAt'>): Promise<Worldview> => {
  const response = await api.post('/consistency/worldview', { novelId, ...worldview })
  return (response as unknown as { success: boolean; data: Worldview }).data
}

export const getWorldview = async (novelId: string): Promise<Worldview | undefined> => {
  const response = await api.get(`/consistency/worldview/${novelId}`)
  return (response as unknown as { success: boolean; data: Worldview | undefined }).data
}

export const createChapterVersion = async (chapterId: string, content: string, description: string, createdBy?: string): Promise<ChapterVersion> => {
  const response = await api.post('/consistency/versions', { chapterId, content, description, createdBy })
  return (response as unknown as { success: boolean; data: ChapterVersion }).data
}

export const getChapterVersions = async (chapterId: string): Promise<ChapterVersion[]> => {
  const response = await api.get(`/consistency/versions/${chapterId}`)
  return (response as unknown as { success: boolean; data: ChapterVersion[] }).data
}

export const getChapterVersion = async (id: string): Promise<ChapterVersion> => {
  const response = await api.get(`/consistency/version/${id}`)
  return (response as unknown as { success: boolean; data: ChapterVersion }).data
}

export const runConsistencyCheck = async (novelId: string, chapterId?: string, checkType?: string): Promise<ConsistencyCheck> => {
  const response = await api.post('/consistency/check', { novelId, chapterId, checkType })
  return (response as unknown as { success: boolean; data: ConsistencyCheck }).data
}

export const getConsistencyChecks = async (novelId: string, chapterId?: string): Promise<ConsistencyCheck[]> => {
  const params = chapterId ? `?chapterId=${chapterId}` : ''
  const response = await api.get(`/consistency/checks/${novelId}${params}`)
  return (response as unknown as { success: boolean; data: ConsistencyCheck[] }).data
}

export const createReviewCriteria = async (novelId: string, name: string, description: string, type: string, threshold: number): Promise<ReviewCriteria> => {
  const response = await api.post('/consistency/criteria', { novelId, name, description, type, threshold })
  return (response as unknown as { success: boolean; data: ReviewCriteria }).data
}

export const getReviewCriteria = async (novelId: string): Promise<ReviewCriteria[]> => {
  const response = await api.get(`/consistency/criteria/${novelId}`)
  return (response as unknown as { success: boolean; data: ReviewCriteria[] }).data
}

export const updateReviewCriteria = async (id: string, criteria: Partial<Omit<ReviewCriteria, 'id' | 'novelId' | 'createdAt' | 'updatedAt'>>): Promise<ReviewCriteria> => {
  const response = await api.put(`/consistency/criteria/${id}`, criteria)
  return (response as unknown as { success: boolean; data: ReviewCriteria }).data
}

export const deleteReviewCriteria = async (id: string): Promise<{ success: boolean }> => {
  const response = await api.delete(`/consistency/criteria/${id}`)
  return (response as unknown as { success: boolean; data: { success: boolean } }).data
}

// ============================================================================
// 项目设定 API
// ============================================================================

export interface ProjectSettingData {
  id?: string
  workflowId?: string
  title: string
  description?: string
  genre: string
  coreSellingPoint: string
  targetReaderFeeling: string
  first30ChaptersPromise: string
  worldviewHint?: string
  styleHint?: string
  writingStyle?: string
  estimatedWordCount?: number
  oneLineSummary?: string
  createdAt?: string
  updatedAt?: string
}

export const createProjectSetting = async (data: ProjectSettingData): Promise<ProjectSettingData> => {
  const response = await api.post('/project-setting', data)
  return (response as unknown as { success: boolean; data: ProjectSettingData }).data
}

export const getProjectSetting = async (id: string): Promise<ProjectSettingData> => {
  const response = await api.get(`/project-setting/${id}`)
  return (response as unknown as { success: boolean; data: ProjectSettingData }).data
}

export const getProjectSettingByWorkflow = async (workflowId: string): Promise<ProjectSettingData> => {
  const response = await api.get(`/project-setting/workflow/${workflowId}`)
  return (response as unknown as { success: boolean; data: ProjectSettingData }).data
}

export const updateProjectSetting = async (id: string, data: Partial<ProjectSettingData>): Promise<ProjectSettingData> => {
  const response = await api.put(`/project-setting/${id}`, data)
  return (response as unknown as { success: boolean; data: ProjectSettingData }).data
}

export const deleteProjectSetting = async (id: string): Promise<void> => {
  await api.delete(`/project-setting/${id}`)
}

export const validateProjectSetting = async (data: ProjectSettingData): Promise<{ valid: boolean; message: string }> => {
  const response = await api.post('/project-setting/validate', data)
  return (response as unknown as { success: boolean; data: { valid: boolean; message: string } }).data
}

export interface StreamGenerateOptions {
  prompt: string
  systemPrompt?: string
  temperature?: number
  maxTokens?: number
  onChunk: (content: string) => void
  onError?: (error: string) => void
  onComplete?: () => void
}

export const streamGenerateText = async (options: StreamGenerateOptions): Promise<void> => {
  const { prompt, systemPrompt, temperature, maxTokens, onChunk, onError, onComplete } = options
  
  const response = await fetch(`${API_BASE_URL}/ai/generate-stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt, systemPrompt, temperature, maxTokens }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    onError?.(`请求失败: ${response.status} ${errorText}`)
    return
  }

  const reader = response.body?.getReader()
  if (!reader) {
    onError?.('无法获取响应流')
    return
  }

  const decoder = new TextDecoder()
  let buffer = ''

  try {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read()
      
      if (done) {
        break
      }

      buffer += decoder.decode(value, { stream: true })
      
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          
          if (data === '[DONE]') {
            onComplete?.()
            return
          }

          try {
            const parsed = JSON.parse(data)
            
            if (parsed.error) {
              onError?.(parsed.error)
              return
            }
            
            if (parsed.content) {
              onChunk(parsed.content)
            }
          } catch {
            // 忽略解析错误，继续处理下一行
          }
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}

export const regenerateNovelContent = async (novelId: string): Promise<void> => {
  await api.post(`/novels/${novelId}/regenerate`)
}

export interface StreamRegenerateOptions {
  novelId: string
  onChunk: (content: string) => void
  onError?: (error: string) => void
  onComplete?: () => void
}

export const streamRegenerateNovel = async (options: StreamRegenerateOptions): Promise<void> => {
  const { novelId, onChunk, onError, onComplete } = options
  
  const response = await fetch(`${API_BASE_URL}/novels/${novelId}/regenerate-stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    onError?.(`请求失败: ${response.status} ${errorText}`)
    return
  }

  const reader = response.body?.getReader()
  if (!reader) {
    onError?.('无法获取响应流')
    return
  }

  const decoder = new TextDecoder()
  let buffer = ''

  try {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read()
      
      if (done) {
        break
      }

      buffer += decoder.decode(value, { stream: true })
      
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          
          if (data === '[DONE]') {
            onComplete?.()
            return
          }

          try {
            const parsed = JSON.parse(data)
            
            if (parsed.error) {
              onError?.(parsed.error)
              return
            }
            
            if (parsed.content) {
              onChunk(parsed.content)
            }
          } catch {
            // 忽略解析错误，继续处理下一行
          }
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}

// ============================================================================
// AI 导演模式 API
// ============================================================================

import type {
  DirectionCandidate,
  GenerateCandidatesRequest,
  GenerateCandidatesResponse,
  ModifyCandidateRequest,
  ModifyCandidateResponse,
  SelectCandidateRequest,
  SelectCandidateResponse,
  StartDirectorModeRequest,
  StartDirectorModeResponse,
} from '../types/directorMode'

/**
 * 生成整本方向候选
 */
export const generateDirectionCandidates = async (
  data: GenerateCandidatesRequest
): Promise<GenerateCandidatesResponse> => {
  const response = await api.post('/director/generate-candidates', data)
  return (response as unknown as { success: boolean; data: GenerateCandidatesResponse }).data
}

/**
 * 开始导演模式
 */
export const startDirectorMode = async (
  data: StartDirectorModeRequest
): Promise<StartDirectorModeResponse> => {
  const response = await api.post('/director/start', data)
  return (response as unknown as { success: boolean; data: StartDirectorModeResponse }).data
}

/**
 * 修改候选方案
 */
export const modifyCandidate = async (
  data: ModifyCandidateRequest
): Promise<ModifyCandidateResponse> => {
  const response = await api.post('/director/modify-candidate', data)
  return (response as unknown as { success: boolean; data: ModifyCandidateResponse }).data
}

/**
 * 选择候选方案
 */
export const selectCandidate = async (
  data: SelectCandidateRequest
): Promise<SelectCandidateResponse> => {
  const response = await api.post('/director/select-candidate', data)
  return (response as unknown as { success: boolean; data: SelectCandidateResponse }).data
}

/**
 * 流式生成候选方案
 */
export interface StreamGenerateCandidatesOptions {
  inspiration: string
  count?: number
  onCandidateGenerated: (candidate: DirectionCandidate) => void
  onComplete: (candidates: DirectionCandidate[]) => void
  onError?: (error: string) => void
}

export const streamGenerateCandidates = async (
  options: StreamGenerateCandidatesOptions
): Promise<void> => {
  const { inspiration, count = 3, onCandidateGenerated, onComplete, onError } = options

  const response = await fetch(`${API_BASE_URL}/director/stream-generate-candidates`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ inspiration, count }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    onError?.(`请求失败: ${response.status} ${errorText}`)
    return
  }

  const reader = response.body?.getReader()
  if (!reader) {
    onError?.('无法获取响应流')
    return
  }

  const decoder = new TextDecoder()
  let buffer = ''
  const allCandidates: DirectionCandidate[] = []

  try {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read()

      if (done) {
        break
      }

      buffer += decoder.decode(value, { stream: true })

      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)

          if (data === '[DONE]') {
            onComplete(allCandidates)
            return
          }

          try {
            const parsed = JSON.parse(data)

            if (parsed.error) {
              onError?.(parsed.error)
              return
            }

            if (parsed.candidate) {
              allCandidates.push(parsed.candidate)
              onCandidateGenerated(parsed.candidate)
            }
          } catch {
            // 忽略解析错误，继续处理下一行
          }
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}

// ============================================================================
// 故事宏观规划 API
// ============================================================================

import type { UpgradeNode, LongTermPromise } from '../types/workflow'

/**
 * 生成宏观规划请求参数
 */
export interface GenerateMacroPlanningRequest {
  title: string
  genre: string
  coreSellingPoint: string
  targetReaderFeeling: string
  first30ChaptersPromise: string
}

/**
 * 生成宏观规划响应
 */
export interface GenerateMacroPlanningResponse {
  overallDirection: string
  coreConflict: string
  theme: string
  worldviewSummary?: string
  upgradeNodes: UpgradeNode[]
  longTermPromises: LongTermPromise[]
}

/**
 * 生成故事宏观规划
 */
export const generateMacroPlanning = async (
  data: GenerateMacroPlanningRequest
): Promise<GenerateMacroPlanningResponse> => {
  const response = await api.post('/story-plan/macro-planning', data)
  return (response as unknown as { success: boolean; data: GenerateMacroPlanningResponse }).data
}

/**
 * 保存宏观规划请求参数
 */
export interface SaveMacroPlanningRequest {
  workflowId: string
  overallDirection: string
  coreConflict: string
  theme: string
  worldviewSummary?: string
  upgradeNodes: UpgradeNode[]
  longTermPromises: LongTermPromise[]
}

/**
 * 保存宏观规划响应
 */
export interface SaveMacroPlanningResponse {
  id: string
  workflowId: string
  overallDirection: string
  coreConflict: string
  theme: string
  worldviewSummary?: string
  upgradeNodes: UpgradeNode[]
  longTermPromises: LongTermPromise[]
  createdAt: string
  updatedAt: string
}

/**
 * 保存故事宏观规划
 */
export const saveMacroPlanning = async (
  data: SaveMacroPlanningRequest
): Promise<SaveMacroPlanningResponse> => {
  const response = await api.post('/story-plan/macro-planning/save', data)
  return (response as unknown as { success: boolean; data: SaveMacroPlanningResponse }).data
}

/**
 * 获取宏观规划
 */
export const getMacroPlanning = async (
  workflowId: string
): Promise<SaveMacroPlanningResponse | null> => {
  const response = await api.get(`/story-plan/macro-planning/${workflowId}`)
  return (response as unknown as { success: boolean; data: SaveMacroPlanningResponse | null }).data
}

// ============================================================================
// 角色准备阶段 API
// ============================================================================

import type { VolumeResponsibility } from '../types/workflow'

/**
 * 生成角色阵容请求参数
 */
export interface GenerateCharacterCastRequest {
  title: string
  genre: string
  coreSellingPoint: string
  targetReaderFeeling: string
  overallDirection: string
  coreConflict: string
  theme: string
  worldviewSummary?: string
}

/**
 * 生成角色阵容响应
 */
export interface GenerateCharacterCastResponse {
  mainCharacters: Character[]
  supportingCharacters: Character[]
  relationships: Relationship[]
  volumeResponsibilities: VolumeResponsibility[]
}

/**
 * 生成角色阵容
 */
export const generateCharacterCast = async (
  data: GenerateCharacterCastRequest
): Promise<GenerateCharacterCastResponse> => {
  const response = await api.post('/story-plan/character-cast', data)
  return (response as unknown as { success: boolean; data: GenerateCharacterCastResponse }).data
}

/**
 * 保存角色准备数据请求参数
 */
export interface SaveCharacterPreparationRequest {
  workflowId: string
  mainCharacters: Character[]
  supportingCharacters: Character[]
  relationships: Relationship[]
  volumeResponsibilities: VolumeResponsibility[]
}

/**
 * 保存角色准备数据响应
 */
export interface SaveCharacterPreparationResponse {
  id: string
  workflowId: string
  mainCharacters: Character[]
  supportingCharacters: Character[]
  relationships: Relationship[]
  volumeResponsibilities: VolumeResponsibility[]
  createdAt: string
  updatedAt: string
}

/**
 * 保存角色准备数据
 */
export const saveCharacterPreparation = async (
  data: SaveCharacterPreparationRequest
): Promise<SaveCharacterPreparationResponse> => {
  const response = await api.post('/story-plan/character-preparation/save', data)
  return (response as unknown as { success: boolean; data: SaveCharacterPreparationResponse }).data
}

/**
 * 获取角色准备数据
 */
export const getCharacterPreparation = async (
  workflowId: string
): Promise<SaveCharacterPreparationResponse | null> => {
  const response = await api.get(`/story-plan/character-preparation/${workflowId}`)
  return (response as unknown as { success: boolean; data: SaveCharacterPreparationResponse | null }).data
}

// ============================================================================
// 卷战略规划 API
// ============================================================================

import type { Volume, ChapterOutline } from '../types/workflow'

/**
 * 生成卷战略请求参数
 */
export interface GenerateVolumeStrategyRequest {
  title: string
  genre: string
  coreSellingPoint: string
  targetReaderFeeling: string
  overallDirection: string
  coreConflict: string
  theme: string
  upgradeNodes: Array<{
    id: string
    name: string
    chapterRange: { start: number; end: number }
    upgradeContent: string
    keyEvents: string[]
  }>
  mainCharacters: Array<{
    name: string
    role: string
  }>
}

/**
 * 生成卷战略响应
 */
export interface GenerateVolumeStrategyResponse {
  volumes: Volume[]
}

/**
 * 生成卷战略
 */
export const generateVolumeStrategy = async (
  data: GenerateVolumeStrategyRequest
): Promise<GenerateVolumeStrategyResponse> => {
  const response = await api.post('/story-plan/volume-strategy', data)
  return (response as unknown as { success: boolean; data: GenerateVolumeStrategyResponse }).data
}

/**
 * 保存卷战略请求参数
 */
export interface SaveVolumeStrategyRequest {
  workflowId: string
  volumes: Volume[]
  currentVolumeIndex: number
}

/**
 * 保存卷战略响应
 */
export interface SaveVolumeStrategyResponse {
  id: string
  workflowId: string
  volumes: Volume[]
  currentVolumeIndex: number
  createdAt: string
  updatedAt: string
}

/**
 * 保存卷战略
 */
export const saveVolumeStrategy = async (
  data: SaveVolumeStrategyRequest
): Promise<SaveVolumeStrategyResponse> => {
  const response = await api.post('/story-plan/volume-strategy/save', data)
  return (response as unknown as { success: boolean; data: SaveVolumeStrategyResponse }).data
}

/**
 * 获取卷战略
 */
export const getVolumeStrategy = async (
  workflowId: string
): Promise<SaveVolumeStrategyResponse | null> => {
  const response = await api.get(`/story-plan/volume-strategy/${workflowId}`)
  return (response as unknown as { success: boolean; data: SaveVolumeStrategyResponse | null }).data
}

/**
 * 流式生成卷战略选项
 */
export interface StreamGenerateVolumeStrategyOptions {
  title: string
  genre: string
  coreSellingPoint: string
  targetReaderFeeling: string
  overallDirection: string
  coreConflict: string
  theme: string
  upgradeNodes: Array<{
    id: string
    name: string
    chapterRange: { start: number; end: number }
    upgradeContent: string
    keyEvents: string[]
  }>
  mainCharacters: Array<{
    name: string
    role: string
  }>
  onProgress?: (progress: string) => void
  onComplete: (result: GenerateVolumeStrategyResponse) => void
  onError?: (error: string) => void
}

/**
 * 流式生成卷战略
 */
export const streamGenerateVolumeStrategy = async (
  options: StreamGenerateVolumeStrategyOptions
): Promise<void> => {
  const {
    title,
    genre,
    coreSellingPoint,
    targetReaderFeeling,
    overallDirection,
    coreConflict,
    theme,
    upgradeNodes,
    mainCharacters,
    onProgress,
    onComplete,
    onError,
  } = options

  const response = await fetch(`${API_BASE_URL}/story-plan/volume-strategy/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title,
      genre,
      coreSellingPoint,
      targetReaderFeeling,
      overallDirection,
      coreConflict,
      theme,
      upgradeNodes,
      mainCharacters,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    onError?.(`请求失败: ${response.status} ${errorText}`)
    return
  }

  const reader = response.body?.getReader()
  if (!reader) {
    onError?.('无法获取响应流')
    return
  }

  const decoder = new TextDecoder()
  let buffer = ''

  try {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read()

      if (done) {
        break
      }

      buffer += decoder.decode(value, { stream: true })

      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)

          if (data === '[DONE]') {
            return
          }

          try {
            const parsed = JSON.parse(data)

            if (parsed.error) {
              onError?.(parsed.error)
              return
            }

            if (parsed.progress) {
              onProgress?.(parsed.progress)
            }

            if (parsed.result) {
              onComplete(parsed.result)
            }
          } catch {
            // 忽略解析错误，继续处理下一行
          }
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}

// ============================================================================
// 节奏拆章 API
// ============================================================================

/**
 * 生成章节列表请求参数
 */
export interface GenerateChapterListRequest {
  volumeId: string
  volumeName: string
  volumeMission: string
  chapterRange: { start: number; end: number }
  upgradeNodes: Array<{
    id: string
    name: string
    upgradeContent: string
  }>
  mainCharacters: Array<{
    name: string
    role: string
  }>
}

/**
 * 生成章节列表响应
 */
export interface GenerateChapterListResponse {
  chapters: ChapterOutline[]
}

/**
 * 生成章节列表
 */
export const generateChapterList = async (
  data: GenerateChapterListRequest
): Promise<GenerateChapterListResponse> => {
  const response = await api.post('/story-plan/chapter-list', data)
  return (response as unknown as { success: boolean; data: GenerateChapterListResponse }).data
}

/**
 * 保存节奏拆章请求参数
 */
export interface SaveRhythmBreakdownRequest {
  workflowId: string
  currentVolumeId: string
  chapters: ChapterOutline[]
  currentChapterIndex: number
}

/**
 * 保存节奏拆章响应
 */
export interface SaveRhythmBreakdownResponse {
  id: string
  workflowId: string
  currentVolumeId: string
  chapters: ChapterOutline[]
  currentChapterIndex: number
  createdAt: string
  updatedAt: string
}

/**
 * 保存节奏拆章
 */
export const saveRhythmBreakdown = async (
  data: SaveRhythmBreakdownRequest
): Promise<SaveRhythmBreakdownResponse> => {
  const response = await api.post('/story-plan/rhythm-breakdown/save', data)
  return (response as unknown as { success: boolean; data: SaveRhythmBreakdownResponse }).data
}

/**
 * 获取节奏拆章
 */
export const getRhythmBreakdown = async (
  workflowId: string
): Promise<SaveRhythmBreakdownResponse | null> => {
  const response = await api.get(`/story-plan/rhythm-breakdown/${workflowId}`)
  return (response as unknown as { success: boolean; data: SaveRhythmBreakdownResponse | null }).data
}

// ============================================================================
// 章节执行工作流 API
// ============================================================================

import type {
  BatchGenerationParams,
  GenerationProgress,
  FixRecord,
  ChapterNavigationItem,
  ChapterProgressStats,
  GenerateChapterRequest,
  GenerateChapterResponse,
  AuditChapterRequest,
  AuditChapterResponse,
  GetFixSuggestionsRequest,
  GetFixSuggestionsResponse,
  ApplyFixRequest,
  ApplyFixResponse,
} from '../types/chapterExecution'

/**
 * 获取章节列表
 */
export const getChapterList = async (workflowId: string): Promise<{
  chapters: ChapterNavigationItem[]
  stats: ChapterProgressStats
}> => {
  const response = await api.get(`/chapter-execution/chapters/${workflowId}`)
  return (response as unknown as { success: boolean; data: { chapters: ChapterNavigationItem[]; stats: ChapterProgressStats } }).data
}

/**
 * 获取章节内容
 */
export const getChapterContent = async (chapterId: string): Promise<{
  id: string
  content: string
  wordCount: number
  updatedAt: string
}> => {
  const response = await api.get(`/chapter-execution/chapter/${chapterId}/content`)
  return (response as unknown as { success: boolean; data: { id: string; content: string; wordCount: number; updatedAt: string } }).data
}

/**
 * 保存章节内容
 */
export const saveChapterContent = async (chapterId: string, content: string): Promise<{
  success: boolean
  wordCount: number
}> => {
  const response = await api.put(`/chapter-execution/chapter/${chapterId}/content`, { content })
  return (response as unknown as { success: boolean; data: { success: boolean; wordCount: number } }).data
}

/**
 * 生成章节内容
 */
export const generateChapterContent = async (
  data: GenerateChapterRequest
): Promise<GenerateChapterResponse> => {
  const response = await api.post('/chapter-execution/generate', data)
  return (response as unknown as { success: boolean; data: GenerateChapterResponse }).data
}

/**
 * 批量生成章节
 */
export const batchGenerateChaptersWorkflow = async (
  workflowId: string,
  params: BatchGenerationParams
): Promise<{ taskId: string; message: string }> => {
  const response = await api.post(`/chapter-execution/batch-generate/${workflowId}`, params)
  return (response as unknown as { success: boolean; data: { taskId: string; message: string } }).data
}

/**
 * 获取生成进度
 */
export const getGenerationProgress = async (taskId: string): Promise<GenerationProgress> => {
  const response = await api.get(`/chapter-execution/progress/${taskId}`)
  return (response as unknown as { success: boolean; data: GenerationProgress }).data
}

/**
 * 取消生成任务
 */
export const cancelGenerationTask = async (taskId: string): Promise<void> => {
  await api.post(`/chapter-execution/cancel/${taskId}`)
}

/**
 * 审计章节
 */
export const auditChapter = async (
  data: AuditChapterRequest
): Promise<AuditChapterResponse> => {
  const response = await api.post('/chapter-execution/audit', data)
  return (response as unknown as { success: boolean; data: AuditChapterResponse }).data
}

/**
 * 批量审计章节
 */
export const batchAuditChapters = async (
  workflowId: string,
  chapterIds: string[]
): Promise<{ taskId: string; message: string }> => {
  const response = await api.post(`/chapter-execution/batch-audit/${workflowId}`, { chapterIds })
  return (response as unknown as { success: boolean; data: { taskId: string; message: string } }).data
}

/**
 * 获取修复建议
 */
export const getFixSuggestions = async (
  data: GetFixSuggestionsRequest
): Promise<GetFixSuggestionsResponse> => {
  const response = await api.post('/chapter-execution/fix-suggestions', data)
  return (response as unknown as { success: boolean; data: GetFixSuggestionsResponse }).data
}

/**
 * 应用修复
 */
export const applyFix = async (
  data: ApplyFixRequest
): Promise<ApplyFixResponse> => {
  const response = await api.post('/chapter-execution/apply-fix', data)
  return (response as unknown as { success: boolean; data: ApplyFixResponse }).data
}

/**
 * 批量应用修复
 */
export const batchApplyFixes = async (
  chapterId: string,
  suggestionIds: string[]
): Promise<{ success: boolean; appliedCount: number }> => {
  const response = await api.post(`/chapter-execution/batch-fix/${chapterId}`, { suggestionIds })
  return (response as unknown as { success: boolean; data: { success: boolean; appliedCount: number } }).data
}

/**
 * 获取修复历史
 */
export const getFixHistory = async (chapterId: string): Promise<{
  chapterId: string
  records: FixRecord[]
  totalFixes: number
}> => {
  const response = await api.get(`/chapter-execution/fix-history/${chapterId}`)
  return (response as unknown as { success: boolean; data: { chapterId: string; records: FixRecord[]; totalFixes: number } }).data
}

/**
 * 流式生成章节内容
 */
// ============================================================================
// AI辅助生成API
// ============================================================================

export interface GenerateInspirationRequest {
  keyword?: string
  genre?: string
}

export interface GenerateInspirationResponse {
  directions: Array<{
    title: string
    description: string
    genre: string
    coreSellingPoint: string
    targetReaderFeeling: string
  }>
}

export const generateInspiration = async (
  data: GenerateInspirationRequest
): Promise<GenerateInspirationResponse> => {
  const response = await api.post('/story-plan/inspiration', data)
  return (response as unknown as { success: boolean; data: GenerateInspirationResponse }).data
}

export interface GenerateProjectSettingRequest {
  title: string
  description: string
  genre?: string
  inspiration?: string
}

export interface GenerateProjectSettingResponse {
  title?: string
  description?: string
  genre: string
  coreSellingPoint: string
  targetReaderFeeling: string
  first30ChaptersPromise: string
  worldviewHint: string
  styleHint: string
}

export const generateProjectSetting = async (
  data: GenerateProjectSettingRequest
): Promise<GenerateProjectSettingResponse> => {
  const response = await api.post('/story-plan/project-setting', data)
  return (response as unknown as { success: boolean; data: GenerateProjectSettingResponse }).data
}

export interface GenerateVolumeStrategyAIRequest {
  title: string
  genre: string
  overallDirection: string
  coreConflict: string
  upgradeNodes: Array<{
    name: string
    chapterRange: { start: number; end: number }
    upgradeContent: string
    keyEvents: string[]
  }>
  mainCharacters?: Array<{ name: string; role: string }>
}

export interface GenerateVolumeStrategyAIResponse {
  volumes: Array<{
    name: string
    chapterRange: { start: number; end: number }
    coreEvent: string
    characterArc: string
    tensionLevel: number
    summary: string
    upgradeNodes: Array<{
      name: string
      upgradeContent: string
    }>
    endingHook: string
  }>
}

export const generateVolumeStrategyAI = async (
  data: GenerateVolumeStrategyAIRequest
): Promise<GenerateVolumeStrategyAIResponse> => {
  const response = await api.post('/story-plan/volume-strategy', data)
  return (response as unknown as { success: boolean; data: GenerateVolumeStrategyAIResponse }).data
}

export interface GenerateRhythmBreakdownAIRequest {
  title: string
  genre: string
  volumeName: string
  volumeChapterRange: { start: number; end: number }
  coreEvent: string
  characterArc: string
  tensionLevel: number
  characters: Array<{ name: string; role: string }>
}

export interface GenerateRhythmBreakdownAIResponse {
  chapters: Array<{
    chapterNumber: number
    title: string
    summary: string
    tensionLevel: number
    pov: string
    keyEvents: string[]
    wordCountTarget: number
  }>
}

export const generateRhythmBreakdownAI = async (
  data: GenerateRhythmBreakdownAIRequest
): Promise<GenerateRhythmBreakdownAIResponse> => {
  const response = await api.post('/story-plan/rhythm-breakdown', data)
  return (response as unknown as { success: boolean; data: GenerateRhythmBreakdownAIResponse }).data
}

export interface GenerateChapterContentAIRequest {
  title: string
  genre: string
  chapterTitle: string
  chapterSummary: string
  previousChapterSummary?: string
  characters: Array<{ name: string; role: string; personality?: string }>
  styleHint?: string
  targetWordCount?: number
  rhythmType?: 'fast' | 'medium' | 'slow'
  writingStyle?: string
  emotionalTone?: string
  specialRequirements?: string
  autoPolish?: boolean
  polishIntensity?: 'light' | 'medium' | 'deep'
}

export interface GenerateChapterContentAIResponse {
  content: string
  wordCount: number
}

export const generateChapterContentAI = async (
  data: GenerateChapterContentAIRequest
): Promise<GenerateChapterContentAIResponse> => {
  const response = await api.post('/story-plan/chapter-content', data)
  return (response as unknown as { success: boolean; data: GenerateChapterContentAIResponse }).data
}

// ============================================================================
// AI模型管理API
// ============================================================================

import type { AIModel, AIModelFormData, AIModelTestResult } from '../types/aiModel'

export const aiModelApi = {
  getAll: async (): Promise<{ data: AIModel[] }> => {
    const response = await api.get('/ai-models')
    return { data: (response as unknown as { data?: AIModel[] }).data || [] }
  },

  getById: async (id: string): Promise<{ data: AIModel }> => {
    const response = await api.get(`/ai-models/${id}`)
    return { data: (response as unknown as { data: AIModel }).data }
  },

  create: async (data: AIModelFormData): Promise<{ data: AIModel }> => {
    const response = await api.post('/ai-models', data)
    return { data: (response as unknown as { data: AIModel }).data }
  },

  update: async (id: string, data: Partial<AIModelFormData>): Promise<{ data: AIModel }> => {
    const response = await api.put(`/ai-models/${id}`, data)
    return { data: (response as unknown as { data: AIModel }).data }
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/ai-models/${id}`)
  },

  test: async (id: string): Promise<{ data: AIModelTestResult }> => {
    const response = await api.post(`/ai-models/${id}/test`)
    return { data: (response as unknown as { data: AIModelTestResult }).data }
  },

  setActive: async (id: string): Promise<void> => {
    await api.put(`/ai-models/${id}/active`)
  }
}

// ============================================================================
// 润色功能 API
// ============================================================================

/**
 * 润色模式
 */
export type PolishMode = 'style_reproduction' | 'remove_ai_flavor'

/**
 * 风格审计结果
 */
export interface StyleAuditResult {
  /** 总体评分 (0-100) */
  overallScore: number
  /** 各维度评分 */
  scores: {
    /** 句式多样性 */
    sentenceVariety: number
    /** 词汇丰富度 */
    vocabularyRichness: number
    /** 情感表达 */
    emotionalExpression: number
    /** 节奏感 */
    pacing: number
    /** 细节描写 */
    detailDescription: number
  }
  /** AI特征列表 */
  aiFeatures: Array<{
    /** 特征类型 */
    type: string
    /** 特征描述 */
    description: string
    /** 出现次数 */
    count: number
    /** 示例文本 */
    examples: string[]
  }>
  /** 优化建议 */
  suggestions: Array<{
    /** 建议类型 */
    type: 'style' | 'structure' | 'vocabulary' | 'rhythm'
    /** 建议描述 */
    description: string
    /** 优先级 */
    priority: 'high' | 'medium' | 'low'
  }>
}

/**
 * 润色选项
 */
export interface PolishOptions {
  /** 润色模式: style_reproduction-风格复现, remove_ai_flavor-去AI味 */
  mode?: PolishMode
  /** 润色强度: light-轻度, medium-中度, deep-深度 */
  intensity?: 'light' | 'medium' | 'deep'
  /** 保留关键词列表 */
  preserveKeywords?: string[]
  /** 目标受众 */
  targetAudience?: 'young' | 'adult' | 'general'
  /** 文风基调 */
  tone?: 'natural' | 'vivid' | 'concise' | 'literary'
}

/**
 * 润色结果
 */
export interface PolishResult {
  /** 润色后的内容 */
  polishedContent: string
  /** 原始内容 */
  originalContent?: string
  /** 风格审计结果 */
  auditResult?: StyleAuditResult
  /** 检测到的AI特征 */
  aiFeaturesDetected?: string[]
  /** 改进列表 */
  improvements?: Array<{
    type: string
    description: string
    before?: string
    after?: string
  }>
  /** 统计信息 */
  statistics?: {
    /** 原文字数 */
    originalWordCount: number
    /** 润色后字数 */
    polishedWordCount: number
    /** 修改段落数 */
    modifiedParagraphs: number
    /** 改进点数量 */
    improvementCount: number
  }
}

/**
 * 润色单个章节
 * @param content 章节内容
 * @param options 润色选项
 * @returns 润色结果
 */
export const polishChapter = async (
  content: string,
  options?: PolishOptions
): Promise<PolishResult> => {
  const response = await api.post('/story-plan/polish', { content, ...options })
  return (response as unknown as { success: boolean; data: PolishResult }).data
}

/**
 * 批量润色章节
 * @param chapters 章节列表
 * @param options 润色选项
 * @returns 任务ID和消息
 */
export const polishBatch = async (
  chapters: Array<{
    chapterId: string
    content: string
  }>,
  options?: PolishOptions
): Promise<{ taskId: string; message: string }> => {
  const response = await api.post('/story-plan/polish-batch', { chapters, ...options })
  return (response as unknown as { success: boolean; data: { taskId: string; message: string } }).data
}

/**
 * 获取润色进度
 * @param taskId 任务ID
 * @returns 润色进度信息
 */
export const getPolishProgress = async (taskId: string): Promise<{
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  currentChapter?: number
  totalChapters?: number
  message?: string
  error?: string
  results?: Array<{
    chapterId: string
    result: PolishResult
  }>
}> => {
  const response = await api.get(`/polish/progress/${taskId}`)
  return (response as unknown as { success: boolean; data: {
    id: string
    status: 'pending' | 'processing' | 'completed' | 'failed'
    progress: number
    currentChapter?: number
    totalChapters?: number
    message?: string
    error?: string
    results?: Array<{
      chapterId: string
      result: PolishResult
    }>
  } }).data
}

/**
 * 风格审计
 * @param content 待审计的内容
 * @returns 风格审计结果
 */
export const auditStyle = async (content: string): Promise<StyleAuditResult> => {
  const response = await api.post('/story-plan/audit-style', { content })
  return (response as unknown as { success: boolean; data: StyleAuditResult }).data
}

export default api
