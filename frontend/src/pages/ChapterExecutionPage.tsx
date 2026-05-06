import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Save,
  PanelLeftClose,
  PanelLeft,
  Maximize2,
  Minimize2,
  Loader2,
  Download,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useWorkflowStore } from '../stores/workflowStore'
import { WorkflowStage, GeneratedChapter } from '../types/workflow'
import ChapterNavigationView from '../components/ChapterNavigationView'
import ChapterGenerator from '../components/ChapterGenerator'
import FixSuggestions from '../components/FixSuggestions'
import RichTextEditor from '../components/RichTextEditor'
import {
  ChapterStatus,
  ChapterNavigationItem,
  ChapterProgressStats,
  ChapterGenerationParams,
  BatchGenerationParams,
  ChapterAuditResult,
  FixSuggestion,
  FixRecord,
  AuditIssueType,
  IssueSeverity,
  FixStatus,
} from '../types/chapterExecution'
import { cn } from '../utils'
import { generateChapterContentAI, createNovel, updateNovel } from '../services/api'

function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
}

interface ChapterExecutionPageProps {
  embedded?: boolean
}

export default function ChapterExecutionPage({ embedded = false }: ChapterExecutionPageProps) {
  const navigate = useNavigate()

  const {
    workflowState,
    getStageData,
    updateStageData,
    isInitialized,
  } = useWorkflowStore()

  const rhythmBreakdownData = getStageData(WorkflowStage.RHYTHM_BREAKDOWN)
  const projectSettingData = getStageData(WorkflowStage.PROJECT_SETTING)
  
  const currentVolumeChapters = useMemo(() => {
    if (!rhythmBreakdownData) return []
    
    const currentVolumeId = rhythmBreakdownData.currentVolumeId
    if (rhythmBreakdownData.volumeChapters && currentVolumeId) {
      return rhythmBreakdownData.volumeChapters[currentVolumeId] || []
    }
    
    return rhythmBreakdownData.chapters || []
  }, [rhythmBreakdownData])

  const executionData = getStageData(WorkflowStage.CHAPTER_EXECUTION) as {
    novelId?: string
    generatedChapters?: Array<{
      id: string
      chapterNumber: number
      title: string
      content: string
      wordCount: number
      status?: string
      generatedAt?: string
      auditScore?: number
    }>
  } | null

  const [novelId, setNovelId] = useState<string | null>(executionData?.novelId || null)

  // 已生成的章节内容存储
  const [generatedContents, setGeneratedContents] = useState<Record<string, string>>({})

  // 章节列表状态
  const [chapters, setChapters] = useState<ChapterNavigationItem[]>([])
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // 当前章节内容
  const [currentContent, setCurrentContent] = useState('')

  // 从 store 获取生成状态
  const generationTask = useWorkflowStore(state => state.generationTask)
  const isGenerating = generationTask?.isGenerating ?? false
  const workflowProgress = generationTask?.progress ?? null

  // 将 workflow 的 GenerationProgress 转换为 ChapterGenerator 期望的格式
  const generationProgress: import('../types/chapterExecution').GenerationProgress | null =
    workflowProgress && generationTask ? {
      taskId: generationTask.taskId,
      currentChapter: workflowProgress.chapterNumber,
      totalChapters: 1,
      status: workflowProgress.status === 'generating' ? 'generating' :
              workflowProgress.status === 'completed' ? 'completed' :
              workflowProgress.status === 'failed' ? 'failed' : 'pending',
      percentage: workflowProgress.percentage,
      currentAction: workflowProgress.status === 'generating' ? '正在生成章节内容...' :
                    workflowProgress.status === 'completed' ? '生成完成' :
                    workflowProgress.status === 'failed' ? '生成失败' : '等待生成',
      estimatedTimeRemaining: workflowProgress.estimatedRemainingSeconds,
    } : null

  // 审计状态
  const [isAuditing, setIsAuditing] = useState(false)
  const [auditResult, setAuditResult] = useState<ChapterAuditResult | null>(null)

  // 修复建议
  const [fixSuggestions, setFixSuggestions] = useState<FixSuggestion[]>([])
  const [fixHistory, setFixHistory] = useState<FixRecord[]>([])
  const [isProcessingFix, setIsProcessingFix] = useState(false)

  // UI 状态
  const [showLeftPanel, setShowLeftPanel] = useState(true)
  const [showRightPanel, setShowRightPanel] = useState(true)
  const [rightPanelTab, setRightPanelTab] = useState<'generate' | 'fix'>('generate')
  const [isSaving, setIsSaving] = useState(false)

  // 进度统计
  const progressStats: ChapterProgressStats = useMemo(() => {
    const total = chapters.length
    const completed = chapters.filter((c) => c.status === ChapterStatus.COMPLETED).length
    const writing = chapters.filter((c) => c.status === ChapterStatus.WRITING).length
    const pending = chapters.filter((c) => c.status === ChapterStatus.PENDING).length
    const needsFix = chapters.filter((c) => c.status === ChapterStatus.NEEDS_FIX).length
    const totalWords = chapters.reduce((sum, c) => sum + c.wordCount, 0)
    const scores = chapters.filter((c) => c.auditScore !== undefined).map((c) => c.auditScore!)
    const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0

    return {
      totalChapters: total,
      completedChapters: completed,
      writingChapters: writing,
      pendingChapters: pending,
      needsFixChapters: needsFix,
      totalWordCount: totalWords,
      averageAuditScore: avgScore,
      completionPercentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    }
  }, [chapters])

  // 当前选中章节
  const selectedChapter = useMemo(() => {
    return chapters.find((c) => c.id === selectedChapterId)
  }, [chapters, selectedChapterId])

  // 当前选中章节的大纲信息
  const selectedChapterOutline = useMemo(() => {
    if (!selectedChapter || currentVolumeChapters.length === 0) {
      return { summary: '', keyPlotPoints: [], involvedCharacters: [] }
    }
    const outline = currentVolumeChapters.find(
      (ch: { chapterNumber: number }) => ch.chapterNumber === selectedChapter.chapterNumber
    )
    return {
      summary: outline?.summary || '',
      keyPlotPoints: outline?.keyPlotPoints || [],
      involvedCharacters: outline?.involvedCharacters || []
    }
  }, [selectedChapter, currentVolumeChapters])

  // 初始化数据
  useEffect(() => {
    // 等待 store 初始化完成
    if (!isInitialized) {
      return
    }

    const loadData = async () => {
      setIsLoading(true)
      try {
        await new Promise((resolve) => setTimeout(resolve, 300))

        // 在 useEffect 内部重新获取最新数据，确保从 localStorage 加载
        const store = useWorkflowStore.getState()
        const freshRhythmBreakdownData = store.getStageData(WorkflowStage.RHYTHM_BREAKDOWN)
        const freshChapterExecutionData = store.getStageData(WorkflowStage.CHAPTER_EXECUTION) as {
          generatedChapters?: Array<{
            id: string
            chapterNumber: number
            title: string
            content: string
            wordCount: number
            status?: string
            auditScore?: number
          }>
        } | null

        // 检查是否有进行中的生成任务
        const activeGenerationTask = store.getGenerationTask()
        if (activeGenerationTask && activeGenerationTask.isGenerating) {
          toast(`检测到有章节"${activeGenerationTask.progress.chapterTitle}"正在生成，页面刷新后已恢复生成状态`, {
            duration: 5000,
          })
        }

        const savedContents: Record<string, string> = {}
        const savedChapters: Record<string, { wordCount: number; status: ChapterStatus; auditScore?: number }> = {}

        if (freshChapterExecutionData?.generatedChapters) {
          freshChapterExecutionData.generatedChapters.forEach(ch => {
            savedContents[ch.id] = ch.content
            savedChapters[ch.id] = {
              wordCount: ch.wordCount,
              status: ch.status === 'completed' ? ChapterStatus.COMPLETED : 
                      ch.status === 'writing' ? ChapterStatus.WRITING : ChapterStatus.PENDING,
              auditScore: ch.auditScore
            }
          })
        }

        // 使用节奏拆章的真实数据
        // 优先从 volumeChapters 获取当前卷的章节
        const currentVolumeId = freshRhythmBreakdownData?.currentVolumeId
        const chaptersData = (freshRhythmBreakdownData?.volumeChapters && currentVolumeId)
          ? freshRhythmBreakdownData.volumeChapters[currentVolumeId]
          : freshRhythmBreakdownData?.chapters
        
        if (chaptersData && chaptersData.length > 0) {
          const realChapters: ChapterNavigationItem[] = chaptersData.map((ch: { 
            id?: string
            chapterNumber: number
            title?: string
            summary?: string
            wordCount?: number
            estimatedWordCount?: number
            status?: string
          }) => {
            // 优先使用节奏拆章数据中的ID，否则使用章节号生成
            const chapterId = ch.id || `chapter-${ch.chapterNumber}`
            const saved = savedChapters[chapterId]
            return {
              id: chapterId,
              chapterNumber: ch.chapterNumber,
              title: ch.title || `第${ch.chapterNumber}章`,
              wordCount: saved?.wordCount || ch.wordCount || 0,
              estimatedWordCount: ch.estimatedWordCount || 3000,
              status: saved?.status || (ch.status === 'completed' ? ChapterStatus.COMPLETED : 
                      ch.status === 'writing' ? ChapterStatus.WRITING : ChapterStatus.PENDING),
              auditScore: saved?.auditScore,
              updatedAt: new Date().toISOString(),
            }
          })
          setChapters(realChapters)
          setGeneratedContents(savedContents)

          // 默认选中第一个已完成或待写章节
          const firstCompleted = realChapters.find((c) => c.status === ChapterStatus.COMPLETED)
          if (firstCompleted) {
            setSelectedChapterId(firstCompleted.id)
          } else {
            const firstPending = realChapters.find((c) => c.status === ChapterStatus.PENDING)
            if (firstPending) {
              setSelectedChapterId(firstPending.id)
            } else if (realChapters.length > 0) {
              setSelectedChapterId(realChapters[0].id)
            }
          }
        } else {
          // 如果没有节奏拆章数据，显示提示
          setChapters([])
          toast.error('请先完成节奏拆章阶段')
        }
      } catch (error) {
        console.error('加载章节数据失败:', error)
        toast.error('加载章节数据失败')
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [isInitialized])

  // 自动保存功能
  const lastSavedContentRef = useRef<Record<string, string>>({})
  
  useEffect(() => {
    if (!selectedChapterId || !currentContent) return

    // 检查内容是否真正变化
    const lastSaved = lastSavedContentRef.current[selectedChapterId]
    if (lastSaved === currentContent) return

    const autoSaveTimer = setTimeout(() => {
      // 再次检查是否仍然是当前选中的章节
      const currentSelectedId = selectedChapterId
      
      // 自动保存到 store
      const currentExecutionData = getStageData(WorkflowStage.CHAPTER_EXECUTION) as {
        generatedChapters?: Array<{
          id: string
          chapterNumber: number
          title: string
          content: string
          wordCount: number
          status?: string
          generatedAt?: string
        }>
      } | null

      const existingChapters = currentExecutionData?.generatedChapters || []
      const existingChapter = existingChapters.find(ch => ch.id === currentSelectedId)
      
      // 只有内容变化时才保存
      if (existingChapter?.content !== currentContent) {
        const updatedChapters = [
          ...existingChapters.filter(ch => ch.id !== currentSelectedId),
          {
            id: currentSelectedId,
            chapterNumber: selectedChapter?.chapterNumber || 1,
            title: selectedChapter?.title || '',
            content: currentContent,
            wordCount: stripHtmlTags(currentContent).length,
            generatedAt: existingChapter?.generatedAt || new Date().toISOString(),
            status: (existingChapter?.status || 'draft') as 'draft' | 'reviewed' | 'final',
          }
        ]

        updateStageData(WorkflowStage.CHAPTER_EXECUTION, {
          novelId: novelId || undefined,
          currentChapterId: currentSelectedId,
          generatedChapters: updatedChapters as GeneratedChapter[],
          createdAt: currentExecutionData ? (currentExecutionData as { createdAt?: string }).createdAt || new Date().toISOString() : new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })

        // 更新章节字数
        setChapters(prev => prev.map(c => 
          c.id === currentSelectedId 
            ? { ...c, wordCount: stripHtmlTags(currentContent).length }
            : c
        ))

        // 更新本地缓存
        setGeneratedContents(prev => ({
          ...prev,
          [currentSelectedId]: currentContent
        }))
        
        // 记录已保存的内容
        lastSavedContentRef.current[currentSelectedId] = currentContent
      }
    }, 3000) // 3秒后自动保存

    return () => clearTimeout(autoSaveTimer)
  }, [selectedChapterId, currentContent, selectedChapter?.chapterNumber, selectedChapter?.title, novelId, getStageData, updateStageData])

  // 加载选中章节内容
  useEffect(() => {
    const loadChapterContent = async () => {
      if (!selectedChapterId) {
        setCurrentContent('')
        return
      }

      try {
        // 优先从当前状态获取
        let savedContent = generatedContents[selectedChapterId]
        
        // 如果状态中没有，尝试从 store 直接获取
        if (!savedContent) {
          const store = useWorkflowStore.getState()
          const executionData = store.getStageData(WorkflowStage.CHAPTER_EXECUTION) as {
            generatedChapters?: Array<{
              id: string
              content: string
            }>
          } | null
          
          if (executionData?.generatedChapters) {
            const chapter = executionData.generatedChapters.find(ch => ch.id === selectedChapterId)
            if (chapter?.content) {
              savedContent = chapter.content
              // 同时更新状态
              setGeneratedContents(prev => ({
                ...prev,
                [selectedChapterId]: chapter.content
              }))
            }
          }
        }
        
        if (savedContent) {
          setCurrentContent(savedContent)
        } else {
          setCurrentContent('')
        }
        setAuditResult(null)
        setFixSuggestions([])
      } catch (error) {
        console.error('加载章节内容失败:', error)
      }
    }

    loadChapterContent()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChapterId]) // 只依赖 selectedChapterId，避免循环触发

  // 处理章节选择
  const handleChapterSelect = useCallback((chapterId: string) => {
    // 切换前先保存当前章节内容
    if (selectedChapterId && currentContent && selectedChapterId !== chapterId) {
      const currentExecutionData = getStageData(WorkflowStage.CHAPTER_EXECUTION) as {
        generatedChapters?: Array<{
          id: string
          chapterNumber: number
          title: string
          content: string
          wordCount: number
          status?: string
          generatedAt?: string
        }>
      } | null

      const existingChapters = currentExecutionData?.generatedChapters || []
      const existingChapter = existingChapters.find(ch => ch.id === selectedChapterId)
      
      // 保存当前章节内容
      const updatedChapters = [
        ...existingChapters.filter(ch => ch.id !== selectedChapterId),
        {
          id: selectedChapterId,
          chapterNumber: selectedChapter?.chapterNumber || 1,
          title: selectedChapter?.title || '',
          content: currentContent,
          wordCount: stripHtmlTags(currentContent).length,
          generatedAt: existingChapter?.generatedAt || new Date().toISOString(),
          status: (existingChapter?.status || 'draft') as 'draft' | 'reviewed' | 'final',
        }
      ]

      updateStageData(WorkflowStage.CHAPTER_EXECUTION, {
        novelId: novelId || undefined,
        currentChapterId: chapterId,
        generatedChapters: updatedChapters as GeneratedChapter[],
        createdAt: currentExecutionData ? (currentExecutionData as { createdAt?: string }).createdAt || new Date().toISOString() : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      // 更新本地缓存
      setGeneratedContents(prev => ({
        ...prev,
        [selectedChapterId]: currentContent
      }))
      
      // 记录已保存的内容
      lastSavedContentRef.current[selectedChapterId] = currentContent
    }
    
    setSelectedChapterId(chapterId)
    setAuditResult(null)
    setFixSuggestions([])
  }, [selectedChapterId, currentContent, selectedChapter, novelId, getStageData, updateStageData])

  // 处理章节生成
  const handleGenerate = useCallback(
    async (params: ChapterGenerationParams) => {
      if (!selectedChapterId) return

      const taskId = `task-${Date.now()}`
      const chapterNumber = selectedChapter?.chapterNumber || 1
      const currentVolumeId = rhythmBreakdownData?.currentVolumeId

      // 调用 store 开始生成
      useWorkflowStore.getState().startGeneration({
        taskId,
        chapterId: selectedChapterId,
        chapterNumber,
        volumeId: currentVolumeId || '',
        progress: {
          chapterNumber,
          chapterTitle: selectedChapter?.title || '',
          completedWords: 0,
          totalWords: selectedChapter?.estimatedWordCount || 3000,
          percentage: 0,
          status: 'generating',
          startedAt: new Date().toISOString(),
        },
        isGenerating: true,
      })

      try {
        const store = useWorkflowStore.getState()
        const projectSetting = store.getStageData(WorkflowStage.PROJECT_SETTING) as Record<string, unknown> | null
        const characterData = store.getStageData(WorkflowStage.CHARACTER_PREPARATION) as Record<string, unknown> | null
        
        // 从节奏拆章数据中获取当前章节的摘要和关键情节点
        const chapterOutline = currentVolumeChapters.find(
          (ch: { chapterNumber: number }) => ch.chapterNumber === selectedChapter?.chapterNumber
        )
        const chapterSummary = chapterOutline?.summary || ''
        const keyPlotPoints = chapterOutline?.keyPlotPoints || []
        const involvedCharacters = chapterOutline?.involvedCharacters || []
        
        // 将关键情节点合并到摘要中
        const fullSummary = keyPlotPoints.length > 0
          ? `${chapterSummary}\n\n关键情节点：${keyPlotPoints.join('、')}`
          : chapterSummary
        
        // 获取上一章的内容作为上下文
        const prevChapter = chapters.find(c => c.chapterNumber === (selectedChapter?.chapterNumber || 1) - 1)
        const prevChapterSummary = prevChapter ? generatedContents[prevChapter.id]?.substring(0, 500) : undefined
        
        const mainChars = ((characterData?.mainCharacters as Array<Record<string, unknown>>) || [])
          .map((c) => ({
            name: String(c.name || ''),
            role: String(c.role || '主角'),
            personality: c.personality ? String(c.personality) : undefined
          }))
        const supportingChars = ((characterData?.supportingCharacters as Array<Record<string, unknown>>) || [])
          .map((c) => ({
            name: String(c.name || ''),
            role: String(c.role || '配角'),
            personality: c.personality ? String(c.personality) : undefined
          }))

        const allKnownCharacterNames = new Set([
          ...mainChars.map(c => c.name),
          ...supportingChars.map(c => c.name)
        ])

        const involvedChars = involvedCharacters
          .filter((name: string) => !allKnownCharacterNames.has(name))
          .map((name: string) => ({
            name,
            role: '角色' as const,
            personality: undefined as string | undefined
          }))

        const result = await generateChapterContentAI({
          title: (projectSetting?.title as string) || '未命名小说',
          genre: (projectSetting?.genre as string) || '玄幻',
          chapterTitle: selectedChapter?.title || `第${selectedChapter?.chapterNumber || 1}章`,
          chapterSummary: fullSummary || '本章内容待生成',
          previousChapterSummary: prevChapterSummary,
          characters: [...mainChars, ...supportingChars, ...involvedChars],
          styleHint: (projectSetting?.styleHint as string) || undefined,
          targetWordCount: params.targetWordCount || 3000,
          rhythmType: params.rhythmType,
          writingStyle: params.writingStyle,
          emotionalTone: params.emotionalTone,
          specialRequirements: params.specialRequirements,
          autoPolish: params.autoPolish,
          polishIntensity: params.polishIntensity
        })

        // 更新生成进度为完成状态
        useWorkflowStore.getState().updateGenerationProgress({
          completedWords: selectedChapter?.estimatedWordCount || 3000,
          percentage: 100,
          status: 'completed',
        })

        let generatedContent = result.content || ''

        if (!generatedContent) {
          toast.error('AI返回内容为空')
          return
        }

        // 将纯文本转换为 HTML 格式（用 <p> 标签包裹段落）
        generatedContent = generatedContent
          .split('\n\n')
          .filter(p => p.trim())
          .map(p => `<p>${p.trim().replace(/\n/g, '<br/>')}</p>`)
          .join('')

        setGeneratedContents(prev => ({
          ...prev,
          [selectedChapterId]: generatedContent
        }))
        
        setCurrentContent(generatedContent)

        setChapters((prev) =>
          prev.map((c) =>
            c.id === selectedChapterId
              ? {
                  ...c,
                  status: ChapterStatus.COMPLETED,
                  wordCount: stripHtmlTags(generatedContent).length,
                  updatedAt: new Date().toISOString(),
                }
              : c
          )
        )

        // 保存到 workflow store
        const currentExecutionData = getStageData(WorkflowStage.CHAPTER_EXECUTION) as {
          generatedChapters?: Array<{
            id: string
            chapterNumber: number
            title: string
            content: string
            wordCount: number
            status?: string
            generatedAt?: string
          }>
        } | null
        
        const existingChapters = currentExecutionData?.generatedChapters || []
        const updatedChapters = [
          ...existingChapters
            .filter(ch => ch.id !== selectedChapterId)
            .map(ch => ({
              ...ch,
              generatedAt: ch.generatedAt || new Date().toISOString(),
              status: (ch.status || 'draft') as 'draft' | 'reviewed' | 'final'
            })),
          {
            id: selectedChapterId,
            chapterNumber: selectedChapter?.chapterNumber || 1,
            title: selectedChapter?.title || '',
            content: generatedContent,
            wordCount: stripHtmlTags(generatedContent).length,
            status: 'draft' as const,
            generatedAt: new Date().toISOString(),
          }
        ]
        
        updateStageData(WorkflowStage.CHAPTER_EXECUTION, {
          novelId: novelId || undefined,
          currentChapterId: selectedChapterId,
          generatedChapters: updatedChapters,
          createdAt: currentExecutionData ? (currentExecutionData as { createdAt?: string }).createdAt || new Date().toISOString() : new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })

        toast.success('章节生成成功，点击"导出小说"保存到我的小说')
      } catch (error) {
        console.error('生成失败:', error)
        toast.error('章节生成失败')
        // 更新生成进度为失败状态
        useWorkflowStore.getState().updateGenerationProgress({
          status: 'failed',
        })
      } finally {
        // 停止生成
        useWorkflowStore.getState().stopGeneration()
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedChapterId, selectedChapter?.chapterNumber, selectedChapter?.title, selectedChapter?.estimatedWordCount, currentVolumeChapters, chapters, generatedContents, rhythmBreakdownData, getStageData, updateStageData]
  )

  // 处理批量生成
  const handleBatchGenerate = useCallback(async (params: BatchGenerationParams) => {
    const taskId = `batch-task-${Date.now()}`
    const currentVolumeId = rhythmBreakdownData?.currentVolumeId

    // 调用 store 开始批量生成
    useWorkflowStore.getState().startGeneration({
      taskId,
      chapterId: `batch-${params.startChapter}`,
      chapterNumber: params.startChapter,
      volumeId: currentVolumeId || '',
      progress: {
        chapterNumber: params.startChapter,
        chapterTitle: `第${params.startChapter}章`,
        completedWords: 0,
        totalWords: (params.endChapter - params.startChapter + 1) * 3000,
        percentage: 0,
        status: 'generating',
        startedAt: new Date().toISOString(),
      },
      isGenerating: true,
    })

    toast.success(`开始批量生成第 ${params.startChapter} 到 ${params.endChapter} 章`)

    // 模拟批量生成
    try {
      for (let i = params.startChapter; i <= params.endChapter; i++) {
        const currentChapter = chapters.find(c => c.chapterNumber === i)
        const totalChapters = params.endChapter - params.startChapter + 1
        const completedWords = (i - params.startChapter) * 3000

        // 更新生成进度
        useWorkflowStore.getState().updateGenerationProgress({
          chapterNumber: i,
          chapterTitle: currentChapter?.title || `第${i}章`,
          completedWords,
          totalWords: totalChapters * 3000,
          percentage: Math.round(((i - params.startChapter + 1) / totalChapters) * 100),
          status: 'generating',
        })

        await new Promise((resolve) => setTimeout(resolve, 1000))

        // 更新章节状态
        setChapters((prev) =>
          prev.map((c) =>
            c.chapterNumber === i
              ? {
                  ...c,
                  status: ChapterStatus.COMPLETED,
                  wordCount: 2500 + Math.floor(Math.random() * 500),
                  updatedAt: new Date().toISOString(),
                  auditScore: params.autoAudit ? 75 + Math.floor(Math.random() * 20) : undefined,
                }
              : c
          )
        )
      }

      toast.success('批量生成完成')
      // 更新生成进度为完成状态
      useWorkflowStore.getState().updateGenerationProgress({
        percentage: 100,
        status: 'completed',
      })
    } catch (error) {
      console.error('批量生成失败:', error)
      toast.error('批量生成失败')
      useWorkflowStore.getState().updateGenerationProgress({
        status: 'failed',
      })
    } finally {
      // 停止生成
      useWorkflowStore.getState().stopGeneration()
    }
  }, [rhythmBreakdownData, chapters])

  // 处理审计
  const handleAudit = useCallback(async (): Promise<ChapterAuditResult> => {
    if (!selectedChapterId || !currentContent) {
      toast.error('请先生成章节内容')
      throw new Error('No content to audit')
    }

    setIsAuditing(true)

    try {
      // 模拟审计过程
      await new Promise((resolve) => setTimeout(resolve, 2000))

      const result: ChapterAuditResult = {
        id: `audit-${Date.now()}`,
        chapterId: selectedChapterId,
        auditedAt: new Date().toISOString(),
        overallScore: 78 + Math.floor(Math.random() * 15),
        dimensionScores: {
          contentQuality: 80 + Math.floor(Math.random() * 15),
          characterConsistency: 75 + Math.floor(Math.random() * 20),
          plotContinuity: 70 + Math.floor(Math.random() * 25),
          styleConsistency: 75 + Math.floor(Math.random() * 20),
          pacing: 70 + Math.floor(Math.random() * 20),
        },
        issues: [
          {
            id: 'issue-1',
            type: AuditIssueType.CHARACTER_CONSISTENCY,
            description: '主角性格描写前后略有矛盾，建议统一角色性格特征。',
            severity: IssueSeverity.MEDIUM,
            location: {
              paragraphIndex: 2,
              sentenceIndex: 1,
              originalText: '主角深吸一口气，感受着体内澎湃的灵力。',
            },
            suggestedFix: '建议在此处增加一些心理描写，展现主角突破后的内心变化。',
            relatedCharacters: ['主角'],
          },
          {
            id: 'issue-2',
            type: AuditIssueType.PACING,
            description: '本章节奏略显平淡，建议在中间部分增加一些冲突或转折。',
            severity: IssueSeverity.LOW,
            location: {
              paragraphIndex: 3,
            },
            suggestedFix: '可以在主角与师妹对话时增加一些意外事件或信息揭示。',
          },
        ],
        overallSuggestions: [
          '建议增加一些环境描写，增强场景感',
          '可以适当增加角色之间的互动对话',
          '结尾可以设置一些悬念，为下一章做铺垫',
        ],
        strengths: [
          '文字流畅，叙述清晰',
          '角色形象鲜明',
          '情节推进自然',
        ],
      }

      setAuditResult(result)

      // 更新章节状态
      setChapters((prev) =>
        prev.map((c) =>
          c.id === selectedChapterId
            ? {
                ...c,
                  auditScore: result.overallScore,
                  hasUnfixedIssues: result.issues.length > 0,
                  status: result.issues.some((i) => i.severity === IssueSeverity.HIGH || i.severity === IssueSeverity.CRITICAL)
                    ? ChapterStatus.NEEDS_FIX
                    : c.status,
                }
              : c
          )
      )

      // 生成修复建议
      const suggestions: FixSuggestion[] = result.issues.map((issue) => ({
        id: `fix-${issue.id}`,
        issueId: issue.id,
        type: 'auto' as const,
        description: issue.description,
        originalText: issue.location.originalText || '',
        suggestedText: issue.suggestedFix || '',
        reason: issue.suggestedFix || '',
        confidence: 0.85,
        canAutoApply: issue.severity === IssueSeverity.LOW || issue.severity === IssueSeverity.MEDIUM,
        status: FixStatus.PENDING,
      }))

      setFixSuggestions(suggestions)

      toast.success('审计完成')
      return result
    } catch (error) {
      console.error('审计失败:', error)
      toast.error('审计失败')
      throw error
    } finally {
      setIsAuditing(false)
    }
  }, [selectedChapterId, currentContent])

  // 处理应用修复
  const handleApplyFix = useCallback(
    async (suggestionId: string) => {
      setIsProcessingFix(true)

      try {
        const suggestion = fixSuggestions.find((s) => s.id === suggestionId)
        if (!suggestion) return

        await new Promise((resolve) => setTimeout(resolve, 500))

        let updatedContent = currentContent
        if (suggestion.originalText && suggestion.suggestedText) {
          updatedContent = currentContent.replace(suggestion.originalText, suggestion.suggestedText)
        }

        if (updatedContent !== currentContent) {
          setCurrentContent(updatedContent)
          setGeneratedContents(prev => ({
            ...prev,
            [selectedChapterId || '']: updatedContent
          }))
        }

        setFixSuggestions((prev) =>
          prev.map((s) =>
            s.id === suggestionId ? { ...s, status: FixStatus.FIXED } : s
          )
        )

        const record: FixRecord = {
          id: `record-${Date.now()}`,
          chapterId: selectedChapterId || '',
          issueId: suggestion.issueId,
          beforeContent: suggestion.originalText,
          afterContent: suggestion.suggestedText,
          fixType: 'auto',
          fixedAt: new Date().toISOString(),
          fixedBy: 'system',
        }
        setFixHistory((prev) => [...prev, record])

        toast.success('修复已应用')
      } catch (error) {
        console.error('应用修复失败:', error)
        toast.error('应用修复失败')
      } finally {
        setIsProcessingFix(false)
      }
    },
    [fixSuggestions, selectedChapterId, currentContent]
  )

  // 处理批量修复
  const handleBatchApplyFixes = useCallback(
    async (suggestionIds: string[]) => {
      setIsProcessingFix(true)

      try {
        for (const id of suggestionIds) {
          await handleApplyFix(id)
        }
        toast.success(`已批量修复 ${suggestionIds.length} 个问题`)
      } finally {
        setIsProcessingFix(false)
      }
    },
    [handleApplyFix]
  )

  // 处理忽略修复
  const handleIgnoreFix = useCallback((suggestionId: string) => {
    setFixSuggestions((prev) =>
      prev.map((s) =>
        s.id === suggestionId ? { ...s, status: FixStatus.IGNORED } : s
      )
    )
    toast.success('已忽略该建议')
  }, [])

  // 处理手动修复
  const handleManualFix = useCallback(
    async (issueId: string, newContent: string) => {
      setIsProcessingFix(true)

      try {
        await new Promise((resolve) => setTimeout(resolve, 500))

        const record: FixRecord = {
          id: `record-${Date.now()}`,
          chapterId: selectedChapterId || '',
          issueId,
          beforeContent: currentContent.substring(0, 100),
          afterContent: newContent,
          fixType: 'manual',
          fixedAt: new Date().toISOString(),
          fixedBy: 'user',
        }
        setFixHistory((prev) => [...prev, record])

        toast.success('手动修复已保存')
      } finally {
        setIsProcessingFix(false)
      }
    },
    [selectedChapterId, currentContent]
  )

  // 处理保存
  const handleSave = useCallback(async () => {
    if (!selectedChapterId || !currentContent) return

    setIsSaving(true)

    try {
      await new Promise((resolve) => setTimeout(resolve, 500))

      setChapters((prev) =>
        prev.map((c) =>
          c.id === selectedChapterId
            ? {
                ...c,
                wordCount: stripHtmlTags(currentContent).length,
                updatedAt: new Date().toISOString(),
              }
            : c
        )
      )

      setGeneratedContents(prev => ({
        ...prev,
        [selectedChapterId]: currentContent
      }))

      const currentExecutionData = getStageData(WorkflowStage.CHAPTER_EXECUTION) as {
        generatedChapters?: Array<{
          id: string
          chapterNumber: number
          title: string
          content: string
          wordCount: number
          status?: string
          generatedAt?: string
        }>
      } | null
      
      const existingChapters = currentExecutionData?.generatedChapters || []
      
      const updatedChapters = [
        ...existingChapters
          .filter(ch => ch.id !== selectedChapterId)
          .map(ch => ({
            id: ch.id,
            chapterNumber: ch.chapterNumber,
            title: ch.title,
            content: ch.content,
            wordCount: ch.wordCount,
            generatedAt: ch.generatedAt || new Date().toISOString(),
            status: (ch.status || 'draft') as 'draft' | 'reviewed' | 'final',
          })),
        {
          id: selectedChapterId,
          chapterNumber: selectedChapter?.chapterNumber || 1,
          title: selectedChapter?.title || '',
          content: currentContent,
          wordCount: stripHtmlTags(currentContent).length,
          generatedAt: new Date().toISOString(),
          status: 'draft' as const,
        }
      ]

      updateStageData(WorkflowStage.CHAPTER_EXECUTION, {
        novelId: novelId || undefined,
        currentChapterId: selectedChapterId,
        generatedChapters: updatedChapters,
        createdAt: currentExecutionData ? (currentExecutionData as { createdAt?: string }).createdAt || new Date().toISOString() : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      toast.success('保存成功')
    } catch (error) {
      console.error('保存失败:', error)
      toast.error('保存失败')
    } finally {
      setIsSaving(false)
    }
  }, [selectedChapterId, currentContent, selectedChapter, novelId, updateStageData, getStageData])

  // 导出小说 - 保存所有章节到后端
  const handleExportNovel = useCallback(async () => {
    setIsSaving(true)
    
    try {
      if (selectedChapterId && currentContent) {
        const currentExecutionData = getStageData(WorkflowStage.CHAPTER_EXECUTION) as {
          generatedChapters?: Array<{
            id: string
            chapterNumber: number
            title: string
            content: string
            wordCount: number
            status?: string
            generatedAt?: string
          }>
        } | null
        
        const existingChapters = currentExecutionData?.generatedChapters || []
        
        const updatedChapters = [
          ...existingChapters
            .filter(ch => ch.id !== selectedChapterId)
            .map(ch => ({
              id: ch.id,
              chapterNumber: ch.chapterNumber,
              title: ch.title,
              content: ch.content,
              wordCount: ch.wordCount,
              generatedAt: ch.generatedAt || new Date().toISOString(),
              status: (ch.status || 'draft') as 'draft' | 'reviewed' | 'final',
            })),
          {
            id: selectedChapterId,
            chapterNumber: selectedChapter?.chapterNumber || 1,
            title: selectedChapter?.title || '',
            content: currentContent,
            wordCount: stripHtmlTags(currentContent).length,
            generatedAt: new Date().toISOString(),
            status: 'draft' as const,
          }
        ]

        updateStageData(WorkflowStage.CHAPTER_EXECUTION, {
          novelId: novelId || undefined,
          currentChapterId: selectedChapterId,
          generatedChapters: updatedChapters,
          createdAt: currentExecutionData ? (currentExecutionData as { createdAt?: string }).createdAt || new Date().toISOString() : new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
      }

      const store = useWorkflowStore.getState()
      const executionData = store.getStageData(WorkflowStage.CHAPTER_EXECUTION) as {
        generatedChapters?: Array<{
          id: string
          chapterNumber: number
          title: string
          content: string
          wordCount: number
          status?: string
        }>
      } | null

      const allChapters = executionData?.generatedChapters || []
      
      if (allChapters.length === 0) {
        toast.error('没有可导出的章节内容，请先生成章节')
        return
      }

      const chaptersWithContent = allChapters.filter(ch => ch.content && ch.content.trim().length > 0)
      if (chaptersWithContent.length === 0) {
        toast.error('章节内容为空，请先生成章节内容')
        return
      }

      const title = projectSettingData?.title || '未命名小说'
      const totalWordCount = chaptersWithContent.reduce((sum, ch) => sum + stripHtmlTags(ch.content).length, 0)
      
      let novelIdToUse = novelId
      
      if (!novelIdToUse) {
        const result = await createNovel({
          title,
          style: projectSettingData?.genre || 'other'
        })
        novelIdToUse = result.id
        setNovelId(novelIdToUse)
        
        const currentExecData = getStageData(WorkflowStage.CHAPTER_EXECUTION) as Record<string, unknown> | null
        updateStageData(WorkflowStage.CHAPTER_EXECUTION, {
          ...(currentExecData || {}),
          novelId: novelIdToUse,
        })
      }

      const content = chaptersWithContent
        .sort((a, b) => a.chapterNumber - b.chapterNumber)
        .map(ch => {
          const plainContent = stripHtmlTags(ch.content)
          return `${ch.title}\n\n${plainContent}`
        })
        .join('\n\n---\n\n')

      await updateNovel(novelIdToUse, {
        content,
        wordCount: totalWordCount,
        generatedChapterCount: chaptersWithContent.length,
        totalChapterCount: chapters.length,
        status: 'completed',
      })

      toast.success(`已保存 ${chaptersWithContent.length} 个章节（共 ${totalWordCount} 字）到"我的小说"`)
      
      if (!embedded) {
        navigate('/novels')
      }
      
    } catch (error) {
      console.error('导出小说失败:', error)
      toast.error('导出小说失败')
    } finally {
      setIsSaving(false)
    }
  }, [selectedChapterId, currentContent, selectedChapter, novelId, projectSettingData, chapters.length, updateStageData, getStageData, navigate, embedded])

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {!embedded && (
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">章节执行</h1>
              <p className="text-sm text-gray-500">
                {workflowState.id ? `工作流: ${workflowState.id.substring(0, 8)}...` : '新建工作流'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowLeftPanel(!showLeftPanel)}
              className={cn(
                'p-2 rounded-lg transition-colors',
                showLeftPanel ? 'bg-primary-100 text-primary-600' : 'hover:bg-gray-100 text-gray-600'
              )}
              title={showLeftPanel ? '隐藏章节列表' : '显示章节列表'}
            >
              {showLeftPanel ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeft className="w-5 h-5" />}
            </button>
            <button
              onClick={() => setShowRightPanel(!showRightPanel)}
              className={cn(
                'p-2 rounded-lg transition-colors',
                showRightPanel ? 'bg-primary-100 text-primary-600' : 'hover:bg-gray-100 text-gray-600'
              )}
              title={showRightPanel ? '隐藏工具面板' : '显示工具面板'}
            >
              {showRightPanel ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
            <div className="w-px h-6 bg-gray-200" />
            
            <button
              onClick={handleSave}
              disabled={isSaving || !currentContent}
              className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              保存
            </button>
            
            <button
              onClick={handleExportNovel}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="保存所有章节并导出"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              导出小说
            </button>
          </div>
        </div>
      </header>
      )}

      {/* 主内容区 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧章节导航 */}
        {showLeftPanel && (
          <div className="w-80 border-r border-gray-200 bg-white overflow-hidden">
            <ChapterNavigationView
              chapters={chapters}
              selectedChapterId={selectedChapterId}
              onChapterSelect={handleChapterSelect}
              progressStats={progressStats}
              isLoading={isLoading}
            />
          </div>
        )}

        {/* 中间编辑区 */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedChapter ? (
            <>
              {/* 章节标题栏 */}
              <div className="bg-white border-b border-gray-200 px-4 py-2">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-medium text-gray-900">
                    第 {selectedChapter.chapterNumber} 章: {selectedChapter.title}
                  </h2>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span>
                      字数: {currentContent.length.toLocaleString()}
                      {currentContent.length !== selectedChapter.wordCount && (
                        <span className="text-orange-500 ml-1">(未保存)</span>
                      )}
                    </span>
                    {selectedChapter.auditScore && (
                      <span className="text-primary-600">审计分: {selectedChapter.auditScore}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* 编辑器 */}
              <div className="flex-1 min-h-0 bg-white">
                <RichTextEditor
                  value={currentContent}
                  onChange={setCurrentContent}
                  placeholder="选择章节后开始写作，或使用右侧面板生成内容..."
                  showActions={true}
                  onClear={() => {
                    if (confirm('确定要清空当前章节内容吗？')) {
                      setCurrentContent('')
                      if (selectedChapterId) {
                        setGeneratedContents(prev => {
                          const newContents = { ...prev }
                          delete newContents[selectedChapterId]
                          return newContents
                        })
                      }
                    }
                  }}
                />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-white">
              <div className="text-center text-gray-500">
                <p className="text-lg">请从左侧选择一个章节</p>
                <p className="text-sm mt-2">或开始生成新章节</p>
              </div>
            </div>
          )}
        </div>

        {/* 右侧工具面板 */}
        {showRightPanel && selectedChapter && (
          <div className="w-96 border-l border-gray-200 bg-white overflow-hidden flex flex-col">
            {/* 标签切换 */}
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setRightPanelTab('generate')}
                className={cn(
                  'flex-1 py-3 text-sm font-medium transition-colors',
                  rightPanelTab === 'generate'
                    ? 'text-primary-600 border-b-2 border-primary-600'
                    : 'text-gray-500 hover:text-gray-700'
                )}
              >
                生成
              </button>
              <button
                onClick={() => setRightPanelTab('fix')}
                className={cn(
                  'flex-1 py-3 text-sm font-medium transition-colors',
                  rightPanelTab === 'fix'
                    ? 'text-primary-600 border-b-2 border-primary-600'
                    : 'text-gray-500 hover:text-gray-700'
                )}
              >
                审计与修复
                {(fixSuggestions.filter((s) => s.status === 'pending').length > 0 || auditResult) && (
                  <span className="ml-1 px-1.5 py-0.5 bg-red-100 text-red-600 text-xs rounded-full">
                    {fixSuggestions.filter((s) => s.status === 'pending').length || auditResult?.issues.length || 0}
                  </span>
                )}
              </button>
            </div>

            {/* 面板内容 */}
            <div className="flex-1 overflow-hidden">
              {rightPanelTab === 'generate' ? (
                <ChapterGenerator
                  chapterId={selectedChapterId}
                  chapterNumber={selectedChapter.chapterNumber}
                  chapterTitle={selectedChapter.title}
                  chapterOutline={selectedChapterOutline}
                  currentContent={currentContent}
                  onGenerate={handleGenerate}
                  onBatchGenerate={handleBatchGenerate}
                  onContentUpdate={setCurrentContent}
                  generationProgress={generationProgress}
                  isGenerating={isGenerating}
                  chapterStatus={selectedChapter.status}
                  totalChapters={chapters.length}
                />
              ) : (
                <FixSuggestions
                  suggestions={fixSuggestions}
                  issues={auditResult?.issues || []}
                  fixHistory={fixHistory}
                  chapterContent={currentContent}
                  onApplyFix={handleApplyFix}
                  onBatchApplyFixes={handleBatchApplyFixes}
                  onIgnoreFix={handleIgnoreFix}
                  onManualFix={handleManualFix}
                  onContentUpdate={setCurrentContent}
                  isProcessing={isProcessingFix}
                  onAudit={handleAudit}
                  auditResult={auditResult}
                  isAuditing={isAuditing}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
