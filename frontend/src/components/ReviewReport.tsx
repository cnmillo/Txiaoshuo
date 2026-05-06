import React, { useState, useEffect, useCallback } from 'react'
import { checkReviewNeeded, performReview, getReviewReports } from '../services/api'

interface ReviewReportProps {
  novelId: string
  wordCount: number
}

interface ConsistencySection {
  score: number
  issues: string[]
}

interface ReviewReportData {
  id: string
  consistencyScore: number
  characterConsistency: ConsistencySection
  plotConsistency: ConsistencySection
  styleConsistency: ConsistencySection
  pacing: ConsistencySection
  suggestions: string[]
  createdAt: string
  wordCount: number
}

const ReviewReport: React.FC<ReviewReportProps> = ({ novelId, wordCount }) => {
  const [shouldReview, setShouldReview] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [report, setReport] = useState<ReviewReportData | null>(null)
  const [reports, setReports] = useState<ReviewReportData[]>([])

  const checkIfReviewNeeded = useCallback(async () => {
    try {
      const result = await checkReviewNeeded(novelId)
      setShouldReview(result.shouldReview)
    } catch (error) {
      console.error('检查回顾需求失败:', error)
    }
  }, [novelId])

  const fetchReports = useCallback(async () => {
    try {
      const result = await getReviewReports(novelId)
      setReports(result)
    } catch (error) {
      console.error('获取回顾报告失败:', error)
    }
  }, [novelId])

  useEffect(() => {
    checkIfReviewNeeded()
    fetchReports()
  }, [checkIfReviewNeeded, fetchReports, novelId, wordCount])

  const handleReview = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await performReview(novelId)
      setReport(result)
      setShouldReview(false)
      fetchReports()
    } catch (error) {
      console.error('执行回顾分析失败:', error)
    } finally {
      setIsLoading(false)
    }
  }, [fetchReports, novelId])

  if (shouldReview) {
    return (
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-yellow-700">
              小说已达到 {wordCount} 字，建议进行一次整体回顾分析，检查内容一致性。
            </p>
            <div className="mt-2">
              <button
                onClick={handleReview}
                disabled={isLoading}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isLoading ? '分析中...' : '开始回顾分析'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (report) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h3 className="text-xl font-semibold mb-4">回顾分析报告</h3>
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">整体一致性评分</span>
            <span className="text-lg font-bold text-blue-600">{report.consistencyScore}/100</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-blue-600 h-2.5 rounded-full" 
              style={{ width: `${report.consistencyScore}%` }}
            ></div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <h4 className="text-sm font-medium text-gray-600 mb-2">角色一致性</h4>
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold">{report.characterConsistency.score}/100</span>
              <div className="w-3/4 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full" 
                  style={{ width: `${report.characterConsistency.score}%` }}
                ></div>
              </div>
            </div>
            {report.characterConsistency.issues.length > 0 && (
              <ul className="mt-2 text-sm text-gray-600 list-disc list-inside">
                {report.characterConsistency.issues.map((issue: string, index: number) => (
                  <li key={index}>{issue}</li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-600 mb-2">情节一致性</h4>
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold">{report.plotConsistency.score}/100</span>
              <div className="w-3/4 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full" 
                  style={{ width: `${report.plotConsistency.score}%` }}
                ></div>
              </div>
            </div>
            {report.plotConsistency.issues.length > 0 && (
              <ul className="mt-2 text-sm text-gray-600 list-disc list-inside">
                {report.plotConsistency.issues.map((issue: string, index: number) => (
                  <li key={index}>{issue}</li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-600 mb-2">风格一致性</h4>
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold">{report.styleConsistency.score}/100</span>
              <div className="w-3/4 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full" 
                  style={{ width: `${report.styleConsistency.score}%` }}
                ></div>
              </div>
            </div>
            {report.styleConsistency.issues.length > 0 && (
              <ul className="mt-2 text-sm text-gray-600 list-disc list-inside">
                {report.styleConsistency.issues.map((issue: string, index: number) => (
                  <li key={index}>{issue}</li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-600 mb-2">节奏把控</h4>
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold">{report.pacing.score}/100</span>
              <div className="w-3/4 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full" 
                  style={{ width: `${report.pacing.score}%` }}
                ></div>
              </div>
            </div>
            {report.pacing.issues.length > 0 && (
              <ul className="mt-2 text-sm text-gray-600 list-disc list-inside">
                {report.pacing.issues.map((issue: string, index: number) => (
                  <li key={index}>{issue}</li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {report.suggestions.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-600 mb-2">改进建议</h4>
            <ul className="text-sm text-gray-600 list-disc list-inside">
              {report.suggestions.map((suggestion: string, index: number) => (
                <li key={index}>{suggestion}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-4 text-sm text-gray-500">
          分析时间: {new Date(report.createdAt).toLocaleString()}
        </div>
      </div>
    )
  }

  if (reports.length > 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h3 className="text-xl font-semibold mb-4">历史回顾分析</h3>
        <div className="space-y-4">
          {reports.map((r: ReviewReportData) => (
            <div key={r.id} className="border-b pb-4 last:border-0">
              <div className="flex justify-between items-center">
                <h4 className="font-medium">分析报告 - {new Date(r.createdAt).toLocaleString()}</h4>
                <span className="text-blue-600 font-bold">{r.consistencyScore}/100</span>
              </div>
              <div className="mt-2 text-sm text-gray-600">
                分析时字数: {r.wordCount} 字
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return null
}

export default ReviewReport