import { useState } from 'react'
import { Upload, X, Loader2 } from 'lucide-react'

export interface ImageUploaderProps {
  value: string[]
  onChange: (images: string[]) => void
  maxImages?: number
  label?: string
}

export default function ImageUploader({
  value,
  onChange,
  maxImages = 5,
  label = '上传图片'
}: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setIsUploading(true)

    try {
      const newImages: string[] = [...value]
      
      for (let i = 0; i < files.length; i++) {
        if (newImages.length >= maxImages) break
        
        const file = files[i]
        const base64 = await convertToBase64(file)
        newImages.push(base64)
      }

      onChange(newImages)
    } catch (error) {
      console.error('上传失败:', error)
    } finally {
      setIsUploading(false)
      e.target.value = ''
    }
  }

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const removeImage = (index: number) => {
    const newImages = value.filter((_, i) => i !== index)
    onChange(newImages)
  }

  return (
    <div className="space-y-4">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
        {value.map((image, index) => (
          <div key={index} className="relative group">
            <div className="aspect-square rounded-lg overflow-hidden border-2 border-gray-200">
              <img 
                src={image} 
                alt={`上传图片 ${index + 1}`} 
                className="w-full h-full object-cover"
              />
            </div>
            <button
              type="button"
              onClick={() => removeImage(index)}
              className="absolute top-1 right-1 bg-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="移除图片"
            >
              <X className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        ))}

        {value.length < maxImages && (
          <label className="flex flex-col items-center justify-center w-full aspect-square border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <Upload className="w-8 h-8 text-gray-400 mb-2" />
              <p className="text-xs text-gray-500">点击上传</p>
              <p className="text-xs text-gray-400">最多上传 {maxImages} 张图片</p>
            </div>
            <input 
              type="file" 
              multiple 
              accept="image/*" 
              className="hidden" 
              onChange={handleFileChange}
              disabled={isUploading}
            />
            {isUploading && (
              <div className="absolute inset-0 bg-white bg-opacity-80 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
              </div>
            )}
          </label>
        )}
      </div>

      {value.length > 0 && (
        <p className="mt-2 text-sm text-gray-500">
          已上传 {value.length} / {maxImages} 张图片
        </p>
      )}
    </div>
  )
}
