import { z } from 'zod'

// 小说类型枚举
const novelGenreSchema = z.enum([
  'fantasy', 'wuxia', 'xianxia', 'romance', 'scifi',
  'mystery', 'history', 'urban', 'game', 'horror', 'military', 'general'
])

// 小说长度枚举
const novelLengthSchema = z.enum(['short', 'medium', 'long', 'epic'])

// 小说验证模式
export const novelSchema = z.object({
  title: z.string().min(1, '小说标题不能为空').max(200, '小说标题不能超过200个字符'),
  type: z.string().max(50, '类型不能超过50个字符').optional().default('general'),
  description: z.string().max(2000, '描述不能超过2000个字符').optional(),
  prompt: z.string().max(5000, '提示词不能超过5000个字符').optional(),
  outline: z.string().max(10000, '大纲不能超过10000个字符').optional(),
  style: z.string().max(50, '风格不能超过50个字符').optional(),
  targetWordCount: z.number().min(1000, '目标字数至少为1000').max(10000000, '目标字数不能超过1000万').optional().default(50000),
  status: z.enum(['generating', 'completed', 'failed', 'draft']).optional().default('draft')
})

// 更新小说验证模式
export const updateNovelSchema = novelSchema.partial()

// 章节验证模式
export const chapterSchema = z.object({
  title: z.string().min(1, '章节标题不能为空').max(200, '章节标题不能超过200个字符'),
  content: z.string().max(500000, '章节内容不能超过50万字符').optional(),
  orderIndex: z.number().min(0, '排序索引不能为负数').optional()
})

// 更新章节验证模式
export const updateChapterSchema = chapterSchema.partial()

// 生成请求验证模式
export const generateRequestSchema = z.object({
  title: z.string().min(1, '小说标题不能为空').max(200, '小说标题不能超过200个字符'),
  prompt: z.string().min(1, '生成提示不能为空').max(5000, '生成提示不能超过5000个字符'),
  style: z.string().max(50, '风格不能超过50个字符').optional(),
  wordCount: z.number().min(1000, '字数至少为1000').max(10000000, '字数不能超过1000万').optional().default(50000),
  outline: z.string().max(10000, '大纲不能超过10000个字符').optional(),
  type: novelGenreSchema.optional().default('general'),
  length: novelLengthSchema.optional().default('medium'),
  logicRequirements: z.string().max(5000, '逻辑要求不能超过5000个字符').optional()
})

// 大纲生成请求验证模式
export const outlineGenerateSchema = z.object({
  novelId: z.string().uuid('无效的小说ID').optional(),
  title: z.string().min(1, '标题不能为空').max(200, '标题不能超过200个字符'),
  prompt: z.string().min(1, '提示不能为空').max(5000, '提示不能超过5000个字符'),
  style: z.string().max(50, '风格不能超过50个字符').optional(),
  wordCount: z.number().min(1000, '字数至少为1000').max(10000000, '字数不能超过1000万').optional().default(50000),
  type: novelGenreSchema.optional().default('general'),
  length: novelLengthSchema.optional().default('medium')
})

// 从大纲生成请求验证模式
export const generateFromOutlineSchema = z.object({
  title: z.string().min(1, '标题不能为空').max(200, '标题不能超过200个字符'),
  chapterNumber: z.number().min(1, '章节号至少为1').int('章节号必须是整数'),
  chapterTitle: z.string().min(1, '章节标题不能为空').max(200, '章节标题不能超过200个字符'),
  outline: z.string().min(1, '大纲不能为空').max(10000, '大纲不能超过10000个字符'),
  previousContent: z.string().max(10000, '前文内容不能超过10000个字符').optional(),
  targetWords: z.number().min(100, '目标字数至少为100').max(20000, '目标字数不能超过20000').optional().default(3000),
  genre: novelGenreSchema.optional().default('general')
})

// AI配置验证模式
export const aiConfigSchema = z.object({
  apiKey: z.string().optional().default(''),
  baseUrl: z.string().url('无效的API地址'),
  model: z.string().min(1, '模型名称不能为空'),
  customModelName: z.string().optional(),
  temperature: z.number().min(0).max(2).optional().default(0.7),
  maxTokens: z.number().min(1).max(100000).optional().default(4000)
})

// CURL配置验证模式
export const curlConfigSchema = z.object({
  useCustomCurl: z.boolean(),
  curlCommand: z.string().max(10000, 'CURL命令不能超过10000个字符')
})

// 设置验证模式
export const settingsSchema = z.object({
  aiConfig: aiConfigSchema.optional(),
  curlConfig: curlConfigSchema.optional(),
  theme: z.enum(['light', 'dark', 'auto']).optional().default('auto'),
  language: z.string().max(10, '语言代码不能超过10个字符').optional().default('zh-CN')
})

// AI生成请求验证模式
export const aiGenerateSchema = z.object({
  prompt: z.string().min(1, '提示词不能为空').max(10000, '提示词不能超过10000个字符'),
  systemPrompt: z.string().max(5000, '系统提示词不能超过5000个字符').optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().min(1).max(100000).optional()
})

// 自定义CURL请求验证模式
export const customCurlSchema = z.object({
  command: z.string().min(1, 'CURL命令不能为空').max(10000, 'CURL命令不能超过10000个字符'),
  prompt: z.string().min(1, '提示词不能为空').max(10000, '提示词不能超过10000个字符')
})

// 解析CURL请求验证模式
export const parseCurlSchema = z.object({
  command: z.string().min(1, 'CURL命令不能为空').max(10000, 'CURL命令不能超过10000个字符')
})

// 取消生成请求验证模式
export const cancelGenerateSchema = z.object({
  id: z.string().uuid('无效的生成任务ID')
})

// 分页参数验证模式
export const paginationSchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional().default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).optional().default('20'),
  search: z.string().max(200, '搜索关键词不能超过200个字符').optional(),
  type: z.string().max(50).optional(),
  status: z.string().max(50).optional(),
  sortBy: z.enum(['created_at', 'updated_at', 'word_count', 'title']).optional().default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
})

// 导出选项验证模式
export const exportOptionsSchema = z.object({
  includeTitle: z.boolean().optional().default(true),
  includeAuthor: z.boolean().optional().default(false),
  authorName: z.string().max(100, '作者名称不能超过100个字符').optional()
})

// 批量生成验证模式
export const batchGenerateSchema = z.object({
  novelId: z.string().uuid('无效的小说ID'),
  startChapter: z.number().min(1, '起始章节至少为1').int('起始章节必须是整数'),
  endChapter: z.number().min(1, '结束章节至少为1').int('结束章节必须是整数'),
  outline: z.string().min(1, '大纲不能为空').max(10000, '大纲不能超过10000个字符'),
  contentBlockSize: z.number().min(5000, '内容块大小至少为5000字').max(10000, '内容块大小不能超过10000字').optional().default(7500)
}).refine((data: { startChapter: number; endChapter: number }) => data.endChapter >= data.startChapter, {
  message: '结束章节不能小于起始章节',
  path: ['endChapter']
})

// 续写验证模式
export const continueNovelSchema = z.object({
  novelId: z.string().uuid('无效的小说ID'),
  chaptersToAdd: z.number().min(1, '添加章节数至少为1').max(50, '一次最多添加50章').int('添加章节数必须是整数')
})

// 生成大纲验证模式
export const generateOutlineSchema = z.object({
  title: z.string().min(1, '标题不能为空').max(200, '标题不能超过200个字符'),
  prompt: z.string().min(1, '提示不能为空').max(5000, '提示不能超过5000个字符'),
  genre: novelGenreSchema.optional().default('general'),
  length: novelLengthSchema.optional().default('medium')
})

// 测试CURL配置验证模式
export const testCurlSchema = z.object({
  command: z.string().min(1, 'CURL命令不能为空').max(10000, 'CURL命令不能超过10000个字符')
})

// 自动大纲生成请求验证模式
export const autoOutlineGenerateSchema = z.object({
  title: z.string().min(1, '标题不能为空').max(200, '标题不能超过200个字符'),
  prompt: z.string().min(1, '提示不能为空').max(5000, '提示不能超过5000个字符'),
  templateId: z.string().max(100, '模板ID不能超过100个字符').optional(),
  style: z.string().max(50, '风格不能超过50个字符').optional(),
  styleConfig: z.record(z.unknown()).optional(),
  wordCount: z.number().min(1000, '字数至少为1000').max(10000000, '字数不能超过1000万').optional().default(50000),
  type: novelGenreSchema.optional().default('general'),
  length: novelLengthSchema.optional().default('medium')
})

// 验证函数
export function validate<T>(schema: { safeParse(data: unknown): { success: true; data: T } | { success: false; error: { errors: Array<{ path: (string | number)[]; message: string }> } } }, data: unknown): { success: true; data: T } | { success: false; errors: string[] } {
  const result = schema.safeParse(data)

  if (result.success) {
    return { success: true, data: result.data }
  } else {
    const errors = result.error.errors.map((err) => `${err.path.join('.')}: ${err.message}`)
    return { success: false, errors }
  }
}

// 异步验证函数
export async function validateAsync<T>(schema: { safeParseAsync(data: unknown): Promise<{ success: true; data: T } | { success: false; error: { errors: Array<{ path: (string | number)[]; message: string }> } }> }, data: unknown): Promise<{ success: true; data: T } | { success: false; errors: string[] }> {
  const result = await schema.safeParseAsync(data)

  if (result.success) {
    return { success: true, data: result.data }
  } else {
    const errors = result.error.errors.map((err) => `${err.path.join('.')}: ${err.message}`)
    return { success: false, errors }
  }
}

// 验证并抛出错误
export function validateOrThrow<T>(schema: { safeParse(data: unknown): { success: true; data: T } | { success: false; error: { errors: Array<{ path: (string | number)[]; message: string }> } } }, data: unknown): T {
  const result = validate<T>(schema, data)
  if (!result.success) {
    throw new Error(`验证失败: ${result.errors.join(', ')}`)
  }
  return result.data
}

export default {
  novelSchema,
  updateNovelSchema,
  chapterSchema,
  updateChapterSchema,
  generateRequestSchema,
  outlineGenerateSchema,
  generateFromOutlineSchema,
  aiConfigSchema,
  curlConfigSchema,
  settingsSchema,
  aiGenerateSchema,
  customCurlSchema,
  parseCurlSchema,
  cancelGenerateSchema,
  paginationSchema,
  exportOptionsSchema,
  batchGenerateSchema,
  continueNovelSchema,
  generateOutlineSchema,
  testCurlSchema,
  autoOutlineGenerateSchema,
  validate,
  validateAsync,
  validateOrThrow
}
