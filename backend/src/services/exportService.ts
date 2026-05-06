/**
 * 导出服务
 * 提供多种格式的小说导出功能
 */

import { existsSync, mkdirSync, promises as fs } from 'fs'
import { join } from 'path'
import { novelService } from './novelService.js'
import type { ExportOptions } from '../config/exportConfig.js'
import {
  ExportFormatType,
  supportedFormats,
  formatExtensions,
  formatMimeTypes,
  validateExportOptions,
  mergeExportOptions,
  defaultExportOptions
} from '../config/exportConfig.js'
import {
  generateFile,
  deleteFile,
  getFileInfo,
  NovelExportData,
  ChapterData,
  GenerateResult
} from '../utils/fileGenerator.js'
import logger from '../utils/logger.js'

// 导出目录
const EXPORT_DIR = process.env.EXPORT_DIR || './exports'

// 确保导出目录存在
if (!existsSync(EXPORT_DIR)) {
  mkdirSync(EXPORT_DIR, { recursive: true })
}

/**
 * 清理文件名中的非法字符
 */
function sanitizeFilename(filename: string): string {
  return filename.replace(/[<>:"/\\|?*]/g, '_').trim()
}

/**
 * 准备小说导出数据
 */
async function prepareExportData(
  novelId: string,
  options: ExportOptions
): Promise<NovelExportData> {
  const novel = await novelService.getNovelById(novelId)
  if (!novel) {
    throw new Error('小说不存在')
  }

  // 获取所有章节
  let chapters = await novelService.getChapters(novelId)

  // 根据选项筛选章节
  if (options.selectedChapters && options.selectedChapters.length > 0) {
    // 按指定章节索引筛选
    const selectedSet = new Set(options.selectedChapters)
    chapters = chapters.filter((_, index) => selectedSet.has(index + 1))
  } else if (options.chapterRange) {
    // 按章节范围筛选
    const { start, end } = options.chapterRange
    chapters = chapters.slice(start - 1, end)
  }

  if (chapters.length === 0) {
    throw new Error('没有可导出的章节')
  }

  // 转换章节数据
  const chapterData: ChapterData[] = chapters.map((chapter, index) => ({
    index: index + 1,
    title: chapter.title,
    content: chapter.content,
    wordCount: chapter.wordCount
  }))

  // 计算选中章节的总字数
  const totalWordCount = chapterData.reduce((sum, ch) => sum + ch.wordCount, 0)

  return {
    id: novel.id,
    title: novel.title,
    author: options.authorName || undefined,
    description: novel.description || undefined,
    wordCount: totalWordCount,
    chapterCount: chapterData.length,
    chapters: chapterData,
    createdAt: novel.createdAt ? new Date(novel.createdAt) : undefined,
    updatedAt: novel.updatedAt ? new Date(novel.updatedAt) : undefined
  }
}

/**
 * 导出服务
 */
export const exportService = {
  /**
   * 导出为TXT格式
   */
  async exportToTxt(novelId: string, options: Partial<ExportOptions> = {}): Promise<GenerateResult> {
    try {
      const mergedOptions = mergeExportOptions({ ...options, format: 'txt' })
      const data = await prepareExportData(novelId, mergedOptions)

      const result = await generateFile('txt', data, mergedOptions, EXPORT_DIR)

      logger.info('导出TXT成功', { novelId, fileName: result.fileName, fileSize: result.fileSize })
      return result
    } catch (error) {
      logger.error('导出TXT失败', error)
      throw error
    }
  },

  /**
   * 导出为Markdown格式
   */
  async exportToMarkdown(novelId: string, options: Partial<ExportOptions> = {}): Promise<GenerateResult> {
    try {
      const mergedOptions = mergeExportOptions({ ...options, format: 'md' })
      const data = await prepareExportData(novelId, mergedOptions)

      const result = await generateFile('md', data, mergedOptions, EXPORT_DIR)

      logger.info('导出Markdown成功', { novelId, fileName: result.fileName, fileSize: result.fileSize })
      return result
    } catch (error) {
      logger.error('导出Markdown失败', error)
      throw error
    }
  },

  /**
   * 导出为HTML格式
   */
  async exportToHtml(novelId: string, options: Partial<ExportOptions> = {}): Promise<GenerateResult> {
    try {
      const mergedOptions = mergeExportOptions({ ...options, format: 'html' })
      const data = await prepareExportData(novelId, mergedOptions)

      const result = await generateFile('html', data, mergedOptions, EXPORT_DIR)

      logger.info('导出HTML成功', { novelId, fileName: result.fileName, fileSize: result.fileSize })
      return result
    } catch (error) {
      logger.error('导出HTML失败', error)
      throw error
    }
  },

  /**
   * 导出为EPUB格式
   */
  async exportToEpub(novelId: string, options: Partial<ExportOptions> = {}): Promise<GenerateResult> {
    try {
      const mergedOptions = mergeExportOptions({ ...options, format: 'epub' })
      const data = await prepareExportData(novelId, mergedOptions)

      const result = await generateFile('epub', data, mergedOptions, EXPORT_DIR)

      logger.info('导出EPUB成功', { novelId, fileName: result.fileName, fileSize: result.fileSize })
      return result
    } catch (error) {
      logger.error('导出EPUB失败', error)
      throw error
    }
  },

  /**
   * 导出为PDF格式
   */
  async exportToPdf(novelId: string, options: Partial<ExportOptions> = {}): Promise<GenerateResult> {
    try {
      const mergedOptions = mergeExportOptions({ ...options, format: 'pdf' })
      const data = await prepareExportData(novelId, mergedOptions)

      const result = await generateFile('pdf', data, mergedOptions, EXPORT_DIR)

      logger.info('导出PDF成功', { novelId, fileName: result.fileName, fileSize: result.fileSize })
      return result
    } catch (error) {
      logger.error('导出PDF失败', error)
      throw error
    }
  },

  /**
   * 自定义导出
   */
  async exportCustom(
    novelId: string,
    format: ExportFormatType,
    options: Partial<ExportOptions> = {}
  ): Promise<GenerateResult> {
    // 验证格式
    if (!supportedFormats.includes(format)) {
      throw new Error(`不支持的导出格式: ${format}。支持的格式: ${supportedFormats.join(', ')}`)
    }

    // 验证选项
    const validation = validateExportOptions({ ...options, format })
    if (!validation.valid) {
      throw new Error(`导出选项验证失败: ${validation.errors.join(', ')}`)
    }

    // 根据格式调用相应的导出方法
    switch (format) {
      case 'txt':
        return this.exportToTxt(novelId, options)
      case 'md':
        return this.exportToMarkdown(novelId, options)
      case 'html':
        return this.exportToHtml(novelId, options)
      case 'epub':
        return this.exportToEpub(novelId, options)
      case 'pdf':
        return this.exportToPdf(novelId, options)
      default:
        throw new Error(`不支持的导出格式: ${format}`)
    }
  },

  /**
   * 批量导出多种格式
   */
  async exportMultipleFormats(
    novelId: string,
    formats: ExportFormatType[],
    options: Partial<ExportOptions> = {}
  ): Promise<GenerateResult[]> {
    const results: GenerateResult[] = []

    for (const format of formats) {
      try {
        const result = await this.exportCustom(novelId, format, options)
        results.push(result)
      } catch (error) {
        logger.error(`导出${format}格式失败`, error)
        // 继续导出其他格式
      }
    }

    if (results.length === 0) {
      throw new Error('所有格式导出均失败')
    }

    return results
  },

  /**
   * 获取支持的导出格式
   */
  getSupportedFormats(): ExportFormatType[] {
    return [...supportedFormats]
  },

  /**
   * 获取导出格式信息
   */
  getFormatInfo(format: ExportFormatType): {
    format: ExportFormatType
    extension: string
    mimeType: string
    displayName: string
  } {
    const displayNames: Record<ExportFormatType, string> = {
      txt: '纯文本 (TXT)',
      md: 'Markdown',
      html: '网页 (HTML)',
      epub: '电子书 (EPUB)',
      pdf: 'PDF文档'
    }

    return {
      format,
      extension: formatExtensions[format],
      mimeType: formatMimeTypes[format],
      displayName: displayNames[format]
    }
  },

  /**
   * 获取所有导出格式信息
   */
  getAllFormatInfo(): ReturnType<typeof this.getFormatInfo>[] {
    return supportedFormats.map(format => this.getFormatInfo(format))
  },

  /**
   * 获取默认导出选项
   */
  getDefaultOptions(): ExportOptions {
    return { ...defaultExportOptions }
  },

  /**
   * 删除导出文件
   */
  async deleteExportFile(filePath: string): Promise<void> {
    try {
      await deleteFile(filePath)
    } catch (error) {
      logger.error('删除导出文件失败', error)
      throw error
    }
  },

  /**
   * 获取导出文件路径
   */
  getExportPath(fileName: string): string {
    return join(EXPORT_DIR, sanitizeFilename(fileName))
  },

  /**
   * 检查导出文件是否存在
   */
  async exportFileExists(fileName: string): Promise<boolean> {
    const filePath = this.getExportPath(fileName)
    return existsSync(filePath)
  },

  /**
   * 获取导出文件信息
   */
  async getExportFileInfo(fileName: string): Promise<{
    exists: boolean
    size?: number
    createdAt?: Date
    modifiedAt?: Date
  }> {
    const filePath = this.getExportPath(fileName)

    if (!existsSync(filePath)) {
      return { exists: false }
    }

    try {
      const info = await getFileInfo(filePath)
      return {
        exists: true,
        size: info.size,
        createdAt: info.createdAt,
        modifiedAt: info.modifiedAt
      }
    } catch (error) {
      return { exists: false }
    }
  },

  /**
   * 清理过期导出文件
   */
  async cleanupExpiredExports(maxAgeHours: number = 24): Promise<number> {
    try {
      const files = await fs.readdir(EXPORT_DIR)
      const now = Date.now()
      const maxAgeMs = maxAgeHours * 60 * 60 * 1000
      let deletedCount = 0

      for (const file of files) {
        const filePath = join(EXPORT_DIR, file)
        try {
          const stats = await fs.stat(filePath)
          const age = now - stats.mtime.getTime()

          if (age > maxAgeMs) {
            await fs.unlink(filePath)
            deletedCount++
            logger.info('删除过期导出文件', { file, age: `${Math.round(age / 1000 / 60)}分钟` })
          }
        } catch (error) {
          logger.error(`删除文件失败: ${file}`, error)
        }
      }

      logger.info('清理过期导出文件完成', { deletedCount })
      return deletedCount
    } catch (error) {
      logger.error('清理过期导出文件失败', error)
      throw new Error(`清理过期导出文件失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  },

  /**
   * 获取导出目录大小
   */
  async getExportDirectorySize(): Promise<number> {
    try {
      const files = await fs.readdir(EXPORT_DIR)
      let totalSize = 0

      for (const file of files) {
        const filePath = join(EXPORT_DIR, file)
        try {
          const stats = await fs.stat(filePath)
          if (stats.isFile()) {
            totalSize += stats.size
          }
        } catch (error) {
          // 忽略无法访问的文件
        }
      }

      return totalSize
    } catch (error) {
      logger.error('获取导出目录大小失败', error)
      return 0
    }
  },

  /**
   * 列出所有导出文件
   */
  async listExportFiles(): Promise<Array<{
    fileName: string
    size: number
    createdAt: Date
    modifiedAt: Date
  }>> {
    try {
      const files = await fs.readdir(EXPORT_DIR)
      const fileInfos: Array<{
        fileName: string
        size: number
        createdAt: Date
        modifiedAt: Date
      }> = []

      for (const file of files) {
        const filePath = join(EXPORT_DIR, file)
        try {
          const stats = await fs.stat(filePath)
          if (stats.isFile()) {
            fileInfos.push({
              fileName: file,
              size: stats.size,
              createdAt: stats.birthtime,
              modifiedAt: stats.mtime
            })
          }
        } catch (error) {
          // 忽略无法访问的文件
        }
      }

      // 按修改时间倒序排列
      return fileInfos.sort((a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime())
    } catch (error) {
      logger.error('列出导出文件失败', error)
      return []
    }
  }
}

export default exportService
