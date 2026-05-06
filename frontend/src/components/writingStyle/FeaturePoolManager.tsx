/**
 * 特征池管理组件
 *
 * 管理写法特征池，支持启用/停用、权重调整、特征组合等
 */

import React, { useState } from 'react'
import { useWritingStyleStore, selectFeaturePool } from '../../stores/writingStyleStore'
import type { FeaturePoolItem, WritingStyleFeature } from '@shared/types'

interface FeaturePoolManagerProps {
  onApply?: (features: FeaturePoolItem[]) => void
}

export const FeaturePoolManager: React.FC<FeaturePoolManagerProps> = ({ onApply }) => {
  const [showCombinationModal, setShowCombinationModal] = useState(false)
  const [newCombinationName, setNewCombinationName] = useState('')
  const [newCombinationDescription, setNewCombinationDescription] = useState('')

  const {
    featureCombinations,
    toggleFeatureEnabled,
    setFeatureWeight,
    removeFromFeaturePool,
    clearFeaturePool,
    createFeatureCombination,
    deleteFeatureCombination,
    applyFeatureCombination,
    getEnabledFeatures,
  } = useWritingStyleStore()

  const pool = useWritingStyleStore(selectFeaturePool)

  // 创建特征组合
  const handleCreateCombination = () => {
    if (!newCombinationName.trim()) {
      alert('请输入组合名称')
      return
    }

    const enabledFeatures = getEnabledFeatures()
    if (enabledFeatures.length === 0) {
      alert('请至少启用一个特征')
      return
    }

    createFeatureCombination(
      newCombinationName,
      newCombinationDescription,
      enabledFeatures.map((item) => ({
        featureId: item.id,
        weight: item.weight,
      }))
    )

    setShowCombinationModal(false)
    setNewCombinationName('')
    setNewCombinationDescription('')
  }

  // 应用特征组合
  const handleApplyCombination = (combinationId: string) => {
    if (window.confirm('应用此组合将覆盖当前特征池的权重设置，确定继续吗？')) {
      applyFeatureCombination(combinationId)
    }
  }

  // 渲染特征图标
  const getFeatureIcon = (type: WritingStyleFeature['type']) => {
    const icons: Record<string, string> = {
      sentence: '📝',
      vocabulary: '📚',
      emotion: '💭',
      rhythm: '🎵',
      perspective: '👁️',
    }
    return icons[type] || '📄'
  }

  // 渲染特征颜色
  const getFeatureColor = (type: WritingStyleFeature['type']) => {
    const colors: Record<string, string> = {
      sentence: 'blue',
      vocabulary: 'purple',
      emotion: 'pink',
      rhythm: 'green',
      perspective: 'orange',
    }
    return colors[type] || 'gray'
  }

  return (
    <div className="feature-pool-manager">
      {/* 特征池 */}
      <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">特征池</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setShowCombinationModal(true)}
              disabled={getEnabledFeatures().length === 0}
              className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              创建组合
            </button>
            <button
              onClick={() => {
                if (window.confirm('确定要清空特征池吗？')) {
                  clearFeaturePool()
                }
              }}
              disabled={pool.length === 0}
              className="px-4 py-2 text-sm border border-red-300 text-red-700 rounded-lg hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              清空
            </button>
          </div>
        </div>

        {pool.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>特征池为空</p>
            <p className="text-sm mt-2">请从参考文本中提取特征或手动添加特征</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pool.map((item) => {
              const color = getFeatureColor(item.feature.type)
              return (
                <div
                  key={item.id}
                  className={`border rounded-lg p-4 ${
                    item.isEnabled ? 'bg-white' : 'bg-gray-50'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* 启用开关 */}
                    <input
                      type="checkbox"
                      checked={item.isEnabled}
                      onChange={() => toggleFeatureEnabled(item.id)}
                      className="mt-1 rounded border-gray-300"
                    />

                    {/* 特征信息 */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">{getFeatureIcon(item.feature.type)}</span>
                        <span
                          className={`px-2 py-1 text-xs font-medium bg-${color}-100 text-${color}-800 rounded`}
                        >
                          {item.feature.type}
                        </span>
                        <span
                          className={`px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded`}
                        >
                          {item.source}
                        </span>
                      </div>

                      <p className="text-sm text-gray-700 mb-3">
                        {item.feature.description}
                      </p>

                      {/* 权重调整 */}
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-600">权重:</span>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={item.weight}
                          onChange={(e) =>
                            setFeatureWeight(item.id, parseFloat(e.target.value))
                          }
                          disabled={!item.isEnabled}
                          className="flex-1"
                        />
                        <span className="text-sm text-gray-700 w-12 text-right">
                          {(item.weight * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>

                    {/* 删除按钮 */}
                    <button
                      onClick={() => removeFromFeaturePool(item.id)}
                      className="text-red-600 hover:text-red-800"
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

        {/* 应用按钮 */}
        {onApply && pool.length > 0 && (
          <div className="mt-6 pt-4 border-t">
            <button
              onClick={() => onApply(getEnabledFeatures())}
              disabled={getEnabledFeatures().length === 0}
              className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              应用选中的特征 ({getEnabledFeatures().length})
            </button>
          </div>
        )}
      </div>

      {/* 特征组合 */}
      {featureCombinations.length > 0 && (
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">特征组合</h2>
          <p className="text-sm text-gray-600 mb-4">
            已保存的特征组合，可以快速应用
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {featureCombinations.map((combination) => (
              <div
                key={combination.id}
                className="border rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium text-gray-900">{combination.name}</h3>
                  <button
                    onClick={() => deleteFeatureCombination(combination.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
                <p className="text-sm text-gray-600 mb-3">{combination.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    {combination.features.length} 个特征
                  </span>
                  <button
                    onClick={() => handleApplyCombination(combination.id)}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    应用
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 创建组合模态框 */}
      {showCombinationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">创建特征组合</h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                组合名称 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newCombinationName}
                onChange={(e) => setNewCombinationName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="输入组合名称"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                描述
              </label>
              <textarea
                value={newCombinationDescription}
                onChange={(e) => setNewCombinationDescription(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="描述这个特征组合的用途"
              />
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600">
                将保存 {getEnabledFeatures().length} 个启用的特征及其权重
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowCombinationModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleCreateCombination}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default FeaturePoolManager
