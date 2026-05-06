import React from 'react'

interface ProgressIndicatorProps {
  progress?: number
  mode?: 'simple' | 'compact' | 'detailed'
  showLabel?: boolean
  className?: string
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  progress = 0,
  mode = 'simple',
  showLabel = false,
  className = '',
}) => {
  const clampedProgress = Math.min(100, Math.max(0, progress))

  if (mode === 'compact') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary-600 rounded-full transition-all duration-300"
            style={{ width: `${clampedProgress}%` }}
          />
        </div>
        {showLabel && (
          <span className="text-xs text-gray-500">{clampedProgress}%</span>
        )}
      </div>
    )
  }

  if (mode === 'detailed') {
    return (
      <div className={`flex flex-col gap-1 ${className}`}>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">进度</span>
          {showLabel && (
            <span className="text-xs font-medium text-gray-700">
              {clampedProgress}%
            </span>
          )}
        </div>
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary-600 rounded-full transition-all duration-300"
            style={{ width: `${clampedProgress}%` }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-primary-600 rounded-full transition-all duration-300"
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-sm text-gray-600">{clampedProgress}%</span>
      )}
    </div>
  )
}

export default ProgressIndicator
