import { useState, useEffect } from 'react'
import { Sparkles, Edit3, GitCompare, Lightbulb, ChevronDown, ChevronUp, X, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import RichTextEditor from './RichTextEditor'
import Modal from './Modal'
import VersionManager from './VersionManager'
import {
  analyzeAIFeatures,
  humanizeText,
  getIntensityLevels,
  getHumanizeGenres,
  getSettings
} from '../services/api'

interface CollaborationEditorProps {
  content: string
  onContentChange: (content: string) => void
  disabled?: boolean
  novelId?: string
  chapterId?: string
  chapterTitle?: string
  versions?: Array<{
    id: string
    timestamp: string
    description: string
    content: string
  }>
  onVersionRestore?: (version: { id: string; timestamp: string; description: string; content: string }) => void
  onVersionDelete?: (versionId: string) => void
  onVersionCreate?: (content: string, description: string) => void
}

interface HumanizeConfig {
  intensity: 'light' | 'medium' | 'strong' | 'auto'
  enableStyleOptimization: boolean
  genre: string
  preservePhrases: string[]
  targetAudience: 'young' | 'adult' | 'general'
  mode: 'rewrite' | 'optimize' | 'full'
}

export default function CollaborationEditor({ 
  content, 
  onContentChange, 
  disabled = false, 
  versions = [],
  onVersionRestore,
  onVersionDelete,
  onVersionCreate
}: CollaborationEditorProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<{ score: number; processedScore?: number; assessment?: string; suggestions?: string[] } | null>(null)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [showVersions, setShowVersions] = useState(false)
  const [showHumanizeModal, setShowHumanizeModal] = useState(false)
  const [humanizeOptions, setHumanizeOptions] = useState<HumanizeConfig>({
    intensity: 'auto',
    enableStyleOptimization: true,
    preservePhrases: [],
    genre: '',
    targetAudience: 'general',
    mode: 'full'
  })
  const [preservePhraseInput, setPreservePhraseInput] = useState('')
  const [intensityLevels, setIntensityLevels] = useState<{ level: string; name: string; description: string }[]>([])
  const [genres, setGenres] = useState<{ id: string; name: string; description: string }[]>([])
  const [versionDescription, setVersionDescription] = useState('')
  const [showVersionCreateModal, setShowVersionCreateModal] = useState(false)

  // 加载强度级别、小说类型和全局默认设置
  useEffect(() => {
    const loadData = async () => {
      try {
        const [levels, genreList, settingsData] = await Promise.all([
          getIntensityLevels(),
          getHumanizeGenres(),
          getSettings()
        ])
        setIntensityLevels(levels.map(level => ({ level: level.value, name: level.label, description: level.description })) || [])
        setGenres(genreList.map(genre => ({ id: genre.value, name: genre.label, description: genre.label })) || [])
        
        // 加载全局默认设置
        if (settingsData.humanize_config) {
          const hc = settingsData.humanize_config as Record<string, unknown>
          setHumanizeOptions({
            intensity: (hc.intensity as 'light' | 'medium' | 'strong' | 'auto') || 'auto',
            enableStyleOptimization: hc.enableStyleOptimization as boolean ?? true,
            genre: (hc.genre as string) || '',
            preservePhrases: (hc.preservePhrases as string[]) || [],
            targetAudience: (hc.targetAudience as 'young' | 'adult' | 'general') || 'general',
            mode: (hc.mode as 'rewrite' | 'optimize' | 'full') || 'full'
          })
        }
      } catch (error) {
        console.error('加载数据失败:', error)
      }
    }
    loadData()
  }, [])

  // 分析AI痕迹
  const handleAnalyze = async () => {
    if (!content?.trim()) {
      toast.error('请输入文本内容')
      return
    }

    setIsAnalyzing(true)
    try {
      const result = await analyzeAIFeatures(content, true)
      
      // 设置完整的分析结果
      setAnalysisResult({
        score: result.score,
        assessment: result.assessment,
        suggestions: result.suggestions
      })
      
      // 设置建议列表
      setSuggestions(result.suggestions || [])
      
      // 显示分析结果面板
      setShowSuggestions(true)
      
      // 显示成功消息，包含评分信息
      toast.success(`AI痕迹分析完成！评分: ${result.score}，原创度: ${result.originalityScore}`)
    } catch (error) {
      // 改进错误处理，显示更详细的错误信息
      const errorMessage = error instanceof Error ? error.message : '分析失败，请重试'
      toast.error(errorMessage)
      console.error('AI痕迹分析失败:', error)
    } finally {
      setIsAnalyzing(false)
    }
  }

  // 应用润色
  const handleHumanize = async () => {
    if (!content?.trim()) {
      toast.error('请输入文本内容')
      return
    }

    setIsProcessing(true)
    try {
      const result = await humanizeText(content, humanizeOptions)
      if (result.processedText) {
        onContentChange(result.processedText)
        setAnalysisResult({
          score: result.originalScore,
          processedScore: result.processedScore,
          suggestions: result.suggestions
        })
        setSuggestions(result.suggestions || [])
        setShowHumanizeModal(false)
        toast.success(`润色完成！AI痕迹从 ${result.originalScore} 降至 ${result.processedScore}`)
      } else {
        toast.error('润色结果为空')
      }
    } catch (error) {
      toast.error('润色失败，请重试')
      console.error(error)
    } finally {
      setIsProcessing(false)
    }
  }

  // 快速重写（直接以rewrite模式执行）
  const handleQuickRewrite = async () => {
    if (!content?.trim()) {
      toast.error('请输入文本内容')
      return
    }

    setIsProcessing(true)
    try {
      const rewriteOptions = {
        ...humanizeOptions,
        mode: 'rewrite' as const,
        genre: humanizeOptions.genre || 'general' // 默认使用general类型
      }
      const result = await humanizeText(content, rewriteOptions)
      if (result.processedText) {
        onContentChange(result.processedText)
        setAnalysisResult({
          score: result.originalScore,
          processedScore: result.processedScore,
          suggestions: result.suggestions
        })
        setSuggestions(result.suggestions || [])
        setShowSuggestions(true)
        toast.success(`重写完成！AI痕迹从 ${result.originalScore} 降至 ${result.processedScore}`)
      } else {
        toast.error('重写结果为空')
      }
    } catch (error) {
      toast.error('重写失败，请重试')
      console.error(error)
    } finally {
      setIsProcessing(false)
    }
  }

  // 添保留短语
  const handleAddPreservePhrase = () => {
    if (preservePhraseInput.trim() && !humanizeOptions.preservePhrases.includes(preservePhraseInput.trim())) {
      setHumanizeOptions({
        ...humanizeOptions,
        preservePhrases: [...humanizeOptions.preservePhrases, preservePhraseInput.trim()]
      })
      setPreservePhraseInput('')
    }
  }

  // 移除保留短语
  const handleRemovePreservePhrase = (phrase: string) => {
    setHumanizeOptions({
      ...humanizeOptions,
      preservePhrases: humanizeOptions.preservePhrases.filter(p => p !== phrase)
    })
  }

  // 创建版本
  const handleCreateVersion = () => {
    if (onVersionCreate) {
      onVersionCreate(content, versionDescription || '自动保存')
      setShowVersionCreateModal(false)
      setVersionDescription('')
      toast.success('版本创建成功')
    }
  }

  return (
    <div className="collaboration-editor">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
          <Edit3 className="w-5 h-5" />
          <span>人机协作编辑</span>
        </h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleAnalyze}
            disabled={disabled || isAnalyzing || !content?.trim()}
            className="btn-outline flex items-center space-x-1"
          >
            <Lightbulb className="w-4 h-4" />
            <span>分析AI痕迹</span>
          </button>
          <button
            onClick={handleQuickRewrite}
            disabled={disabled || isProcessing || !content?.trim()}
            className="btn-outline flex items-center space-x-1"
          >
            <Edit3 className="w-4 h-4" />
            <span>重写</span>
          </button>
          <button
            onClick={() => setShowHumanizeModal(true)}
            disabled={disabled || isProcessing || !content?.trim()}
            className="btn-primary flex items-center space-x-1"
          >
            <Sparkles className="w-4 h-4" />
            <span>AI润色</span>
          </button>
          <button
            onClick={() => setShowVersionCreateModal(true)}
            disabled={disabled || !content?.trim()}
            className="btn-outline flex items-center space-x-1"
          >
            <Save className="w-4 h-4" />
            <span>保存版本</span>
          </button>
          <button
            onClick={() => setShowVersions(!showVersions)}
            className="btn-outline flex items-center space-x-1"
          >
            <GitCompare className="w-4 h-4" />
            <span>版本管理</span>
            {showVersions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 主编辑器 */}
      <div className="card mb-6">
        <div className="p-4">
          <RichTextEditor
            value={content || ''}
            onChange={onContentChange}
            placeholder="请输入章节内容..."
            disabled={disabled}
          />
        </div>
      </div>

      {/* 分析结果和建议 */}
      {showSuggestions && analysisResult && (
        <div className="card mb-6">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-gray-900">AI痕迹分析结果</h4>
              <button
                onClick={() => setShowSuggestions(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="mb-4">
              <div className="flex items-center space-x-4 mb-3">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-700">AI痕迹评分:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    analysisResult.score < 20 ? 'bg-green-100 text-green-800' :
                    analysisResult.score < 40 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {analysisResult.score}
                  </span>
                </div>
                {analysisResult.processedScore && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">处理后:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      analysisResult.processedScore < 20 ? 'bg-green-100 text-green-800' :
                      analysisResult.processedScore < 40 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {analysisResult.processedScore}
                    </span>
                  </div>
                )}
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-blue-800 font-medium mb-1">评估结果</p>
                <p className="text-sm text-blue-700">{analysisResult.assessment || '分析完成'}</p>
              </div>
            </div>

            {suggestions.length > 0 && (
              <div className="mt-4">
                <h5 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <Lightbulb className="w-4 h-4 text-yellow-500 mr-1" />
                  改进建议
                </h5>
                <ul className="space-y-2">
                  {suggestions.map((suggestion, index) => (
                    <li key={index} className="text-sm text-gray-600 flex items-start space-x-2">
                      <span className="text-yellow-500 mt-1">•</span>
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 版本管理 */}
      {showVersions && (
        <div className="card mb-6">
          <VersionManager
            versions={versions}
            onVersionRestore={onVersionRestore || (() => {})}
            onVersionDelete={onVersionDelete || (() => {})}
            disabled={disabled}
          />
        </div>
      )}

      {/* AI润色模态框 */}
      <Modal
        isOpen={showHumanizeModal}
        onClose={() => setShowHumanizeModal(false)}
        title="AI润色设置"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              处理强度
            </label>
            <select
              value={humanizeOptions.intensity}
              onChange={(e) => setHumanizeOptions({ ...humanizeOptions, intensity: e.target.value as 'light' | 'medium' | 'strong' | 'auto' })}
              className="input-field"
            >
              {intensityLevels.map((level) => (
                <option key={level.level} value={level.level}>
                  {level.name} - {level.description}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              小说类型
            </label>
            <select
              value={humanizeOptions.genre}
              onChange={(e) => setHumanizeOptions({ ...humanizeOptions, genre: e.target.value })}
              className="input-field"
            >
              <option value="">请选择类型</option>
              {genres.map((genre) => (
                <option key={genre.id} value={genre.id}>
                  {genre.name} - {genre.description}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              启用风格优化
            </label>
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={humanizeOptions.enableStyleOptimization}
                onChange={(e) => setHumanizeOptions({ ...humanizeOptions, enableStyleOptimization: e.target.checked })}
                className="mr-2"
              />
              <span className="text-sm text-gray-600">应用风格优化，提升文本自然度</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              保留短语
            </label>
            <div className="flex space-x-2 mb-2">
              <input
                type="text"
                value={preservePhraseInput}
                onChange={(e) => setPreservePhraseInput(e.target.value)}
                placeholder="输入要保留的短语"
                className="input-field flex-1"
              />
              <button
                onClick={handleAddPreservePhrase}
                className="btn-primary whitespace-nowrap"
              >
                添加
              </button>
            </div>
            {humanizeOptions.preservePhrases.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {humanizeOptions.preservePhrases.map((phrase, index) => (
                  <span key={index} className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">
                    {phrase}
                    <button
                      onClick={() => handleRemovePreservePhrase(phrase)}
                      className="ml-1 text-gray-500 hover:text-gray-700"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              目标读者
            </label>
            <select
              value={humanizeOptions.targetAudience}
              onChange={(e) => setHumanizeOptions({ ...humanizeOptions, targetAudience: e.target.value as 'young' | 'adult' | 'general' })}
              className="input-field"
            >
              <option value="general">一般读者</option>
              <option value="young">年轻读者</option>
              <option value="adult">成年读者</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              处理模式
            </label>
            <select
              value={humanizeOptions.mode}
              onChange={(e) => setHumanizeOptions({ ...humanizeOptions, mode: e.target.value as 'rewrite' | 'optimize' | 'full' })}
              className="input-field"
            >
              <option value="full">完整处理（改写+优化）</option>
              <option value="rewrite">仅改写</option>
              <option value="optimize">仅优化</option>
            </select>
          </div>

          <div className="flex justify-end space-x-2">
            <button
              onClick={() => setShowHumanizeModal(false)}
              className="btn-outline"
            >
              取消
            </button>
            <button
              onClick={handleHumanize}
              disabled={isProcessing}
              className="btn-primary"
            >
              {isProcessing ? '处理中...' : '开始润色'}
            </button>
          </div>
        </div>
      </Modal>

      {/* 保存版本模态框 */}
      <Modal
        isOpen={showVersionCreateModal}
        onClose={() => setShowVersionCreateModal(false)}
        title="保存版本"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              版本描述
            </label>
            <input
              type="text"
              value={versionDescription}
              onChange={(e) => setVersionDescription(e.target.value)}
              placeholder="描述此版本的变更（可选）"
              className="input-field"
            />
          </div>

          <div className="flex justify-end space-x-2">
            <button
              onClick={() => setShowVersionCreateModal(false)}
              className="btn-outline"
            >
              取消
            </button>
            <button
              onClick={handleCreateVersion}
              className="btn-primary"
            >
              保存版本
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
