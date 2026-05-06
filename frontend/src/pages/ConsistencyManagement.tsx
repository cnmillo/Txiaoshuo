import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { CharacterManager, VersionControl, ConsistencyChecker, ReviewCriteria } from '../components'
import { getChapterContent } from '../services/api'
import { useWorkflowStore } from '../stores/workflowStore'
import { WorkflowStage } from '../types/workflow'

const ConsistencyManagement: React.FC = () => {
  const { novelId, chapterId } = useParams<{ novelId: string; chapterId?: string }>()
  const [currentContent, setCurrentContent] = useState('')
  const [activeTab, setActiveTab] = useState('characters')
  const [selectedChapterId, setSelectedChapterId] = useState<string>(chapterId || '')
  const [isLoadingContent, setIsLoadingContent] = useState(false)

  const { getStageData } = useWorkflowStore()
  const executionData = getStageData(WorkflowStage.CHAPTER_EXECUTION) as {
    generatedChapters?: Array<{
      id: string
      chapterNumber: number
      title: string
      content: string
      wordCount: number
      status?: string
    }>
  } | null

  const chapters = useMemo(() => executionData?.generatedChapters || [], [executionData?.generatedChapters])

  useEffect(() => {
    if (!selectedChapterId) {
      setCurrentContent('')
      return
    }
    setIsLoadingContent(true)
    getChapterContent(selectedChapterId)
      .then((data) => setCurrentContent(data.content || ''))
      .catch(() => {
        const savedChapter = chapters.find(ch => ch.id === selectedChapterId)
        setCurrentContent(savedChapter?.content || '')
      })
      .finally(() => setIsLoadingContent(false))
  }, [selectedChapterId, chapters])

  const handleChapterSelect = useCallback((id: string) => {
    setSelectedChapterId(id)
  }, [])

  if (!novelId) {
    return <div className="p-4">缺少小说ID</div>
  }

  return (
    <div className="p-4">
      <h1 className="text-3xl font-bold mb-6">长篇作品一致性管理</h1>

      <div className="border-b mb-6">
        <nav className="flex space-x-4">
          <button
            onClick={() => setActiveTab('characters')}
            className={`px-4 py-2 border-b-2 ${activeTab === 'characters' ? 'border-blue-500 text-blue-600' : 'border-transparent'}`}
          >
            角色档案管理
          </button>
          <button
            onClick={() => setActiveTab('version')}
            className={`px-4 py-2 border-b-2 ${activeTab === 'version' ? 'border-blue-500 text-blue-600' : 'border-transparent'}`}
          >
            版本控制管理
          </button>
          <button
            onClick={() => setActiveTab('consistency')}
            className={`px-4 py-2 border-b-2 ${activeTab === 'consistency' ? 'border-blue-500 text-blue-600' : 'border-transparent'}`}
          >
            内容一致性检查
          </button>
          <button
            onClick={() => setActiveTab('criteria')}
            className={`px-4 py-2 border-b-2 ${activeTab === 'criteria' ? 'border-blue-500 text-blue-600' : 'border-transparent'}`}
          >
            审核标准设置
          </button>
        </nav>
      </div>

      {(activeTab === 'version' || activeTab === 'consistency') && chapters.length > 0 && (
        <div className="mb-4 bg-white rounded-lg shadow p-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">选择章节</label>
          <select
            value={selectedChapterId}
            onChange={(e) => handleChapterSelect(e.target.value)}
            className="w-full max-w-md border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">-- 请选择章节 --</option>
            {chapters.map((ch, idx: number) => (
              <option key={ch.id || idx} value={ch.id || String(idx)}>
                第{ch.chapterNumber || idx + 1}章 {ch.title || `章节 ${idx + 1}`}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        {activeTab === 'characters' && <CharacterManager novelId={novelId} />}
        {activeTab === 'version' && selectedChapterId && (
          isLoadingContent ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />
              <span className="ml-2 text-gray-500">加载章节内容...</span>
            </div>
          ) : (
            <VersionControl chapterId={selectedChapterId} currentContent={currentContent} />
          )
        )}
        {activeTab === 'version' && !selectedChapterId && (
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-center text-gray-600">请选择一个章节进行版本管理</p>
          </div>
        )}
        {activeTab === 'consistency' && (
          <ConsistencyChecker novelId={novelId} chapterId={selectedChapterId || undefined} />
        )}
        {activeTab === 'criteria' && <ReviewCriteria novelId={novelId} />}
      </div>
    </div>
  )
}

export default ConsistencyManagement
