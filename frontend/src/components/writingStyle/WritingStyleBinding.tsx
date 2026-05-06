/**
 * 写法绑定组件
 *
 * 支持将写法资产绑定到小说项目、章节等
 */

import React, { useState, useEffect } from 'react'
import { useWritingStyleStore } from '../../stores/writingStyleStore'
import type {
  WritingStyleAsset,
  WritingStyleBinding as WritingStyleBindingType,
  BindingTargetType,
  CreateWritingStyleBindingRequest,
} from '@shared/types'

interface WritingStyleBindingProps {
  targetType: BindingTargetType
  targetId: string
  targetName?: string
  onBindingChange?: (bindings: WritingStyleBindingType[]) => void
}

export const WritingStyleBinding: React.FC<WritingStyleBindingProps> = ({
  targetType,
  targetId,
  targetName,
  onBindingChange,
}) => {
  const [selectedStyleId, setSelectedStyleId] = useState<string>('')
  const [intensity, setIntensity] = useState<'light' | 'medium' | 'strong'>('medium')
  const [customAdjustments, setCustomAdjustments] = useState('')

  const {
    assets,
    fetchAssets,
    fetchBindings,
    createBinding,
    deleteBinding,
    updateBindingConfig,
    getBindingsByTarget,
    isLoading,
  } = useWritingStyleStore()

  // 加载数据
  useEffect(() => {
    fetchAssets()
    fetchBindings(targetType, targetId)
  }, [fetchAssets, fetchBindings, targetType, targetId])

  // 获取当前目标的绑定
  const currentBindings = getBindingsByTarget(targetType, targetId)

  // 通知绑定变化
  useEffect(() => {
    onBindingChange?.(currentBindings)
  }, [currentBindings, onBindingChange])

  // 创建新绑定
  const handleCreateBinding = async () => {
    if (!selectedStyleId) {
      alert('请选择写法资产')
      return
    }

    // 检查是否已绑定
    if (currentBindings.some((b) => b.writingStyleId === selectedStyleId)) {
      alert('该写法资产已绑定')
      return
    }

    try {
      const request: CreateWritingStyleBindingRequest = {
        writingStyleId: selectedStyleId,
        targetType,
        targetId,
        config: {
          intensity,
          customAdjustments: customAdjustments || undefined,
        },
      }

      await createBinding(request)
      setSelectedStyleId('')
      setCustomAdjustments('')
    } catch (error) {
      console.error('创建绑定失败:', error)
    }
  }

  // 删除绑定
  const handleDeleteBinding = async (bindingId: string) => {
    if (!window.confirm('确定要解除此绑定吗？')) return

    try {
      await deleteBinding(bindingId)
    } catch (error) {
      console.error('删除绑定失败:', error)
    }
  }

  // 更新绑定强度
  const handleUpdateIntensity = async (bindingId: string, newIntensity: 'light' | 'medium' | 'strong') => {
    try {
      await updateBindingConfig(bindingId, { intensity: newIntensity })
    } catch (error) {
      console.error('更新绑定配置失败:', error)
    }
  }

  // 获取写法资产信息
  const getAssetById = (id: string): WritingStyleAsset | undefined => {
    return assets.find((a) => a.id === id)
  }

  // 获取目标类型显示名称
  const getTargetTypeLabel = (type: BindingTargetType) => {
    const labels: Record<BindingTargetType, string> = {
      novel: '小说项目',
      chapter: '章节',
      volume: '卷',
    }
    return labels[type]
  }

  return (
    <div className="writing-style-binding">
      {/* 当前绑定列表 */}
      <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            已绑定的写法资产
            {targetName && <span className="text-gray-600 font-normal ml-2">- {targetName}</span>}
          </h2>
          <span className="text-sm text-gray-500">
            {currentBindings.length} 个绑定
          </span>
        </div>

        {currentBindings.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>暂无绑定的写法资产</p>
            <p className="text-sm mt-2">请在下方选择写法资产进行绑定</p>
          </div>
        ) : (
          <div className="space-y-3">
            {currentBindings.map((binding) => {
              const asset = getAssetById(binding.writingStyleId)
              if (!asset) return null

              return (
                <div
                  key={binding.id}
                  className="border rounded-lg p-4 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-medium text-gray-900">{asset.name}</h3>
                        {asset.isDefault && (
                          <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                            默认
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{asset.description}</p>

                      {/* 强度选择 */}
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-600">应用强度:</span>
                        <div className="flex gap-2">
                          {(['light', 'medium', 'strong'] as const).map((level) => (
                            <button
                              key={level}
                              onClick={() => handleUpdateIntensity(binding.id, level)}
                              className={`px-3 py-1 text-sm rounded ${
                                binding.config.intensity === level
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              {level === 'light' ? '轻度' : level === 'medium' ? '中度' : '强度'}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 自定义调整 */}
                      {binding.config.customAdjustments && (
                        <div className="mt-3">
                          <p className="text-xs text-gray-500 mb-1">自定义调整:</p>
                          <p className="text-sm text-gray-700">
                            {binding.config.customAdjustments}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* 删除按钮 */}
                    <button
                      onClick={() => handleDeleteBinding(binding.id)}
                      className="text-red-600 hover:text-red-800 ml-4"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 添加新绑定 */}
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">添加写法绑定</h2>

        {/* 选择写法资产 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            选择写法资产
          </label>
          <select
            value={selectedStyleId}
            onChange={(e) => setSelectedStyleId(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">请选择写法资产</option>
            {assets.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.name}
                {asset.isDefault ? ' (默认)' : ''}
                {' - '}
                {asset.description.substring(0, 50)}
                {asset.description.length > 50 ? '...' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* 应用强度 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            应用强度
          </label>
          <div className="flex gap-2">
            {(['light', 'medium', 'strong'] as const).map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setIntensity(level)}
                className={`flex-1 px-4 py-2 text-sm rounded-lg ${
                  intensity === level
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {level === 'light' ? '轻度' : level === 'medium' ? '中度' : '强度'}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-gray-500">
            {intensity === 'light'
              ? '轻度：仅应用部分特征，保持原文风格'
              : intensity === 'medium'
              ? '中度：平衡应用特征，适度调整风格'
              : '强度：全面应用特征，显著改变风格'}
          </p>
        </div>

        {/* 自定义调整 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            自定义调整（可选）
          </label>
          <textarea
            value={customAdjustments}
            onChange={(e) => setCustomAdjustments(e.target.value)}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="描述如何调整写法应用，例如：'更注重情感表达，减少华丽辞藻'"
          />
        </div>

        {/* 绑定按钮 */}
        <button
          onClick={handleCreateBinding}
          disabled={isLoading || !selectedStyleId}
          className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? '处理中...' : '绑定写法资产'}
        </button>
      </div>

      {/* 提示信息 */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-2">提示</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• 可以为同一个{getTargetTypeLabel(targetType)}绑定多个写法资产</li>
          <li>• 写法资产将按照绑定顺序依次应用</li>
          <li>• 应用强度决定了写法特征的影响程度</li>
          <li>• 可以通过自定义调整来微调写法应用效果</li>
        </ul>
      </div>
    </div>
  )
}
