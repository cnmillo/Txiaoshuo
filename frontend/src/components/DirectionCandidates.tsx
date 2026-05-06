/**
 * 方案选择与迭代组件
 * 
 * 展示多套整本方向候选，支持用户选择某一方案
 * 支持继续生成下一轮方案、修改某一套方案、重做某套的标题组
 */

import React, { useState, useCallback } from 'react'
import {
  type DirectionCandidate,
  type TitleCandidate,
  type SellingPoint,
  IterationType,
} from '../types/directorMode'

interface DirectionCandidatesProps {
  /** 候选方案列表 */
  candidates: DirectionCandidate[]
  /** 当前轮次 */
  currentRound: number
  /** 是否正在加载 */
  isLoading?: boolean
  /** 选择方案回调 */
  onSelect: (candidateId: string) => void
  /** 迭代操作回调 */
  onIterate: (type: IterationType, candidateId?: string, note?: string) => void
  /** 选中的方案ID */
  selectedCandidateId?: string | null
}

/**
 * 方案选择与迭代组件
 */
const DirectionCandidates: React.FC<DirectionCandidatesProps> = ({
  candidates,
  currentRound,
  isLoading = false,
  onSelect,
  onIterate,
  selectedCandidateId,
}) => {
  const [expandedCandidateId, setExpandedCandidateId] = useState<string | null>(null)
  const [editingCandidateId, setEditingCandidateId] = useState<string | null>(null)
  const [editNote, setEditNote] = useState('')
  const [showIterateModal, setShowIterateModal] = useState(false)
  const [iterateType, setIterateType] = useState<IterationType | null>(null)

  // 展开/收起方案详情
  const toggleExpand = useCallback((candidateId: string) => {
    setExpandedCandidateId(prev => prev === candidateId ? null : candidateId)
  }, [])

  // 开始编辑方案
  const startEdit = useCallback((candidateId: string) => {
    setEditingCandidateId(candidateId)
    setEditNote('')
  }, [])

  // 取消编辑
  const cancelEdit = useCallback(() => {
    setEditingCandidateId(null)
    setEditNote('')
  }, [])

  // 确认修改
  const confirmEdit = useCallback(() => {
    if (editingCandidateId && editNote.trim()) {
      onIterate(IterationType.MODIFY_ONE, editingCandidateId, editNote.trim())
      setEditingCandidateId(null)
      setEditNote('')
    }
  }, [editingCandidateId, editNote, onIterate])

  // 开始迭代操作
  const startIterate = useCallback((type: IterationType) => {
    setIterateType(type)
    setShowIterateModal(true)
  }, [])

  // 确认迭代
  const confirmIterate = useCallback(() => {
    if (iterateType) {
      onIterate(iterateType)
      setShowIterateModal(false)
      setIterateType(null)
    }
  }, [iterateType, onIterate])

  // 渲染难度标签
  const renderDifficultyBadge = (level: 'easy' | 'medium' | 'hard' | 'expert') => {
    const config = {
      easy: { label: '简单', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
      medium: { label: '中等', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' },
      hard: { label: '困难', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
      expert: { label: '专家', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
    }
    const { label, color } = config[level]
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${color}`}>
        {label}
      </span>
    )
  }

  // 渲染市场热度标签
  const renderMarketHeatBadge = (heat: 'hot' | 'warm' | 'normal' | 'cold') => {
    const config = {
      hot: { label: '热门', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
      warm: { label: '升温', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
      normal: { label: '稳定', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
      cold: { label: '冷门', color: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300' },
    }
    const { label, color } = config[heat]
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${color}`}>
        {label}
      </span>
    )
  }

  // 渲染书名候选
  const renderTitleCandidates = (titles: TitleCandidate[]) => (
    <div className="space-y-2">
      <h4 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
        书名备选
      </h4>
      <div className="space-y-2">
        {titles.map((title, index) => (
          <div key={index} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="font-medium text-gray-900 dark:text-white">{title.title}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{title.reason}</p>
              </div>
              <div className="flex flex-wrap gap-1 ml-2">
                {title.styleTags.map((tag, i) => (
                  <span key={i} className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  // 渲染卖点
  const renderSellingPoints = (points: SellingPoint[]) => (
    <div className="space-y-2">
      <h4 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
        核心卖点
      </h4>
      <div className="space-y-2">
        {points.map((point) => (
          <div key={point.id} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-gray-900 dark:text-white">{point.title}</span>
                  <span className={`px-2 py-0.5 text-xs rounded ${
                    point.importance === 'core' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                    point.importance === 'major' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' :
                    'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300'
                  }`}>
                    {point.importance === 'core' ? '核心' : point.importance === 'major' ? '重要' : '次要'}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{point.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  // 渲染单个方案卡片
  const renderCandidateCard = (candidate: DirectionCandidate) => {
    const isExpanded = expandedCandidateId === candidate.id
    const isSelected = selectedCandidateId === candidate.id
    const isEditing = editingCandidateId === candidate.id

    return (
      <div
        key={candidate.id}
        className={`rounded-xl border-2 transition-all duration-200 ${
          isSelected
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-lg'
            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-600'
        }`}
      >
        {/* 方案头部 */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  {candidate.name}
                </h3>
                {renderDifficultyBadge(candidate.difficultyAssessment.overall)}
                {renderMarketHeatBadge(candidate.genrePositioning.marketHeat)}
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                {candidate.oneLineSummary}
              </p>
            </div>
            
            <div className="flex items-center gap-2 ml-4">
              <button
                onClick={() => toggleExpand(candidate.id)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                <svg className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* 方案详情 */}
        {isExpanded && (
          <div className="p-4 space-y-4 border-b border-gray-200 dark:border-gray-700">
            {renderTitleCandidates(candidate.titleCandidates)}
            
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                题材定位
              </h4>
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex flex-wrap gap-2 mb-2">
                  <span className="px-2 py-1 text-sm bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 rounded">
                    {candidate.genrePositioning.primaryGenre}
                  </span>
                  {candidate.genrePositioning.subGenres.map((genre, i) => (
                    <span key={i} className="px-2 py-1 text-sm bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded">
                      {genre}
                    </span>
                  ))}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {candidate.genrePositioning.description}
                </p>
              </div>
            </div>

            {renderSellingPoints(candidate.sellingPoints)}

            <div className="space-y-2">
              <h4 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                前30章承诺
              </h4>
              <div className="space-y-2">
                {candidate.first30ChaptersPromise.map((promise) => (
                  <div key={promise.id} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-gray-900 dark:text-white mb-2">{promise.content}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                      <span>铺设: 第{promise.setupRange.start}-{promise.setupRange.end}章</span>
                      <span>兑现: {promise.payoffMethod}</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      读者期待: {promise.readerExpectation}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                目标读者感受
              </h4>
              <p className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-gray-900 dark:text-white">
                {candidate.targetReaderFeeling}
              </p>
            </div>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onSelect(candidate.id)}
              disabled={isLoading}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                isSelected
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-700 dark:hover:text-blue-300'
              }`}
            >
              {isSelected ? '已选择' : '选择此方案'}
            </button>
            
            <button
              onClick={() => startEdit(candidate.id)}
              disabled={isLoading}
              className="px-4 py-2 rounded-lg font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
            >
              修改方案
            </button>
            
            <button
              onClick={() => onIterate(IterationType.REDO_TITLES, candidate.id)}
              disabled={isLoading}
              className="px-4 py-2 rounded-lg font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
            >
              重做标题
            </button>
          </div>
          
          <div className="text-xs text-gray-500 dark:text-gray-400">
            生成于 {new Date(candidate.generatedAt).toLocaleString()}
          </div>
        </div>

        {/* 编辑模式 */}
        {isEditing && (
          <div className="p-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900 dark:text-white">修改方案说明</h4>
              <textarea
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                placeholder="请描述您希望如何修改这个方案..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={cancelEdit}
                  className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  取消
                </button>
                <button
                  onClick={confirmEdit}
                  disabled={!editNote.trim()}
                  className="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  确认修改
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* 标题区域 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            选择创作方向
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            第 {currentRound} 轮候选方案，共 {candidates.length} 套方案
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => startIterate(IterationType.GENERATE_MORE)}
            disabled={isLoading}
            className="px-4 py-2 rounded-lg font-medium bg-green-500 text-white hover:bg-green-600 transition-all flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            继续生成
          </button>
          
          <button
            onClick={() => startIterate(IterationType.REGENERATE_ALL)}
            disabled={isLoading}
            className="px-4 py-2 rounded-lg font-medium bg-orange-500 text-white hover:bg-orange-600 transition-all flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            全部重做
          </button>
        </div>
      </div>

      {/* 候选方案列表 */}
      <div className="space-y-4">
        {candidates.map(renderCandidateCard)}
      </div>

      {/* 迭代确认弹窗 */}
      {showIterateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              确认操作
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {iterateType === IterationType.GENERATE_MORE && '将生成新的候选方案，保留现有方案'}
              {iterateType === IterationType.REGENERATE_ALL && '将重新生成所有候选方案，现有方案将被替换'}
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowIterateModal(false)}
                className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                取消
              </button>
              <button
                onClick={confirmIterate}
                disabled={isLoading}
                className="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
              >
                {isLoading ? '处理中...' : '确认'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DirectionCandidates
