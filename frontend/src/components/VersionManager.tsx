import { useState } from 'react'
import { History, Clock, RotateCcw, Trash2, AlertTriangle } from 'lucide-react'
import Modal from './Modal'

interface Version {
  id: string
  timestamp: string
  description: string
  content: string
}

interface VersionManagerProps {
  versions: Version[]
  onVersionRestore: (version: Version) => void
  onVersionDelete: (versionId: string) => void
  disabled?: boolean
}

export default function VersionManager({ versions, onVersionRestore, onVersionDelete, disabled = false }: VersionManagerProps) {
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null)
  const [deleteConfirmVersion, setDeleteConfirmVersion] = useState<Version | null>(null)

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const handleDeleteConfirm = () => {
    if (deleteConfirmVersion) {
      onVersionDelete(deleteConfirmVersion.id)
      setDeleteConfirmVersion(null)
    }
  }

  return (
    <div className="version-manager">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
          <History className="w-5 h-5" />
          <span>版本历史</span>
        </h3>
      </div>

      {versions.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>暂无版本历史</p>
        </div>
      ) : (
        <div className="space-y-4">
          {versions.map((version, index) => (
            <div key={version.id} className="card">
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-500">版本 {versions.length - index}</span>
                    <span className="text-xs text-gray-400">{formatDate(version.timestamp)}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setSelectedVersion(selectedVersion?.id === version.id ? null : version)}
                      className="text-sm text-gray-600 hover:text-gray-900"
                    >
                      {selectedVersion?.id === version.id ? '收起' : '查看'}
                    </button>
                    <button
                      onClick={() => onVersionRestore(version)}
                      disabled={disabled}
                      className="btn-outline text-sm flex items-center space-x-1"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>恢复</span>
                    </button>
                    <button
                      onClick={() => setDeleteConfirmVersion(version)}
                      disabled={disabled}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="删除"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-2">{version.description || '自动保存'}</p>
                {selectedVersion?.id === version.id && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="text-sm text-gray-700 whitespace-pre-wrap max-h-48 overflow-y-auto">
                      {version.content}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={!!deleteConfirmVersion}
        onClose={() => setDeleteConfirmVersion(null)}
        title="确认删除"
      >
        <div className="space-y-4">
          <div className="flex items-center space-x-3 text-amber-600">
            <AlertTriangle className="w-6 h-6" />
            <span className="font-medium">确定要删除此版本吗？</span>
          </div>
          <p className="text-sm text-gray-600">
            删除后将无法恢复版本 "{deleteConfirmVersion?.description || '自动保存'}"。
            此操作不可撤销。
          </p>
          <div className="flex justify-end space-x-2">
            <button
              onClick={() => setDeleteConfirmVersion(null)}
              className="btn-outline"
            >
              取消
            </button>
            <button
              onClick={handleDeleteConfirm}
              className="btn-danger"
            >
              确认删除
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
