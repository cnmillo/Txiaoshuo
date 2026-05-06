import React, { useState, useEffect, useCallback } from 'react'
import { runConsistencyCheck, getConsistencyChecks } from '../services/api'

interface ConsistencyCheckerProps {
  novelId: string
  chapterId?: string
}

interface ConsistencyCheck {
  id: string
  checkType: string
  createdAt: string
  result: string
  score: number
  issues: string
}

const ConsistencyChecker: React.FC<ConsistencyCheckerProps> = ({ novelId, chapterId }) => {
  const [checks, setChecks] = useState<ConsistencyCheck[]>([])
  const [isChecking, setIsChecking] = useState(false)
  const [checkType, setCheckType] = useState('full')
  const [latestCheck, setLatestCheck] = useState<ConsistencyCheck | null>(null)

  const loadChecks = useCallback(async () => {
    try {
      const data = await getConsistencyChecks(novelId, chapterId)
      setChecks(data)
      if (data.length > 0) {
        setLatestCheck(data[0])
      }
    } catch (error) {
      console.error('加载检查历史失败:', error)
    }
  }, [novelId, chapterId])

  useEffect(() => {
    loadChecks()
  }, [loadChecks])

  const handleRunCheck = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setIsChecking(true)
      await runConsistencyCheck(novelId, chapterId, checkType)
      loadChecks()
    } catch (error) {
      console.error('执行一致性检查失败:', error)
    } finally {
      setIsChecking(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600'
    if (score >= 70) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">内容一致性检查</h2>
      
      {/* 执行检查 */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h3 className="text-lg font-semibold mb-2">执行一致性检查</h3>
        <form onSubmit={handleRunCheck}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">检查类型</label>
            <select
              value={checkType}
              onChange={(e) => setCheckType(e.target.value)}
              className="w-full px-3 py-2 border rounded"
            >
              <option value="full">完整检查</option>
              <option value="character">角色一致性</option>
              <option value="worldview">世界观一致性</option>
              <option value="plot">情节一致性</option>
            </select>
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded"
            disabled={isChecking}
          >
            {isChecking ? '检查中...' : '执行检查'}
          </button>
        </form>
      </div>
      
      {/* 最新检查结果 */}
      {latestCheck && (
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <h3 className="text-lg font-semibold mb-2">最新检查结果</h3>
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium">检查类型:</span>
              <span>{latestCheck.checkType}</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium">检查时间:</span>
              <span>{new Date(latestCheck.createdAt).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium">检查结果:</span>
              <span className={latestCheck.result === '内容一致' ? 'text-green-600' : 'text-red-600'}>
                {latestCheck.result}
              </span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium">一致性得分:</span>
              <span className={`font-bold ${getScoreColor(latestCheck.score)}`}>
                {latestCheck.score}/100
              </span>
            </div>
          </div>
          
          {JSON.parse(latestCheck.issues || '[]').length > 0 && (
            <div className="mt-4">
              <h4 className="font-medium mb-2">发现的问题:</h4>
              <ul className="list-disc list-inside space-y-1 text-red-600">
                {JSON.parse(latestCheck.issues || '[]').map((issue: string, index: number) => (
                  <li key={index}>{issue}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      
      {/* 检查历史 */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-semibold mb-2">检查历史</h3>
        {checks.length === 0 ? (
          <p>还没有检查历史</p>
        ) : (
          <div className="space-y-3">
            {checks.map(check => (
              <div key={check.id} className="p-3 border rounded hover:bg-gray-50">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-medium">{check.checkType} 检查</h4>
                    <p className={`text-sm ${check.result === '内容一致' ? 'text-green-600' : 'text-red-600'}`}>
                      {check.result}
                    </p>
                    <p className={`text-sm font-medium ${getScoreColor(check.score)}`}>
                      得分: {check.score}/100
                    </p>
                    <p className="text-xs text-gray-500">
                      检查时间: {new Date(check.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default ConsistencyChecker
