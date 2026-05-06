import { v4 as uuidv4 } from 'uuid'
import { aiService } from './aiService.js'
import logger from '../utils/logger.js'

// 方向候选接口
export interface DirectionCandidate {
  id: string
  title: string
  genre: string
  coreSellingPoint: string
  targetReaderFeeling: string
  first30ChaptersPromise: string
  estimatedWordCount: number
  theme: string
  conflict: string
}

// 升级节点接口
export interface UpgradeNode {
  id: string
  name: string
  chapterRange: {
    start: number
    end: number
  }
  upgradeContent: string
  keyEvents: string[]
}

// 长线承诺接口
export interface LongTermPromise {
  id: string
  content: string
  setupChapter?: number
  payoffChapter?: number
  status: 'setup' | 'payoff' | 'both'
}

// 宏观规划接口
export interface MacroPlan {
  overallDirection: string
  upgradeNodes: UpgradeNode[]
  longTermPromises: LongTermPromise[]
  coreConflict: string
  theme: string
  worldviewSummary: string
}

// 角色接口
export interface GeneratedCharacter {
  id: string
  name: string
  age: number
  gender: 'male' | 'female' | 'other'
  personality: string
  background: string
  appearance: string
  goals: string[]
  fears: string[]
  skills: string[]
  role: string
  importance: 'main' | 'supporting' | 'minor'
  volumeResponsibilities?: {
    volumeId: string
    volumeName: string
    responsibility: string
  }[]
}

// 卷规划接口
export interface VolumePlan {
  id: string
  name: string
  mission: string
  upgradeNodes: UpgradeNode[]
  endingHook: string
  chapterRange: {
    start: number
    end: number
  }
  status: 'pending' | 'in_progress' | 'completed'
}

// 章节大纲接口
export interface ChapterOutline {
  id: string
  chapterNumber: number
  title: string
  summary: string
  keyPlotPoints: string[]
  involvedCharacters: string[]
  estimatedWordCount: number
  rhythmType: 'fast' | 'medium' | 'slow'
  status: 'pending' | 'in_progress' | 'completed'
}

// 生成方向参数
interface GenerateDirectionsParams {
  inspiration: string
  genre?: string
  count: number
}

// 生成宏观规划参数
interface GenerateMacroPlanParams {
  title: string
  genre: string
  coreSellingPoint: string
  targetReaderFeeling?: string
  first30ChaptersPromise?: string
}

// 生成角色参数
interface GenerateCharactersParams {
  title: string
  genre: string
  macroPlan?: string
  mainCharacterCount: number
  supportingCharacterCount: number
}

// 生成卷规划参数
interface GenerateVolumePlanParams {
  title: string
  genre: string
  macroPlan: string
  characters?: GeneratedCharacter[]
  volumeCount: number
  estimatedTotalChapters: number
}

// 生成章节参数
interface GenerateChaptersParams {
  volumeId: string
  volumeName: string
  volumeMission: string
  startChapter: number
  endChapter: number
  macroPlan?: string
  characters?: GeneratedCharacter[]
  previousChapters?: ChapterOutline[]
}

/**
 * AI 生成服务
 */
export const aiGenerationService = {
  /**
   * 生成整本方向候选
   */
  async generateDirections(params: GenerateDirectionsParams): Promise<{
    candidates: DirectionCandidate[]
  }> {
    const { inspiration, genre, count } = params

    const prompt = this.buildDirectionsPrompt(inspiration, genre, count)

    try {
      const response = await aiService.generateText(prompt, {
        temperature: 0.8,
        maxTokens: 4000
      })

      const candidates = this.parseDirectionsResponse(response, genre)

      return { candidates }
    } catch (error) {
      logger.error('生成方向候选失败', error)
      throw error
    }
  },

  /**
   * 流式生成整本方向候选
   */
  async *generateDirectionsStream(
    params: GenerateDirectionsParams
  ): AsyncGenerator<{ content?: string; error?: string; done?: boolean }> {
    const { inspiration, genre, count } = params

    const prompt = this.buildDirectionsPrompt(inspiration, genre, count)

    try {
      for await (const chunk of aiService.generateTextStream(prompt, {
        temperature: 0.8,
        maxTokens: 4000
      })) {
        yield chunk
      }
    } catch (error) {
      yield { error: error instanceof Error ? error.message : '生成失败' }
    }
  },

  /**
   * 构建方向候选提示词
   */
  buildDirectionsPrompt(inspiration: string, genre?: string, count: number = 3): string {
    return `你是一位资深的网文策划专家。请根据以下灵感，生成 ${count} 个不同的故事方向候选。

灵感描述：
${inspiration}

${genre ? `题材类型：${genre}` : ''}

请为每个方向候选提供以下信息：
1. 书名（吸引眼球，符合网文风格）
2. 核心卖点（一句话概括最吸引读者的点）
3. 目标读者感受（读者阅读后应该产生什么感受）
4. 前30章承诺（前30章要给读者什么体验）
5. 预计字数（万字为单位）
6. 主题（故事的核心主题）
7. 核心冲突（故事的主要矛盾）

请以 JSON 数组格式输出，格式如下：
[
  {
    "title": "书名",
    "coreSellingPoint": "核心卖点",
    "targetReaderFeeling": "目标读者感受",
    "first30ChaptersPromise": "前30章承诺",
    "estimatedWordCount": 预计字数,
    "theme": "主题",
    "conflict": "核心冲突"
  }
]

注意：
- 每个方向要有明显的差异化
- 书名要符合网文风格，吸引点击
- 核心卖点要具体，避免空泛
- 确保输出有效的 JSON 格式`
  },

  /**
   * 解析方向候选响应
   */
  parseDirectionsResponse(response: string, genre?: string): DirectionCandidate[] {
    try {
      // 尝试提取 JSON
      const jsonMatch = response.match(/\[[\s\S]*\]/)
      if (!jsonMatch) {
        throw new Error('无法从响应中提取 JSON 数组')
      }

      const data = JSON.parse(jsonMatch[0])
      
      if (!Array.isArray(data)) {
        throw new Error('响应不是有效的数组')
      }

      return data.map((item, index) => ({
        id: uuidv4(),
        title: item.title || `方向候选 ${index + 1}`,
        genre: genre || '玄幻',
        coreSellingPoint: item.coreSellingPoint || '',
        targetReaderFeeling: item.targetReaderFeeling || '',
        first30ChaptersPromise: item.first30ChaptersPromise || '',
        estimatedWordCount: item.estimatedWordCount || 100,
        theme: item.theme || '',
        conflict: item.conflict || ''
      }))
    } catch (error) {
      logger.error('解析方向候选响应失败', { error, response: response.substring(0, 500) })
      // 返回默认候选
      return [{
        id: uuidv4(),
        title: '默认故事方向',
        genre: genre || '玄幻',
        coreSellingPoint: '精彩的故事体验',
        targetReaderFeeling: '热血沸腾',
        first30ChaptersPromise: '引人入胜的开篇',
        estimatedWordCount: 100,
        theme: '成长与冒险',
        conflict: '主角与命运的抗争'
      }]
    }
  },

  /**
   * 生成故事宏观规划
   */
  async generateMacroPlan(params: GenerateMacroPlanParams): Promise<MacroPlan> {
    const { title, genre, coreSellingPoint, targetReaderFeeling, first30ChaptersPromise } = params

    const prompt = this.buildMacroPlanPrompt(title, genre, coreSellingPoint, targetReaderFeeling, first30ChaptersPromise)

    try {
      const response = await aiService.generateText(prompt, {
        temperature: 0.7,
        maxTokens: 4000
      })

      return this.parseMacroPlanResponse(response)
    } catch (error) {
      logger.error('生成宏观规划失败', error)
      throw error
    }
  },

  /**
   * 流式生成故事宏观规划
   */
  async *generateMacroPlanStream(
    params: GenerateMacroPlanParams
  ): AsyncGenerator<{ content?: string; error?: string; done?: boolean }> {
    const { title, genre, coreSellingPoint, targetReaderFeeling, first30ChaptersPromise } = params

    const prompt = this.buildMacroPlanPrompt(title, genre, coreSellingPoint, targetReaderFeeling, first30ChaptersPromise)

    try {
      for await (const chunk of aiService.generateTextStream(prompt, {
        temperature: 0.7,
        maxTokens: 4000
      })) {
        yield chunk
      }
    } catch (error) {
      yield { error: error instanceof Error ? error.message : '生成失败' }
    }
  },

  /**
   * 构建宏观规划提示词
   */
  buildMacroPlanPrompt(
    title: string,
    genre: string,
    coreSellingPoint: string,
    targetReaderFeeling?: string,
    first30ChaptersPromise?: string
  ): string {
    return `你是一位资深的网文策划专家。请为以下小说生成详细的故事宏观规划。

书名：${title}
题材：${genre}
核心卖点：${coreSellingPoint}
${targetReaderFeeling ? `目标读者感受：${targetReaderFeeling}` : ''}
${first30ChaptersPromise ? `前30章承诺：${first30ChaptersPromise}` : ''}

请生成以下内容：

1. 整本走向（300字以内）
   - 故事的整体发展方向
   - 主角的成长路径
   - 世界观的展开方式

2. 阶段升级节点（3-5个）
   - 每个节点包含：节点名称、章节范围、升级内容、关键事件

3. 长线兑现承诺（3-5个）
   - 每个承诺包含：承诺内容、铺设章节、兑现章节

4. 核心冲突
   - 故事的主要矛盾

5. 主题
   - 故事的核心主题

6. 世界观概要
   - 故事背景设定概述

请以 JSON 格式输出：
{
  "overallDirection": "整本走向描述",
  "upgradeNodes": [
    {
      "name": "节点名称",
      "chapterRange": { "start": 1, "end": 30 },
      "upgradeContent": "升级内容",
      "keyEvents": ["事件1", "事件2"]
    }
  ],
  "longTermPromises": [
    {
      "content": "承诺内容",
      "setupChapter": 1,
      "payoffChapter": 100,
      "status": "setup"
    }
  ],
  "coreConflict": "核心冲突",
  "theme": "主题",
  "worldviewSummary": "世界观概要"
}`
  },

  /**
   * 解析宏观规划响应
   */
  parseMacroPlanResponse(response: string): MacroPlan {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('无法从响应中提取 JSON 对象')
      }

      const data = JSON.parse(jsonMatch[0])

      return {
        overallDirection: data.overallDirection || '',
        upgradeNodes: (data.upgradeNodes || []).map((node: Record<string, unknown>, index: number) => ({
          id: uuidv4(),
          name: (node.name as string) || `升级节点 ${index + 1}`,
          chapterRange: (node.chapterRange as { start: number; end: number }) || { start: 1, end: 30 },
          upgradeContent: (node.upgradeContent as string) || '',
          keyEvents: (node.keyEvents as string[]) || []
        })),
        longTermPromises: (data.longTermPromises || []).map((promise: Record<string, unknown>) => ({
          id: uuidv4(),
          content: (promise.content as string) || '',
          setupChapter: promise.setupChapter as number | undefined,
          payoffChapter: promise.payoffChapter as number | undefined,
          status: (promise.status as 'setup' | 'payoff' | 'both') || 'setup'
        })),
        coreConflict: data.coreConflict || '',
        theme: data.theme || '',
        worldviewSummary: data.worldviewSummary || ''
      }
    } catch (error) {
      logger.error('解析宏观规划响应失败', { error, response: response.substring(0, 500) })
      // 返回默认规划
      return {
        overallDirection: '主角从平凡走向强大，最终成就传奇',
        upgradeNodes: [{
          id: uuidv4(),
          name: '初始觉醒',
          chapterRange: { start: 1, end: 30 },
          upgradeContent: '主角获得特殊能力',
          keyEvents: ['觉醒', '初战', '结识伙伴']
        }],
        longTermPromises: [{
          id: uuidv4(),
          content: '主角的身世之谜',
          setupChapter: 1,
          payoffChapter: 100,
          status: 'setup'
        }],
        coreConflict: '主角与命运的抗争',
        theme: '成长与冒险',
        worldviewSummary: '一个充满奇幻色彩的世界'
      }
    }
  },

  /**
   * 生成角色阵容
   */
  async generateCharacters(params: GenerateCharactersParams): Promise<{
    mainCharacters: GeneratedCharacter[]
    supportingCharacters: GeneratedCharacter[]
  }> {
    const { title, genre, macroPlan, mainCharacterCount, supportingCharacterCount } = params

    const prompt = this.buildCharactersPrompt(title, genre, macroPlan, mainCharacterCount, supportingCharacterCount)

    try {
      const response = await aiService.generateText(prompt, {
        temperature: 0.7,
        maxTokens: 4000
      })

      return this.parseCharactersResponse(response)
    } catch (error) {
      logger.error('生成角色阵容失败', error)
      throw error
    }
  },

  /**
   * 构建角色生成提示词
   */
  buildCharactersPrompt(
    title: string,
    genre: string,
    macroPlan?: string,
    mainCharacterCount: number = 3,
    supportingCharacterCount: number = 5
  ): string {
    return `你是一位资深的网文角色设计专家。请为以下小说设计角色阵容。

书名：${title}
题材：${genre}
${macroPlan ? `宏观规划：${macroPlan}` : ''}

请生成：
1. ${mainCharacterCount} 个主要角色（主角团）
2. ${supportingCharacterCount} 个重要配角

每个角色需要包含：
- 姓名
- 年龄
- 性别（male/female/other）
- 性格特点
- 背景故事
- 外貌描述
- 目标（数组）
- 恐惧（数组）
- 技能（数组）
- 角色定位
- 重要性（main/supporting/minor）

请以 JSON 格式输出：
{
  "mainCharacters": [
    {
      "name": "姓名",
      "age": 20,
      "gender": "male",
      "personality": "性格特点",
      "background": "背景故事",
      "appearance": "外貌描述",
      "goals": ["目标1", "目标2"],
      "fears": ["恐惧1"],
      "skills": ["技能1"],
      "role": "角色定位",
      "importance": "main"
    }
  ],
  "supportingCharacters": [
    // 同上格式，importance 为 "supporting"
  ]
}

注意：
- 角色要有鲜明的个性特点
- 角色之间要有互动关系
- 确保输出有效的 JSON 格式`
  },

  /**
   * 解析角色响应
   */
  parseCharactersResponse(response: string): {
    mainCharacters: GeneratedCharacter[]
    supportingCharacters: GeneratedCharacter[]
  } {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('无法从响应中提取 JSON 对象')
      }

      const data = JSON.parse(jsonMatch[0])

      const parseCharacter = (char: Record<string, unknown>, importance: 'main' | 'supporting' | 'minor'): GeneratedCharacter => ({
        id: uuidv4(),
        name: (char.name as string) || '未命名角色',
        age: (char.age as number) || 20,
        gender: (char.gender as 'male' | 'female' | 'other') || 'male',
        personality: (char.personality as string) || '',
        background: (char.background as string) || '',
        appearance: (char.appearance as string) || '',
        goals: (char.goals as string[]) || [],
        fears: (char.fears as string[]) || [],
        skills: (char.skills as string[]) || [],
        role: (char.role as string) || '',
        importance
      })

      return {
        mainCharacters: ((data.mainCharacters || []) as Record<string, unknown>[]).map(c => parseCharacter(c, 'main')),
        supportingCharacters: ((data.supportingCharacters || []) as Record<string, unknown>[]).map(c => parseCharacter(c, 'supporting'))
      }
    } catch (error) {
      logger.error('解析角色响应失败', { error, response: response.substring(0, 500) })
      return {
        mainCharacters: [{
          id: uuidv4(),
          name: '主角',
          age: 20,
          gender: 'male',
          personality: '勇敢坚毅',
          background: '出身平凡',
          appearance: '英俊潇洒',
          goals: ['成为强者'],
          fears: ['失去亲人'],
          skills: ['剑术'],
          role: '主角',
          importance: 'main'
        }],
        supportingCharacters: []
      }
    }
  },

  /**
   * 生成卷战略
   */
  async generateVolumePlan(params: GenerateVolumePlanParams): Promise<{
    volumes: VolumePlan[]
  }> {
    const { title, genre, macroPlan, characters, volumeCount, estimatedTotalChapters } = params

    const prompt = this.buildVolumePlanPrompt(title, genre, macroPlan, characters, volumeCount, estimatedTotalChapters)

    try {
      const response = await aiService.generateText(prompt, {
        temperature: 0.7,
        maxTokens: 4000
      })

      return this.parseVolumePlanResponse(response, estimatedTotalChapters)
    } catch (error) {
      logger.error('生成卷战略失败', error)
      throw error
    }
  },

  /**
   * 构建卷战略提示词
   */
  buildVolumePlanPrompt(
    title: string,
    genre: string,
    macroPlan: string,
    characters?: GeneratedCharacter[],
    volumeCount: number = 3,
    estimatedTotalChapters: number = 100
  ): string {
    const chaptersPerVolume = Math.floor(estimatedTotalChapters / volumeCount)

    return `你是一位资深的网文分卷策划专家。请为以下小说设计分卷战略。

书名：${title}
题材：${genre}
宏观规划：${macroPlan}
预计总章节数：${estimatedTotalChapters}
分卷数量：${volumeCount}
${characters ? `主要角色：${characters.map(c => c.name).join('、')}` : ''}

请生成 ${volumeCount} 卷的规划，每卷约 ${chaptersPerVolume} 章。

每卷需要包含：
- 卷名（吸引人的标题）
- 卷使命（这卷要完成什么任务）
- 升级节点（这卷的升级点）
- 卷尾钩子（吸引读者继续阅读的悬念）
- 章节范围

请以 JSON 格式输出：
{
  "volumes": [
    {
      "name": "第一卷名称",
      "mission": "卷使命",
      "upgradeNodes": [
        {
          "name": "升级点名称",
          "chapterRange": { "start": 1, "end": 10 },
          "upgradeContent": "升级内容",
          "keyEvents": ["事件1"]
        }
      ],
      "endingHook": "卷尾钩子",
      "chapterRange": { "start": 1, "end": ${chaptersPerVolume} }
    }
  ]
}`
  },

  /**
   * 解析卷战略响应
   */
  parseVolumePlanResponse(response: string, estimatedTotalChapters: number): {
    volumes: VolumePlan[]
  } {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('无法从响应中提取 JSON 对象')
      }

      const data = JSON.parse(jsonMatch[0])
      const volumes = (data.volumes || []) as Record<string, unknown>[]

      return {
        volumes: volumes.map((vol, index) => ({
          id: uuidv4(),
          name: (vol.name as string) || `第${index + 1}卷`,
          mission: (vol.mission as string) || '',
          upgradeNodes: ((vol.upgradeNodes as Record<string, unknown>[]) || []).map((node, nodeIndex) => ({
            id: uuidv4(),
            name: (node.name as string) || `升级节点 ${nodeIndex + 1}`,
            chapterRange: (node.chapterRange as { start: number; end: number }) || { start: 1, end: 10 },
            upgradeContent: (node.upgradeContent as string) || '',
            keyEvents: (node.keyEvents as string[]) || []
          })),
          endingHook: (vol.endingHook as string) || '',
          chapterRange: (vol.chapterRange as { start: number; end: number }) || { 
            start: index * Math.floor(estimatedTotalChapters / volumes.length) + 1, 
            end: (index + 1) * Math.floor(estimatedTotalChapters / volumes.length) 
          },
          status: 'pending' as const
        }))
      }
    } catch (error) {
      logger.error('解析卷战略响应失败', { error, response: response.substring(0, 500) })
      return {
        volumes: [{
          id: uuidv4(),
          name: '第一卷',
          mission: '故事开篇',
          upgradeNodes: [],
          endingHook: '悬念',
          chapterRange: { start: 1, end: estimatedTotalChapters },
          status: 'pending'
        }]
      }
    }
  },

  /**
   * 生成章节列表
   */
  async generateChapters(params: GenerateChaptersParams): Promise<{
    chapters: ChapterOutline[]
  }> {
    const { volumeName, volumeMission, startChapter, endChapter, macroPlan, characters, previousChapters } = params

    const prompt = this.buildChaptersPrompt(volumeName, volumeMission, startChapter, endChapter, macroPlan, characters, previousChapters)

    try {
      const response = await aiService.generateText(prompt, {
        temperature: 0.7,
        maxTokens: 6000
      })

      return this.parseChaptersResponse(response, startChapter)
    } catch (error) {
      logger.error('生成章节列表失败', error)
      throw error
    }
  },

  /**
   * 构建章节列表提示词
   */
  buildChaptersPrompt(
    volumeName: string,
    volumeMission: string,
    startChapter: number,
    endChapter: number,
    macroPlan?: string,
    characters?: GeneratedCharacter[],
    previousChapters?: ChapterOutline[]
  ): string {
    const chapterCount = endChapter - startChapter + 1

    return `你是一位资深的网文节奏设计专家。请为以下卷设计章节大纲。

卷名：${volumeName}
卷使命：${volumeMission}
章节范围：第${startChapter}章 到 第${endChapter}章（共${chapterCount}章）
${macroPlan ? `宏观规划：${macroPlan}` : ''}
${characters ? `主要角色：${characters.map(c => c.name).join('、')}` : ''}
${previousChapters && previousChapters.length > 0 ? `前文情节：${previousChapters.slice(-5).map(c => c.summary).join('；')}` : ''}

请为每章设计：
- 章节标题（吸引人的标题）
- 章节摘要（50字以内概括本章内容）
- 关键情节点（2-3个）
- 涉及角色
- 预计字数（2000-4000字）
- 节奏类型（fast/medium/slow）

注意节奏把控：
- 开篇要快节奏吸引读者
- 中间穿插慢节奏铺垫
- 高潮要快节奏推进
- 结尾留悬念

请以 JSON 格式输出：
{
  "chapters": [
    {
      "chapterNumber": ${startChapter},
      "title": "章节标题",
      "summary": "章节摘要",
      "keyPlotPoints": ["情节点1", "情节点2"],
      "involvedCharacters": ["角色1", "角色2"],
      "estimatedWordCount": 3000,
      "rhythmType": "fast"
    }
  ]
}`
  },

  /**
   * 解析章节列表响应
   */
  parseChaptersResponse(response: string, startChapter: number): {
    chapters: ChapterOutline[]
  } {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('无法从响应中提取 JSON 对象')
      }

      const data = JSON.parse(jsonMatch[0])
      const chapters = (data.chapters || []) as Record<string, unknown>[]

      return {
        chapters: chapters.map((ch, index) => ({
          id: uuidv4(),
          chapterNumber: (ch.chapterNumber as number) || startChapter + index,
          title: (ch.title as string) || `第${startChapter + index}章`,
          summary: (ch.summary as string) || '',
          keyPlotPoints: (ch.keyPlotPoints as string[]) || [],
          involvedCharacters: (ch.involvedCharacters as string[]) || [],
          estimatedWordCount: (ch.estimatedWordCount as number) || 3000,
          rhythmType: (ch.rhythmType as 'fast' | 'medium' | 'slow') || 'medium',
          status: 'pending' as const
        }))
      }
    } catch (error) {
      logger.error('解析章节列表响应失败', { error, response: response.substring(0, 500) })
      return {
        chapters: []
      }
    }
  }
}

export default aiGenerationService
