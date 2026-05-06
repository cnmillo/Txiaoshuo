/**
 * 写法资产表单组件
 *
 * 用于创建和编辑写法资产
 */

import React, { useState, useEffect } from 'react'
import { useWritingStyleStore } from '../../stores/writingStyleStore'
import type {
  WritingStyleAsset,
  CreateWritingStyleRequest,
  UpdateWritingStyleRequest,
} from '@shared/types'

interface WritingStyleFormProps {
  asset?: WritingStyleAsset | null // 如果提供，则为编辑模式
  onSave?: (asset: WritingStyleAsset) => void
  onCancel?: () => void
}

export const WritingStyleForm: React.FC<WritingStyleFormProps> = ({
  asset,
  onSave,
  onCancel,
}) => {
  const isEditMode = !!asset

  const [formData, setFormData] = useState<CreateWritingStyleRequest>({
    name: '',
    description: '',
    styleTags: [],
    applicableScenes: [],
    featurePool: [],
    referenceText: '',
    sampleText: '',
    promptTemplate: '',
  })

  const [newTag, setNewTag] = useState('')
  const [newScene, setNewScene] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { createAsset, updateAsset, isLoading } = useWritingStyleStore()

  // 初始化表单数据
  useEffect(() => {
    if (asset) {
      setFormData({
        name: asset.name,
        description: asset.description,
        styleTags: asset.styleTags,
        applicableScenes: asset.applicableScenes,
        featurePool: asset.featurePool,
        referenceText: asset.referenceText,
        sampleText: asset.sampleText,
        promptTemplate: asset.promptTemplate,
      })
    }
  }, [asset])

  // 验证表单
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = '名称不能为空'
    }

    if (!formData.description.trim()) {
      newErrors.description = '描述不能为空'
    }

    if (formData.styleTags.length === 0) {
      newErrors.styleTags = '至少需要一个风格标签'
    }

    if (formData.applicableScenes.length === 0) {
      newErrors.applicableScenes = '至少需要一个适用场景'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // 提交表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    try {
      let savedAsset: WritingStyleAsset

      if (isEditMode && asset) {
        savedAsset = await updateAsset(asset.id, formData as UpdateWritingStyleRequest)
      } else {
        savedAsset = await createAsset(formData)
      }

      onSave?.(savedAsset)
    } catch (error) {
      console.error('保存失败:', error)
    }
  }

  // 添加标签
  const handleAddTag = () => {
    if (newTag.trim() && !formData.styleTags.includes(newTag.trim())) {
      setFormData({
        ...formData,
        styleTags: [...formData.styleTags, newTag.trim()],
      })
      setNewTag('')
    }
  }

  // 移除标签
  const handleRemoveTag = (tag: string) => {
    setFormData({
      ...formData,
      styleTags: formData.styleTags.filter((t) => t !== tag),
    })
  }

  // 添加场景
  const handleAddScene = () => {
    if (newScene.trim() && !formData.applicableScenes.includes(newScene.trim())) {
      setFormData({
        ...formData,
        applicableScenes: [...formData.applicableScenes, newScene.trim()],
      })
      setNewScene('')
    }
  }

  // 移除场景
  const handleRemoveScene = (scene: string) => {
    setFormData({
      ...formData,
      applicableScenes: formData.applicableScenes.filter((s) => s !== scene),
    })
  }

  // 移除特征
  const handleRemoveFeature = (index: number) => {
    setFormData({
      ...formData,
      featurePool: formData.featurePool?.filter((_, i) => i !== index) || [],
    })
  }

  return (
    <form onSubmit={handleSubmit} className="writing-style-form space-y-6">
      {/* 基本信息 */}
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">基本信息</h2>

        {/* 名称 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            名称 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
              errors.name ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="输入写法资产名称"
          />
          {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
        </div>

        {/* 描述 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            描述 <span className="text-red-500">*</span>
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
              errors.description ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="描述这个写法资产的特点和用途"
          />
          {errors.description && <p className="mt-1 text-sm text-red-500">{errors.description}</p>}
        </div>

        {/* 风格标签 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            风格标签 <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
              className={`flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                errors.styleTags ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="输入标签后按回车添加"
            />
            <button
              type="button"
              onClick={handleAddTag}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              添加
            </button>
          </div>
          {formData.styleTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {formData.styleTags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          {errors.styleTags && <p className="mt-1 text-sm text-red-500">{errors.styleTags}</p>}
        </div>

        {/* 适用场景 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            适用场景 <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={newScene}
              onChange={(e) => setNewScene(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddScene())}
              className={`flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                errors.applicableScenes ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="输入场景后按回车添加"
            />
            <button
              type="button"
              onClick={handleAddScene}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              添加
            </button>
          </div>
          {formData.applicableScenes.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {formData.applicableScenes.map((scene) => (
                <span
                  key={scene}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full"
                >
                  {scene}
                  <button
                    type="button"
                    onClick={() => handleRemoveScene(scene)}
                    className="text-green-600 hover:text-green-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          {errors.applicableScenes && (
            <p className="mt-1 text-sm text-red-500">{errors.applicableScenes}</p>
          )}
        </div>
      </div>

      {/* 特征池 */}
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">特征池</h2>
        <p className="text-sm text-gray-600 mb-4">
          定义这个写法资产的特征，包括句式、用词、情感、节奏、视角等方面
        </p>

        {formData.featurePool && formData.featurePool.length > 0 ? (
          <div className="space-y-3">
            {formData.featurePool.map((feature, index) => (
              <div
                key={index}
                className="flex items-start justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                      {feature.type}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{feature.description}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveFeature(index)}
                  className="text-red-600 hover:text-red-800"
                >
                  删除
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">暂无特征，请添加特征或从参考文本中提取</p>
        )}
      </div>

      {/* 参考文本 */}
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">参考文本</h2>
        <p className="text-sm text-gray-600 mb-4">
          提供参考文本可以用于特征提取或作为示例
        </p>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            参考文本
          </label>
          <textarea
            value={formData.referenceText}
            onChange={(e) => setFormData({ ...formData, referenceText: e.target.value })}
            rows={6}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="粘贴参考文本，可以用于特征提取"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            示例文本
          </label>
          <textarea
            value={formData.sampleText}
            onChange={(e) => setFormData({ ...formData, sampleText: e.target.value })}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="展示这个写法风格的示例文本"
          />
        </div>
      </div>

      {/* 提示词模板 */}
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">提示词模板</h2>
        <p className="text-sm text-gray-600 mb-4">
          自定义提示词模板，用于生成文本时应用这个写法风格
        </p>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            提示词模板
          </label>
          <textarea
            value={formData.promptTemplate}
            onChange={(e) => setFormData({ ...formData, promptTemplate: e.target.value })}
            rows={6}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            placeholder="输入提示词模板，可以使用 {feature} 等变量"
          />
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex justify-end gap-4">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            取消
          </button>
        )}
        <button
          type="submit"
          disabled={isLoading}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? '保存中...' : isEditMode ? '更新' : '创建'}
        </button>
      </div>
    </form>
  )
}

export default WritingStyleForm
