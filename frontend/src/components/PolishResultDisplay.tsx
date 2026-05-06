import { useState } from 'react'
import {
  FileText,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Sparkles,
  BarChart3,
  Lightbulb,
  XCircle,
} from 'lucide-react'
import type { PolishResult } from '../services/api'
import { cn } from '../utils'

interface PolishResultDisplayProps {
  /** 润色结果 */
  result: PolishResult
  /** 原始内容（如果结果中没有包含） */
  originalContent?: string
  /** 是否显示对比视图 */
  showComparison?: boolean
  /** 应用润色结果的回调 */
  onApply?: (content: string) => void
  /** 关闭回调 */
  onClose?: () => void
}

/**
 * 润色结果展示组件
 */
type TabId = 'comparison' | 'audit' | 'features' | 'suggestions'

export default function PolishResultDisplay({
  result,
  originalContent,
  showComparison = true,
  onApply,
  onClose,
}: PolishResultDisplayProps) {
  const [activeTab, setActiveTab] = useState<TabId>('comparison')
  const [showOriginal, setShowOriginal] = useState(true)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['scores']))

  const original = result.originalContent || originalContent || ''
  const polished = result.polishedContent
  const audit = result.auditResult

  // 切换展开状态
  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(section)) {
        next.delete(section)
      } else {
        next.add(section)
      }
      return next
    })
  }

  // 获取评分颜色
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  // 获取优先级样式
  const getPriorityStyle = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-700 border-red-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      case 'low':
        return 'bg-green-100 text-green-700 border-green-200'
    }
  }

  // 获取建议类型标签
  const getSuggestionTypeLabel = (type: 'style' | 'structure' | 'vocabulary' | 'rhythm') => {
    const labels = {
      style: '风格',
      structure: '结构',
      vocabulary: '词汇',
      rhythm: '节奏',
    }
    return labels[type]
  }

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
      {/* 头部 */}
      <div className="px-4 py-3 bg-gradient-to-r from-purple-50 to-blue-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-900">润色结果</h3>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-200 rounded-full transition-colors"
            >
              <XCircle className="w-5 h-5 text-gray-500" />
            </button>
          )}
        </div>

        {/* 统计信息 */}
        {result.statistics && (
          <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
            <span>原文字数: {result.statistics.originalWordCount}</span>
            <span>润色后: {result.statistics.polishedWordCount}</span>
            <span>修改段落: {result.statistics.modifiedParagraphs}</span>
            <span>改进点: {result.statistics.improvementCount}</span>
          </div>
        )}
      </div>

      {/* 标签页 */}
      <div className="border-b border-gray-200">
        <div className="flex">
          {([
            { id: 'comparison', label: '内容对比', icon: FileText },
            { id: 'audit', label: '风格审计', icon: BarChart3 },
            { id: 'features', label: 'AI特征', icon: AlertTriangle },
            { id: 'suggestions', label: '优化建议', icon: Lightbulb },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-b-2',
                activeTab === tab.id
                  ? 'text-purple-600 border-purple-600 bg-purple-50'
                  : 'text-gray-600 border-transparent hover:text-gray-900 hover:bg-gray-50'
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 内容区域 */}
      <div className="p-4 max-h-[600px] overflow-y-auto">
        {/* 内容对比 */}
        {activeTab === 'comparison' && showComparison && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-700">原文与润色后对比</h4>
              <button
                onClick={() => setShowOriginal(!showOriginal)}
                className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700"
              >
                {showOriginal ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {showOriginal ? '隐藏原文' : '显示原文'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {showOriginal && (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
                    <span className="text-sm font-medium text-gray-700">原文</span>
                  </div>
                  <div className="p-3 text-sm text-gray-600 whitespace-pre-wrap max-h-[400px] overflow-y-auto">
                    {original || '无原文内容'}
                  </div>
                </div>
              )}

              <div className={cn('border border-purple-200 rounded-lg overflow-hidden', !showOriginal && 'col-span-2')}>
                <div className="px-3 py-2 bg-purple-50 border-b border-purple-200">
                  <span className="text-sm font-medium text-purple-700">润色后</span>
                </div>
                <div className="p-3 text-sm text-gray-800 whitespace-pre-wrap max-h-[400px] overflow-y-auto">
                  {polished}
                </div>
              </div>
            </div>

            {/* 改进列表 */}
            {result.improvements && result.improvements.length > 0 && (
              <div className="mt-4">
                <button
                  onClick={() => toggleSection('improvements')}
                  className="flex items-center justify-between w-full py-2 text-sm font-medium text-gray-700"
                >
                  <span className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                    改进详情 ({result.improvements.length})
                  </span>
                  {expandedSections.has('improvements') ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>

                {expandedSections.has('improvements') && (
                  <div className="mt-2 space-y-2">
                    {result.improvements.map((improvement, index) => (
                      <div
                        key={index}
                        className="p-3 bg-green-50 border border-green-200 rounded-lg"
                      >
                        <div className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                          <div className="flex-1">
                            <span className="text-sm font-medium text-green-700">
                              {improvement.type}
                            </span>
                            <p className="text-sm text-gray-600 mt-1">
                              {improvement.description}
                            </p>
                            {improvement.before && improvement.after && (
                              <div className="mt-2 space-y-1 text-xs">
                                <div className="text-red-600 line-through">
                                  原: {improvement.before}
                                </div>
                                <div className="text-green-600">改: {improvement.after}</div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 风格审计 */}
        {activeTab === 'audit' && audit && (
          <div className="space-y-4">
            {/* 总体评分 */}
            <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg">
              <div className="text-5xl font-bold text-purple-600 mb-2">
                {audit.overallScore}
              </div>
              <div className="text-sm text-gray-600">总体评分</div>
              <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                <div
                  className={cn(
                    'h-2 rounded-full transition-all',
                    audit.overallScore >= 80
                      ? 'bg-green-500'
                      : audit.overallScore >= 60
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                  )}
                  style={{ width: `${audit.overallScore}%` }}
                />
              </div>
            </div>

            {/* 各维度评分 */}
            <div>
              <button
                onClick={() => toggleSection('scores')}
                className="flex items-center justify-between w-full py-2 text-sm font-medium text-gray-700"
              >
                <span>各维度评分</span>
                {expandedSections.has('scores') ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>

              {expandedSections.has('scores') && (
                <div className="mt-2 space-y-3">
                  {Object.entries(audit.scores).map(([key, value]) => {
                    const labels: Record<string, string> = {
                      sentenceVariety: '句式多样性',
                      vocabularyRichness: '词汇丰富度',
                      emotionalExpression: '情感表达',
                      pacing: '节奏感',
                      detailDescription: '细节描写',
                    }
                    return (
                      <div key={key} className="flex items-center gap-3">
                        <span className="text-sm text-gray-600 w-24">{labels[key]}</span>
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className={cn(
                              'h-2 rounded-full transition-all',
                              value >= 80
                                ? 'bg-green-500'
                                : value >= 60
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                            )}
                            style={{ width: `${value}%` }}
                          />
                        </div>
                        <span className={cn('text-sm font-medium w-12 text-right', getScoreColor(value))}>
                          {value}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* AI特征 */}
        {activeTab === 'features' && (
          <div className="space-y-4">
            {audit?.aiFeatures && audit.aiFeatures.length > 0 ? (
              audit.aiFeatures.map((feature, index) => (
                <div
                  key={index}
                  className="p-4 bg-orange-50 border border-orange-200 rounded-lg"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-orange-600" />
                        <span className="text-sm font-medium text-orange-700">
                          {feature.type}
                        </span>
                        <span className="text-xs bg-orange-200 text-orange-800 px-2 py-0.5 rounded-full">
                          出现 {feature.count} 次
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{feature.description}</p>
                      {feature.examples.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {feature.examples.slice(0, 3).map((example, i) => (
                            <div
                              key={i}
                              className="text-xs text-gray-500 bg-white px-2 py-1 rounded border border-orange-100"
                            >
                              "{example}"
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
                <p>未检测到明显的AI特征</p>
              </div>
            )}

            {result.aiFeaturesDetected && result.aiFeaturesDetected.length > 0 && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <h5 className="text-sm font-medium text-gray-700 mb-2">检测到的特征</h5>
                <div className="flex flex-wrap gap-2">
                  {result.aiFeaturesDetected.map((feature, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 优化建议 */}
        {activeTab === 'suggestions' && (
          <div className="space-y-3">
            {audit?.suggestions && audit.suggestions.length > 0 ? (
              audit.suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="p-4 bg-blue-50 border border-blue-200 rounded-lg"
                >
                  <div className="flex items-start gap-3">
                    <Lightbulb className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs px-2 py-0.5 rounded border bg-blue-100 text-blue-700 border-blue-200">
                          {getSuggestionTypeLabel(suggestion.type)}
                        </span>
                        <span
                          className={cn(
                            'text-xs px-2 py-0.5 rounded border',
                            getPriorityStyle(suggestion.priority)
                          )}
                        >
                          {suggestion.priority === 'high'
                            ? '高优先级'
                            : suggestion.priority === 'medium'
                            ? '中优先级'
                            : '低优先级'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">{suggestion.description}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
                <p>暂无优化建议</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 底部操作栏 */}
      {onApply && (
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
          <div className="flex gap-2">
            <button
              onClick={() => onApply(polished)}
              className="flex-1 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              应用润色结果
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                取消
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
