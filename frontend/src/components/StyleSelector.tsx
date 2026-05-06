import { useState, useEffect, useCallback } from 'react'
import { getStyles, getStyleTemplates, getStyleConfigOptions, previewStyleConfig } from '../services/api'
import Loading from './Loading'
import toast from 'react-hot-toast'
import type { StyleConfig, NovelGenre } from '@shared/types'

interface Style {
  id: string
  name: string
  description?: string
  config: StyleConfig
  isDefault?: boolean
}

interface StyleTemplate {
  id: string
  name: string
  description?: string
  genre?: NovelGenre
}

interface StyleConfigOptions {
  genres: Array<{ value: string; label: string; description?: string }>
  perspectives: Array<{ value: string; label: string; description?: string }>
  languages: Array<{ value: string; label: string; description?: string }>
  descriptions: Array<{ value: string; label: string; description?: string }>
  pacings: Array<{ value: string; label: string; description?: string }>
  dialogues: Array<{ value: string; label: string; description?: string }>
}

interface StyleSelectorProps {
  value?: string
  config?: StyleConfig
  onChange?: (styleId: string, config: StyleConfig) => void
  onConfigChange?: (config: StyleConfig) => void
  showPreview?: boolean
  className?: string
}

export default function StyleSelector({
  value,
  config,
  onChange,
  onConfigChange,
  showPreview = false,
  className = ''
}: StyleSelectorProps) {
  const [styles, setStyles] = useState<Style[]>([])
  const [templates, setTemplates] = useState<StyleTemplate[]>([])
  const [options, setOptions] = useState<StyleConfigOptions | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [activeTab, setActiveTab] = useState<'preset' | 'custom'>('preset')
  const [selectedStyleId, setSelectedStyleId] = useState<string>(value || '')
  const [currentConfig, setCurrentConfig] = useState<StyleConfig>(
    config || {
      genre: 'general',
      perspective: 'third_person',
      language: 'modern',
      description: 'vivid',
      pacing: 'moderate',
      dialogue: 'natural'
    }
  )
  const [preview, setPreview] = useState<string>('')
  const [previewLoading, setPreviewLoading] = useState(false)

  // 加载数据函数
  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      
      const [stylesRes, templatesRes, optionsRes] = await Promise.all([
        getStyles(),
        getStyleTemplates(),
        getStyleConfigOptions()
      ])
      
      setStyles(stylesRes?.items || [])
      setTemplates(templatesRes?.items || [])
      setOptions(optionsRes || null)
      
      // 如果有选中的风格，加载其配置
      if (value) {
        const selectedStyle = stylesRes?.items?.find(s => s.id === value)
        if (selectedStyle) {
          setCurrentConfig(selectedStyle.config)
          setSelectedStyleId(value)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载风格配置失败')
    } finally {
      setLoading(false)
    }
  }, [value])

  // 加载数据
  useEffect(() => {
    loadData()
  }, [loadData])

  // 同步外部 value
  useEffect(() => {
    if (value) {
      setSelectedStyleId(value)
    }
  }, [value])

  // 同步外部 config
  useEffect(() => {
    if (config) {
      setCurrentConfig(config)
    }
  }, [config])

  // 处理风格选择
  const handleStyleSelect = (style: Style) => {
    setSelectedStyleId(style.id)
    setCurrentConfig(style.config)
    onChange?.(style.id, style.config)
  }

  // 处理模板选择
  const handleTemplateSelect = (template: StyleTemplate) => {
    // 从模板创建新风格配置
    const newConfig: StyleConfig = {
      genre: template.genre || 'general',
      perspective: 'third_person',
      language: 'modern',
      description: 'vivid',
      pacing: 'moderate',
      dialogue: 'natural'
    }
    setCurrentConfig(newConfig)
    setSelectedStyleId('')
    onConfigChange?.(newConfig)
  }

  // 处理配置变更
  const handleConfigUpdate = (key: keyof StyleConfig, value: string) => {
    const newConfig = { ...currentConfig, [key]: value }
    setCurrentConfig(newConfig)
    setSelectedStyleId('')
    onConfigChange?.(newConfig)
  }

  // 生成预览
  const generatePreview = useCallback(async () => {
    if (!showPreview) return
    
    try {
      setPreviewLoading(true)
      console.log('开始生成预览，配置:', currentConfig)
      const result = await previewStyleConfig(currentConfig)
      console.log('预览生成成功:', result)
      setPreview(result?.promptPreview || '')
    } catch (err) {
      console.error('预览生成失败:', err)
      console.error('错误详情:', err instanceof Error ? err.message : err)
      toast.error(`预览生成失败: ${err instanceof Error ? err.message : '未知错误'}`)
    } finally {
      setPreviewLoading(false)
    }
  }, [showPreview, currentConfig])

  // 配置变更时生成预览
  useEffect(() => {
    if (showPreview && currentConfig) {
      generatePreview()
    }
  }, [currentConfig, showPreview, generatePreview])

  if (loading) {
    return <Loading message="加载风格配置..." />
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600">{error}</p>
        <button
          type="button"
          onClick={loadData}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          重试
        </button>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 标签切换 */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        <button
          type="button"
          onClick={() => setActiveTab('preset')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'preset'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          预设风格
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('custom')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'custom'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          自定义配置
        </button>
      </div>

      {/* 预设风格 */}
      {activeTab === 'preset' && (
        <div className="space-y-4">
          {/* 已保存的风格 */}
          {styles.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">我的风格</h4>
              <div className="grid grid-cols-2 gap-2">
                {styles.map(style => (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => handleStyleSelect(style)}
                    className={`p-3 text-left rounded-lg border transition-all ${
                      selectedStyleId === style.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="font-medium text-sm">{style.name}</div>
                    {style.description && (
                      <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                        {style.description}
                      </div>
                    )}
                    {style.isDefault && (
                      <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                        默认
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 风格模板 */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">风格模板</h4>
            <div className="grid grid-cols-2 gap-2">
              {templates.map(template => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => handleTemplateSelect(template)}
                  className="p-3 text-left rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-gray-50 transition-all"
                >
                  <div className="font-medium text-sm">{template.name}</div>
                  <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                    {template.description}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 自定义配置 */}
      {activeTab === 'custom' && options && (
        <div className="space-y-6">
          {/* 小说类型 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              小说类型
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {options.genres.map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleConfigUpdate('genre', option.value)}
                  className={`p-3 text-left rounded-lg border transition-all ${
                    currentConfig.genre === option.value
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="font-medium text-sm">{option.label}</div>
                  {option.description && (
                    <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                      {option.description}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* 叙事视角 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              叙事视角
            </label>
            <div className="grid grid-cols-2 gap-2">
              {options.perspectives.map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleConfigUpdate('perspective', option.value)}
                  className={`p-3 text-left rounded-lg border transition-all ${
                    currentConfig.perspective === option.value
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="font-medium text-sm">{option.label}</div>
                  {option.description && (
                    <div className="text-xs text-gray-500 mt-1">
                      {option.description}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* 语言风格 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              语言风格
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {options.languages.map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleConfigUpdate('language', option.value)}
                  className={`p-3 text-left rounded-lg border transition-all ${
                    currentConfig.language === option.value
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="font-medium text-sm">{option.label}</div>
                  {option.description && (
                    <div className="text-xs text-gray-500 mt-1">
                      {option.description}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* 描写风格 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              描写风格
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {options.descriptions.map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleConfigUpdate('description', option.value)}
                  className={`p-3 text-left rounded-lg border transition-all ${
                    currentConfig.description === option.value
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="font-medium text-sm">{option.label}</div>
                  {option.description && (
                    <div className="text-xs text-gray-500 mt-1">
                      {option.description}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* 节奏风格 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              节奏风格
            </label>
            <div className="grid grid-cols-2 gap-2">
              {options.pacings.map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleConfigUpdate('pacing', option.value)}
                  className={`p-3 text-left rounded-lg border transition-all ${
                    currentConfig.pacing === option.value
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="font-medium text-sm">{option.label}</div>
                  {option.description && (
                    <div className="text-xs text-gray-500 mt-1">
                      {option.description}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* 对话风格 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              对话风格
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {options.dialogues.map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleConfigUpdate('dialogue', option.value)}
                  className={`p-3 text-left rounded-lg border transition-all ${
                    currentConfig.dialogue === option.value
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="font-medium text-sm">{option.label}</div>
                  {option.description && (
                    <div className="text-xs text-gray-500 mt-1">
                      {option.description}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 预览 */}
      {showPreview && preview && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 mb-2">风格预览</h4>
          {previewLoading ? (
            <div className="text-sm text-gray-500">生成预览中...</div>
          ) : (
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{preview}</p>
          )}
        </div>
      )}
    </div>
  )
}
