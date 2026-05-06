import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  showCloseButton?: boolean
  closeOnOverlayClick?: boolean
  footer?: React.ReactNode
}

const sizeMap = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-full mx-4',
  large: 'max-w-3xl',
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
  footer,
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (closeOnOverlayClick && e.target === overlayRef.current) {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
    >
      <div
        ref={contentRef}
        className={cn(
          'bg-white rounded-2xl shadow-2xl w-full transform transition-all duration-200 animate-slide-up',
          sizeMap[size]
        )}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            {title && (
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  title ? '' : 'ml-auto',
                  'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                )}
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="px-6 py-4">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end space-x-3 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

// 确认对话框
interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  confirmVariant?: 'primary' | 'danger' | 'secondary'
  isLoading?: boolean
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = '确认操作',
  message,
  confirmText = '确认',
  cancelText = '取消',
  confirmVariant = 'primary',
  isLoading = false,
}: ConfirmModalProps) {
  const variantClasses = {
    primary: 'btn-primary',
    danger: 'px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 font-medium',
    secondary: 'btn-secondary',
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors duration-200 font-medium"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={variantClasses[confirmVariant]}
          >
            {isLoading ? (
              <span className="flex items-center space-x-2">
                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                <span>处理中...</span>
              </span>
            ) : (
              confirmText
            )}
          </button>
        </>
      }
    >
      <p className="text-gray-600">{message}</p>
    </Modal>
  )
}

// 提示对话框
interface AlertModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  message: string
  type?: 'info' | 'success' | 'warning' | 'error'
  buttonText?: string
}

export function AlertModal({
  isOpen,
  onClose,
  title = '提示',
  message,
  type = 'info',
  buttonText = '确定',
}: AlertModalProps) {
  const typeStyles = {
    info: { icon: 'text-blue-500', bg: 'bg-blue-50' },
    success: { icon: 'text-green-500', bg: 'bg-green-50' },
    warning: { icon: 'text-yellow-500', bg: 'bg-yellow-50' },
    error: { icon: 'text-red-500', bg: 'bg-red-50' },
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <button onClick={onClose} className="btn-primary">
          {buttonText}
        </button>
      }
    >
      <div className="flex items-start space-x-3">
        <div className={`p-2 rounded-lg ${typeStyles[type].bg}`}>
          <span className={typeStyles[type].icon}>
            {type === 'success' && '✓'}
            {type === 'error' && '✕'}
            {type === 'warning' && '!'}
            {type === 'info' && 'i'}
          </span>
        </div>
        <p className="text-gray-600 mt-2">{message}</p>
      </div>
    </Modal>
  )
}
