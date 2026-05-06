import { useState, useMemo, useCallback } from 'react'
import {
  Search,
  Filter,
  SortAsc,
  SortDesc,
  FileText,
  Clock,
  AlertCircle,
  CheckCircle,
  Edit3,
  Loader2,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  TrendingUp,
} from 'lucide-react'
import {
  ChapterStatus,
  ChapterNavigationItem,
  ChapterProgressStats,
  ChapterFilter,
} from '../types/chapterExecution'
import { cn } from '../utils'

interface ChapterNavigationViewProps {
  /** 章节列表 */
  chapters: ChapterNavigationItem[]
  /** 当前选中章节ID */
  selectedChapterId: string | null
  /** 章节选择回调 */
  onChapterSelect: (chapterId: string) => void
  /** 进度统计 */
  progressStats: ChapterProgressStats
  /** 筛选条件变化回调 */
  onFilterChange?: (filter: ChapterFilter) => void
  /** 是否加载中 */
  isLoading?: boolean
}

/**
 * 获取状态对应的样式和图标
 */
const getStatusConfig = (status: ChapterStatus) => {
  const configs = {
    [ChapterStatus.PENDING]: {
      label: '待写',
      color: 'bg-gray-100 text-gray-600',
      icon: FileText,
    },
    [ChapterStatus.WRITING]: {
      label: '写作中',
      color: 'bg-blue-100 text-blue-600',
      icon: Edit3,
    },
    [ChapterStatus.GENERATING]: {
      label: '生成中',
      color: 'bg-purple-100 text-purple-600',
      icon: Loader2,
    },
    [ChapterStatus.AUDITING]: {
      label: '审计中',
      color: 'bg-yellow-100 text-yellow-600',
      icon: Clock,
    },
    [ChapterStatus.COMPLETED]: {
      label: '已完成',
      color: 'bg-green-100 text-green-600',
      icon: CheckCircle,
    },
    [ChapterStatus.NEEDS_FIX]: {
      label: '需修复',
      color: 'bg-red-100 text-red-600',
      icon: AlertCircle,
    },
  }
  return configs[status] || configs[ChapterStatus.PENDING]
}

/**
 * 格式化字数显示
 */
const formatWordCount = (count: number): string => {
  if (count >= 10000) {
    return `${(count / 10000).toFixed(1)}万字`
  }
  return `${count}字`
}

/**
 * 格式化时间显示
 */
const formatTime = (dateString: string): string => {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return '刚刚'
  if (diffMins < 60) return `${diffMins}分钟前`
  if (diffHours < 24) return `${diffHours}小时前`
  if (diffDays < 7) return `${diffDays}天前`
  return date.toLocaleDateString('zh-CN')
}

/**
 * 获取分数对应的颜色
 */
const getScoreColor = (score: number): string => {
  if (score >= 90) return 'text-green-600'
  if (score >= 75) return 'text-blue-600'
  if (score >= 60) return 'text-yellow-600'
  return 'text-red-600'
}

export default function ChapterNavigationView({
  chapters,
  selectedChapterId,
  onChapterSelect,
  progressStats,
  onFilterChange,
  isLoading = false,
}: ChapterNavigationViewProps) {
  // 筛选状态
  const [filter, setFilter] = useState<ChapterFilter>({
    status: 'all',
    search: '',
    sortBy: 'chapterNumber',
    sortOrder: 'asc',
  })

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 20

  // 状态筛选选项
  const statusOptions = [
    { value: 'all', label: '全部', count: progressStats.totalChapters },
    { value: ChapterStatus.PENDING, label: '待写', count: progressStats.pendingChapters },
    { value: ChapterStatus.WRITING, label: '写作中', count: progressStats.writingChapters },
    { value: ChapterStatus.COMPLETED, label: '已完成', count: progressStats.completedChapters },
    { value: ChapterStatus.NEEDS_FIX, label: '需修复', count: progressStats.needsFixChapters },
  ]

  // 排序选项
  const sortOptions = [
    { value: 'chapterNumber', label: '章节号' },
    { value: 'wordCount', label: '字数' },
    { value: 'updatedAt', label: '更新时间' },
    { value: 'auditScore', label: '审计分数' },
  ]

  // 应用筛选和排序
  const filteredChapters = useMemo(() => {
    let result = [...chapters]

    // 状态筛选
    if (filter.status && filter.status !== 'all') {
      result = result.filter((chapter) => chapter.status === filter.status)
    }

    // 搜索筛选
    if (filter.search) {
      const searchLower = filter.search.toLowerCase()
      result = result.filter(
        (chapter) =>
          chapter.title.toLowerCase().includes(searchLower) ||
          chapter.chapterNumber.toString().includes(searchLower)
      )
    }

    // 排序
    result.sort((a, b) => {
      let comparison = 0
      switch (filter.sortBy) {
        case 'chapterNumber':
          comparison = a.chapterNumber - b.chapterNumber
          break
        case 'wordCount':
          comparison = a.wordCount - b.wordCount
          break
        case 'updatedAt':
          comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
          break
        case 'auditScore':
          comparison = (a.auditScore || 0) - (b.auditScore || 0)
          break
        default:
          comparison = a.chapterNumber - b.chapterNumber
      }
      return filter.sortOrder === 'asc' ? comparison : -comparison
    })

    return result
  }, [chapters, filter])

  // 分页数据
  const paginatedChapters = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredChapters.slice(start, start + pageSize)
  }, [filteredChapters, currentPage])

  const totalPages = Math.ceil(filteredChapters.length / pageSize)

  // 更新筛选条件
  const handleFilterUpdate = useCallback(
    (updates: Partial<ChapterFilter>) => {
      const newFilter = { ...filter, ...updates }
      setFilter(newFilter)
      setCurrentPage(1) // 重置页码
      onFilterChange?.(newFilter)
    },
    [filter, onFilterChange]
  )

  // 切换排序方向
  const toggleSortOrder = useCallback(() => {
    handleFilterUpdate({
      sortOrder: filter.sortOrder === 'asc' ? 'desc' : 'asc',
    })
  }, [filter.sortOrder, handleFilterUpdate])

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-sm border border-gray-200">
      {/* 进度统计头部 */}
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-primary-50 to-blue-50">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary-600" />
            章节进度
          </h3>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <TrendingUp className="w-4 h-4" />
            <span>完成率: {progressStats.completionPercentage}%</span>
          </div>
        </div>

        {/* 进度条 */}
        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-3">
          <div
            className="bg-gradient-to-r from-primary-500 to-primary-600 h-2.5 rounded-full transition-all duration-500"
            style={{ width: `${progressStats.completionPercentage}%` }}
          />
        </div>

        {/* 统计数据 */}
        <div className="grid grid-cols-4 gap-3 text-center">
          <div className="bg-white rounded-lg p-2 shadow-sm">
            <div className="text-lg font-bold text-gray-900">{progressStats.totalChapters}</div>
            <div className="text-xs text-gray-500">总章节</div>
          </div>
          <div className="bg-white rounded-lg p-2 shadow-sm">
            <div className="text-lg font-bold text-green-600">{progressStats.completedChapters}</div>
            <div className="text-xs text-gray-500">已完成</div>
          </div>
          <div className="bg-white rounded-lg p-2 shadow-sm">
            <div className="text-lg font-bold text-blue-600">{progressStats.writingChapters}</div>
            <div className="text-xs text-gray-500">写作中</div>
          </div>
          <div className="bg-white rounded-lg p-2 shadow-sm">
            <div className="text-lg font-bold text-red-600">{progressStats.needsFixChapters}</div>
            <div className="text-xs text-gray-500">需修复</div>
          </div>
        </div>

        {/* 字数和分数统计 */}
        <div className="flex justify-between mt-3 text-sm text-gray-600">
          <span>总字数: {formatWordCount(progressStats.totalWordCount)}</span>
          <span>平均审计分: {progressStats.averageAuditScore.toFixed(1)}</span>
        </div>
      </div>

      {/* 筛选和搜索区域 */}
      <div className="p-3 border-b border-gray-200 space-y-3">
        {/* 搜索框 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="搜索章节标题或序号..."
            value={filter.search || ''}
            onChange={(e) => handleFilterUpdate({ search: e.target.value })}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        {/* 状态筛选标签 */}
        <div className="flex flex-wrap gap-1.5">
          {statusOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => handleFilterUpdate({ status: option.value as ChapterStatus | 'all' })}
              className={cn(
                'px-3 py-1 text-xs font-medium rounded-full transition-colors',
                filter.status === option.value
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              {option.label}
              <span className="ml-1 opacity-75">({option.count})</span>
            </button>
          ))}
        </div>

        {/* 排序控制 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={filter.sortBy}
              onChange={(e) =>
                handleFilterUpdate({ sortBy: e.target.value as ChapterFilter['sortBy'] })
              }
              className="text-sm border border-gray-300 rounded-lg px-2 py-1 focus:ring-2 focus:ring-primary-500"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  按{option.label}排序
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={toggleSortOrder}
            className="flex items-center gap-1 px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {filter.sortOrder === 'asc' ? (
              <>
                <SortAsc className="w-4 h-4" />
                升序
              </>
            ) : (
              <>
                <SortDesc className="w-4 h-4" />
                降序
              </>
            )}
          </button>
        </div>
      </div>

      {/* 章节列表 */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
          </div>
        ) : paginatedChapters.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-500">
            <FileText className="w-8 h-8 mb-2" />
            <p>暂无章节数据</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {paginatedChapters.map((chapter) => {
              const statusConfig = getStatusConfig(chapter.status)
              const StatusIcon = statusConfig.icon
              const isSelected = selectedChapterId === chapter.id

              return (
                <button
                  key={chapter.id}
                  onClick={() => onChapterSelect(chapter.id)}
                  className={cn(
                    'w-full p-3 text-left hover:bg-gray-50 transition-colors',
                    isSelected && 'bg-primary-50 border-l-4 border-primary-500'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-gray-400">
                          #{chapter.chapterNumber}
                        </span>
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {chapter.title}
                        </h4>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          {formatWordCount(chapter.wordCount)}
                          {chapter.estimatedWordCount > 0 && (
                            <span className="text-gray-400">
                              /{formatWordCount(chapter.estimatedWordCount)}
                            </span>
                          )}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTime(chapter.updatedAt)}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                          statusConfig.color
                        )}
                      >
                        <StatusIcon
                          className={cn(
                            'w-3 h-3',
                            chapter.status === ChapterStatus.GENERATING && 'animate-spin'
                          )}
                        />
                        {statusConfig.label}
                      </span>

                      {chapter.auditScore !== undefined && (
                        <span className={cn('text-xs font-medium', getScoreColor(chapter.auditScore))}>
                          {chapter.auditScore}分
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 未修复问题提示 */}
                  {chapter.hasUnfixedIssues && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-red-600">
                      <AlertCircle className="w-3 h-3" />
                      <span>存在未修复问题</span>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* 分页控制 */}
      {totalPages > 1 && (
        <div className="p-3 border-t border-gray-200 flex items-center justify-between">
          <span className="text-xs text-gray-500">
            共 {filteredChapters.length} 章，第 {currentPage}/{totalPages} 页
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
