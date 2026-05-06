import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Download, Edit2, FileText, Clock, Sparkles, BookOpen, Save, X, AlertCircle, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { getNovel, exportNovel, updateNovel, getGenerateTaskByNovelId, streamRegenerateNovel, continueGeneration } from '../services/api'
import { ChapterEditor, CollaborationEditor, VersionManager, ReviewReport, QualityImprovement, GenerationProgress } from '../components'
import type { Novel, Chapter } from '@shared/types'

interface NovelWithChapters extends Novel {
  chapters?: Chapter[]
}

interface Version {
  id: string
  timestamp: string
  description: string
  content: string
}

interface GenerateTaskInfo {
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

export default function NovelDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [novel, setNovel] = useState<Novel | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [draftContent, setDraftContent] = useState('')
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [versions, setVersions] = useState<Version[]>([])
  const [activeTab, setActiveTab] = useState<'content' | 'outline' | 'chapters' | 'versions' | 'quality'>('content')
  const [generateTaskId, setGenerateTaskId] = useState<string | null>(null)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [streamContent, setStreamContent] = useState('')
  const [generateTaskInfo, setGenerateTaskInfo] = useState<GenerateTaskInfo | null>(null)
  const [showFailureAlert, setShowFailureAlert] = useState(false)
  const [isContinuing, setIsContinuing] = useState(false)

  const loadNovel = useCallback(async (novelId: string) => {
    try {
      setIsLoading(true)
      const data = await getNovel(novelId)
      setNovel(data)
      setDraftContent(data.content || '')
      setChapters((data as NovelWithChapters).chapters || [])
      setVersions([])
      
      // 检查生成任务状态
      const task = await getGenerateTaskByNovelId(novelId)
      if (task) {
        setGenerateTaskInfo(task)
        
        // 如果任务正在生成中，设置taskId以显示进度
        if (task.status === 'generating') {
          setGenerateTaskId(task.id)
        } else if (task.status === 'cancelled' || task.status === 'failed') {
          // 已取消或失败的任务不需要显示进度，清除之前的taskId
          setGenerateTaskId(null)
        }
        
        // 如果任务失败，显示失败提示
        if (task.status === 'failed') {
          setShowFailureAlert(true)
        }
      } else {
        // 没有任务时，清除之前的taskId
        setGenerateTaskId(null)
      }
    } catch (error) {
      toast.error('加载小说失败')
      console.error(error)
      setNovel(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (id) {
      loadNovel(id)
    }
  }, [id, loadNovel])

  const handleSave = async () => {
    if (!novel) return

    try {
      setIsSaving(true)
      const updatedNovel = await updateNovel(novel.id, {
        content: draftContent
      })
      setNovel(updatedNovel)
      // 添加版本历史
      const newVersion: Version = {
        id: `version-${Date.now()}`,
        timestamp: new Date().toISOString(),
        description: '手动保存',
        content: draftContent
      }
      setVersions([newVersion, ...versions])
      toast.success('保存成功')
      setIsEditMode(false)
    } catch (error) {
      toast.error('保存失败')
      console.error(error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setDraftContent(novel?.content || '')
    setIsEditMode(false)
  }

  const handleVersionRestore = (version: Version) => {
    setDraftContent(version.content)
    setIsEditMode(true)
    setActiveTab('content')
    toast.success('已恢复到所选版本')
  }

  const handleVersionDelete = (versionId: string) => {
    setVersions(versions.filter(v => v.id !== versionId))
    toast.success('版本已删除')
  }

  const handleChaptersChange = (updatedChapters: Chapter[]) => {
    setChapters(updatedChapters)
  }

  const handleGenerateComplete = useCallback(() => {
    if (id) {
      loadNovel(id)
      toast.success('小说生成完成！')
    }
  }, [id, loadNovel])

  const handleGenerateFail = useCallback((error: string) => {
    toast.error(`生成失败: ${error}`)
    // 清除generateTaskId，停止进度轮询
    setGenerateTaskId(null)
    // 重新加载小说信息以更新失败状态
    if (id) {
      loadNovel(id)
    }
  }, [id, loadNovel])

  const handleContinueGeneration = async () => {
    if (!novel || isContinuing) return
    
    setIsContinuing(true)
    setShowFailureAlert(false)
    
    try {
      const data = await continueGeneration(novel.id)
      if (data.id) {
        setGenerateTaskId(data.id)
        toast.success('继续生成任务已创建')
      }
    } catch (error) {
      toast.error('继续生成失败')
      console.error(error)
    } finally {
      setIsContinuing(false)
    }
  }

  const handleRegenerate = async () => {
    if (!novel) return
    
    setIsRegenerating(true)
    setStreamContent('')
    
    try {
      await streamRegenerateNovel({
        novelId: novel.id,
        onChunk: (content) => {
          setStreamContent(prev => prev + content)
        },
        onError: (error) => {
          toast.error(`重新生成失败: ${error}`)
          setIsRegenerating(false)
        },
        onComplete: () => {
          toast.success('内容生成完成！')
          setIsRegenerating(false)
          loadNovel(novel.id)
        }
      })
    } catch (error) {
      toast.error('重新生成失败')
      setIsRegenerating(false)
    }
  }

  const handleExport = async (format: 'txt' | 'pdf' | 'epub') => {
    if (!novel) return

    try {
      await exportNovel(novel.id, format)
      toast.success(`导出${format.toUpperCase()}成功`)
    } catch (error) {
      toast.error('导出失败')
      console.error(error)
    }
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) {
        return '无效日期'
      }
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch (error) {
      return '无效日期'
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </div>
    )
  }

  if (!novel) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">小说不存在</h2>
          <button onClick={() => navigate('/novels')} className="btn-primary">
            返回列表
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/novels')}
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-5 h-5 mr-1" />
          返回列表
        </button>

        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{novel.title}</h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
              <span className="flex items-center space-x-1">
                <BookOpen className="w-4 h-4" />
                <span>风格: {(() => {
                  if (!novel.style) return '默认风格'
                  const styleMap: Record<string, string> = {
                    'style-default-fantasy': '奇幻风格',
                    'style-default-scifi': '科幻风格',
                    'style-default-wuxia': '武侠风格',
                    'style-default-xianxia': '仙侠风格',
                    'style-default-urban': '都市风格',
                    'style-default-romance': '言情风格',
                    'style-default-mystery': '悬疑风格',
                    'style-default-history': '历史风格',
                    'fantasy': '奇幻风格',
                    'scifi': '科幻风格',
                    'wuxia': '武侠风格',
                    'xianxia': '仙侠风格',
                    'urban': '都市风格',
                    'romance': '言情风格',
                    'mystery': '悬疑风格',
                    'history': '历史风格'
                  }
                  return styleMap[novel.style] || novel.style
                })()}</span>
              </span>
              <span className="flex items-center space-x-1">
                <FileText className="w-4 h-4" />
                <span>{novel.wordCount?.toLocaleString() || 0} 字</span>
              </span>
              <span className="flex items-center space-x-1">
                <Clock className="w-4 h-4" />
                <span>{formatDate(novel.createdAt)}</span>
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isEditMode ? (
              <>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="btn-primary text-sm flex items-center space-x-1"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? '保存中...' : '保存'}</span>
                </button>
                <button
                  onClick={handleCancel}
                  className="btn-outline text-sm flex items-center space-x-1"
                >
                  <X className="w-4 h-4" />
                  <span>取消</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setIsEditMode(true)}
                  className="btn-primary text-sm flex items-center space-x-1"
                >
                  <Edit2 className="w-4 h-4" />
                  <span>编辑</span>
                </button>
                <button
                  onClick={() => handleExport('txt')}
                  className="btn-outline text-sm flex items-center space-x-1"
                >
                  <Download className="w-4 h-4" />
                  <span>导出TXT</span>
                </button>
                <button
                  onClick={() => handleExport('pdf')}
                  className="btn-outline text-sm flex items-center space-x-1"
                >
                  <Download className="w-4 h-4" />
                  <span>导出PDF</span>
                </button>
                <button
                  onClick={() => handleExport('epub')}
                  className="btn-outline text-sm flex items-center space-x-1"
                >
                  <Download className="w-4 h-4" />
                  <span>导出EPUB</span>
                </button>
                {/* 继续生成按钮 - 当小说未完全生成时显示 */}
                {novel.status !== 'completed' && (novel.generatedChapterCount || 0) < (novel.totalChapterCount || 0) && (
                  <button
                    onClick={handleContinueGeneration}
                    disabled={isContinuing}
                    className="inline-flex items-center px-4 py-2 bg-amber-500 text-white text-sm font-medium rounded-md hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${isContinuing ? 'animate-spin' : ''}`} />
                    {isContinuing 
                      ? '正在继续生成...' 
                      : `继续生成（已完成${novel.generatedChapterCount || 0}/${novel.totalChapterCount || 0}章）`
                    }
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* 失败提示 */}
      {showFailureAlert && generateTaskInfo && generateTaskInfo.status === 'failed' && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 animate-fade-in">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-800 mb-2">生成任务失败</h3>
              <div className="text-sm text-red-700 space-y-1">
                {generateTaskInfo.error && (
                  <p><span className="font-medium">失败原因：</span>{generateTaskInfo.error}</p>
                )}
                {generateTaskInfo.currentChapter && generateTaskInfo.totalChapters && (
                  <p><span className="font-medium">失败位置：</span>第 {generateTaskInfo.currentChapter} 章 / 共 {generateTaskInfo.totalChapters} 章</p>
                )}
                {generateTaskInfo.progress !== undefined && (
                  <p><span className="font-medium">完成进度：</span>{generateTaskInfo.progress}%</p>
                )}
              </div>
              <div className="mt-3 flex items-center space-x-3">
                <button
                  onClick={handleContinueGeneration}
                  disabled={isContinuing}
                  className="inline-flex items-center px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isContinuing ? 'animate-spin' : ''}`} />
                  {isContinuing ? '正在继续生成...' : '继续生成'}
                </button>
                <button
                  onClick={() => setShowFailureAlert(false)}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-red-700 hover:text-red-800 focus:outline-none transition-colors"
                >
                  关闭提示
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Review Report */}
      {novel?.id && <ReviewReport novelId={novel.id} wordCount={novel.wordCount || 0} />}

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8 overflow-x-auto">
          <button
            onClick={() => setActiveTab('content')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'content'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            小说内容
          </button>
          <button
            onClick={() => setActiveTab('outline')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'outline'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            创作大纲
          </button>
          <button
            onClick={() => setActiveTab('chapters')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'chapters'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            章节管理
          </button>
          <button
            onClick={() => setActiveTab('versions')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'versions'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            版本历史
          </button>
          <button
            onClick={() => setActiveTab('quality')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'quality'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            质量提升
          </button>
        </nav>
      </div>

      {/* Content */}
      <div className="card">
        {activeTab === 'content' ? (
          <div className="p-6 md:p-8">
            {novel.status === 'generating' && generateTaskId && (generateTaskInfo?.status !== 'cancelled' && generateTaskInfo?.status !== 'failed') ? (
              <GenerationProgress
                taskId={generateTaskId}
                onComplete={handleGenerateComplete}
                onFail={handleGenerateFail}
              />
            ) : novel.status === 'generating' ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
                <p className="text-gray-600">小说正在生成中，请稍候...</p>
              </div>
            ) : isEditMode ? (
              <CollaborationEditor
                content={draftContent}
                onContentChange={setDraftContent}
                novelId={novel.id}
                versions={versions}
                onVersionRestore={handleVersionRestore}
                onVersionDelete={handleVersionDelete}
                onVersionCreate={(content, description) => {
                  const newVersion: Version = {
                    id: `version-${Date.now()}`,
                    timestamp: new Date().toISOString(),
                    description,
                    content
                  }
                  setVersions([newVersion, ...versions])
                }}
              />
            ) : novel.content ? (
              <div className="prose prose-lg max-w-none">
                <div className="whitespace-pre-wrap leading-relaxed text-gray-800">
                  {novel.content}
                </div>
              </div>
            ) : isRegenerating ? (
              <div className="space-y-4">
                <div className="flex items-center space-x-2 text-primary-600 mb-4">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
                  <span>正在生成内容...</span>
                </div>
                {streamContent && (
                  <div className="prose prose-lg max-w-none bg-gray-50 p-4 rounded-lg">
                    <div className="whitespace-pre-wrap leading-relaxed text-gray-800">
                      {streamContent}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="mb-4">暂无内容</p>
                <button
                  onClick={handleRegenerate}
                  className="btn-primary flex items-center space-x-2 mx-auto"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>重新生成</span>
                </button>
              </div>
            )}
          </div>
        ) : activeTab === 'outline' ? (
          <div className="p-6 md:p-8">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">创作提示</h3>
              <p className="text-gray-600 bg-gray-50 p-4 rounded-lg">{novel.prompt}</p>
            </div>
            {novel.outline && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">大纲</h3>
                <div className="text-gray-600 bg-gray-50 p-4 rounded-lg whitespace-pre-wrap">
                  {novel.outline}
                </div>
              </div>
            )}
          </div>
        ) : activeTab === 'chapters' ? (
          <div className="p-6 md:p-8">
            <ChapterEditor
              chapters={chapters}
              onChaptersChange={handleChaptersChange}
              disabled={!isEditMode}
              novelId={novel.id}
              novelOutline={novel.outline || ''}
            />
          </div>
        ) : activeTab === 'versions' ? (
          <div className="p-6 md:p-8">
            <VersionManager
              versions={versions}
              onVersionRestore={handleVersionRestore}
              onVersionDelete={handleVersionDelete}
              disabled={!isEditMode}
            />
          </div>
        ) : activeTab === 'quality' ? (
          <div className="p-6 md:p-8">
            <QualityImprovement
              novelId={novel.id}
              onRefresh={() => loadNovel(novel.id)}
            />
          </div>
        ) : null}
      </div>
    </div>
  )
}
