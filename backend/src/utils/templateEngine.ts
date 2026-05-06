/**
 * 模板引擎
 * 支持变量替换、条件渲染和循环渲染
 */

// 模板变量类型
export type TemplateVariable = string | number | boolean | undefined | null

// 模板上下文
export interface TemplateContext {
  [key: string]: TemplateVariable | TemplateVariable[] | TemplateContext | TemplateContext[]
}

// 模板配置
export interface TemplateConfig {
  openDelimiter: string
  closeDelimiter: string
  escapeHtml: boolean
}

// 默认模板配置
const defaultConfig: TemplateConfig = {
  openDelimiter: '{{',
  closeDelimiter: '}}',
  escapeHtml: true
}

// HTML转义
function escapeHtml(text: string): string {
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;'
  }
  return text.replace(/[&<>"'/]/g, char => htmlEscapes[char] || char)
}

// 获取嵌套对象值
function getNestedValue(obj: TemplateContext, path: string): TemplateVariable {
  const keys = path.split('.')
  let value: unknown = obj

  for (const key of keys) {
    if (value === null || value === undefined) {
      return undefined
    }
    if (typeof value === 'object' && !Array.isArray(value)) {
      value = (value as Record<string, unknown>)[key]
    } else {
      return undefined
    }
  }

  return value as TemplateVariable
}

// 解析条件表达式
function evaluateCondition(condition: string, context: TemplateContext): boolean {
  const trimmedCondition = condition.trim()

  // 处理简单变量存在性检查
  if (!trimmedCondition.includes(' ') && !trimmedCondition.includes('==') && !trimmedCondition.includes('!=')) {
    const value = getNestedValue(context, trimmedCondition)
    return value !== undefined && value !== null && value !== false && value !== ''
  }

  // 处理比较表达式
  const equalMatch = trimmedCondition.match(/^(.+?)\s*==\s*(.+)$/)
  if (equalMatch) {
    const left = getNestedValue(context, equalMatch[1].trim())
    const right = equalMatch[2].trim().replace(/^["']|["']$/g, '')
    return String(left) === right
  }

  const notEqualMatch = trimmedCondition.match(/^(.+?)\s*!=\s*(.+)$/)
  if (notEqualMatch) {
    const left = getNestedValue(context, notEqualMatch[1].trim())
    const right = notEqualMatch[2].trim().replace(/^["']|["']$/g, '')
    return String(left) !== right
  }

  // 默认返回false
  return false
}

// 渲染变量
function renderVariable(template: string, context: TemplateContext, config: TemplateConfig): string {
  const { openDelimiter, closeDelimiter, escapeHtml: shouldEscape } = config
  const regex = new RegExp(`${openDelimiter}\\s*(.+?)\\s*${closeDelimiter}`, 'g')

  return template.replace(regex, (match, variablePath) => {
    const value = getNestedValue(context, variablePath.trim())

    if (value === undefined || value === null) {
      return ''
    }

    const stringValue = String(value)
    return shouldEscape ? escapeHtml(stringValue) : stringValue
  })
}

// 渲染条件语句
function renderConditions(template: string, context: TemplateContext, config: TemplateConfig): string {
  const { openDelimiter, closeDelimiter } = config

  // 处理 if-else
  const ifRegex = new RegExp(
    `${openDelimiter}\\s*if\\s+(.+?)\\s*${closeDelimiter}([\\s\\S]*?)` +
    `(?:${openDelimiter}\\s*else\\s*${closeDelimiter}([\\s\\S]*?))?` +
    `${openDelimiter}\\s*endif\\s*${closeDelimiter}`,
    'g'
  )

  return template.replace(ifRegex, (match, condition, ifContent, elseContent = '') => {
    const conditionResult = evaluateCondition(condition, context)
    return conditionResult ? ifContent.trim() : elseContent.trim()
  })
}

// 渲染循环语句
function renderLoops(template: string, context: TemplateContext, config: TemplateConfig): string {
  const { openDelimiter, closeDelimiter } = config

  // 处理 for 循环
  const forRegex = new RegExp(
    `${openDelimiter}\\s*for\\s+(\\w+)\\s+in\\s+(.+?)\\s*${closeDelimiter}([\\s\\S]*?)` +
    `${openDelimiter}\\s*endfor\\s*${closeDelimiter}`,
    'g'
  )

  return template.replace(forRegex, (match, itemName, arrayPath, loopContent) => {
    const array = getNestedValue(context, arrayPath.trim())

    if (!Array.isArray(array)) {
      return ''
    }

    return array.map((item, index) => {
      const loopContext: TemplateContext = {
        ...context,
        [itemName]: item,
        [`${itemName}_index`]: index + 1,
        [`${itemName}_first`]: index === 0,
        [`${itemName}_last`]: index === array.length - 1
      }

      return renderTemplate(loopContent, loopContext, { ...config, escapeHtml: false })
    }).join('')
  })
}

// 主渲染函数
export function renderTemplate(
  template: string,
  context: TemplateContext,
  config: Partial<TemplateConfig> = {}
): string {
  const mergedConfig = { ...defaultConfig, ...config }

  let result = template

  // 按顺序渲染：循环 -> 条件 -> 变量
  result = renderLoops(result, context, mergedConfig)
  result = renderConditions(result, context, mergedConfig)
  result = renderVariable(result, context, mergedConfig)

  return result
}

// 预编译模板
export function compileTemplate(template: string, config: Partial<TemplateConfig> = {}) {
  const mergedConfig = { ...defaultConfig, ...config }

  return (context: TemplateContext): string => {
    return renderTemplate(template, context, mergedConfig)
  }
}

// 内置模板
export const builtInTemplates = {
  // TXT模板
  txt: `{{ title }}
{{ '=' | repeat title.length }}

{{ if author }}
作者：{{ author }}

{{ endif }}
{{ if description }}
【简介】
{{ description }}

{{ endif }}
{{ for chapter in chapters }}
{{ chapter.title }}
{{ '-' | repeat chapter.title.length }}

{{ chapter.content }}

{{ endfor }}

【完】
总字数：{{ wordCount }}字
章节数：{{ chapterCount }}章`,

  // Markdown模板
  markdown: `# {{ title }}

{{ if author }}
**作者：{{ author }}**

{{ endif }}
{{ if description }}
## 简介

{{ description }}

---

{{ endif }}
{{ for chapter in chapters }}
## {{ chapter.title }}

{{ chapter.content }}

---

{{ endfor }}

* * *

**完**

- 总字数：{{ wordCount }}字
- 章节数：{{ chapterCount }}章`,

  // HTML模板
  html: `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{ title }}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: {{ font.family }};
      font-size: {{ font.size }}px;
      line-height: {{ font.lineHeight }};
      color: {{ font.color }};
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
      background: #f5f5f5;
    }
    .container {
      background: #fff;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .novel-header {
      text-align: center;
      margin-bottom: 40px;
      padding-bottom: 30px;
      border-bottom: 2px solid #eee;
    }
    .novel-title {
      font-size: 2.5em;
      color: #1a1a1a;
      margin-bottom: 15px;
    }
    .novel-meta {
      color: #666;
      font-size: 0.95em;
    }
    .novel-description {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 6px;
      margin: 30px 0;
      color: #555;
    }
    .chapter {
      margin: 40px 0;
      padding: 30px 0;
      border-bottom: 1px solid #eee;
    }
    .chapter:last-child {
      border-bottom: none;
    }
    .chapter-title {
      font-size: 1.5em;
      color: #2c3e50;
      margin-bottom: 20px;
      text-align: center;
    }
    .chapter-content {
      text-align: justify;
      text-indent: 2em;
      font-size: 1.1em;
      line-height: 2;
    }
    .novel-footer {
      text-align: center;
      margin-top: 50px;
      padding-top: 30px;
      border-top: 2px solid #eee;
      color: #999;
    }
    @media print {
      body {
        background: #fff;
        padding: 0;
      }
      .container {
        box-shadow: none;
        padding: 20px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <header class="novel-header">
      <h1 class="novel-title">{{ title }}</h1>
      {{ if author }}
      <p class="novel-meta">作者：{{ author }}</p>
      {{ endif }}
    </header>

    {{ if description }}
    <div class="novel-description">
      <strong>简介</strong><br>
      {{ description }}
    </div>
    {{ endif }}

    <main class="novel-content">
      {{ for chapter in chapters }}
      <div class="chapter">
        <h2 class="chapter-title">{{ chapter.title }}</h2>
        <div class="chapter-content">{{ chapter.content }}</div>
      </div>
      {{ endfor }}
    </main>

    <footer class="novel-footer">
      <p>【完】</p>
      <p>总字数：{{ wordCount }}字 | 章节数：{{ chapterCount }}章</p>
    </footer>
  </div>
</body>
</html>`,

  // EPUB内容模板
  epub: {
    contentOpf: `<?xml version="1.0" encoding="UTF-8"?>
<package version="3.0" xmlns="http://www.idpf.org/2007/opf">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>{{ title }}</dc:title>
    <dc:creator>{{ author }}</dc:creator>
    <dc:language>zh-CN</dc:language>
    <dc:identifier id="book-id">{{ id }}</dc:identifier>
    <dc:description>{{ description }}</dc:description>
    <meta property="dcterms:modified">{{ modified }}</meta>
  </metadata>
  <manifest>
    <item id="toc" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="stylesheet" href="stylesheet.css" media-type="text/css"/>
    {{ for chapter in chapters }}
    <item id="chapter{{ chapter.index }}" href="chapter{{ chapter.index }}.xhtml" media-type="application/xhtml+xml"/>
    {{ endfor }}
  </manifest>
  <spine toc="toc">
    {{ for chapter in chapters }}
    <itemref idref="chapter{{ chapter.index }}"/>
    {{ endfor }}
  </spine>
</package>`,

    tocNcx: `<?xml version="1.0" encoding="UTF-8"?>
<ncx version="2005-1" xmlns="http://www.daisy.org/z3986/2005/ncx/">
  <head>
    <meta name="dtb:uid" content="{{ id }}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle>
    <text>{{ title }}</text>
  </docTitle>
  <navMap>
    {{ for chapter in chapters }}
    <navPoint id="navpoint-{{ chapter.index }}" playOrder="{{ chapter.index }}">
      <navLabel>
        <text>{{ chapter.title }}</text>
      </navLabel>
      <content src="chapter{{ chapter.index }}.xhtml"/>
    </navPoint>
    {{ endfor }}
  </navMap>
</ncx>`,

    chapterXhtml: `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>{{ chapter.title }}</title>
  <link rel="stylesheet" type="text/css" href="stylesheet.css"/>
</head>
<body>
  <h1>{{ chapter.title }}</h1>
  <div class="chapter-content">{{ chapter.content }}</div>
</body>
</html>`,

    stylesheet: `body {
  font-family: {{ font.family }};
  font-size: {{ font.size }}pt;
  line-height: {{ font.lineHeight }};
  color: {{ font.color }};
  margin: 2em;
  text-align: justify;
}
h1 {
  text-align: center;
  margin-bottom: 2em;
  font-size: 1.5em;
}
.chapter-content {
  text-indent: 2em;
  margin-bottom: 0.5em;
}`
  },

  // PDF HTML模板（用于Puppeteer生成PDF）
  pdf: `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>{{ title }}</title>
  <style>
    @page {
      size: {{ page.size }} {{ page.orientation }};
      margin: {{ page.margins.top }}mm {{ page.margins.right }}mm {{ page.margins.bottom }}mm {{ page.margins.left }}mm;
      {{ if headerFooter.pageNumberEnabled }}
      @bottom-center {
        content: counter(page);
        font-size: 10pt;
        color: #666;
      }
      {{ endif }}
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: {{ font.family }};
      font-size: {{ font.size }}pt;
      line-height: {{ font.lineHeight }};
      color: {{ font.color }};
    }
    .cover {
      page-break-after: always;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      height: 100vh;
      text-align: center;
      background: {{ cover.backgroundColor }};
      color: {{ cover.textColor }};
    }
    .cover-title {
      font-size: 2.5em;
      margin-bottom: 1em;
    }
    .cover-author {
      font-size: 1.2em;
      margin-bottom: 2em;
    }
    .cover-description {
      max-width: 80%;
      font-size: 0.9em;
      line-height: 1.6;
    }
    .chapter {
      page-break-before: always;
    }
    .chapter:first-of-type {
      page-break-before: auto;
    }
    .chapter-title {
      font-size: 1.5em;
      text-align: center;
      margin-bottom: 2em;
      color: #2c3e50;
    }
    .chapter-content {
      text-align: justify;
      text-indent: 2em;
    }
    .chapter-content p {
      margin-bottom: 0.5em;
    }
  </style>
</head>
<body>
  {{ if cover.enabled }}
  <div class="cover">
    <h1 class="cover-title">{{ title }}</h1>
    {{ if author }}
    <p class="cover-author">作者：{{ author }}</p>
    {{ endif }}
    {{ if description }}
    <p class="cover-description">{{ description }}</p>
    {{ endif }}
  </div>
  {{ endif }}

  {{ for chapter in chapters }}
  <div class="chapter">
    <h2 class="chapter-title">{{ chapter.title }}</h2>
    <div class="chapter-content">{{ chapter.content }}</div>
  </div>
  {{ endfor }}
</body>
</html>`
}

// 辅助过滤器（在模板中使用）
export const templateFilters = {
  repeat: (str: string, count: number): string => str.repeat(Math.max(0, count)),
  upper: (str: string): string => str.toUpperCase(),
  lower: (str: string): string => str.toLowerCase(),
  trim: (str: string): string => str.trim(),
  truncate: (str: string, length: number): string => {
    if (str.length <= length) return str
    return str.substring(0, length) + '...'
  },
  date: (date: Date, format: string = 'YYYY-MM-DD'): string => {
    const d = new Date(date)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return format
      .replace('YYYY', String(year))
      .replace('MM', month)
      .replace('DD', day)
  }
}

export default {
  renderTemplate,
  compileTemplate,
  builtInTemplates,
  templateFilters,
  escapeHtml
}
