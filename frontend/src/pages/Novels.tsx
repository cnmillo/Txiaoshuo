import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, BookOpen, Clock, FileText, Trash2, AlertCircle, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { getNovels, deleteNovel } from '../services/api'
import type { Novel } from '@shared/types'

export default function Novels() {
  const [novels, setNovels] = useState<Novel[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; title: string } | null>(null)

  useEffect(() => {
    loadNovels()
  }, [])

  const loadNovels = async () => {
    try {
      const response = await getNovels()
      setNovels(response)
    } catch (error) {
      toast.error('加载小说列表失败')
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = (id: string) => {
    const novel = novels.find(n => n.id === id)
    setDeleteConfirm({ id, title: novel?.title || '这部小说' })
  }

  const confirmDelete = async () => {
    if (!deleteConfirm) return

    try {
      await deleteNovel(deleteConfirm.id)
      setNovels(novels.filter((novel) => novel.id !== deleteConfirm.id))
      toast.success('删除成功')
    } catch (error) {
      toast.error('删除失败')
      console.error(error)
    } finally {
      setDeleteConfirm(null)
    }
  }

  const cancelDelete = () => {
    setDeleteConfirm(null)
  }

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '未知时间'
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) {
        return '未知时间'
      }
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    } catch {
      return '未知时间'
    }
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { text: string; className: string }> = {
      generating: { text: '生成中', className: 'bg-yellow-100 text-yellow-800' },
      completed: { text: '已完成', className: 'bg-green-100 text-green-800' },
      failed: { text: '生成失败', className: 'bg-red-100 text-red-800' },
    }
    const statusInfo = statusMap[status] || { text: status, className: 'bg-gray-100 text-gray-800' }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.className}`}>
        {statusInfo.text}
      </span>
    )
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </div>
    )
  }

  return (
    <>
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">我的小说</h1>
          <p className="text-gray-600">管理您创作的所有小说作品</p>
        </div>
        <Link
          to="/generate"
          className="mt-4 sm:mt-0 inline-flex items-center space-x-2 btn-primary"
        >
          <Plus className="w-5 h-5" />
          <span>创作新小说</span>
        </Link>
      </div>

      {novels.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl shadow-sm">
          <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <BookOpen className="w-10 h-10 text-primary-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">还没有小说</h3>
          <p className="text-gray-600 mb-6">开始创作您的第一部小说吧</p>
          <Link to="/generate" className="btn-primary inline-flex items-center space-x-2">
            <Plus className="w-5 h-5" />
            <span>开始创作</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {novels.map((novel) => (
            <div
              key={novel.id}
              className="card overflow-hidden group hover:shadow-xl transition-all duration-200"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1 line-clamp-1">
                      {novel.title}
                    </h3>
                    {getStatusBadge(novel.status)}
                  </div>
                </div>

                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {novel.description || novel.prompt}
                </p>

                {novel.status === 'failed' && novel.error && (
                  <div className="mb-4 p-3 bg-red-50 rounded-lg border border-red-100">
                    <div className="flex items-start space-x-2">
                      <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-xs text-red-700 font-medium mb-1">失败原因</p>
                        <p className="text-xs text-red-600">{novel.error}</p>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center space-x-2">
                      <Link
                        to={`/novels/${novel.id}`}
                        className="text-xs text-primary-600 hover:text-primary-700 flex items-center space-x-1"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>查看详情并重试</span>
                      </Link>
                    </div>
                  </div>
                )}

                <div className="flex items-center space-x-4 text-sm text-gray-500 mb-4">
                  <div className="flex items-center space-x-1">
                    <FileText className="w-4 h-4" />
                    <span>{novel.wordCount?.toLocaleString() || 0} 字</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="w-4 h-4" />
                    <span>{formatDate(novel.createdAt)}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Link
                    to={`/novels/${novel.id}`}
                    className="flex-1 btn-primary text-center text-sm"
                  >
                    查看详情
                  </Link>
                  <button
                    onClick={() => handleDelete(novel.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="删除"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>

    {deleteConfirm && (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
        <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4 animate-scale-in">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-red-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">确认删除</h3>
              <p className="mt-2 text-sm text-gray-600">
                确定要删除《{deleteConfirm.title}》吗？此操作不可撤销，所有章节内容将被永久删除。
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
            <button
              onClick={cancelDelete}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              onClick={confirmDelete}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-1"
            >
              <Trash2 className="w-4 h-4" />
              <span>确认删除</span>
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}
