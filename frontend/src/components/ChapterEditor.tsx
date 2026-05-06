import { useState, useEffect } from 'react'
import { Plus, Trash2, MoveUp, MoveDown, Save, Sparkles, RefreshCw, FileText, ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'
import RichTextEditor from './RichTextEditor'
import Modal from './Modal'
import GenerationProgress from './GenerationProgress'
import { batchGenerateChapters, regenerateChapter, updateChapter } from '../services/api'
import type { Chapter } from '@shared/types'

interface ChapterEditorProps {
  chapters: Chapter[]
  onChaptersChange: (chapters: Chapter[]) => void
  disabled?: boolean
  novelId?: string
  novelOutline?: string
}

export default function ChapterEditor({ chapters, onChaptersChange, disabled = false, novelId, novelOutline = '' }: ChapterEditorProps) {
  const [editingChapter, setEditingChapter] = useState<string | null>(null)
  const [draftChapters, setDraftChapters] = useState<Chapter[]>(chapters)
  const [showBatchModal, setShowBatchModal] = useState(false)
  const [batchForm, setBatchForm] = useState({
    startChapter: 1,
    endChapter: 5,
    outline: novelOutline,
    contentBlockSize: 7500
  })
  const [isGenerating, setIsGenerating] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [chapterToDelete, setChapterToDelete] = useState<string | null>(null)
  const [regeneratingChapterId, setRegeneratingChapterId] = useState<string | null>(null)
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(new Set())
  const [regenerateTaskId, setRegenerateTaskId] = useState<string | null>(null)

  // 当 chapters prop 变化时，更新 draftChapters 状态
  useEffect(() => {
    setDraftChapters(chapters)
  }, [chapters])

  // 切换description展开/折叠状态
  const toggleDescriptionExpand = (chapterId: string) => {
    setExpandedDescriptions(prev => {
      const newSet = new Set(prev)
      if (newSet.has(chapterId)) {
        newSet.delete(chapterId)
      } else {
        newSet.add(chapterId)
      }
      return newSet
    })
  }

  const handleAddChapter = () => {
    const newChapter: Chapter = {
      id: `temp-${Date.now()}`,
      novelId: novelId || '',
      title: `章节 ${draftChapters.length + 1}`,
      content: '',
      orderIndex: draftChapters.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    const updatedChapters = [...draftChapters, newChapter]
    setDraftChapters(updatedChapters)
    setEditingChapter(newChapter.id)
    onChaptersChange(updatedChapters)
  }

  const handleDeleteChapter = (chapterId: string) => {
    setChapterToDelete(chapterId)
    setShowDeleteModal(true)
  }

  const confirmDeleteChapter = () => {
    if (!chapterToDelete) return
    
    const updatedChapters = draftChapters.filter(chapter => chapter.id !== chapterToDelete)
    .map((chapter, index) => ({
      ...chapter,
      orderIndex: index
    }))
    setDraftChapters(updatedChapters)
    setEditingChapter(null)
    onChaptersChange(updatedChapters)
    setShowDeleteModal(false)
    setChapterToDelete(null)
    toast.success('章节删除成功')
  }

  const cancelDeleteChapter = () => {
    setShowDeleteModal(false)
    setChapterToDelete(null)
  }

  const handleMoveChapter = (chapterId: string, direction: 'up' | 'down') => {
    const chapterIndex = draftChapters.findIndex(chapter => chapter.id === chapterId)
    if (
      (direction === 'up' && chapterIndex === 0) ||
      (direction === 'down' && chapterIndex === draftChapters.length - 1)
    ) {
      return
    }

    const updatedChapters = [...draftChapters]
    const targetIndex = direction === 'up' ? chapterIndex - 1 : chapterIndex + 1
    ;[updatedChapters[chapterIndex], updatedChapters[targetIndex]] = [updatedChapters[targetIndex], updatedChapters[chapterIndex]]

    const reorderedChapters = updatedChapters.map((chapter, index) => ({
      ...chapter,
      orderIndex: index
    }))

    setDraftChapters(reorderedChapters)
    onChaptersChange(reorderedChapters)
  }

  const handleChapterTitleChange = (chapterId: string, title: string) => {
    const updatedChapters = draftChapters.map(chapter =>
      chapter.id === chapterId ? { ...chapter, title, updatedAt: new Date().toISOString() } : chapter
    )
    setDraftChapters(updatedChapters)
    onChaptersChange(updatedChapters)
  }

  const handleChapterContentChange = (chapterId: string, content: string) => {
    const updatedChapters = draftChapters.map(chapter =>
      chapter.id === chapterId ? { ...chapter, content, updatedAt: new Date().toISOString() } : chapter
    )
    setDraftChapters(updatedChapters)
    onChaptersChange(updatedChapters)
  }

  const handleBatchGenerate = async () => {
    if (!novelId) {
      toast.error('小说ID不存在')
      return
    }

    if (!batchForm.outline.trim()) {
      toast.error('请输入大纲')
      return
    }

    if (batchForm.startChapter > batchForm.endChapter) {
      toast.error('起始章节不能大于结束章节')
      return
    }

    setIsGenerating(true)

    try {
      await batchGenerateChapters({
        novelId,
        startChapter: batchForm.startChapter,
        endChapter: batchForm.endChapter,
        outline: batchForm.outline,
        contentBlockSize: batchForm.contentBlockSize
      })

      toast.success('批量生成任务已创建')
      setShowBatchModal(false)
    } catch (error) {
      toast.error('批量生成失败，请重试')
      console.error(error)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleRegenerateChapter = async (chapter: Chapter, index: number) => {
    if (!novelId || !chapter.id) {
      toast.error('缺少必要信息')
      return
    }

    setRegeneratingChapterId(chapter.id)

    try {
      const result = await regenerateChapter(novelId, chapter.id)
      setRegenerateTaskId(result.id)

      toast.success(`第${index + 1}章《${chapter.title}》重新生成任务已创建`)
    } catch (error) {
      toast.error('重新生成失败，请重试')
      console.error(error)
    } finally {
      setRegeneratingChapterId(null)
    }
  }

  return (
    <div className="chapter-editor">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-gray-900">章节管理</h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowBatchModal(true)}
            disabled={disabled || !novelId}
            className="btn-outline flex items-center space-x-1"
          >
            <Sparkles className="w-4 h-4" />
            <span>批量生成</span>
          </button>
          <button
            onClick={handleAddChapter}
            disabled={disabled}
            className="btn-primary flex items-center space-x-1"
          >
            <Plus className="w-4 h-4" />
            <span>添加章节</span>
          </button>
        </div>
      </div>

      {/* 重新生成进度 */}
      {regenerateTaskId && (
        <div className="mb-6">
          <GenerationProgress
            taskId={regenerateTaskId}
            onComplete={() => {
              setRegenerateTaskId(null)
              // 重新加载章节数据
              window.location.reload()
            }}
            onFail={(error) => {
              setRegenerateTaskId(null)
              toast.error(`重新生成失败: ${error}`)
            }}
          />
        </div>
      )}

      <div className="space-y-6">
        {draftChapters.map((chapter, index) => (
          <div key={chapter.id} className="card">
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-gray-500 font-mono">{index + 1}.</span>
                  {editingChapter === chapter.id ? (
                    <input
                      type="text"
                      value={chapter.title}
                      onChange={(e) => handleChapterTitleChange(chapter.id, e.target.value)}
                      className="text-lg font-semibold border-b border-primary-500 px-2 py-1"
                      autoFocus
                    />
                  ) : (
                    <h4 className="text-lg font-semibold text-gray-900">{chapter.title}</h4>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleRegenerateChapter(chapter, index)}
                    disabled={regeneratingChapterId === chapter.id}
                    className="btn-outline text-sm flex items-center space-x-1"
                  >
                    <RefreshCw className={`w-4 h-4 ${regeneratingChapterId === chapter.id ? 'animate-spin' : ''}`} />
                    <span>{regeneratingChapterId === chapter.id ? '生成中...' : '重新生成'}</span>
                  </button>
                  <button
                    onClick={() => handleMoveChapter(chapter.id, 'up')}
                    disabled={disabled || index === 0}
                    className="p-1 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                  >
                    <MoveUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleMoveChapter(chapter.id, 'down')}
                    disabled={disabled || index === draftChapters.length - 1}
                    className="p-1 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                  >
                    <MoveDown className="w-4 h-4" />
                  </button>
                  <button
                    onClick={async () => {
                      if (!novelId) {
                        toast.error('无法保存：缺少小说ID')
                        return
                      }
                      try {
                        await updateChapter(novelId, chapter.id, { content: chapter.content })
                        toast.success('章节内容已保存')
                      } catch (error) {
                        toast.error('保存失败')
                      }
                    }}
                    disabled={disabled}
                    className="btn-primary text-sm flex items-center space-x-1"
                  >
                    <Save className="w-4 h-4" />
                    <span>保存</span>
                  </button>
                  <button
                    onClick={() => handleDeleteChapter(chapter.id)}
                    disabled={disabled}
                    className="btn-danger text-sm flex items-center space-x-1"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>删除</span>
                  </button>
                </div>
              </div>
              {/* 章节描述展示 */}
              {chapter.description && chapter.description.trim() !== '' && (
                <div className="mt-3 pt-3 border-t border-gray-50">
                  <button
                    onClick={() => toggleDescriptionExpand(chapter.id)}
                    className="flex items-start space-x-2 text-left w-full group"
                  >
                    <FileText className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-xs font-medium text-gray-500">章节描述</span>
                        {expandedDescriptions.has(chapter.id) ? (
                          <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                        )}
                      </div>
                      <p className={`text-sm text-gray-500 leading-relaxed ${
                        expandedDescriptions.has(chapter.id) ? '' : 'line-clamp-2'
                      }`}>
                        {expandedDescriptions.has(chapter.id)
                          ? chapter.description
                          : chapter.description.length > 100
                            ? `${chapter.description.substring(0, 100)}...`
                            : chapter.description
                        }
                      </p>
                      {!expandedDescriptions.has(chapter.id) && chapter.description.length > 100 && (
                        <span className="text-xs text-primary-600 mt-1 inline-block group-hover:underline">
                          点击展开查看完整描述
                        </span>
                      )}
                    </div>
                  </button>
                </div>
              )}
            </div>
            <div className="p-4">
              <RichTextEditor
                value={chapter.content || ''}
                onChange={(content) => handleChapterContentChange(chapter.id, content)}
                placeholder="请输入章节内容..."
                disabled={disabled}
              />
            </div>
          </div>
        ))}
      </div>

      {/* 批量生成模态框 */}
      <Modal
        isOpen={showBatchModal}
        onClose={() => setShowBatchModal(false)}
        title="批量生成章节"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              起始章节
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={batchForm.startChapter}
              onChange={(e) => {
                const val = e.target.value
                if (val === '') {
                  setBatchForm({ ...batchForm, startChapter: '' as unknown as number })
                } else {
                  const num = parseInt(val)
                  if (!isNaN(num) && num >= 1) {
                    setBatchForm({ ...batchForm, startChapter: num })
                  }
                }
              }}
              onBlur={(e) => {
                const num = parseInt(e.target.value) || 1
                setBatchForm({ ...batchForm, startChapter: Math.max(1, num) })
              }}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              结束章节
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={batchForm.endChapter}
              onChange={(e) => {
                const val = e.target.value
                if (val === '') {
                  setBatchForm({ ...batchForm, endChapter: '' as unknown as number })
                } else {
                  const num = parseInt(val)
                  if (!isNaN(num) && num >= 1) {
                    setBatchForm({ ...batchForm, endChapter: num })
                  }
                }
              }}
              onBlur={(e) => {
                const num = parseInt(e.target.value) || 1
                setBatchForm({ ...batchForm, endChapter: Math.max(1, num) })
              }}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              内容块大小（5000-10000字）
            </label>
            <input
              type="number"
              min="5000"
              max="10000"
              step="500"
              value={batchForm.contentBlockSize}
              onChange={(e) => {
                const val = e.target.value
                if (val === '') {
                  setBatchForm({ ...batchForm, contentBlockSize: '' as unknown as number })
                } else {
                  const num = parseInt(val)
                  if (!isNaN(num)) {
                    setBatchForm({ ...batchForm, contentBlockSize: num })
                  }
                }
              }}
              onBlur={(e) => {
                let num = parseInt(e.target.value) || 7500
                num = Math.max(5000, Math.min(10000, num))
                setBatchForm({ ...batchForm, contentBlockSize: num })
              }}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              大纲
            </label>
            <textarea
              value={batchForm.outline}
              onChange={(e) => setBatchForm({ ...batchForm, outline: e.target.value })}
              placeholder="请输入小说大纲..."
              rows={6}
              className="textarea-field"
            />
          </div>
          <div className="flex justify-end space-x-2">
            <button
              onClick={() => setShowBatchModal(false)}
              className="btn-outline"
            >
              取消
            </button>
            <button
              onClick={handleBatchGenerate}
              disabled={isGenerating}
              className="btn-primary"
            >
              {isGenerating ? '生成中...' : '开始生成'}
            </button>
          </div>
        </div>
      </Modal>

      {/* 删除确认模态框 */}
      <Modal
        isOpen={showDeleteModal}
        onClose={cancelDeleteChapter}
        title="确认删除"
      >
        <div className="space-y-4">
          <p>确定要删除这个章节吗？此操作不可撤销。</p>
          <div className="flex justify-end space-x-2">
            <button
              onClick={cancelDeleteChapter}
              className="btn-outline"
            >
              取消
            </button>
            <button
              onClick={confirmDeleteChapter}
              className="btn-danger"
            >
              确认删除
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}