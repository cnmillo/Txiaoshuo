/**
 * 文件生成器
 * 负责生成各种格式的导出文件
 */

import { writeFileSync, existsSync, mkdirSync, promises as fs } from 'fs'
import { join, dirname } from 'path'
import type { ExportOptions, ExportFormatType } from '../config/exportConfig.js'
import { formatExtensions, formatMimeTypes, txtExportConfig } from '../config/exportConfig.js'
import { renderTemplate, builtInTemplates, type TemplateVariable } from './templateEngine.js'
import logger from './logger.js'

// 动态导入puppeteer（用于PDF生成）
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let puppeteer: any = null

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getPuppeteer(): Promise<any> {
  if (!puppeteer) {
    puppeteer = await import('puppeteer')
  }
  return puppeteer
}

// 章节数据接口
export interface ChapterData {
  index: number
  title: string
  content: string
  wordCount: number
}

// 小说数据接口
export interface NovelExportData {
  id: string
  title: string
  author?: string
  description?: string
  wordCount: number
  chapterCount: number
  chapters: ChapterData[]
  createdAt?: Date
  updatedAt?: Date
}

// 生成结果接口
export interface GenerateResult {
  filePath: string
  fileName: string
  fileSize: number
  mimeType: string
}

/**
 * 确保目录存在
 */
function ensureDir(dirPath: string): void {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true })
  }
}

/**
 * 清理文件名中的非法字符
 */
function sanitizeFilename(filename: string): string {
  return filename.replace(/[<>:"/\\|?*]/g, '_').trim()
}

/**
 * 格式化章节内容（将换行符转换为HTML段落）
 */
function formatChapterContent(content: string, format: 'html' | 'xhtml' = 'html'): string {
  const paragraphs = content.split(/\n\s*\n/)
  if (format === 'xhtml') {
    return paragraphs
      .map(p => `<p>${p.trim().replace(/\n/g, '<br/>')}</p>`)
      .join('\n')
  }
  return paragraphs
    .map(p => `<p>${p.trim().replace(/\n/g, '<br>')}</p>`)
    .join('\n')
}

/**
 * 生成TXT文件
 */
export async function generateTxtFile(
  data: NovelExportData,
  options: ExportOptions,
  outputDir: string
): Promise<GenerateResult> {
  try {
    const template = options.template || builtInTemplates.txt

    const context = {
      title: data.title,
      author: options.includeAuthor ? options.authorName || data.author : '',
      description: data.description || '',
      wordCount: data.wordCount,
      chapterCount: data.chapterCount,
      chapters: data.chapters.map(ch => ({
        ...ch,
        content: ch.content
      }))
    }

    let content = renderTemplate(template, context, { escapeHtml: false })

    // 添加UTF-8 BOM（可选）
    if (txtExportConfig.bom) {
      content = '\uFEFF' + content
    }

    const fileName = `${sanitizeFilename(data.title)}${formatExtensions.txt}`
    const filePath = join(outputDir, fileName)

    ensureDir(dirname(filePath))
    writeFileSync(filePath, content, txtExportConfig.encoding as BufferEncoding)

    const stats = await fs.stat(filePath)

    logger.info('生成TXT文件成功', { fileName, fileSize: stats.size })

    return {
      filePath,
      fileName,
      fileSize: stats.size,
      mimeType: formatMimeTypes.txt
    }
  } catch (error) {
    logger.error('生成TXT文件失败', error)
    throw new Error(`生成TXT文件失败: ${error instanceof Error ? error.message : '未知错误'}`)
  }
}

/**
 * 生成Markdown文件
 */
export async function generateMarkdownFile(
  data: NovelExportData,
  options: ExportOptions,
  outputDir: string
): Promise<GenerateResult> {
  try {
    const template = options.template || builtInTemplates.markdown

    const context = {
      title: data.title,
      author: options.includeAuthor ? options.authorName || data.author : '',
      description: data.description || '',
      wordCount: data.wordCount,
      chapterCount: data.chapterCount,
      chapters: data.chapters.map(ch => ({
        ...ch,
        content: ch.content
      }))
    }

    const content = renderTemplate(template, context as unknown as Record<string, TemplateVariable>, { escapeHtml: false })

    const fileName = `${sanitizeFilename(data.title)}${formatExtensions.md}`
    const filePath = join(outputDir, fileName)

    ensureDir(dirname(filePath))
    writeFileSync(filePath, content, 'utf-8')

    const stats = await fs.stat(filePath)

    logger.info('生成Markdown文件成功', { fileName, fileSize: stats.size })

    return {
      filePath,
      fileName,
      fileSize: stats.size,
      mimeType: formatMimeTypes.md
    }
  } catch (error) {
    logger.error('生成Markdown文件失败', error)
    throw new Error(`生成Markdown文件失败: ${error instanceof Error ? error.message : '未知错误'}`)
  }
}

/**
 * 生成HTML文件
 */
export async function generateHtmlFile(
  data: NovelExportData,
  options: ExportOptions,
  outputDir: string
): Promise<GenerateResult> {
  try {
    const template = options.template || builtInTemplates.html

    const context = {
      title: data.title,
      author: options.includeAuthor ? options.authorName || data.author : '',
      description: data.description || '',
      wordCount: data.wordCount,
      chapterCount: data.chapterCount,
      font: options.font,
      chapters: data.chapters.map(ch => ({
        ...ch,
        content: formatChapterContent(ch.content, 'html')
      }))
    }

    const content = renderTemplate(template, context as unknown as Record<string, TemplateVariable>, { escapeHtml: false })

    const fileName = `${sanitizeFilename(data.title)}${formatExtensions.html}`
    const filePath = join(outputDir, fileName)

    ensureDir(dirname(filePath))
    writeFileSync(filePath, content, 'utf-8')

    const stats = await fs.stat(filePath)

    logger.info('生成HTML文件成功', { fileName, fileSize: stats.size })

    return {
      filePath,
      fileName,
      fileSize: stats.size,
      mimeType: formatMimeTypes.html
    }
  } catch (error) {
    logger.error('生成HTML文件失败', error)
    throw new Error(`生成HTML文件失败: ${error instanceof Error ? error.message : '未知错误'}`)
  }
}

/**
 * 生成EPUB文件
 */
export async function generateEpubFile(
  novelData: NovelExportData,
  options: ExportOptions,
  outputDir: string
): Promise<GenerateResult> {
  try {
    const JSZipModule = await import('jszip')
    const JSZip = JSZipModule.default
    const zip = new JSZip()

    const epubId = novelData.id;
    const epubTitle = novelData.title;
    const epubAuthor = novelData.author;
    const epubDescription = novelData.description;
    const epubChapters = novelData.chapters;
    const modified = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
    const bookUuid = `urn:uuid:${epubId}`;

    // 创建 mimetype 文件（必须第一个添加且不压缩）
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (zip.file as any)('mimetype', 'application/epub+zip', { compression: 'STORE' })

    // 创建 META-INF/container.xml
    zip.folder('META-INF')?.file('container.xml', `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`)

    // 创建 OEBPS 文件夹
    const oebps = zip.folder('OEBPS')
    if (!oebps) {
      throw new Error('创建EPUB目录结构失败')
    }

    // 准备章节数据
    const chapters = epubChapters.map((ch, idx) => ({
      index: idx + 1,
      title: ch.title,
      content: formatChapterContent(ch.content, 'xhtml')
    }))

    // 生成 content.opf
    const contentOpfTemplate = builtInTemplates.epub.contentOpf
    const contentOpf = renderTemplate(contentOpfTemplate, {
      title: epubTitle,
      author: options.authorName || epubAuthor || 'Unknown',
      description: epubDescription || '',
      id: bookUuid,
      modified,
      chapters
    }, { escapeHtml: true })
    oebps.file('content.opf', contentOpf)

    // 生成 toc.ncx
    const tocNcxTemplate = builtInTemplates.epub.tocNcx
    const tocNcx = renderTemplate(tocNcxTemplate, {
      title: epubTitle,
      id: bookUuid,
      chapters
    }, { escapeHtml: true })
    oebps.file('toc.ncx', tocNcx)

    // 生成 stylesheet.css
    const stylesheetTemplate = builtInTemplates.epub.stylesheet
    const stylesheet = renderTemplate(stylesheetTemplate, {
      font: options.font ?? 'default'
    } as unknown as Record<string, TemplateVariable>, { escapeHtml: false })
    oebps.file('stylesheet.css', stylesheet)

    // 生成章节文件
    const chapterTemplate = builtInTemplates.epub.chapterXhtml
    for (const chapter of chapters) {
      const chapterContent = renderTemplate(chapterTemplate, {
        chapter
      }, { escapeHtml: false })
      oebps.file(`chapter${chapter.index}.xhtml`, chapterContent)
    }

    // 生成EPUB文件
    const fileName = `${sanitizeFilename(epubTitle)}${formatExtensions.epub}`
    const filePath = join(outputDir, fileName)

    ensureDir(dirname(filePath))

    const content = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    })

    await fs.writeFile(filePath, content)

    const stats = await fs.stat(filePath)

    logger.info('生成EPUB文件成功', { fileName, fileSize: stats.size })

    return {
      filePath,
      fileName,
      fileSize: stats.size,
      mimeType: formatMimeTypes.epub
    }
  } catch (error) {
    logger.error('生成EPUB文件失败', error)
    throw new Error(`生成EPUB文件失败: ${error instanceof Error ? error.message : '未知错误'}`)
  }
}

/**
 * 生成PDF文件
 */
export async function generatePdfFile(
  data: NovelExportData,
  options: ExportOptions,
  outputDir: string
): Promise<GenerateResult> {
  let browser = null

  try {
    const template = options.template || builtInTemplates.pdf

    const context = {
      title: data.title,
      author: options.includeAuthor ? options.authorName || data.author : '',
      description: data.description || '',
      font: options.font,
      page: options.page,
      cover: options.cover,
      headerFooter: options.headerFooter,
      chapters: data.chapters.map(ch => ({
        ...ch,
        content: formatChapterContent(ch.content, 'html')
      }))
    }

    const htmlContent = renderTemplate(template, context as unknown as Record<string, TemplateVariable>, { escapeHtml: false })

    // 使用Puppeteer生成PDF
    const puppeteerModule = await getPuppeteer()
    browser = await puppeteerModule.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })

    const page = await browser.newPage()

    // 设置HTML内容
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (page.setContent as any)(htmlContent, {
      waitUntil: 'networkidle0',
      timeout: 30000
    })

    // 等待字体加载
    await page.evaluateHandle('document.fonts.ready')

    // 生成PDF
    const fileName = `${sanitizeFilename(data.title)}${formatExtensions.pdf}`
    const filePath = join(outputDir, fileName)

    ensureDir(dirname(filePath))

    const { width, height } = getPageDimensions(options.page)

    await page.pdf({
      path: filePath,
      width: `${width}mm`,
      height: `${height}mm`,
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: options.headerFooter.pageNumberEnabled,
      headerTemplate: options.headerFooter.headerEnabled
        ? `<div style="font-size: 9px; width: 100%; text-align: center; padding: 10px;">${options.headerFooter.headerText || ''}</div>`
        : '<div></div>',
      footerTemplate: options.headerFooter.footerEnabled || options.headerFooter.pageNumberEnabled
        ? `<div style="font-size: 9px; width: 100%; text-align: ${options.headerFooter.pageNumberPosition}; padding: 10px;">
            ${options.headerFooter.footerText || ''}
            ${options.headerFooter.pageNumberEnabled ? '<span class="pageNumber"></span> / <span class="totalPages"></span>' : ''}
           </div>`
        : '<div></div>',
      margin: {
        top: `${options.page.margins.top}mm`,
        right: `${options.page.margins.right}mm`,
        bottom: `${options.page.margins.bottom}mm`,
        left: `${options.page.margins.left}mm`
      }
    })

    await browser.close()
    browser = null

    const stats = await fs.stat(filePath)

    logger.info('生成PDF文件成功', { fileName, fileSize: stats.size })

    return {
      filePath,
      fileName,
      fileSize: stats.size,
      mimeType: formatMimeTypes.pdf
    }
  } catch (error) {
    if (browser) {
      await browser.close()
    }
    logger.error('生成PDF文件失败', error)
    throw new Error(`生成PDF文件失败: ${error instanceof Error ? error.message : '未知错误'}`)
  }
}

/**
 * 获取页面尺寸（毫米）
 */
function getPageDimensions(pageSettings: ExportOptions['page']): { width: number; height: number } {
  const sizeMap: Record<string, { width: number; height: number }> = {
    A4: { width: 210, height: 297 },
    A5: { width: 148, height: 210 },
    B5: { width: 176, height: 250 },
    letter: { width: 216, height: 279 },
    legal: { width: 216, height: 356 }
  }

  const size = sizeMap[pageSettings.size]
  if (pageSettings.orientation === 'landscape') {
    return { width: size.height, height: size.width }
  }
  return size
}

/**
 * 压缩文件为ZIP
 */
export async function compressFile(
  filePath: string,
  outputPath?: string
): Promise<string> {
  try {
    const JSZip = (await import('jszip')).default
    const zip = new JSZip()

    const fileName = filePath.split(/[/\\]/).pop() || 'file'
    const content = await fs.readFile(filePath)

    zip.file(fileName, content)

    const zipContent = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    })

    const zipPath = outputPath || `${filePath}.zip`
    await fs.writeFile(zipPath, zipContent)

    logger.info('文件压缩成功', { originalFile: filePath, zipFile: zipPath })

    return zipPath
  } catch (error) {
    logger.error('文件压缩失败', error)
    throw new Error(`文件压缩失败: ${error instanceof Error ? error.message : '未知错误'}`)
  }
}

/**
 * 删除文件
 */
export async function deleteFile(filePath: string): Promise<void> {
  try {
    if (existsSync(filePath)) {
      await fs.unlink(filePath)
      logger.info('删除文件成功', { filePath })
    }
  } catch (error) {
    logger.error('删除文件失败', error)
    throw new Error(`删除文件失败: ${error instanceof Error ? error.message : '未知错误'}`)
  }
}

/**
 * 获取文件信息
 */
export async function getFileInfo(filePath: string): Promise<{
  size: number
  createdAt: Date
  modifiedAt: Date
}> {
  try {
    const stats = await fs.stat(filePath)
    return {
      size: stats.size,
      createdAt: stats.birthtime,
      modifiedAt: stats.mtime
    }
  } catch (error) {
    logger.error('获取文件信息失败', error)
    throw new Error(`获取文件信息失败: ${error instanceof Error ? error.message : '未知错误'}`)
  }
}

/**
 * 主生成函数
 */
export async function generateFile(
  format: ExportFormatType,
  data: NovelExportData,
  options: ExportOptions,
  outputDir: string
): Promise<GenerateResult> {
  switch (format) {
    case 'txt':
      return generateTxtFile(data, options, outputDir)
    case 'md':
      return generateMarkdownFile(data, options, outputDir)
    case 'html':
      return generateHtmlFile(data, options, outputDir)
    case 'epub':
      return generateEpubFile(data, options, outputDir)
    case 'pdf':
      return generatePdfFile(data, options, outputDir)
    default:
      throw new Error(`不支持的导出格式: ${format}`)
  }
}

export default {
  generateTxtFile,
  generateMarkdownFile,
  generateHtmlFile,
  generateEpubFile,
  generatePdfFile,
  generateFile,
  compressFile,
  deleteFile,
  getFileInfo
}
