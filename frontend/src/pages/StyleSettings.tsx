import { useState, useEffect, useCallback } from 'react'
import type {
  Style,
  StyleTemplate,
  StyleConfig,
  StyleConfigOptions,
  CreateStyleRequest,
  NovelGenre,
  NarrativePerspective,
  LanguageStyle,
  DescriptionStyle,
  PacingStyle,
  DialogueStyle
} from '@shared/types'
import {
  getStyles,
  getStyleTemplates,
  getStyleConfigOptions,
  createStyle,
  updateStyle,
  deleteStyle,
  createStyleFromTemplate,
  setDefaultStyle,
  previewStyleConfig
} from '../services/api'
import Loading from '../components/Loading'
import Modal from '../components/Modal'

export default function StyleSettings() {

  // 状态
  const [styles, setStyles] = useState<Style[]>([])
  const [templates, setTemplates] = useState<StyleTemplate[]>([])
  const [options, setOptions] = useState<StyleConfigOptions | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')

  // 模态框状态
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [selectedStyle, setSelectedStyle] = useState<Style | null>(null)

  // 表单状态
  const [formData, setFormData] = useState<{
    name: string
    description: string
    config: StyleConfig
  }>({
    name: '',
    description: '',
    config: {
      genre: 'general',
      perspective: 'third_person',
      language: 'modern',
      description: 'vivid',
      pacing: 'moderate',
      dialogue: 'natural'
    }
  })
  const [previewPrompt, setPreviewPrompt] = useState<string>('')
  const [saving, setSaving] = useState(false)

  // 加载数据
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      setError('')

      const [stylesRes, templatesRes, optionsRes] = await Promise.all([
        getStyles(),
        getStyleTemplates(),
        getStyleConfigOptions()
      ])

      setStyles(stylesRes.items)
      setTemplates(templatesRes.items)
      setOptions(optionsRes)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载数据失败')
    } finally {
      setLoading(false)
    }
  }

  // 更新预览
  const updatePreview = useCallback(async (config: StyleConfig) => {
    try {
      const result = await previewStyleConfig(config)
      setPreviewPrompt(result.promptPreview)
    } catch (err) {
      console.error('预览生成失败:', err)
    }
  }, [])

  // 防抖更新预览
  useEffect(() => {
    const timer = setTimeout(() => {
      updatePreview(formData.config)
    }, 500)

    return () => clearTimeout(timer)
  }, [formData.config, updatePreview])

  // 处理创建风格
  const handleCreate = async () => {
    if (!formData.name.trim()) {
      setError('风格名称不能为空')
      return
    }

    try {
      setSaving(true)
      const request: CreateStyleRequest = {
        name: formData.name,
        description: formData.description,
        config: formData.config
      }

      await createStyle(request)
      setShowCreateModal(false)
      resetForm()
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建风格失败')
    } finally {
      setSaving(false)
    }
  }

  // 处理更新风格
  const handleUpdate = async () => {
    if (!selectedStyle) return
    if (!formData.name.trim()) {
      setError('风格名称不能为空')
      return
    }

    try {
      setSaving(true)
      await updateStyle(selectedStyle.id, {
        name: formData.name,
        description: formData.description,
        config: formData.config
      })
      setShowEditModal(false)
      setSelectedStyle(null)
      resetForm()
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新风格失败')
    } finally {
      setSaving(false)
    }
  }

  // 处理删除风格
  const handleDelete = async () => {
    if (!selectedStyle) return

    try {
      setSaving(true)
      await deleteStyle(selectedStyle.id)
      setShowDeleteModal(false)
      setSelectedStyle(null)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除风格失败')
    } finally {
      setSaving(false)
    }
  }

  // 处理从模板创建
  const handleCreateFromTemplate = async (template: StyleTemplate) => {
    try {
      setSaving(true)
      await createStyleFromTemplate(template.id, `${template.name} (自定义)`)
      setShowTemplateModal(false)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : '从模板创建失败')
    } finally {
      setSaving(false)
    }
  }

  // 处理设置默认风格
  const handleSetDefault = async (style: Style) => {
    try {
      await setDefaultStyle(style.id)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : '设置默认风格失败')
    }
  }

  // 打开编辑模态框
  const openEditModal = (style: Style) => {
    setSelectedStyle(style)
    setFormData({
      name: style.name,
      description: style.description || '',
      config: style.config
    })
    setShowEditModal(true)
  }

  // 打开删除模态框
  const openDeleteModal = (style: Style) => {
    setSelectedStyle(style)
    setShowDeleteModal(true)
  }

  // 打开创建模态框
  const openCreateModal = () => {
    resetForm()
    setShowCreateModal(true)
  }

  // 重置表单
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      config: {
        genre: 'general',
        perspective: 'third_person',
        language: 'modern',
        description: 'vivid',
        pacing: 'moderate',
        dialogue: 'natural'
      }
    })
    setPreviewPrompt('')
    setError('')
  }

  // 处理配置变更
  const handleConfigChange = <K extends keyof StyleConfig>(
    key: K,
    value: StyleConfig[K]
  ) => {
    setFormData(prev => ({
      ...prev,
      config: { ...prev.config, [key]: value }
    }))
  }

  // 获取选项标签
  const getOptionLabel = (
    options: { value: string; label: string }[],
    value: string
  ): string => {
    return options.find(o => o.value === value)?.label || value
  }

  if (loading) {
    return <Loading message="加载风格设置..." />
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">风格设置</h1>
          <p className="mt-2 text-gray-600">管理小说生成风格，创建自定义风格模板</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowTemplateModal(true)}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            从模板创建
          </button>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            创建风格
          </button>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600">{error}</p>
          <button
            onClick={() => setError('')}
            className="mt-2 text-sm text-red-600 hover:text-red-800"
          >
            清除错误
          </button>
        </div>
      )}

      {/* 风格列表 */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">我的风格</h2>
        </div>

        {styles.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">暂无自定义风格</p>
            <button
              onClick={openCreateModal}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              创建第一个风格
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {styles.map(style => (
              <div
                key={style.id}
                className="px-6 py-4 flex items-center justify-between hover:bg-gray-50"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-medium text-gray-900">{style.name}</h3>
                    {style.isDefault && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                        默认
                      </span>
                    )}
                    {style.isCustom ? (
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                        自定义
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full">
                        系统
                      </span>
                    )}
                  </div>
                  {style.description && (
                    <p className="mt-1 text-sm text-gray-500">{style.description}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                      {getOptionLabel(options?.genres || [], style.config.genre)}
                    </span>
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                      {getOptionLabel(options?.perspectives || [], style.config.perspective)}
                    </span>
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                      {getOptionLabel(options?.languages || [], style.config.language)}
                    </span>
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                      {getOptionLabel(options?.descriptions || [], style.config.description)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  {!style.isDefault && (
                    <button
                      onClick={() => handleSetDefault(style)}
                      className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    >
                      设为默认
                    </button>
                  )}
                  {style.isCustom && (
                    <>
                      <button
                        onClick={() => openEditModal(style)}
                        className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded transition-colors"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => openDeleteModal(style)}
                        className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        删除
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 风格模板预览 */}
      <div className="mt-8 bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">风格模板</h2>
          <p className="text-sm text-gray-500 mt-1">基于模板快速创建自定义风格</p>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map(template => (
            <div
              key={template.id}
              className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all"
            >
              <h3 className="font-medium text-gray-900">{template.name}</h3>
              <p className="text-sm text-gray-500 mt-1">{template.description}</p>
              <div className="mt-3 flex flex-wrap gap-1">
                <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded">
                  {getOptionLabel(options?.genres || [], template.config.genre)}
                </span>
              </div>
              <button
                onClick={() => handleCreateFromTemplate(template)}
                disabled={saving}
                className="mt-3 w-full px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                使用此模板
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 创建风格模态框 */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="创建风格"
        size="xl"
      >
        <StyleForm
          formData={formData}
          options={options}
          previewPrompt={previewPrompt}
          saving={saving}
          onChange={setFormData}
          onConfigChange={handleConfigChange}
          onSubmit={handleCreate}
          onCancel={() => setShowCreateModal(false)}
          submitText="创建"
        />
      </Modal>

      {/* 编辑风格模态框 */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="编辑风格"
        size="xl"
      >
        <StyleForm
          formData={formData}
          options={options}
          previewPrompt={previewPrompt}
          saving={saving}
          onChange={setFormData}
          onConfigChange={handleConfigChange}
          onSubmit={handleUpdate}
          onCancel={() => setShowEditModal(false)}
          submitText="保存"
        />
      </Modal>

      {/* 删除确认模态框 */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="删除风格"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            确定要删除风格 <strong>{selectedStyle?.name}</strong> 吗？
          </p>
          <p className="text-sm text-gray-500">此操作不可撤销。</p>
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setShowDeleteModal(false)}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleDelete}
              disabled={saving}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {saving ? '删除中...' : '删除'}
            </button>
          </div>
        </div>
      </Modal>

      {/* 模板选择模态框 */}
      <Modal
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        title="选择风格模板"
        size="xl"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
          {templates.map(template => (
            <div
              key={template.id}
              className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 cursor-pointer transition-all"
              onClick={() => handleCreateFromTemplate(template)}
            >
              <h3 className="font-medium text-gray-900">{template.name}</h3>
              <p className="text-sm text-gray-500 mt-1">{template.description}</p>
              <div className="mt-2 text-xs text-gray-400">
                {getOptionLabel(options?.genres || [], template.config.genre)} ·
                {getOptionLabel(options?.perspectives || [], template.config.perspective)} ·
                {getOptionLabel(options?.languages || [], template.config.language)}
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  )
}

// 风格表单组件
interface StyleFormProps {
  formData: {
    name: string
    description: string
    config: StyleConfig
  }
  options: StyleConfigOptions | null
  previewPrompt: string
  saving: boolean
  onChange: (data: { name: string; description: string; config: StyleConfig }) => void
  onConfigChange: <K extends keyof StyleConfig>(key: K, value: StyleConfig[K]) => void
  onSubmit: () => void
  onCancel: () => void
  submitText: string
}

function StyleForm({
  formData,
  options,
  previewPrompt,
  saving,
  onChange,
  onConfigChange,
  onSubmit,
  onCancel,
  submitText
}: StyleFormProps) {
  if (!options) return null

  return (
    <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
      {/* 基本信息 */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            风格名称 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={e => onChange({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="输入风格名称"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            描述
          </label>
          <textarea
            value={formData.description}
            onChange={e => onChange({ ...formData, description: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows={2}
            placeholder="输入风格描述（可选）"
          />
        </div>
      </div>

      {/* 风格配置 */}
      <div className="border-t pt-4">
        <h4 className="text-sm font-medium text-gray-900 mb-4">风格配置</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 小说类型 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              小说类型
            </label>
            <select
              value={formData.config.genre}
              onChange={e => onConfigChange('genre', e.target.value as NovelGenre)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {options.genres.map(genre => (
                <option key={genre.value} value={genre.value}>
                  {genre.label}
                </option>
              ))}
            </select>
          </div>

          {/* 叙事视角 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              叙事视角
            </label>
            <select
              value={formData.config.perspective}
              onChange={e =>
                onConfigChange('perspective', e.target.value as NarrativePerspective)
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {options.perspectives.map(perspective => (
                <option key={perspective.value} value={perspective.value}>
                  {perspective.label}
                </option>
              ))}
            </select>
          </div>

          {/* 语言风格 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              语言风格
            </label>
            <select
              value={formData.config.language}
              onChange={e =>
                onConfigChange('language', e.target.value as LanguageStyle)
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {options.languages.map(language => (
                <option key={language.value} value={language.value}>
                  {language.label}
                </option>
              ))}
            </select>
          </div>

          {/* 描写风格 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              描写风格
            </label>
            <select
              value={formData.config.description}
              onChange={e =>
                onConfigChange('description', e.target.value as DescriptionStyle)
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {options.descriptions.map(description => (
                <option key={description.value} value={description.value}>
                  {description.label}
                </option>
              ))}
            </select>
          </div>

          {/* 节奏风格 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              节奏风格
            </label>
            <select
              value={formData.config.pacing}
              onChange={e =>
                onConfigChange('pacing', e.target.value as PacingStyle)
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {options.pacings.map(pacing => (
                <option key={pacing.value} value={pacing.value}>
                  {pacing.label}
                </option>
              ))}
            </select>
          </div>

          {/* 对话风格 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              对话风格
            </label>
            <select
              value={formData.config.dialogue}
              onChange={e =>
                onConfigChange('dialogue', e.target.value as DialogueStyle)
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {options.dialogues.map(dialogue => (
                <option key={dialogue.value} value={dialogue.value}>
                  {dialogue.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 预览 */}
      <div className="border-t pt-4">
        <h4 className="text-sm font-medium text-gray-900 mb-2">提示词预览</h4>
        <div className="p-3 bg-gray-50 rounded-lg max-h-40 overflow-y-auto">
          <pre className="text-xs text-gray-700 whitespace-pre-wrap">
            {previewPrompt || '配置风格以查看预览'}
          </pre>
        </div>
      </div>

      {/* 按钮 */}
      <div className="flex justify-end space-x-3 pt-4 border-t">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          取消
        </button>
        <button
          onClick={onSubmit}
          disabled={saving || !formData.name.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {saving ? '保存中...' : submitText}
        </button>
      </div>
    </div>
  )
}
