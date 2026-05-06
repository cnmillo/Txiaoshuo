/**
 * 导出配置文件
 * 定义各种导出格式的配置选项
 */

// 导出格式类型
export type ExportFormatType = 'txt' | 'md' | 'html' | 'epub' | 'pdf'

// 页面尺寸
export type PageSize = 'A4' | 'A5' | 'B5' | 'letter' | 'legal'

// 页面方向
export type PageOrientation = 'portrait' | 'landscape'

// 字体设置
export interface FontSettings {
  family: string
  size: number
  lineHeight: number
  color: string
}

// 页面边距
export interface PageMargins {
  top: number
  right: number
  bottom: number
  left: number
}

// 页面设置
export interface PageSettings {
  size: PageSize
  orientation: PageOrientation
  margins: PageMargins
}

// 封面设置
export interface CoverSettings {
  enabled: boolean
  title: string
  subtitle?: string
  author?: string
  description?: string
  backgroundColor?: string
  textColor?: string
  imageUrl?: string
}

// 章节设置
export interface ChapterSettings {
  numbering: boolean
  separator: string
  pageBreak: boolean
  includeSummary: boolean
}

// 页眉页脚设置
export interface HeaderFooterSettings {
  headerEnabled: boolean
  headerText?: string
  footerEnabled: boolean
  footerText?: string
  pageNumberEnabled: boolean
  pageNumberPosition: 'center' | 'left' | 'right'
}

// 导出选项
export interface ExportOptions {
  // 基本选项
  format: ExportFormatType
  includeTitle: boolean
  includeAuthor: boolean
  authorName: string

  // 章节选择
  selectedChapters?: number[] // 章节索引数组，为空表示全部
  chapterRange?: { start: number; end: number }

  // 样式设置
  font: FontSettings
  page: PageSettings

  // 封面设置
  cover: CoverSettings

  // 章节设置
  chapter: ChapterSettings

  // 页眉页脚
  headerFooter: HeaderFooterSettings

  // 模板
  template?: string

  // 元数据
  metadata?: {
    title?: string
    author?: string
    description?: string
    keywords?: string[]
    language?: string
    publisher?: string
    rights?: string
  }
}

// 默认字体设置
export const defaultFontSettings: FontSettings = {
  family: 'SimSun, serif',
  size: 16,
  lineHeight: 1.8,
  color: '#333333'
}

// 默认页面设置
export const defaultPageSettings: PageSettings = {
  size: 'A4',
  orientation: 'portrait',
  margins: {
    top: 25,
    right: 25,
    bottom: 25,
    left: 25
  }
}

// 默认封面设置
export const defaultCoverSettings: CoverSettings = {
  enabled: true,
  title: '',
  subtitle: '',
  author: '',
  description: '',
  backgroundColor: '#f5f5f5',
  textColor: '#333333'
}

// 默认章节设置
export const defaultChapterSettings: ChapterSettings = {
  numbering: true,
  separator: '---',
  pageBreak: true,
  includeSummary: false
}

// 默认页眉页脚设置
export const defaultHeaderFooterSettings: HeaderFooterSettings = {
  headerEnabled: false,
  headerText: '',
  footerEnabled: true,
  footerText: '',
  pageNumberEnabled: true,
  pageNumberPosition: 'center'
}

// 默认导出选项
export const defaultExportOptions: ExportOptions = {
  format: 'txt',
  includeTitle: true,
  includeAuthor: false,
  authorName: '',
  font: defaultFontSettings,
  page: defaultPageSettings,
  cover: defaultCoverSettings,
  chapter: defaultChapterSettings,
  headerFooter: defaultHeaderFooterSettings
}

// 页面尺寸映射（单位：毫米）
export const pageSizeMap: Record<PageSize, { width: number; height: number }> = {
  A4: { width: 210, height: 297 },
  A5: { width: 148, height: 210 },
  B5: { width: 176, height: 250 },
  letter: { width: 216, height: 279 },
  legal: { width: 216, height: 356 }
}

// 支持的导出格式
export const supportedFormats: ExportFormatType[] = ['txt', 'md', 'html', 'epub', 'pdf']

// 格式显示名称
export const formatDisplayNames: Record<ExportFormatType, string> = {
  txt: '纯文本 (TXT)',
  md: 'Markdown',
  html: '网页 (HTML)',
  epub: '电子书 (EPUB)',
  pdf: 'PDF文档'
}

// 格式MIME类型
export const formatMimeTypes: Record<ExportFormatType, string> = {
  txt: 'text/plain; charset=utf-8',
  md: 'text/markdown; charset=utf-8',
  html: 'text/html; charset=utf-8',
  epub: 'application/epub+zip',
  pdf: 'application/pdf'
}

// 格式文件扩展名
export const formatExtensions: Record<ExportFormatType, string> = {
  txt: '.txt',
  md: '.md',
  html: '.html',
  epub: '.epub',
  pdf: '.pdf'
}

// TXT导出特定配置
export const txtExportConfig = {
  encoding: 'utf-8',
  lineEnding: '\n',
  bom: true // 是否添加UTF-8 BOM
}

// Markdown导出特定配置
export const mdExportConfig = {
  flavor: 'github', // github, commonmark, etc.
  tableOfContents: true,
  syntaxHighlighting: false
}

// HTML导出特定配置
export const htmlExportConfig = {
  minify: false,
  inlineCss: true,
  responsive: true,
  includePrintStyles: true
}

// EPUB导出特定配置
export const epubExportConfig = {
  version: '3.0',
  coverImage: '',
  cssFile: '',
  tocDepth: 2
}

// PDF导出特定配置
export const pdfExportConfig = {
  printBackground: true,
  preferCSSPageSize: true,
  scale: 1,
  displayHeaderFooter: true
}

// 验证导出选项
export function validateExportOptions(options: Partial<ExportOptions>): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // 验证格式
  if (options.format && !supportedFormats.includes(options.format)) {
    errors.push(`不支持的导出格式: ${options.format}。支持的格式: ${supportedFormats.join(', ')}`)
  }

  // 验证字体大小
  if (options.font?.size !== undefined) {
    if (options.font.size < 8 || options.font.size > 72) {
      errors.push('字体大小必须在8-72之间')
    }
  }

  // 验证行高
  if (options.font?.lineHeight !== undefined) {
    if (options.font.lineHeight < 1 || options.font.lineHeight > 3) {
      errors.push('行高必须在1-3之间')
    }
  }

  // 验证页面边距
  if (options.page?.margins) {
    const { top, right, bottom, left } = options.page.margins
    if ([top, right, bottom, left].some(m => m < 0 || m > 100)) {
      errors.push('页面边距必须在0-100毫米之间')
    }
  }

  // 验证章节范围
  if (options.chapterRange) {
    const { start, end } = options.chapterRange
    if (start < 1) {
      errors.push('起始章节必须大于等于1')
    }
    if (end < start) {
      errors.push('结束章节不能小于起始章节')
    }
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

// 合并导出选项
export function mergeExportOptions(options: Partial<ExportOptions>): ExportOptions {
  return {
    ...defaultExportOptions,
    ...options,
    font: { ...defaultFontSettings, ...options.font },
    page: {
      ...defaultPageSettings,
      ...options.page,
      margins: { ...defaultPageSettings.margins, ...options.page?.margins }
    },
    cover: { ...defaultCoverSettings, ...options.cover },
    chapter: { ...defaultChapterSettings, ...options.chapter },
    headerFooter: { ...defaultHeaderFooterSettings, ...options.headerFooter }
  }
}

// 获取页面尺寸（考虑方向）
export function getPageDimensions(pageSettings: PageSettings): { width: number; height: number } {
  const size = pageSizeMap[pageSettings.size]
  if (pageSettings.orientation === 'landscape') {
    return { width: size.height, height: size.width }
  }
  return size
}

export default {
  defaultExportOptions,
  defaultFontSettings,
  defaultPageSettings,
  defaultCoverSettings,
  defaultChapterSettings,
  defaultHeaderFooterSettings,
  supportedFormats,
  formatDisplayNames,
  formatMimeTypes,
  formatExtensions,
  pageSizeMap,
  txtExportConfig,
  mdExportConfig,
  htmlExportConfig,
  epubExportConfig,
  pdfExportConfig,
  validateExportOptions,
  mergeExportOptions,
  getPageDimensions
}
