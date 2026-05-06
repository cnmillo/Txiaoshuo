/**
 * 导出路由
 * 提供小说导出相关的API端点
 */

import { Router, Request, Response } from 'express'
import { exportService } from '../services/exportService.js'

// 为 exportService 添加类型断言，确保 TypeScript 能够正确识别所有方法
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const typedExportService = exportService as any
import { sendSuccess, sendError, ErrorMessages, HttpStatus } from '../utils/response.js'
import { validate } from '../utils/validation.js'
import { z } from 'zod'
import logger from '../utils/logger.js'

import { ExportFormatType, supportedFormats } from '../config/exportConfig.js'

const router = Router()

// 导出选项验证模式
const exportOptionsSchema = z.object({
  includeTitle: z.boolean().optional().default(true),
  includeAuthor: z.boolean().optional().default(false),
  authorName: z.string().max(100, '作者名称不能超过100个字符').optional(),
  selectedChapters: z.array(z.number().int().positive()).optional(),
  chapterRange: z.object({
    start: z.number().int().positive(),
    end: z.number().int().positive()
  }).optional(),
  font: z.object({
    family: z.string().optional(),
    size: z.number().min(8).max(72).optional(),
    lineHeight: z.number().min(1).max(3).optional(),
    color: z.string().optional()
  }).optional(),
  page: z.object({
    size: z.enum(['A4', 'A5', 'B5', 'letter', 'legal']).optional(),
    orientation: z.enum(['portrait', 'landscape']).optional(),
    margins: z.object({
      top: z.number().min(0).max(100).optional(),
      right: z.number().min(0).max(100).optional(),
      bottom: z.number().min(0).max(100).optional(),
      left: z.number().min(0).max(100).optional()
    }).optional()
  }).optional(),
  cover: z.object({
    enabled: z.boolean().optional(),
    title: z.string().optional(),
    subtitle: z.string().optional(),
    author: z.string().optional(),
    description: z.string().optional(),
    backgroundColor: z.string().optional(),
    textColor: z.string().optional()
  }).optional(),
  chapter: z.object({
    numbering: z.boolean().optional(),
    separator: z.string().optional(),
    pageBreak: z.boolean().optional(),
    includeSummary: z.boolean().optional()
  }).optional(),
  headerFooter: z.object({
    headerEnabled: z.boolean().optional(),
    headerText: z.string().optional(),
    footerEnabled: z.boolean().optional(),
    footerText: z.string().optional(),
    pageNumberEnabled: z.boolean().optional(),
    pageNumberPosition: z.enum(['center', 'left', 'right']).optional()
  }).optional(),
  template: z.string().optional()
})

// 自定义导出请求验证模式
const customExportSchema = z.object({
  format: z.enum(['txt', 'md', 'html', 'epub', 'pdf']),
  options: exportOptionsSchema.optional()
})

// 批量导出请求验证模式
const batchExportSchema = z.object({
  formats: z.array(z.enum(['txt', 'md', 'html', 'epub', 'pdf'])).min(1, '至少选择一种导出格式'),
  options: exportOptionsSchema.optional()
})

/**
 * 获取支持的导出格式
 * GET /api/export/formats
 */
router.get('/formats', (req: Request, res: Response) => {
  try {
    const formats = typedExportService.getAllFormatInfo()
    sendSuccess(res, formats, '获取导出格式列表成功')
  } catch (error) {
    logger.error('获取导出格式列表失败', error)
    sendError(res, '获取导出格式列表失败', HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

/**
 * 获取默认导出选项
 * GET /api/export/default-options
 */
router.get('/default-options', (req: Request, res: Response) => {
  try {
    const options = typedExportService.getDefaultOptions()
    sendSuccess(res, options, '获取默认导出选项成功')
  } catch (error) {
    logger.error('获取默认导出选项失败', error)
    sendError(res, '获取默认导出选项失败', HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

/**
 * 导出为TXT
 * GET /api/export/:id/txt
 */
router.get('/:id/txt', async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const validation = validate(exportOptionsSchema, req.query)
    if (!validation.success) {
      sendError(res, `请求参数验证失败: ${validation.errors.join(', ')}`, HttpStatus.BAD_REQUEST)
      return
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await typedExportService.exportToTxt(id, validation.data as any)

    res.setHeader('Content-Type', result.mimeType)
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(result.fileName)}"`)
    res.setHeader('Content-Length', result.fileSize.toString())

    res.download(result.filePath, result.fileName, (err) => {
      if (err) {
        logger.error('下载TXT文件失败', err)
      }
    })
  } catch (error) {
    logger.error('导出TXT失败', error)
    const message = error instanceof Error ? error.message : ErrorMessages.EXPORT_FAILED
    sendError(res, message, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

/**
 * 导出为Markdown
 * GET /api/export/:id/md
 */
router.get('/:id/md', async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const validation = validate(exportOptionsSchema, req.query)
    if (!validation.success) {
      sendError(res, `请求参数验证失败: ${validation.errors.join(', ')}`, HttpStatus.BAD_REQUEST)
      return
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await typedExportService.exportToMarkdown(id, validation.data as any)

    res.setHeader('Content-Type', result.mimeType)
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(result.fileName)}"`)
    res.setHeader('Content-Length', result.fileSize.toString())

    res.download(result.filePath, result.fileName, (err) => {
      if (err) {
        logger.error('下载Markdown文件失败', err)
      }
    })
  } catch (error) {
    logger.error('导出Markdown失败', error)
    const message = error instanceof Error ? error.message : ErrorMessages.EXPORT_FAILED
    sendError(res, message, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

/**
 * 导出为HTML
 * GET /api/export/:id/html
 */
router.get('/:id/html', async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const validation = validate(exportOptionsSchema, req.query)
    if (!validation.success) {
      sendError(res, `请求参数验证失败: ${validation.errors.join(', ')}`, HttpStatus.BAD_REQUEST)
      return
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await typedExportService.exportToHtml(id, validation.data as any)

    res.setHeader('Content-Type', result.mimeType)
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(result.fileName)}"`)
    res.setHeader('Content-Length', result.fileSize.toString())

    res.download(result.filePath, result.fileName, (err) => {
      if (err) {
        logger.error('下载HTML文件失败', err)
      }
    })
  } catch (error) {
    logger.error('导出HTML失败', error)
    const message = error instanceof Error ? error.message : ErrorMessages.EXPORT_FAILED
    sendError(res, message, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

/**
 * 导出为EPUB
 * GET /api/export/:id/epub
 */
router.get('/:id/epub', async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const validation = validate(exportOptionsSchema, req.query)
    if (!validation.success) {
      sendError(res, `请求参数验证失败: ${validation.errors.join(', ')}`, HttpStatus.BAD_REQUEST)
      return
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await typedExportService.exportToEpub(id, validation.data as any)

    res.setHeader('Content-Type', result.mimeType)
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(result.fileName)}"`)
    res.setHeader('Content-Length', result.fileSize.toString())

    res.download(result.filePath, result.fileName, (err) => {
      if (err) {
        logger.error('下载EPUB文件失败', err)
      }
    })
  } catch (error) {
    logger.error('导出EPUB失败', error)
    const message = error instanceof Error ? error.message : ErrorMessages.EXPORT_FAILED
    sendError(res, message, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

/**
 * 导出为PDF
 * GET /api/export/:id/pdf
 */
router.get('/:id/pdf', async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const validation = validate(exportOptionsSchema, req.query)
    if (!validation.success) {
      sendError(res, `请求参数验证失败: ${validation.errors.join(', ')}`, HttpStatus.BAD_REQUEST)
      return
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await typedExportService.exportToPdf(id, validation.data as any)

    res.setHeader('Content-Type', result.mimeType)
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(result.fileName)}"`)
    res.setHeader('Content-Length', result.fileSize.toString())

    res.download(result.filePath, result.fileName, (err) => {
      if (err) {
        logger.error('下载PDF文件失败', err)
      }
    })
  } catch (error) {
    logger.error('导出PDF失败', error)
    const message = error instanceof Error ? error.message : ErrorMessages.EXPORT_FAILED
    sendError(res, message, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

/**
 * 自定义导出
 * POST /api/export/:id/custom
 */
router.post('/:id/custom', async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const validation = validate(customExportSchema, req.body)
    if (!validation.success) {
      sendError(res, `请求参数验证失败: ${validation.errors.join(', ')}`, HttpStatus.BAD_REQUEST)
      return
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { format, options = {} } = validation.data as { format: string; options?: any }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await typedExportService.exportCustom(id, format as any, options as any)

    res.setHeader('Content-Type', result.mimeType)
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(result.fileName)}"`)
    res.setHeader('Content-Length', result.fileSize.toString())

    res.download(result.filePath, result.fileName, (err) => {
      if (err) {
        logger.error('下载导出文件失败', err)
      }
    })
  } catch (error) {
    logger.error('自定义导出失败', error)
    const message = error instanceof Error ? error.message : ErrorMessages.EXPORT_FAILED
    sendError(res, message, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

/**
 * 批量导出多种格式
 * POST /api/export/:id/batch
 */
router.post('/:id/batch', async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const validation = validate(batchExportSchema, req.body)
    if (!validation.success) {
      sendError(res, `请求参数验证失败: ${validation.errors.join(', ')}`, HttpStatus.BAD_REQUEST)
      return
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { formats, options = {} } = validation.data as { formats: string[]; options?: any }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results = await typedExportService.exportMultipleFormats(id, formats as any, options as any)

    // 返回导出结果列表（不包含文件内容，只包含文件信息）
    const exportResults = results.map((result: { fileName: string; fileSize: number; mimeType: string }) => ({
      fileName: result.fileName,
      fileSize: result.fileSize,
      mimeType: result.mimeType,
      downloadUrl: `/api/export/download/${encodeURIComponent(result.fileName)}`
    }))

    sendSuccess(res, {
      exportedFiles: exportResults,
      totalFiles: exportResults.length,
      totalSize: exportResults.reduce((sum: number, f: { fileSize: number }) => sum + f.fileSize, 0)
    }, '批量导出成功')
  } catch (error) {
    logger.error('批量导出失败', error)
    const message = error instanceof Error ? error.message : ErrorMessages.EXPORT_FAILED
    sendError(res, message, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

/**
 * 预览导出内容（返回HTML预览）
 * GET /api/export/:id/preview
 */
router.get('/:id/preview', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const format = (req.query.format as ExportFormatType) || 'html'

    if (!supportedFormats.includes(format)) {
      sendError(res, `不支持的预览格式: ${format}`, HttpStatus.BAD_REQUEST)
      return
    }

    const validation = validate(exportOptionsSchema, req.query)
    if (!validation.success) {
      sendError(res, `请求参数验证失败: ${validation.errors.join(', ')}`, HttpStatus.BAD_REQUEST)
      return
    }

    // 生成HTML预览
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await typedExportService.exportToHtml(id, validation.data as any)

    // 读取HTML内容
    const fs = await import('fs/promises')
    const htmlContent = await fs.readFile(result.filePath, 'utf-8')

    // 返回HTML内容
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.send(htmlContent)
  } catch (error) {
    logger.error('预览导出内容失败', error)
    const message = error instanceof Error ? error.message : ErrorMessages.EXPORT_FAILED
    sendError(res, message, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

/**
 * 下载导出文件
 * GET /api/export/download/:fileName
 */
router.get('/download/:fileName', async (req: Request, res: Response) => {
  try {
    const { fileName } = req.params
    const decodedFileName = decodeURIComponent(fileName)

    const fileInfo = await typedExportService.getExportFileInfo(decodedFileName)

    if (!fileInfo.exists) {
      sendError(res, '文件不存在或已过期', HttpStatus.NOT_FOUND)
      return
    }

    const filePath = typedExportService.getExportPath(decodedFileName)

    res.download(filePath, decodedFileName, (err) => {
      if (err) {
        logger.error('下载文件失败', err)
      }
    })
  } catch (error) {
    logger.error('下载文件失败', error)
    const message = error instanceof Error ? error.message : '下载文件失败'
    sendError(res, message, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

/**
 * 获取导出文件信息
 * GET /api/export/file-info/:fileName
 */
router.get('/file-info/:fileName', async (req: Request, res: Response) => {
  try {
    const { fileName } = req.params
    const decodedFileName = decodeURIComponent(fileName)

    const fileInfo = await typedExportService.getExportFileInfo(decodedFileName)

    if (!fileInfo.exists) {
      sendError(res, '文件不存在或已过期', HttpStatus.NOT_FOUND)
      return
    }

    sendSuccess(res, {
      fileName: decodedFileName,
      size: fileInfo.size,
      createdAt: fileInfo.createdAt,
      modifiedAt: fileInfo.modifiedAt
    }, '获取文件信息成功')
  } catch (error) {
    logger.error('获取文件信息失败', error)
    const message = error instanceof Error ? error.message : '获取文件信息失败'
    sendError(res, message, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

/**
 * 列出所有导出文件
 * GET /api/export/files
 */
router.get('/files', async (req: Request, res: Response) => {
  try {
    const files = await typedExportService.listExportFiles()
    const totalSize = await typedExportService.getExportDirectorySize()

    sendSuccess(res, {
      files,
      totalFiles: files.length,
      totalSize
    }, '获取导出文件列表成功')
  } catch (error) {
    logger.error('获取导出文件列表失败', error)
    sendError(res, '获取导出文件列表失败', HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

/**
 * 清理过期导出文件
 * POST /api/export/cleanup
 */
router.post('/cleanup', async (req: Request, res: Response) => {
  try {
    const maxAgeHours = req.body.maxAgeHours || 24

    if (typeof maxAgeHours !== 'number' || maxAgeHours < 1) {
      sendError(res, 'maxAgeHours必须是大于等于1的数字', HttpStatus.BAD_REQUEST)
      return
    }

    const deletedCount = await typedExportService.cleanupExpiredExports(maxAgeHours)

    sendSuccess(res, { deletedCount }, `成功清理${deletedCount}个过期文件`)
  } catch (error) {
    logger.error('清理过期导出文件失败', error)
    const message = error instanceof Error ? error.message : '清理过期导出文件失败'
    sendError(res, message, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

/**
 * 删除导出文件
 * DELETE /api/export/files/:fileName
 */
router.delete('/files/:fileName', async (req: Request, res: Response) => {
  try {
    const { fileName } = req.params
    const decodedFileName = decodeURIComponent(fileName)

    const fileInfo = await typedExportService.getExportFileInfo(decodedFileName)

    if (!fileInfo.exists) {
      sendError(res, '文件不存在或已过期', HttpStatus.NOT_FOUND)
      return
    }

    const filePath = typedExportService.getExportPath(decodedFileName)
    await typedExportService.deleteExportFile(filePath)

    sendSuccess(res, null, '删除文件成功')
  } catch (error) {
    logger.error('删除导出文件失败', error)
    const message = error instanceof Error ? error.message : '删除导出文件失败'
    sendError(res, message, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

export default router
