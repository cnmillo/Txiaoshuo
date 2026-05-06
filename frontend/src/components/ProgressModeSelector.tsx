/**
 * 三种推进方式选择组件
 * 
 * 提供三种推进方式选择：
 * 1. 按重要阶段审核
 * 2. 自动推进到可开写
 * 3. 继续自动执行前10章
 */

import React, { useState, useCallback } from 'react'
import {
  ProgressMode,
  type AutoProgressConfig,
  type StageReviewConfig,
} from '../types/directorMode'

interface ProgressModeSelectorProps {
  /** 选中的方案名称 */
  selectedCandidateName: string
  /** 是否正在加载 */
  isLoading?: boolean
  /** 选择推进方式回调 */
  onSelect: (mode: ProgressMode, config?: AutoProgressConfig) => void
  /** 返回修改回调 */
  onBack: () => void
}

/**
 * 推进方式选择组件
 */
const ProgressModeSelector: React.FC<ProgressModeSelectorProps> = ({
  selectedCandidateName,
  isLoading = false,
  onSelect,
  onBack,
}) => {
  const [selectedMode, setSelectedMode] = useState<ProgressMode | null>(null)
  const [stageReviewConfig, setStageReviewConfig] = useState<StageReviewConfig>({
    reviewStages: [
      {
        stageName: '故事宏观规划',
        reviewPoints: ['整本走向', '升级节点', '长线承诺'],
        required: true,
      },
      {
        stageName: '角色准备',
        reviewPoints: ['主角团', '关系网', '职责分配'],
        required: true,
      },
      {
        stageName: '卷战略',
        reviewPoints: ['分卷规划', '卷级使命', '卷尾钩子'],
        required: false,
      },
    ],
    pauseForConfirmation: true,
  })
  const [maxAutoChapters, setMaxAutoChapters] = useState(10)
  const [pauseAtKeyPoints, setPauseAtKeyPoints] = useState(true)

  // 选择推进方式
  const handleModeSelect = useCallback((mode: ProgressMode) => {
    setSelectedMode(mode)
  }, [])

  // 确认选择
  const handleConfirm = useCallback(() => {
    if (!selectedMode) return

    let config: AutoProgressConfig | undefined

    if (selectedMode === ProgressMode.STAGE_REVIEW) {
      config = {
        mode: selectedMode,
        stageReviewConfig,
        pauseAtKeyPoints,
      }
    } else if (selectedMode === ProgressMode.AUTO_FIRST_10_CHAPTERS) {
      config = {
        mode: selectedMode,
        maxAutoChapters,
        pauseAtKeyPoints,
      }
    } else {
      config = {
        mode: selectedMode,
        pauseAtKeyPoints,
      }
    }

    onSelect(selectedMode, config)
  }, [selectedMode, stageReviewConfig, maxAutoChapters, pauseAtKeyPoints, onSelect])

  // 切换审核阶段
  const toggleReviewStage = useCallback((index: number) => {
    setStageReviewConfig(prev => ({
      ...prev,
      reviewStages: prev.reviewStages.map((stage, i) =>
        i === index ? { ...stage, required: !stage.required } : stage
      ),
    }))
  }, [])

  // 推进方式配置
  const progressModes = [
    {
      mode: ProgressMode.STAGE_REVIEW,
      title: '按重要阶段审核',
      description: '在每个重要阶段暂停，让您审核并确认后再继续',
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
      color: 'blue',
      benefits: ['完全掌控每个阶段', '可随时调整方向', '适合新手创作者'],
    },
    {
      mode: ProgressMode.AUTO_TO_WRITABLE,
      title: '自动推进到可开写',
      description: '自动完成所有规划阶段，直到可以开始写作',
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      color: 'green',
      benefits: ['快速进入写作', '节省规划时间', '适合有经验的作者'],
    },
    {
      mode: ProgressMode.AUTO_FIRST_10_CHAPTERS,
      title: '自动执行前10章',
      description: '自动完成规划和前10章的内容生成',
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      color: 'purple',
      benefits: ['全自动创作流程', '快速产出内容', '适合快速验证创意'],
    },
  ]

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* 标题区域 */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          选择推进方式
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          您选择了方案：<span className="font-medium text-blue-600 dark:text-blue-400">{selectedCandidateName}</span>
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          请选择您希望的推进方式，AI 将根据您的选择自动执行相应的工作流
        </p>
      </div>

      {/* 推进方式选择 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {progressModes.map((mode) => {
          const isSelected = selectedMode === mode.mode
          const colorConfig = {
            blue: {
              border: isSelected ? 'border-blue-500' : 'border-gray-200 dark:border-gray-700',
              bg: isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-white dark:bg-gray-800',
              icon: isSelected ? 'text-blue-500' : 'text-gray-400',
              title: 'text-blue-900 dark:text-blue-100',
            },
            green: {
              border: isSelected ? 'border-green-500' : 'border-gray-200 dark:border-gray-700',
              bg: isSelected ? 'bg-green-50 dark:bg-green-900/20' : 'bg-white dark:bg-gray-800',
              icon: isSelected ? 'text-green-500' : 'text-gray-400',
              title: 'text-green-900 dark:text-green-100',
            },
            purple: {
              border: isSelected ? 'border-purple-500' : 'border-gray-200 dark:border-gray-700',
              bg: isSelected ? 'bg-purple-50 dark:bg-purple-900/20' : 'bg-white dark:bg-gray-800',
              icon: isSelected ? 'text-purple-500' : 'text-gray-400',
              title: 'text-purple-900 dark:text-purple-100',
            },
          }
          const colors = colorConfig[mode.color as keyof typeof colorConfig]

          return (
            <button
              key={mode.mode}
              onClick={() => handleModeSelect(mode.mode)}
              disabled={isLoading}
              className={`p-6 rounded-xl border-2 transition-all duration-200 text-left ${colors.border} ${colors.bg} hover:shadow-lg`}
            >
              <div className={`mb-4 ${colors.icon}`}>
                {mode.icon}
              </div>
              <h3 className={`text-lg font-bold mb-2 ${colors.title}`}>
                {mode.title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {mode.description}
              </p>
              <ul className="space-y-1">
                {mode.benefits.map((benefit, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <svg className="w-3 h-3 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {benefit}
                  </li>
                ))}
              </ul>
            </button>
          )
        })}
      </div>

      {/* 高级配置 */}
      {selectedMode && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 space-y-4">
          <h3 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            高级配置
          </h3>

          {/* 按阶段审核配置 */}
          {selectedMode === ProgressMode.STAGE_REVIEW && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                选择需要在审核时暂停的阶段：
              </p>
              <div className="space-y-2">
                {stageReviewConfig.reviewStages.map((stage, index) => (
                  <label
                    key={stage.stageName}
                    className="flex items-center justify-between p-3 bg-white dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600"
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={stage.required}
                        onChange={() => toggleReviewStage(index)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <div>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {stage.stageName}
                        </span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {stage.reviewPoints.map((point, i) => (
                            <span key={i} className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded">
                              {point}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded ${
                      stage.required
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                        : 'bg-gray-100 text-gray-500 dark:bg-gray-600 dark:text-gray-400'
                    }`}>
                      {stage.required ? '必审' : '可选'}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* 自动执行前10章配置 */}
          {selectedMode === ProgressMode.AUTO_FIRST_10_CHAPTERS && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  自动执行章节数
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="1"
                    max="30"
                    value={maxAutoChapters}
                    onChange={(e) => setMaxAutoChapters(Number(e.target.value))}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                  />
                  <span className="w-16 text-center font-medium text-gray-900 dark:text-white">
                    {maxAutoChapters} 章
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 通用配置 */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={pauseAtKeyPoints}
                onChange={(e) => setPauseAtKeyPoints(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <div>
                <span className="font-medium text-gray-900 dark:text-white">
                  在关键节点暂停
                </span>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  在重要的创作节点暂停，让您可以查看和调整
                </p>
              </div>
            </label>
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex items-center justify-between pt-4">
        <button
          onClick={onBack}
          disabled={isLoading}
          className="px-6 py-3 rounded-lg font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
        >
          返回修改选择
        </button>
        
        <button
          onClick={handleConfirm}
          disabled={!selectedMode || isLoading}
          className={`px-8 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${
            selectedMode && !isLoading
              ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 shadow-lg hover:shadow-xl'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
          }`}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>启动中...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>开始推进</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}

export default ProgressModeSelector
