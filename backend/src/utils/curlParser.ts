/**
 * CURL命令解析器
 * 支持解析各种CURL命令格式，提取URL、Headers、Body等信息
 */

export interface ParsedCurlCommand {
  url: string
  method: string
  headers: Record<string, string>
  body?: string
  queryParams: Record<string, string>
  isJsonBody: boolean
}

export interface CurlParseResult {
  success: boolean
  data?: ParsedCurlCommand
  error?: string
}

/**
 * 解析命令（支持CURL命令和Python代码）
 * @param command 命令字符串
 * @returns 解析结果
 */
export function parseCurlCommand(command: string): CurlParseResult {
  try {
    // 去除首尾空白字符
    const trimmedCommand = command.trim()

    const result: ParsedCurlCommand = {
      url: '',
      method: 'POST',
      headers: {},
      queryParams: {},
      isJsonBody: true
    }

    // 检查是否是Python代码
    if (trimmedCommand.toLowerCase().startsWith('import ')) {
      // 提取URL
      const urlMatch = trimmedCommand.match(/endpoint\s*=\s*['"](https?:\/\/[^'"]+)['"]/i)
      if (urlMatch) {
        result.url = urlMatch[1]
      } else {
        // 尝试更宽松的URL匹配
        const looseUrlMatch = trimmedCommand.match(/(https?:\/\/[^\s'"]+)/i)
        if (looseUrlMatch) {
          result.url = looseUrlMatch[1]
        }
      }

      if (!result.url) {
        return { success: false, error: '无法从Python代码中提取URL' }
      }

      // 提取API密钥
      const tokenMatch = trimmedCommand.match(/token\s*=\s*[^\n]+/i)
      if (tokenMatch) {
        // 尝试提取实际的token值
        const tokenValueMatch = tokenMatch[0].match(/['"]([^'"]+)['"]/)
        if (tokenValueMatch) {
          result.headers['Authorization'] = `Bearer ${tokenValueMatch[1]}`
        }
      }

      // 提取模型名称
      const modelMatch = trimmedCommand.match(/model\s*=\s*['"]([^'"]+)['"]/i)
      let modelName = 'deepseek/DeepSeek-V3-0324' // 默认模型
      if (modelMatch) {
        modelName = modelMatch[1]
      }

      // 构建请求体
      result.body = JSON.stringify({
        model: modelName,
        messages: [
          { role: 'user', content: '${prompt}' }
        ],
        temperature: 0.7,
        max_tokens: 4000
      })

      // 设置Content-Type
      result.headers['Content-Type'] = 'application/json'
      result.isJsonBody = true
    }
    // 处理CURL命令
    else if (trimmedCommand.toLowerCase().startsWith('curl')) {
      // 提取URL - 支持多种格式
      // 1. curl "http://example.com"
      // 2. curl -X POST http://example.com
      // 3. curl http://example.com -H "..."
      const urlPatterns = [
        /curl\s+['"]([^'"]+)['"]/i,           // curl "url"
        /curl\s+(-[a-zA-Z-]+\s+[^\s]+\s+)*['"]?([^\s'"]+)['"]?/i,  // curl -X POST url
      ]

      let urlMatch: RegExpMatchArray | null = null
      for (const pattern of urlPatterns) {
        urlMatch = trimmedCommand.match(pattern)
        if (urlMatch) {
          // 获取最后一个捕获组作为URL
          const potentialUrl = urlMatch[urlMatch.length - 1]
          if (potentialUrl && (potentialUrl.startsWith('http://') || potentialUrl.startsWith('https://'))) {
            result.url = potentialUrl.replace(/['"]/g, '')
            break
          }
        }
      }

      // 如果没有匹配到URL，尝试更宽松的匹配
      if (!result.url) {
        const looseUrlMatch = trimmedCommand.match(/(https?:\/\/[^\s'"]+)/i)
        if (looseUrlMatch) {
          result.url = looseUrlMatch[1]
        }
      }

      if (!result.url) {
        return { success: false, error: '无法从CURL命令中提取URL' }
      }

      // 解析URL中的查询参数
      const urlObj = new URL(result.url)
      urlObj.searchParams.forEach((value, key) => {
        result.queryParams[key] = value
      })
      // 移除查询参数后的纯净URL
      result.url = result.url.split('?')[0]

      // 提取HTTP方法
      const methodMatch = trimmedCommand.match(/-X\s+['"]?([A-Z]+)['"]?/i)
      if (methodMatch) {
        result.method = methodMatch[1].toUpperCase()
      } else if (trimmedCommand.includes('-d ') || trimmedCommand.includes('--data')) {
        // 如果有请求体但没有指定方法，默认为POST
        result.method = 'POST'
      }

      // 提取请求头
      const headerMatches = trimmedCommand.matchAll(/-H\s+['"]([^'"]+)['"]/gi)
      for (const match of headerMatches) {
        const headerLine = match[1]
        const colonIndex = headerLine.indexOf(':')
        if (colonIndex > 0) {
          const key = headerLine.substring(0, colonIndex).trim()
          const value = headerLine.substring(colonIndex + 1).trim()
          result.headers[key] = value

          // 检测是否为JSON内容类型
          if (key.toLowerCase() === 'content-type' && value.includes('application/json')) {
            result.isJsonBody = true
          }
        }
      }

      // 提取请求体 - 支持多种格式
      // -d "data"
      // --data "data"
      // --data-raw "data"
      // --data-binary "data"
      const bodyPatterns = [
        /-d\s+['"]([\s\S]*?)['"](?:\s+-|$)/i,
        /--data\s+['"]([\s\S]*?)['"](?:\s+-|$)/i,
        /--data-raw\s+['"]([\s\S]*?)['"](?:\s+-|$)/i,
        /--data-binary\s+['"]([\s\S]*?)['"](?:\s+-|$)/i,
      ]

      for (const pattern of bodyPatterns) {
        const bodyMatch = trimmedCommand.match(pattern)
        if (bodyMatch) {
          result.body = bodyMatch[1]
          break
        }
      }

      // 如果没有Content-Type但有请求体，默认设置为JSON
      if (result.body && !result.headers['Content-Type'] && !result.headers['content-type']) {
        result.headers['Content-Type'] = 'application/json'
        result.isJsonBody = true
      }

      // 提取其他常见选项
      // 跟随重定向
      if (trimmedCommand.includes('-L') || trimmedCommand.includes('--location')) {
        // 标记需要跟随重定向（在后续HTTP请求中处理）
      }

      // 超时设置
      const timeoutMatch = trimmedCommand.match(/--connect-timeout\s+(\d+)/i)
      if (timeoutMatch) {
        // 可以存储超时时间供后续使用
      }
    } else {
      return { success: false, error: '无效的命令格式，支持CURL命令和Python代码' }
    }

    return { success: true, data: result }
  } catch (error) {
    return {
      success: false,
      error: `解析命令失败: ${error instanceof Error ? error.message : '未知错误'}`
    }
  }
}

/**
 * 将解析的CURL命令转换为axios配置
 * @param parsed 解析后的CURL命令
 * @param promptReplacement 用于替换提示词的占位符内容
 * @returns axios配置对象
 */
export function convertToAxiosConfig(
  parsed: ParsedCurlCommand,
  promptReplacement?: string
): {
  method: string
  url: string
  headers: Record<string, string>
  data?: unknown
  timeout: number
} {
  let bodyData: unknown = undefined

  if (parsed.body) {
    let processedBody = parsed.body

    // 如果提供了提示词替换内容，替换占位符
    if (promptReplacement !== undefined) {
      processedBody = processedBody
        .replace(/\$\{prompt\}/g, promptReplacement)
        .replace(/"\$prompt"/g, JSON.stringify(promptReplacement))
        .replace(/\$prompt/g, JSON.stringify(promptReplacement))
    }

    // 尝试解析JSON
    if (parsed.isJsonBody) {
      try {
        bodyData = JSON.parse(processedBody)
      } catch {
        // 如果解析失败，使用原始字符串
        bodyData = processedBody
      }
    } else {
      bodyData = processedBody
    }
  }

  return {
    method: parsed.method,
    url: parsed.url,
    headers: parsed.headers,
    data: bodyData,
    timeout: 30000 // 默认30秒超时
  }
}

/**
 * 验证命令格式（支持CURL命令和Python代码）
 * @param command 命令字符串
 * @returns 验证结果
 */
export function validateCurlCommand(command: string): { valid: boolean; error?: string } {
  if (!command || typeof command !== 'string') {
    return { valid: false, error: '命令不能为空' }
  }

  const trimmed = command.trim()

  if (trimmed.length === 0) {
    return { valid: false, error: '命令不能为空' }
  }

  // 检查是否是CURL命令
  if (trimmed.toLowerCase().startsWith('curl')) {
    // 检查是否包含URL
    if (!trimmed.match(/https?:\/\//i)) {
      return { valid: false, error: 'CURL命令中必须包含有效的HTTP(S) URL' }
    }

    // 检查是否有提示词占位符（如果包含请求体）
    if (trimmed.includes('-d') || trimmed.includes('--data')) {
      const hasPlaceholder =
        trimmed.includes('${prompt}') ||
        trimmed.includes('$prompt') ||
        trimmed.includes('"$prompt"')

      if (!hasPlaceholder) {
        return {
          valid: false,
          error: 'CURL命令的请求体中必须包含提示词占位符（${prompt} 或 $prompt）'
        }
      }
    }
  } 
  // 检查是否是Python代码
  else if (trimmed.toLowerCase().startsWith('import ')) {
    // 检查是否包含URL
    if (!trimmed.match(/https?:\/\//i)) {
      return { valid: false, error: 'Python代码中必须包含有效的HTTP(S) URL' }
    }
    
    // 检查是否包含API密钥
    if (!trimmed.match(/token|api[_\s-]?key|secret/i)) {
      return { valid: false, error: 'Python代码中必须包含API密钥或令牌' }
    }
  }

  return { valid: true }
}

/**
 * 生成示例CURL命令
 * @param provider AI提供商名称
 * @returns 示例CURL命令
 */
export function generateExampleCurl(provider: string): string {
  const examples: Record<string, string> = {
    openai: `curl https://api.openai.com/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{
    "model": "gpt-4",
    "messages": [
      {"role": "user", "content": \${prompt}}
    ],
    "temperature": 0.7,
    "max_tokens": 4000
  }'`,

    claude: `curl https://api.anthropic.com/v1/messages \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "anthropic-version: 2023-06-01" \\
  -d '{
    "model": "claude-3-opus-20240229",
    "max_tokens": 4000,
    "messages": [
      {"role": "user", "content": \${prompt}}
    ]
  }'`,

    gemini: `curl https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=YOUR_API_KEY \\
  -H "Content-Type: application/json" \\
  -d '{
    "contents": [
      {"role": "user", "parts": [{"text": \${prompt}}]}
    ],
    "generationConfig": {
      "temperature": 0.7,
      "maxOutputTokens": 4000
    }
  }'`,

    deepseek: `curl https://api.deepseek.com/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{
    "model": "deepseek-chat",
    "messages": [
      {"role": "user", "content": \${prompt}}
    ],
    "temperature": 0.7,
    "max_tokens": 4000
  }'`,

    siliconflow: `curl https://api.siliconflow.cn/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{
    "model": "Qwen/Qwen2.5-72B-Instruct",
    "messages": [
      {"role": "user", "content": \${prompt}}
    ],
    "temperature": 0.7,
    "max_tokens": 4000
  }'`,

    openrouter: `curl https://openrouter.ai/api/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "HTTP-Referer: https://your-app.com" \
  -H "X-Title: Novel Generator" \
  -d '{
    "model": "anthropic/claude-3-opus",
    "messages": [
      {"role": "user", "content": \${prompt}}
    ],
    "temperature": 0.7,
    "max_tokens": 4000
  }'`,

    gitcode: `curl https://api.atomgit.com/api/v5/chat/completions \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "temperature": 0.7,
    "top_k": 0,
    "top_p": 0,
    "frequency_penalty": 0,
    "messages": [\${prompt}],
    "model": "zai/glm-5",
    "maxTokens": 4000
  }'`,

    custom: `curl https://your-api-endpoint.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "model": "your-model-name",
    "messages": [
      {"role": "user", "content": \${prompt}}
    ],
    "temperature": 0.7,
    "max_tokens": 4000
  }'`
  }

  return examples[provider.toLowerCase()] || examples.custom
}

/**
 * 清理AI生成内容中的SSE残留数据
 * 过滤掉可能泄漏到内容中的原始SSE数据、思维链标记等
 */
export function cleanAIContent(content: string): string {
  let cleaned = content
  cleaned = cleaned.replace(/^data:\s*\{.*\}\s*$/gm, '')
  cleaned = cleaned.replace(/data:\{"id":"chatcmpl[^"]*"[^}]*choices[^}]*\}/g, '')
  cleaned = cleaned.replace(/"prompt_token_ids":null/g, '')
  cleaned = cleaned.replace(/"logprobs":null/g, '')
  cleaned = cleaned.replace(/"finish_reason":null/g, '')
  return cleaned.trim()
}

export function extractContentFromRawResponse(raw: string): string | null {
  if (!raw || typeof raw !== 'string') return null

  let text = raw
  text = text.replace(/^data:\s*/gm, '')
  text = text.replace(/\[DONE\]/g, '')

  const jsonPattern = /\{[^{}]*(?:"(?:[^"\\]|\\.)*"[^{}]*)*\}/g
  const jsonMatches = text.match(jsonPattern)
  if (jsonMatches && jsonMatches.length > 0) {
    const extractedParts: string[] = []
    for (const jsonStr of jsonMatches) {
      try {
        const obj = JSON.parse(jsonStr)
        const content = extractContentFromResponse(obj)
        if (content) extractedParts.push(content)
      } catch {
        // ignore parse errors for individual JSON blocks
      }
    }
    if (extractedParts.length > 0) {
      return cleanAIContent(extractedParts.join(''))
    }
  }

  const sseLines = text.split('\n').filter(line => {
    const trimmed = line.trim()
    if (!trimmed || trimmed === '[DONE]') return false
    if (trimmed.startsWith('{') && trimmed.includes('"choices"')) return false
    if (trimmed.startsWith('data: {') || trimmed.startsWith('data:{')) return false
    return true
  })

  if (sseLines.length > 0) {
    const candidate = sseLines.join('\n').trim()
    if (candidate.length > 20 && !candidate.includes('"id":') && !candidate.includes('"object":')) {
      return cleanAIContent(candidate)
    }
  }

  const nonJsonText = text
    .replace(/\{[^}]+\}/g, ' ')
    .replace(/\[[^\]]+\]/g, ' ')
    .replace(/"\w+":\s*[^,}\]]*,?\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (nonJsonText.length > 50) {
    return cleanAIContent(nonJsonText)
  }

  return null
}

/**
 * 从响应数据中提取文本内容
 * 支持多种AI服务返回格式
 * @param data 响应数据
 * @returns 提取的文本内容
 */
export function extractContentFromResponse(data: unknown): string | null {
  if (typeof data === 'string') {
    if (data.startsWith('data:')) {
      return extractStreamContent(data)
    }
    try {
      const parsed = JSON.parse(data)
      return extractContentFromResponse(parsed)
    } catch {
      return data
    }
  }

  if (!data || typeof data !== 'object') {
    return null
  }

  const dataObj = data as Record<string, unknown>

  if (dataObj.error) {
    const errorMsg = typeof dataObj.error === 'string'
      ? dataObj.error
      : (dataObj.error as Record<string, unknown>)?.message || JSON.stringify(dataObj.error)
    throw new Error(`AI服务错误: ${errorMsg}`)
  }

  if (Array.isArray(dataObj.choices) && dataObj.choices.length > 0) {
    const firstChoice = dataObj.choices[0] as Record<string, unknown>
    const message = firstChoice.message as Record<string, unknown>
    const delta = firstChoice.delta as Record<string, unknown>

    if (message && typeof message.content === 'string' && message.content.length > 0) {
      return message.content
    }
    // 处理 GLM-5 等模型的 reasoning 字段
    if (message) {
      const reasoningFields = ['reasoning', 'reasoning_content']
      for (const field of reasoningFields) {
        if (typeof message[field] === 'string' && (message[field] as string).length > 0) {
          return message[field] as string
        }
      }
    }
    if (delta) {
      const deltaContent = delta.content
      if (typeof deltaContent === 'string' && deltaContent.length > 0) {
        return deltaContent
      }
      // 处理 delta 中的 reasoning 字段
      const deltaReasoningFields = ['reasoning', 'reasoning_content']
      for (const field of deltaReasoningFields) {
        if (typeof delta[field] === 'string' && (delta[field] as string).length > 0) {
          return delta[field] as string
        }
      }
    }
  }

  if (dataObj.choices === null || dataObj.choices === undefined) {
    const reasoningFields = ['reasoning_content', 'reasoning']
    for (const field of reasoningFields) {
      if (typeof dataObj[field] === 'string' && (dataObj[field] as string).length > 0) {
        return dataObj[field] as string
      }
    }
  }

  if (Array.isArray(dataObj.content)) {
    const firstContent = dataObj.content[0] as Record<string, unknown>
    if (firstContent && typeof firstContent.text === 'string') {
      return firstContent.text
    }
  }

  if (Array.isArray(dataObj.candidates)) {
    const firstCandidate = dataObj.candidates[0] as Record<string, unknown>
    const content = firstCandidate.content as Record<string, unknown>
    if (Array.isArray(content?.parts)) {
      const firstPart = content.parts[0] as Record<string, unknown>
      if (typeof firstPart.text === 'string') {
        return firstPart.text
      }
    }
  }

  if (typeof dataObj.content === 'string') {
    return dataObj.content
  }

  const possibleFields = ['text', 'content', 'response', 'result', 'output', 'message', 'answer']
  for (const field of possibleFields) {
    if (typeof dataObj[field] === 'string') {
      return dataObj[field]
    }
  }

  if (dataObj.data !== undefined) {
    return extractContentFromResponse(dataObj.data)
  }

  return null
}

/**
 * 从流式响应数据中提取增量内容
 * 只提取实际文本内容，过滤掉思维链(reasoning/reasoning_content)
 * @param chunk 流式数据块
 * @returns 增量内容或null
 */
export function extractStreamContent(chunk: unknown): string | null {
  if (typeof chunk === 'string') {
    const lines = chunk.split('\n')
    let extractedContent = ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data: ')) {
        continue
      }
      const dataStr = trimmed.substring(6)
      if (dataStr === '[DONE]') {
        continue
      }
      try {
        const data = JSON.parse(dataStr)
        if (data.error) {
          throw new Error(`AI服务错误: ${typeof data.error === 'string' ? data.error : JSON.stringify(data.error)}`)
        }
        const content = extractContentFromResponse(data)
        if (content) {
          extractedContent += content
        }
      } catch (error) {
        if (error instanceof Error && error.message.startsWith('AI服务错误:')) {
          throw error
        }
      }
    }

    return extractedContent || null
  }

  return extractContentFromResponse(chunk)
}

export default {
  parseCurlCommand,
  convertToAxiosConfig,
  validateCurlCommand,
  generateExampleCurl,
  extractContentFromResponse,
  extractStreamContent,
  cleanAIContent,
  extractContentFromRawResponse
}
