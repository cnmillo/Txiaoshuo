import { useState, useCallback, useRef, useEffect } from 'react'
import ReactQuill, { Quill } from 'react-quill-new'
import 'quill/dist/quill.snow.css'

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  showActions?: boolean
  onClear?: () => void
}

export default function RichTextEditor({ value, onChange, placeholder = '请输入内容...', className = '', disabled = false, showActions = false, onClear }: RichTextEditorProps) {
  const [isFocused, setIsFocused] = useState(false)
  const [localValue, setLocalValue] = useState(value)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const quillRef = useRef<ReactQuill>(null)
  const isEditingRef = useRef(false)

  // 同步外部 value 变化（仅在非编辑状态下同步）
  useEffect(() => {
    // 如果用户正在编辑，不同步外部值
    if (isFocused || isEditingRef.current) {
      return
    }
    if (value !== localValue) {
      setLocalValue(value)
    }
  }, [value, localValue, isFocused])

  const modules = {
    toolbar: {
      container: [
        [{ 'undo': 'undo' }, { 'redo': 'redo' }],
        ['bold', 'italic', 'underline', 'strike'],
        ['blockquote', 'code-block'],
        [{ 'header': 1 }, { 'header': 2 }],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
        [{ 'script': 'sub' }, { 'script': 'super' }],
        [{ 'indent': '-1' }, { 'indent': '+1' }],
        [{ 'direction': 'rtl' }],
        [{ 'size': ['small', false, 'large', 'huge'] }],
        [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'font': [] }],
        [{ 'align': [] }],
        ['clean']
      ],
      handlers: {
        undo: function(this: { quill: Quill }) {
          this.quill.history.undo()
        },
        redo: function(this: { quill: Quill }) {
          this.quill.history.redo()
        }
      }
    },
    clipboard: {
      matchVisual: false
    },
    history: {
      delay: 1000,
      maxStack: 100,
      userOnly: true
    }
  }

  const handleChange = useCallback((content: string) => {
    setLocalValue(content)
    isEditingRef.current = true

    // 清除之前的定时器
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // 设置新的定时器，300ms 后触发 onChange
    debounceTimerRef.current = setTimeout(() => {
      onChange(content)
      isEditingRef.current = false
    }, 300)
  }, [onChange])

  const handleFocus = useCallback(() => {
    setIsFocused(true)
    isEditingRef.current = true
  }, [])

  const handleBlur = useCallback(() => {
    setIsFocused(false)
    isEditingRef.current = false
    // 失去焦点时立即同步内容
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    onChange(localValue)
  }, [onChange, localValue])

  // 清空内容
  const handleClear = useCallback(() => {
    if (onClear) {
      onClear()
    } else {
      setLocalValue('')
      onChange('')
    }
  }, [onClear, onChange])

  // 清理定时器
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  return (
    <div className={`rich-text-editor h-full flex flex-col ${className} ${isFocused ? 'focused' : ''}`}>
      {/* 操作按钮 */}
      {showActions && (
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-200">
          <button
            onClick={handleClear}
            disabled={disabled || !localValue}
            className="px-3 py-1 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="清空内容"
          >
            清空
          </button>
          <div className="flex-1" />
          <span className="text-xs text-gray-400">
            {localValue.replace(/<[^>]*>/g, '').length} 字
          </span>
        </div>
      )}
      <ReactQuill
        ref={quillRef}
        value={localValue}
        onChange={handleChange}
        placeholder={placeholder}
        modules={modules}
        onFocus={handleFocus}
        onBlur={handleBlur}
        readOnly={disabled}
        className={`flex-1 ${disabled ? 'opacity-70' : ''}`}
      />
      <style>{`
        .rich-text-editor {
          display: flex;
          flex-direction: column;
          height: 100%;
          min-height: 0;
        }
        .rich-text-editor .quill {
          display: flex;
          flex-direction: column;
          height: 100%;
          min-height: 0;
        }
        .rich-text-editor .ql-toolbar {
          flex-shrink: 0;
          border: none;
          border-bottom: 1px solid #e5e7eb;
          background: #f9fafb;
          border-radius: 0;
        }
        .rich-text-editor .ql-container {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          font-size: 16px;
          border: none;
        }
        .rich-text-editor .ql-container::-webkit-scrollbar {
          width: 8px;
        }
        .rich-text-editor .ql-container::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 4px;
        }
        .rich-text-editor .ql-container::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 4px;
        }
        .rich-text-editor .ql-container::-webkit-scrollbar-thumb:hover {
          background: #a1a1a1;
        }
        .rich-text-editor .ql-editor {
          padding: 16px;
          line-height: 1.8;
        }
        .rich-text-editor .ql-editor.ql-blank::before {
          color: #9ca3af;
          font-style: normal;
        }
        .rich-text-editor .ql-editor:focus {
          outline: none;
        }
        .rich-text-editor .ql-editor p {
          margin-bottom: 1em;
        }
        /* 撤销/重做按钮样式 */
        .ql-undo::before {
          content: '↶';
          font-size: 18px;
          line-height: 1;
        }
        .ql-redo::before {
          content: '↷';
          font-size: 18px;
          line-height: 1;
        }
        .ql-undo, .ql-redo {
          width: 28px !important;
          padding: 0 !important;
        }
      `}</style>
    </div>
  )
}
