import React, { useState, useEffect, useCallback } from 'react'
import { createChapterVersion, getChapterVersions, getChapterVersion } from '../services/api'

interface VersionControlProps {
  chapterId: string
  currentContent: string
}

interface ChapterVersion {
  id: string
  version: number
  description: string
  content: string
  createdAt: string
}

const VersionControl: React.FC<VersionControlProps> = ({ chapterId, currentContent }) => {
  const [versions, setVersions] = useState<ChapterVersion[]>([])
  const [selectedVersion, setSelectedVersion] = useState<ChapterVersion | null>(null)
  const [versionDescription, setVersionDescription] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const loadVersions = useCallback(async () => {
    try {
      setIsLoading(true)
      const data = await getChapterVersions(chapterId)
      setVersions(data)
    } catch (error) {
      console.error('加载版本失败:', error)
    } finally {
      setIsLoading(false)
    }
  }, [chapterId])

  useEffect(() => {
    loadVersions()
  }, [loadVersions])

  const handleCreateVersion = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setIsLoading(true)
      await createChapterVersion(chapterId, currentContent, versionDescription)
      loadVersions()
      setVersionDescription('')
    } catch (error) {
      console.error('创建版本失败:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectVersion = async (versionId: string) => {
    try {
      setIsLoading(true)
      const version = await getChapterVersion(versionId)
      setSelectedVersion(version)
    } catch (error) {
      console.error('获取版本失败:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">版本控制管理</h2>
      
      {/* 创建新版本 */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h3 className="text-lg font-semibold mb-2">创建新版本</h3>
        <form onSubmit={handleCreateVersion}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">版本描述</label>
            <input
              type="text"
              value={versionDescription}
              onChange={(e) => setVersionDescription(e.target.value)}
              className="w-full px-3 py-2 border rounded"
              required
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded"
            disabled={isLoading}
          >
            {isLoading ? '创建中...' : '创建版本'}
          </button>
        </form>
      </div>
      
      {/* 版本列表 */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-semibold mb-2">版本历史</h3>
        {isLoading ? (
          <p>加载中...</p>
        ) : versions.length === 0 ? (
          <p>还没有版本</p>
        ) : (
          <div className="space-y-3">
            {versions.map(version => (
              <div key={version.id} className="p-3 border rounded hover:bg-gray-50">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-medium">版本 {version.version}</h4>
                    <p className="text-sm text-gray-600">{version.description}</p>
                    <p className="text-xs text-gray-500">创建于: {new Date(version.createdAt).toLocaleString()}</p>
                  </div>
                  <button
                    onClick={() => handleSelectVersion(version.id)}
                    className="px-3 py-1 bg-gray-200 text-gray-800 rounded"
                  >
                    查看
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* 版本详情 */}
      {selectedVersion && (
        <div className="mt-6 bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold mb-2">版本详情</h3>
          <div className="mb-4">
            <p className="font-medium">版本 {selectedVersion.version}</p>
            <p className="text-sm text-gray-600">{selectedVersion.description}</p>
            <p className="text-xs text-gray-500">创建于: {new Date(selectedVersion.createdAt).toLocaleString()}</p>
          </div>
          <div className="border rounded p-4 bg-gray-50">
            <pre className="whitespace-pre-wrap">{selectedVersion.content}</pre>
          </div>
        </div>
      )}
    </div>
  )
}

export default VersionControl
