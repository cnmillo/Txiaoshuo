import { useState, useMemo, useCallback } from 'react'
import {
  Wrench,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  Edit3,
  History,
  ArrowRight,
  Loader2,
  Eye,
  EyeOff,
  Filter,
  RefreshCw,
  Save,
  X,
  Wand2,
} from 'lucide-react'
import {
  FixSuggestion,
  FixRecord,
  FixStatus,
  AuditIssueDetail,
  IssueSeverity,
  ChapterAuditResult,
} from '../types/chapterExecution'
import { cn } from '../utils'
import { polishChapter, PolishOptions, PolishResult } from '../services/api'
import toast from 'react-hot-toast'

interface FixSuggestionsProps {
  /** 修复建议列表 */
  suggestions: FixSuggestion[]
  /** 审计问题列表 */
  issues: AuditIssueDetail[]
  /** 修复历史 */
  fixHistory?: FixRecord[]
  /** 当前章节内容 */
  chapterContent: string
  /** 应用修复回调 */
  onApplyFix: (suggestionId: string) => Promise<void>
  /** 批量应用修复回调 */
  onBatchApplyFixes?: (suggestionIds: string[]) => Promise<void>
  /** 忽略修复回调 */
  onIgnoreFix: (suggestionId: string) => void
  /** 手动编辑修复回调 */
  onManualFix: (issueId: string, newContent: string) => Promise<void>
  /** 内容更新回调 */
  onContentUpdate?: (content: string) => void
  /** 是否正在处理 */
  isProcessing?: boolean
  /** 审计回调 */
  onAudit: () => Promise<ChapterAuditResult>
  /** 审计结果 */
  auditResult?: ChapterAuditResult | null
  /** 是否正在审计 */
  isAuditing?: boolean
}

const SEVERITY_CONFIG: Record<IssueSeverity, { label: string; color: string; bgColor: string }> = {
  [IssueSeverity.LOW]: { label: '低', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  [IssueSeverity.MEDIUM]: { label: '中', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  [IssueSeverity.HIGH]: { label: '高', color: 'text-orange-600', bgColor: 'bg-orange-100' },
  [IssueSeverity.CRITICAL]: { label: '严重', color: 'text-red-600', bgColor: 'bg-red-100' },
}

/**
 * 修复状态配置
 */
const FIX_STATUS_CONFIG: Record<FixStatus, { label: string; color: string; icon: typeof CheckCircle }> = {
  [FixStatus.PENDING]: { label: '待修复', color: 'text-gray-600', icon: AlertTriangle },
  [FixStatus.IN_PROGRESS]: { label: '修复中', color: 'text-blue-600', icon: Loader2 },
  [FixStatus.FIXED]: { label: '已修复', color: 'text-green-600', icon: CheckCircle },
  [FixStatus.IGNORED]: { label: '已忽略', color: 'text-gray-400', icon: XCircle },
}

export default function FixSuggestions({
  suggestions,
  issues,
  fixHistory = [],
  chapterContent,
  onApplyFix,
  onBatchApplyFixes,
  onIgnoreFix,
  onManualFix,
  onContentUpdate,
  isProcessing = false,
  onAudit,
  auditResult,
  isAuditing = false,
}: FixSuggestionsProps) {
  // UI状态
  const [expandedSuggestion, setExpandedSuggestion] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [filterStatus, setFilterStatus] = useState<FixStatus | 'all'>('all')
  const [editingIssue, setEditingIssue] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [showDiff, setShowDiff] = useState(true)
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set())

  // 润色相关状态
  const [isPolishing, setIsPolishing] = useState(false)
  const [showPolishOptions, setShowPolishOptions] = useState(false)
  const [polishOptions, setPolishOptions] = useState<PolishOptions>({
    intensity: 'medium',
    targetAudience: 'general',
    tone: 'natural',
  })
  const [polishResult, setPolishResult] = useState<PolishResult | null>(null)

  // 获取分数对应的颜色和评级
  const getScoreInfo = useCallback((score: number): { label: string; color: string; bgColor: string } => {
    if (score >= 90) return { label: '优秀', color: 'text-green-600', bgColor: 'bg-green-100' }
    if (score >= 75) return { label: '良好', color: 'text-blue-600', bgColor: 'bg-blue-100' }
    if (score >= 60) return { label: '合格', color: 'text-yellow-600', bgColor: 'bg-yellow-100' }
    return { label: '待改进', color: 'text-red-600', bgColor: 'bg-red-100' }
  }, [])

  // 创建问题ID到问题的映射
  const issuesMap = useMemo(() => {
    const map = new Map<string, AuditIssueDetail>()
    issues.forEach((issue) => map.set(issue.id, issue))
    return map
  }, [issues])

  // 筛选后的建议
  const filteredSuggestions = useMemo(() => {
    if (filterStatus === 'all') return suggestions
    return suggestions.filter((s) => s.status === filterStatus)
  }, [suggestions, filterStatus])

  // 统计信息
  const stats = useMemo(() => {
    const pending = suggestions.filter((s) => s.status === FixStatus.PENDING).length
    const fixed = suggestions.filter((s) => s.status === FixStatus.FIXED).length
    const ignored = suggestions.filter((s) => s.status === FixStatus.IGNORED).length
    const autoApplicable = suggestions.filter(
      (s) => s.status === FixStatus.PENDING && s.canAutoApply
    ).length

    return { pending, fixed, ignored, autoApplicable, total: suggestions.length }
  }, [suggestions])

  // 切换建议展开状态
  const toggleSuggestion = useCallback((id: string) => {
    setExpandedSuggestion((prev) => (prev === id ? null : id))
  }, [])

  // 切换选择建议
  const toggleSelectSuggestion = useCallback((id: string) => {
    setSelectedSuggestions((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }, [])

  // 全选/取消全选
  const toggleSelectAll = useCallback(() => {
    const pendingAutoFixable = filteredSuggestions
      .filter((s) => s.status === FixStatus.PENDING && s.canAutoApply)
      .map((s) => s.id)

    if (selectedSuggestions.size === pendingAutoFixable.length) {
      setSelectedSuggestions(new Set())
    } else {
      setSelectedSuggestions(new Set(pendingAutoFixable))
    }
  }, [filteredSuggestions, selectedSuggestions.size])

  // 批量应用修复
  const handleBatchApply = useCallback(async () => {
    if (!onBatchApplyFixes || selectedSuggestions.size === 0) return
    await onBatchApplyFixes(Array.from(selectedSuggestions))
    setSelectedSuggestions(new Set())
  }, [onBatchApplyFixes, selectedSuggestions])

  // 开始手动编辑
  const startManualEdit = useCallback((issueId: string, originalText: string) => {
    setEditingIssue(issueId)
    setEditContent(originalText)
  }, [])

  // 保存手动编辑
  const saveManualEdit = useCallback(async () => {
    if (!editingIssue) return
    await onManualFix(editingIssue, editContent)
    setEditingIssue(null)
    setEditContent('')
  }, [editingIssue, editContent, onManualFix])

  // 取消手动编辑
  const cancelManualEdit = useCallback(() => {
    setEditingIssue(null)
    setEditContent('')
  }, [])

  // 处理润色
  const handlePolish = useCallback(async () => {
    if (!chapterContent) {
      toast.error('没有可润色的内容')
      return
    }

    setIsPolishing(true)
    setPolishResult(null)
    
    try {
      const result = await polishChapter(chapterContent, polishOptions)
      setPolishResult(result)
      toast.success('润色完成')
    } catch (error) {
      toast.error('润色失败，请重试')
      console.error('Polish error:', error)
    } finally {
      setIsPolishing(false)
    }
  }, [chapterContent, polishOptions])

  // 应用润色结果
  const applyPolishResult = useCallback(() => {
    if (polishResult && onContentUpdate) {
      onContentUpdate(polishResult.polishedContent)
      setPolishResult(null)
      setShowPolishOptions(false)
      toast.success('已应用润色结果')
    }
  }, [polishResult, onContentUpdate])

  // 渲染差异对比
  const renderDiff = (original: string, suggested: string) => {
    if (!showDiff) {
      return (
        <div className="space-y-2">
          <div className="p-2 bg-gray-50 rounded text-sm">
            <span className="text-gray-500 text-xs block mb-1">修改后:</span>
            {suggested}
          </div>
        </div>
      )
    }

    // 简单的差异显示（实际项目中可以使用专业的 diff 库）
    return (
      <div className="space-y-2">
        <div className="p-2 bg-red-50 rounded text-sm">
          <span className="text-red-500 text-xs block mb-1">原文:</span>
          <span className="line-through text-red-600">{original}</span>
        </div>
        <div className="flex justify-center">
          <ArrowRight className="w-4 h-4 text-gray-400" />
        </div>
        <div className="p-2 bg-green-50 rounded text-sm">
          <span className="text-green-500 text-xs block mb-1">修改后:</span>
          <span className="text-green-600">{suggested}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-sm border border-gray-200">
      {/* 标题栏 */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Wrench className="w-5 h-5 text-primary-600" />
            审计与修复
          </h3>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={cn(
              'flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg transition-colors',
              showHistory
                ? 'bg-primary-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            <History className="w-4 h-4" />
            修复历史
          </button>
        </div>

        {/* 审计按钮 */}
        <button
          onClick={onAudit}
          disabled={isAuditing || !chapterContent}
          className="w-full py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 mb-3"
        >
          {isAuditing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              审计中...
            </>
          ) : (
            <>
              <CheckCircle className="w-5 h-5" />
              开始审计
            </>
          )}
        </button>

        {/* 润色按钮 */}
        <button
          onClick={() => setShowPolishOptions(!showPolishOptions)}
          disabled={!chapterContent}
          className="w-full py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 mb-3"
        >
          <Wand2 className="w-5 h-5" />
          润色章节
        </button>

        {/* 润色选项面板 */}
        {showPolishOptions && (
          <div className="bg-purple-50 rounded-lg p-3 mb-3 border border-purple-100">
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  润色强度
                </label>
                <div className="flex gap-2">
                  {(['light', 'medium', 'deep'] as const).map((level) => (
                    <button
                      key={level}
                      onClick={() => setPolishOptions({ ...polishOptions, intensity: level })}
                      className={cn(
                        'flex-1 py-1.5 text-sm font-medium rounded-lg transition-colors',
                        polishOptions.intensity === level
                          ? 'bg-purple-600 text-white'
                          : 'bg-white text-gray-600 hover:bg-purple-100 border border-purple-200'
                      )}
                    >
                      {level === 'light' ? '轻度' : level === 'medium' ? '中度' : '深度'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  目标受众
                </label>
                <select
                  value={polishOptions.targetAudience}
                  onChange={(e) =>
                    setPolishOptions({
                      ...polishOptions,
                      targetAudience: e.target.value as 'young' | 'adult' | 'general',
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white"
                >
                  <option value="general">大众读者</option>
                  <option value="young">年轻读者</option>
                  <option value="adult">成年读者</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  文风基调
                </label>
                <select
                  value={polishOptions.tone}
                  onChange={(e) =>
                    setPolishOptions({
                      ...polishOptions,
                      tone: e.target.value as 'natural' | 'vivid' | 'concise' | 'literary',
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white"
                >
                  <option value="natural">自然流畅</option>
                  <option value="vivid">生动形象</option>
                  <option value="concise">简洁明快</option>
                  <option value="literary">文学性强</option>
                </select>
              </div>

              <button
                onClick={handlePolish}
                disabled={isPolishing || !chapterContent}
                className="w-full py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {isPolishing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    润色中...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    开始润色
                  </>
                )}
              </button>
            </div>

            {/* 润色结果 */}
            {polishResult && (
              <div className="mt-3 p-3 bg-white rounded-lg border border-purple-200">
                <h4 className="text-sm font-medium text-gray-900 mb-2">润色结果</h4>
                {polishResult.statistics && (
                  <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                    <div className="bg-gray-50 rounded p-2">
                      <span className="text-gray-500">原文字数:</span>
                      <span className="font-medium ml-1">{polishResult.statistics.originalWordCount}</span>
                    </div>
                    <div className="bg-gray-50 rounded p-2">
                      <span className="text-gray-500">润色后字数:</span>
                      <span className="font-medium ml-1">{polishResult.statistics.polishedWordCount}</span>
                    </div>
                    <div className="bg-gray-50 rounded p-2">
                      <span className="text-gray-500">修改段落:</span>
                      <span className="font-medium ml-1">{polishResult.statistics.modifiedParagraphs}</span>
                    </div>
                    <div className="bg-gray-50 rounded p-2">
                      <span className="text-gray-500">改进点:</span>
                      <span className="font-medium ml-1">{polishResult.statistics.improvementCount}</span>
                    </div>
                  </div>
                )}
                {polishResult.improvements && polishResult.improvements.length > 0 && (
                  <div className="mb-3">
                    <h5 className="text-xs font-medium text-gray-700 mb-1">主要改进:</h5>
                    <ul className="text-xs text-gray-600 space-y-1">
                      {polishResult.improvements.slice(0, 3).map((imp, idx) => (
                        <li key={idx} className="flex items-start gap-1">
                          <span className="text-purple-500">•</span>
                          <span>{imp.description}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={applyPolishResult}
                    className="flex-1 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    应用润色结果
                  </button>
                  <button
                    onClick={() => setPolishResult(null)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    取消
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 审计结果 */}
        {auditResult && (
          <div className="space-y-3 mb-3">
            {/* 总分 */}
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">审计总分</span>
                <span className={cn('text-xl font-bold', getScoreInfo(auditResult.overallScore).color)}>
                  {auditResult.overallScore}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={cn(
                    'h-2 rounded-full transition-all duration-500',
                    auditResult.overallScore >= 90
                      ? 'bg-green-500'
                      : auditResult.overallScore >= 75
                        ? 'bg-blue-500'
                        : auditResult.overallScore >= 60
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                  )}
                  style={{ width: `${auditResult.overallScore}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">评级: {getScoreInfo(auditResult.overallScore).label}</p>
            </div>

            {/* 维度分数 */}
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(auditResult.dimensionScores).map(([key, value]) => (
                <div key={key} className="bg-gray-50 rounded-lg p-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-600">
                      {key === 'contentQuality'
                        ? '内容质量'
                        : key === 'characterConsistency'
                          ? '角色一致性'
                          : key === 'plotContinuity'
                            ? '情节连贯'
                            : key === 'styleConsistency'
                              ? '文风一致'
                              : '节奏'}
                    </span>
                    <span className={cn('text-xs font-medium', getScoreInfo(value).color)}>{value}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1">
                    <div
                      className={cn(
                        'h-1 rounded-full',
                        value >= 80 ? 'bg-green-500' : value >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                      )}
                      style={{ width: `${value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 统计信息 */}
        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          <div className="bg-gray-50 rounded p-2">
            <div className="font-bold text-gray-900">{stats.total}</div>
            <div className="text-gray-500">总计</div>
          </div>
          <div className="bg-yellow-50 rounded p-2">
            <div className="font-bold text-yellow-600">{stats.pending}</div>
            <div className="text-yellow-600">待修复</div>
          </div>
          <div className="bg-green-50 rounded p-2">
            <div className="font-bold text-green-600">{stats.fixed}</div>
            <div className="text-green-600">已修复</div>
          </div>
          <div className="bg-gray-50 rounded p-2">
            <div className="font-bold text-gray-400">{stats.ignored}</div>
            <div className="text-gray-400">已忽略</div>
          </div>
        </div>
      </div>

      {/* 筛选和批量操作 */}
      <div className="p-3 border-b border-gray-200 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as FixStatus | 'all')}
              className="text-sm border border-gray-300 rounded-lg px-2 py-1"
            >
              <option value="all">全部状态</option>
              <option value={FixStatus.PENDING}>待修复</option>
              <option value={FixStatus.FIXED}>已修复</option>
              <option value={FixStatus.IGNORED}>已忽略</option>
            </select>
          </div>
          <button
            onClick={() => setShowDiff(!showDiff)}
            className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
          >
            {showDiff ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            {showDiff ? '显示对比' : '隐藏对比'}
          </button>
        </div>

        {/* 批量操作 */}
        {stats.autoApplicable > 0 && onBatchApplyFixes && (
          <div className="flex items-center justify-between bg-blue-50 rounded-lg p-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={
                  selectedSuggestions.size ===
                  filteredSuggestions.filter((s) => s.status === FixStatus.PENDING && s.canAutoApply)
                    .length
                }
                onChange={toggleSelectAll}
                className="rounded border-gray-300 text-primary-500"
              />
              <span className="text-sm text-blue-700">
                已选择 {selectedSuggestions.size} 项可自动修复
              </span>
            </div>
            <button
              onClick={handleBatchApply}
              disabled={isProcessing || selectedSuggestions.size === 0}
              className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                '一键修复'
              )}
            </button>
          </div>
        )}
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto">
        {showHistory ? (
          // 修复历史
          <div className="p-4">
            {fixHistory.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>暂无修复历史</p>
              </div>
            ) : (
              <div className="space-y-3">
                {fixHistory.map((record) => (
                  <div key={record.id} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={cn(
                          'text-xs font-medium px-2 py-0.5 rounded',
                          record.fixType === 'auto' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'
                        )}
                      >
                        {record.fixType === 'auto' ? '自动修复' : '手动修复'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(record.fixedAt).toLocaleString('zh-CN')}
                      </span>
                    </div>
                    <div className="space-y-2">
                      <div className="p-2 bg-red-50 rounded text-sm">
                        <span className="text-red-500 text-xs block mb-1">修复前:</span>
                        <span className="line-through text-red-600 text-xs">
                          {record.beforeContent.substring(0, 100)}...
                        </span>
                      </div>
                      <div className="p-2 bg-green-50 rounded text-sm">
                        <span className="text-green-500 text-xs block mb-1">修复后:</span>
                        <span className="text-green-600 text-xs">
                          {record.afterContent.substring(0, 100)}...
                        </span>
                      </div>
                    </div>
                    {record.note && (
                      <p className="text-xs text-gray-500 mt-2">{record.note}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          // 修复建议列表
          <div className="divide-y divide-gray-100">
            {filteredSuggestions.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
                <p>没有需要修复的问题</p>
              </div>
            ) : (
              filteredSuggestions.map((suggestion) => {
                const issue = issuesMap.get(suggestion.issueId)
                const isExpanded = expandedSuggestion === suggestion.id
                const isSelected = selectedSuggestions.has(suggestion.id)
                const statusConfig = FIX_STATUS_CONFIG[suggestion.status]
                const StatusIcon = statusConfig.icon

                return (
                  <div key={suggestion.id} className="p-3">
                    {/* 建议头部 */}
                    <div className="flex items-start gap-2">
                      {suggestion.status === FixStatus.PENDING && suggestion.canAutoApply && (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectSuggestion(suggestion.id)}
                          className="mt-1 rounded border-gray-300 text-primary-500"
                        />
                      )}
                      <button
                        onClick={() => toggleSuggestion(suggestion.id)}
                        className="flex-1 text-left"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              {suggestion.description}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span
                                className={cn(
                                  'text-xs px-2 py-0.5 rounded',
                                  issue ? SEVERITY_CONFIG[issue.severity].bgColor : 'bg-gray-100',
                                  issue ? SEVERITY_CONFIG[issue.severity].color : 'text-gray-600'
                                )}
                              >
                                {issue ? SEVERITY_CONFIG[issue.severity].label : '未知'}
                              </span>
                              <span
                                className={cn(
                                  'text-xs flex items-center gap-1',
                                  statusConfig.color
                                )}
                              >
                                <StatusIcon
                                  className={cn(
                                    'w-3 h-3',
                                    suggestion.status === FixStatus.IN_PROGRESS && 'animate-spin'
                                  )}
                                />
                                {statusConfig.label}
                              </span>
                              <span className="text-xs text-gray-400">
                                置信度: {Math.round(suggestion.confidence * 100)}%
                              </span>
                            </div>
                          </div>
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          )}
                        </div>
                      </button>
                    </div>

                    {/* 展开内容 */}
                    {isExpanded && (
                      <div className="mt-3 pl-6 space-y-3">
                        {/* 差异对比 */}
                        {renderDiff(suggestion.originalText, suggestion.suggestedText)}

                        {/* 修改原因 */}
                        <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                          <span className="font-medium text-gray-700">原因: </span>
                          {suggestion.reason}
                        </div>

                        {/* 操作按钮 */}
                        {suggestion.status === FixStatus.PENDING && (
                          <div className="flex items-center gap-2">
                            {suggestion.canAutoApply ? (
                              <button
                                onClick={() => onApplyFix(suggestion.id)}
                                disabled={isProcessing}
                                className="flex-1 py-2 bg-primary-500 text-white text-sm rounded-lg hover:bg-primary-600 disabled:opacity-50 flex items-center justify-center gap-1"
                              >
                                {isProcessing ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <CheckCircle className="w-4 h-4" />
                                )}
                                应用修复
                              </button>
                            ) : (
                              <button
                                onClick={() => startManualEdit(suggestion.issueId, suggestion.originalText)}
                                className="flex-1 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 flex items-center justify-center gap-1"
                              >
                                <Edit3 className="w-4 h-4" />
                                手动编辑
                              </button>
                            )}
                            <button
                              onClick={() => onIgnoreFix(suggestion.id)}
                              className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300"
                            >
                              忽略
                            </button>
                          </div>
                        )}

                        {/* 手动编辑区域 */}
                        {editingIssue === suggestion.issueId && (
                          <div className="mt-3 p-3 bg-gray-50 rounded-lg space-y-2">
                            <textarea
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              rows={4}
                              className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                              placeholder="输入修改后的内容..."
                            />
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={cancelManualEdit}
                                className="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300"
                              >
                                <X className="w-4 h-4 inline mr-1" />
                                取消
                              </button>
                              <button
                                onClick={saveManualEdit}
                                disabled={isProcessing || !editContent.trim()}
                                className="px-3 py-1.5 bg-primary-500 text-white text-sm rounded hover:bg-primary-600 disabled:opacity-50"
                              >
                                {isProcessing ? (
                                  <Loader2 className="w-4 h-4 animate-spin inline mr-1" />
                                ) : (
                                  <Save className="w-4 h-4 inline mr-1" />
                                )}
                                保存
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>

      {/* 底部操作栏 */}
      {!showHistory && stats.pending > 0 && (
        <div className="p-3 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">
              还有 {stats.pending} 个问题待修复
            </span>
            {stats.autoApplicable > 0 && onBatchApplyFixes && (
              <button
                onClick={handleBatchApply}
                disabled={isProcessing || selectedSuggestions.size === 0}
                className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 flex items-center gap-1"
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                一键修复全部 ({stats.autoApplicable})
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
