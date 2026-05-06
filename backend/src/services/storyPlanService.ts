import { aiService } from './aiService.js'
import { v4 as uuidv4 } from 'uuid'
import { polishContent, PolishIntensity } from './contentPolishService.js'
import type { GenerateStoryPlanRequest, GenerateStoryPlanResponse, StoryPlan, Character, Relationship, Worldview, Faction, PlotPoint, StoryArc } from '../types/index.js'

// 导入人类写作风格配置
import {
  getGeneralAIDetectionBypassTechniques,
  getEmotionalFluctuationTechniques,
  getThinkingSimulationTechniques
} from '../utils/humanWritingStyle.js'

// 导入AI检测绕过Prompt（从默认导出中解构）
import prompts from '../utils/prompts.js'
const {
  COMPREHENSIVE_AI_BYPASS_PROMPT,
  ZHUQUE_BYPASS_PROMPT,
  ZHIPU_BYPASS_PROMPT,
  GPTZERO_BYPASS_PROMPT
} = prompts

/**
 * 生成故事规划
 */
export const generateStoryPlanService = async (data: GenerateStoryPlanRequest): Promise<GenerateStoryPlanResponse> => {
  const { title, prompt, genre, characterCount, plotPointCount } = data

  // 构建故事规划提示
  const storyPlanPrompt = `
请为以下小说创意生成详细的故事规划：

标题：${title}
创意：${prompt}
类型：${genre}

请生成包含以下内容的详细故事规划：

1. 故事概述：简要描述整个故事的核心内容和主题

2. 人物设定：
   - 生成 ${characterCount} 个主要人物
   - 每个人物包含：姓名、年龄、性别、性格、背景、外貌、目标、恐惧、技能、角色定位、重要性

3. 关系图谱：
   - 生成人物之间的关系
   - 每种关系包含：关系类型、描述、强度（1-10）

4. 世界观设定：
   - 世界名称和描述
   - 时间、地点、科技水平、社会结构
   - 关键元素和世界规则
   - 主要派系（如果适用）

5. 故事主线：
   - 生成 2-3 条主要故事线
   - 每条故事线包含：标题、描述、主题、冲突、解决

6. 情节点：
   - 生成 ${plotPointCount} 个情节点
   - 每个情节点包含：标题、描述、重要性、影响

请以 JSON 格式输出，确保格式正确，包含所有必要的字段。
`

  try {
    // 调用AI生成故事规划
    const aiResponse = await aiService.generateText(storyPlanPrompt, {
      temperature: 0.7,
      maxTokens: 4000
    })

    // 解析AI响应
    interface StoryPlanData {
      title?: string
      description?: string
      overview?: string
      characters?: unknown[]
      relationships?: unknown[]
      worldview?: Record<string, unknown>
      storyArcs?: unknown[]
      storyLines?: unknown[]
      plotPoints?: unknown[]
    }
    let storyPlanData: StoryPlanData
    try {
      storyPlanData = JSON.parse(aiResponse) as StoryPlanData
    } catch (parseError) {
      // 如果解析失败，尝试提取JSON部分
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        storyPlanData = JSON.parse(jsonMatch[0]) as StoryPlanData
      } else {
        throw new Error('无法解析AI响应为JSON')
      }
    }

    // 构建故事规划对象
    const storyPlan: StoryPlan = {
      id: uuidv4(),
      title: storyPlanData.title || title,
      description: storyPlanData.description || storyPlanData.overview || '',
      characters: generateCharacters(storyPlanData.characters || [], characterCount || 3),
      relationships: generateRelationships(storyPlanData.relationships || [], storyPlanData.characters || []),
      worldview: generateWorldview(storyPlanData.worldview || {}),
      storyArcs: generateStoryArcs(storyPlanData.storyArcs || storyPlanData.storyLines || []),
      plotPoints: generatePlotPoints(storyPlanData.plotPoints || [], plotPointCount || 10),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    return {
      id: storyPlan.id,
      plan: storyPlan
    }
  } catch (error) {
    console.error('生成故事规划失败:', error)
    throw error
  }
}

/**
 * 生成人物设定
 */
interface CharacterInput {
  name?: string
  age?: number
  gender?: string
  personality?: string
  background?: string
  appearance?: string
  goals?: string[]
  fears?: string[]
  skills?: string[]
  relationships?: string[]
  role?: string
  importance?: string
  id?: string
}

const generateCharacters = (characters: unknown[], count: number): Character[] => {
  const result: Character[] = []

  for (let i = 0; i < Math.min(characters.length, count); i++) {
    const char = characters[i] as CharacterInput
    result.push({
      id: uuidv4(),
      name: char.name || `角色${i + 1}`,
      age: char.age || 20,
      gender: (char.gender || 'male') as 'male' | 'female' | 'other',
      personality: char.personality || '勇敢善良',
      background: char.background || '普通背景',
      appearance: char.appearance || '普通外貌',
      goals: char.goals || ['实现梦想'],
      fears: char.fears || ['失败'],
      skills: char.skills || ['基本技能'],
      relationships: char.relationships || [],
      role: char.role || '主角',
      importance: (char.importance || 'main') as 'main' | 'supporting' | 'minor'
    })
  }
  
  // 如果人物数量不足，生成默认人物
  while (result.length < count) {
    result.push({
      id: uuidv4(),
      name: `角色${result.length + 1}`,
      age: 20 + result.length,
      gender: result.length % 2 === 0 ? 'male' : 'female',
      personality: '勇敢善良',
      background: '普通背景',
      appearance: '普通外貌',
      goals: ['实现梦想'],
      fears: ['失败'],
      skills: ['基本技能'],
      relationships: [],
      role: result.length === 0 ? '主角' : '配角',
      importance: result.length === 0 ? 'main' : 'supporting'
    })
  }
  
  return result
}

/**
 * 生成关系图谱
 */
interface RelationshipInput {
  character1Id?: string
  character2Id?: string
  type?: string
  description?: string
  strength?: number
}

interface CharacterRef {
  id?: string
}

const generateRelationships = (relationships: unknown[], characters: unknown[]): Relationship[] => {
  const result: Relationship[] = []

  // 处理AI生成的关系
  for (const rel of relationships) {
    const r = rel as RelationshipInput
    const c0 = characters[0] as CharacterRef
    const c1 = characters[1] as CharacterRef
    result.push({
      id: uuidv4(),
      character1Id: r.character1Id || (c0?.id || uuidv4()),
      character2Id: r.character2Id || (c1?.id || uuidv4()),
      type: (r.type || 'friend') as 'family' | 'friend' | 'enemy' | 'lover' | 'colleague' | 'other',
      description: r.description || '普通关系',
      strength: r.strength || 5
    })
  }
  
  // 如果关系数量不足，生成默认关系
  if (characters.length >= 2 && result.length === 0) {
    for (let i = 0; i < characters.length - 1; i++) {
      for (let j = i + 1; j < characters.length; j++) {
        const c1 = characters[i] as CharacterRef
        const c2 = characters[j] as CharacterRef
        result.push({
          id: uuidv4(),
          character1Id: c1.id ?? uuidv4(),
          character2Id: c2.id ?? uuidv4(),
          type: i === 0 && j === 1 ? 'friend' : 'other',
          description: '默认关系',
          strength: 5
        })
      }
    }
  }
  
  return result
}

/**
 * 生成世界观设定
 */
interface WorldviewInput {
  name?: string
  description?: string
  setting?: {
    time?: string
    location?: string
    technologyLevel?: string
    magicSystem?: string
    socialStructure?: string
    keyElements?: string[]
  }
  rules?: string[]
  factions?: unknown[]
}

const generateWorldview = (worldviewData: Record<string, unknown>): Worldview => {
  const data = worldviewData as WorldviewInput
  return {
    id: uuidv4(),
    name: data.name || '未知世界',
    description: data.description || '一个神秘的世界',
    setting: {
      time: data.setting?.time || '现代',
      location: data.setting?.location || '地球',
      technologyLevel: data.setting?.technologyLevel || '现代科技',
      magicSystem: data.setting?.magicSystem,
      socialStructure: data.setting?.socialStructure || '现代社会',
      keyElements: data.setting?.keyElements || ['科技', '冒险']
    },
    rules: data.rules || ['因果律', '自然法则'],
    factions: generateFactions(data.factions || [])
  }
}

/**
 * 生成派系
 */
interface FactionInput {
  name?: string
  description?: string
  leader?: string
  goals?: string[]
  allies?: string[]
  enemies?: string[]
}

const generateFactions = (factions: unknown[]): Faction[] => {
  const result: Faction[] = []

  for (const faction of factions) {
    const f = faction as FactionInput
    result.push({
      id: uuidv4(),
      name: f.name || `派系${result.length + 1}`,
      description: f.description || '一个神秘的派系',
      leader: f.leader,
      goals: f.goals || ['实现目标'],
      allies: f.allies || [],
      enemies: f.enemies || []
    })
  }
  
  // 如果没有派系，生成默认派系
  if (result.length === 0) {
    result.push({
      id: uuidv4(),
      name: '正义联盟',
      description: '维护世界和平的组织',
      goals: ['维护和平', '打击邪恶'],
      allies: [],
      enemies: []
    })
    result.push({
      id: uuidv4(),
      name: '邪恶组织',
      description: '企图统治世界的组织',
      goals: ['统治世界', '获取力量'],
      allies: [],
      enemies: [result[0].id]
    })
    result[0].enemies = [result[1].id]
  }
  
  return result
}

/**
 * 生成故事主线
 */
interface StoryArcInput {
  title?: string
  description?: string
  startPoint?: string
  endPoint?: string
  plotPoints?: string[]
  theme?: string
  conflict?: string
  resolution?: string
}

const generateStoryArcs = (storyArcs: unknown[]): StoryArc[] => {
  const result: StoryArc[] = []

  for (const arc of storyArcs) {
    const a = arc as StoryArcInput
    result.push({
      id: uuidv4(),
      title: a.title || `故事线${result.length + 1}`,
      description: a.description || '一个精彩的故事',
      startPoint: a.startPoint || uuidv4(),
      endPoint: a.endPoint || uuidv4(),
      plotPoints: a.plotPoints || [],
      theme: a.theme || '勇气与友谊',
      conflict: a.conflict || '善与恶的斗争',
      resolution: a.resolution || '正义战胜邪恶'
    })
  }
  
  // 如果没有故事主线，生成默认故事线
  if (result.length === 0) {
    result.push({
      id: uuidv4(),
      title: '主线故事',
      description: '主角的成长之旅',
      startPoint: uuidv4(),
      endPoint: uuidv4(),
      plotPoints: [],
      theme: '勇气与成长',
      conflict: '主角与命运的抗争',
      resolution: '主角实现自我价值'
    })
  }
  
  return result
}

/**
 * 生成情节点
 */
interface PlotPointInput {
  title?: string
  description?: string
  chapter?: number
  characters?: string[]
  importance?: string
  impact?: string
  choices?: string[]
  consequences?: string[]
}

const generatePlotPoints = (plotPoints: unknown[], count: number): PlotPoint[] => {
  const result: PlotPoint[] = []

  for (let i = 0; i < Math.min(plotPoints.length, count); i++) {
    const point = plotPoints[i] as PlotPointInput
    result.push({
      id: uuidv4(),
      title: point.title || `情节点${i + 1}`,
      description: point.description || '一个重要的情节',
      chapter: point.chapter || Math.floor(i / 3) + 1,
      characters: point.characters || [],
      importance: (point.importance || 'minor') as 'major' | 'minor',
      impact: point.impact || '推动故事发展',
      choices: point.choices,
      consequences: point.consequences,
      orderIndex: i
    })
  }
  
  // 如果情节点数量不足，生成默认情节点
  while (result.length < count) {
    const i = result.length
    result.push({
      id: uuidv4(),
      title: `情节点${i + 1}`,
      description: `第${i + 1}个情节点`,
      chapter: Math.floor(i / 3) + 1,
      characters: [],
      importance: i % 5 === 0 ? 'major' : 'minor',
      impact: '推动故事发展',
      orderIndex: i
    })
  }
  
  return result
}

// ============================================================================
// 宏观规划生成服务
// ============================================================================

/**
 * 升级节点类型
 */
interface UpgradeNode {
  id: string
  name: string
  chapterRange: {
    start: number
    end: number
  }
  upgradeContent: string
  keyEvents: string[]
}

/**
 * 长线承诺类型
 */
interface LongTermPromise {
  id: string
  content: string
  setupChapter?: number
  payoffChapter?: number
  status: 'setup' | 'payoff' | 'both'
}

/**
 * 宏观规划请求参数
 */
interface GenerateMacroPlanningRequest {
  title: string
  genre: string
  coreSellingPoint: string
  targetReaderFeeling: string
  first30ChaptersPromise: string
}

/**
 * 宏观规划响应
 */
interface GenerateMacroPlanningResponse {
  overallDirection: string
  coreConflict: string
  theme: string
  worldviewSummary?: string
  upgradeNodes: UpgradeNode[]
  longTermPromises: LongTermPromise[]
}

/**
 * 生成故事宏观规划
 */
export const generateMacroPlanningService = async (
  data: GenerateMacroPlanningRequest
): Promise<GenerateMacroPlanningResponse> => {
  const { title, genre, coreSellingPoint, targetReaderFeeling, first30ChaptersPromise } = data

  // 构建宏观规划提示
  const macroPlanningPrompt = `
你是一位专业的小说创作顾问，请为以下小说项目生成详细的宏观规划：

## 项目信息
- 书名：${title}
- 题材：${genre}
- 核心卖点：${coreSellingPoint}
- 目标读者感受：${targetReaderFeeling || '未指定'}
- 前30章承诺：${first30ChaptersPromise || '未指定'}

## 请生成以下内容：

### 1. 整本走向（overallDirection）
描述故事从开始到结束的整体发展脉络，包括：
- 开篇如何吸引读者
- 中间如何层层递进
- 高潮如何爆发
- 结局如何收尾
要求：200-500字

### 2. 核心冲突（coreConflict）
描述故事的核心矛盾和冲突，包括：
- 主角面临的主要困境
- 反派或对立力量
- 冲突的根源和发展
要求：100-300字

### 3. 主题（theme）
描述故事的核心主题和思想，如：
- 成长、友情、爱情、正义等
- 故事想要传达的价值观
要求：20-50字

### 4. 世界观概要（worldviewSummary）
简要描述故事发生的世界观设定（可选）
要求：50-150字

### 5. 阶段升级节点（upgradeNodes）
生成3-6个升级节点，每个节点包含：
- name: 节点名称（如"初入江湖"、"小有名气"等）
- chapterRange: 章节范围 { start: 数字, end: 数字 }
- upgradeContent: 升级内容描述（主角在这个阶段的成长和变化）
- keyEvents: 关键事件列表（2-5个）

### 6. 长线兑现承诺（longTermPromises）
生成3-5个长线承诺，每个承诺包含：
- content: 承诺内容
- setupChapter: 铺设章节（可选）
- payoffChapter: 兑现章节（可选）
- status: 状态（"setup" | "payoff" | "both"）

## 输出格式
请以JSON格式输出，确保格式正确：
{
  "overallDirection": "...",
  "coreConflict": "...",
  "theme": "...",
  "worldviewSummary": "...",
  "upgradeNodes": [...],
  "longTermPromises": [...]
}
`

  try {
    // 调用AI生成宏观规划
    const aiResponse = await aiService.generateText(macroPlanningPrompt, {
      temperature: 0.8,
      maxTokens: 4000
    })

    // 解析AI响应
    interface MacroPlanningData {
      overallDirection?: string
      coreConflict?: string
      theme?: string
      worldviewSummary?: string
      upgradeNodes?: Array<{
        name?: string
        chapterRange?: { start?: number; end?: number }
        upgradeContent?: string
        keyEvents?: string[]
      }>
      longTermPromises?: Array<{
        content?: string
        setupChapter?: number
        payoffChapter?: number
        status?: string
      }>
    }

    let macroData: MacroPlanningData
    try {
      macroData = JSON.parse(aiResponse) as MacroPlanningData
    } catch (parseError) {
      // 如果解析失败，尝试提取JSON部分
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        macroData = JSON.parse(jsonMatch[0]) as MacroPlanningData
      } else {
        throw new Error('无法解析AI响应为JSON')
      }
    }

    // 构建升级节点
    const upgradeNodes: UpgradeNode[] = (macroData.upgradeNodes || []).map((node, index) => {
      // 确保 keyEvents 是字符串数组
      let keyEvents: string[] = []
      if (Array.isArray(node.keyEvents)) {
        keyEvents = node.keyEvents.map(event => {
          // 如果事件是对象，转换为 JSON 字符串
          if (typeof event === 'object' && event !== null) {
            return JSON.stringify(event)
          }
          // 如果是字符串，直接使用
          if (typeof event === 'string') {
            return event
          }
          // 其他类型，转换为字符串
          return String(event)
        })
      }
      
      return {
        id: `node_${Date.now()}_${index}`,
        name: node.name || `阶段${index + 1}`,
        chapterRange: {
          start: node.chapterRange?.start || (index * 30 + 1),
          end: node.chapterRange?.end || ((index + 1) * 30)
        },
        upgradeContent: node.upgradeContent || '主角在这个阶段有所成长',
        keyEvents
      }
    })

    // 如果升级节点不足，生成默认节点
    if (upgradeNodes.length === 0) {
      const defaultStages = [
        { name: '初入江湖', start: 1, end: 30, content: '主角初登场，建立基本世界观和人物关系' },
        { name: '崭露头角', start: 31, end: 80, content: '主角开始展现实力，遇到第一个重大挑战' },
        { name: '名震一方', start: 81, end: 150, content: '主角实力大增，开始影响更大的格局' },
        { name: '巅峰对决', start: 151, end: 200, content: '主角与最终BOSS对决，故事达到高潮' }
      ]
      
      defaultStages.forEach((stage, index) => {
        upgradeNodes.push({
          id: `node_${Date.now()}_${index}`,
          name: stage.name,
          chapterRange: { start: stage.start, end: stage.end },
          upgradeContent: stage.content,
          keyEvents: []
        })
      })
    }

    // 构建长线承诺
    const longTermPromises: LongTermPromise[] = (macroData.longTermPromises || []).map((promise, index) => ({
      id: `promise_${Date.now()}_${index}`,
      content: promise.content || '一个重要的承诺',
      setupChapter: promise.setupChapter,
      payoffChapter: promise.payoffChapter,
      status: (promise.status || 'setup') as 'setup' | 'payoff' | 'both'
    }))

    // 如果长线承诺不足，生成默认承诺
    if (longTermPromises.length === 0) {
      longTermPromises.push(
        {
          id: `promise_${Date.now()}_0`,
          content: '主角将实现自己的梦想',
          setupChapter: 1,
          status: 'setup'
        },
        {
          id: `promise_${Date.now()}_1`,
          content: '主角与伙伴的友情将经受考验',
          setupChapter: 10,
          status: 'setup'
        },
        {
          id: `promise_${Date.now()}_2`,
          content: '主角将揭开身世之谜',
          setupChapter: 20,
          status: 'setup'
        }
      )
    }

    // 辅助函数：将对象转换为格式化文本
    const formatObjectToText = (obj: unknown): string => {
      if (typeof obj === 'string') return obj
      if (typeof obj === 'object' && obj !== null) {
        const record = obj as Record<string, unknown>
        // 如果是带有 beginning/development/climax/ending 的对象
        if (record.beginning || record.development || record.climax || record.ending) {
          const parts: string[] = []
          if (record.beginning) parts.push(`【开篇】${record.beginning}`)
          if (record.development) parts.push(`【发展】${record.development}`)
          if (record.climax) parts.push(`【高潮】${record.climax}`)
          if (record.ending) parts.push(`【结局】${record.ending}`)
          return parts.join('\n\n')
        }
        // 如果是带有 mainChallenge/antagonist/originAndDevelopment 的对象
        if (record.mainChallenge || record.antagonist || record.originAndDevelopment) {
          const parts: string[] = []
          if (record.mainChallenge) parts.push(`【主要困境】${record.mainChallenge}`)
          if (record.antagonist) parts.push(`【反派势力】${record.antagonist}`)
          if (record.originAndDevelopment) parts.push(`【冲突发展】${record.originAndDevelopment}`)
          return parts.join('\n\n')
        }
        // 其他对象，转换为格式化文本
        return Object.entries(record)
          .map(([key, value]) => `【${key}】${value}`)
          .join('\n\n')
      }
      return ''
    }

    return {
      overallDirection: formatObjectToText(macroData.overallDirection) || '一个精彩的故事即将展开...',
      coreConflict: formatObjectToText(macroData.coreConflict) || '主角与命运的抗争',
      theme: formatObjectToText(macroData.theme) || '勇气与成长',
      worldviewSummary: formatObjectToText(macroData.worldviewSummary) || undefined,
      upgradeNodes,
      longTermPromises
    }
  } catch (error) {
    console.error('生成宏观规划失败:', error)
    throw error
  }
}

// ============================================================================
// 角色阵容生成服务
// ============================================================================

/**
 * 卷级职责类型
 */
interface VolumeResponsibility {
  volumeId: string
  volumeName: string
  responsibilities: {
    characterId: string
    characterName: string
    responsibility: string
    importance: 'major' | 'minor'
  }[]
}

/**
 * 角色阵容请求参数
 */
interface GenerateCharacterCastRequest {
  title: string
  genre: string
  coreSellingPoint: string
  targetReaderFeeling: string
  overallDirection: string
  coreConflict: string
  theme: string
  worldviewSummary?: string
}

/**
 * 角色阵容响应
 */
interface GenerateCharacterCastResponse {
  mainCharacters: Character[]
  supportingCharacters: Character[]
  relationships: Relationship[]
  volumeResponsibilities: VolumeResponsibility[]
}

/**
 * 生成角色阵容
 */
export const generateCharacterCastService = async (
  data: GenerateCharacterCastRequest
): Promise<GenerateCharacterCastResponse> => {
  const { title, genre, coreSellingPoint, targetReaderFeeling, overallDirection, coreConflict, theme, worldviewSummary } = data

  // 构建人物个性化语言风格指南
  const characterLanguageStyleGuide = `
【人物个性化语言风格指南 - 让角色更真实】

一、语言习惯设计原则
1. 每个角色应有独特的说话方式，避免所有角色说话风格雷同
2. 语言习惯要符合角色的：
   - 年龄特征（年轻人用词新潮，老年人用词稳重）
   - 教育背景（知识分子用词文雅，市井人物用词接地气）
   - 职业特点（军人说话简洁，文人说话含蓄）
   - 地域背景（可适当加入方言特色）

二、口头禅和语言癖好
为每个角色设计1-2个独特的语言特征：
- 口头禅示例：
  * "这事儿吧..." - 表示思考或犹豫
  * "我说..." - 表示要发表意见
  * "啧" - 表示不满或无奈
  * "哈？" - 表示惊讶或质疑
- 语言癖好示例：
  * 说话喜欢用比喻
  * 经常打断别人
  * 说话喜欢绕弯子
  * 喜欢用反问句

三、方言元素设置
根据角色背景适当加入方言特色（但不要过度）：
- 北方角色：可加入"咋"、"啥"、"那啥"等
- 南方角色：可加入"晓得"、"蛮"、"阿拉"等
- 注意：方言元素要自然融入，不要刻意堆砌

四、对话风格差异化
确保不同角色的对话风格有明显区分：
- 主角：语言风格要鲜明，有辨识度
- 配角：每个人都要有自己的"声音"
- 反派：语言风格可以更极端或独特

五、情感表达方式
不同角色表达情感的方式应该不同：
- 有人喜欢直说，有人喜欢暗示
- 有人情绪外露，有人内敛含蓄
- 有人用行动表达，有人用语言表达
`

  // 构建角色生成提示
  const characterCastPrompt = `
你是一位专业的小说角色设计师，请为以下小说项目生成详细的角色阵容：

## 项目信息
- 书名：${title}
- 题材：${genre}
- 核心卖点：${coreSellingPoint}
- 目标读者感受：${targetReaderFeeling || '未指定'}
- 整本走向：${overallDirection}
- 核心冲突：${coreConflict}
- 主题：${theme}
- 世界观：${worldviewSummary || '未指定'}

${characterLanguageStyleGuide}

## 请生成以下内容：

### 1. 主角团（mainCharacters）
生成1-3个主角，每个主角包含：
- name: 姓名（要有特色，符合题材风格）
- age: 年龄
- gender: 性别（"male" | "female" | "other"）
- personality: 性格特点（详细描述，100-200字）
- background: 背景故事（详细描述，100-200字）
- appearance: 外貌描述（50-100字）
- goals: 目标列表（2-4个）
- fears: 恐惧列表（1-3个）
- skills: 技能列表（2-5个）
- relationships: 关联角色ID列表（先留空）
- role: 角色定位（如"男主角"、"女主角"、"核心配角"等）
- importance: 固定为"main"
- languageStyle: 语言风格描述（50-100字，描述该角色的说话特点）
- catchphrase: 口头禅（1-3个，符合角色性格）
- dialectHint: 方言元素提示（可选，根据角色背景设置）

### 2. 配角阵容（supportingCharacters）
生成3-8个配角，每个配角包含相同字段，importance为"supporting"或"minor"
- 包括：导师、对手、朋友、家人等不同类型
- 确保角色多样性
- 每个配角也要有独特的语言风格和口头禅

### 3. 关系网络（relationships）
生成角色之间的关系，每个关系包含：
- character1Id: 角色1的ID（使用角色姓名作为临时ID）
- character2Id: 角色2的ID
- type: 关系类型（"family" | "friend" | "enemy" | "lover" | "colleague" | "other"）
- description: 关系描述
- strength: 关系强度（1-10）

### 4. 卷级职责分配（volumeResponsibilities）
生成2-4个卷的职责分配，每卷包含：
- volumeId: 卷ID（如"vol_1"）
- volumeName: 卷名称
- responsibilities: 角色职责列表
  - characterId: 角色ID
  - characterName: 角色姓名
  - responsibility: 在该卷的职责
  - importance: 重要性（"major" | "minor"）

## 输出格式
请以JSON格式输出：
{
  "mainCharacters": [...],
  "supportingCharacters": [...],
  "relationships": [...],
  "volumeResponsibilities": [...]
}
`

  try {
    // 调用AI生成角色阵容
    const aiResponse = await aiService.generateText(characterCastPrompt, {
      temperature: 0.8,
      maxTokens: 6000
    })

    // 解析AI响应
    interface CharacterCastData {
      mainCharacters?: Array<{
        name?: string
        age?: number
        gender?: string
        personality?: string
        background?: string
        appearance?: string
        goals?: string[]
        fears?: string[]
        skills?: string[]
        relationships?: string[]
        role?: string
        importance?: string
        languageStyle?: string
        catchphrase?: string[]
        dialectHint?: string
      }>
      supportingCharacters?: Array<{
        name?: string
        age?: number
        gender?: string
        personality?: string
        background?: string
        appearance?: string
        goals?: string[]
        fears?: string[]
        skills?: string[]
        relationships?: string[]
        role?: string
        importance?: string
        languageStyle?: string
        catchphrase?: string[]
        dialectHint?: string
      }>
      relationships?: Array<{
        character1Id?: string
        character2Id?: string
        type?: string
        description?: string
        strength?: number
      }>
      volumeResponsibilities?: Array<{
        volumeId?: string
        volumeName?: string
        responsibilities?: Array<{
          characterId?: string
          characterName?: string
          responsibility?: string
          importance?: string
        }>
      }>
    }

    let castData: CharacterCastData
    try {
      castData = JSON.parse(aiResponse) as CharacterCastData
    } catch (parseError) {
      // 如果解析失败，尝试提取JSON部分
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        castData = JSON.parse(jsonMatch[0]) as CharacterCastData
      } else {
        throw new Error('无法解析AI响应为JSON')
      }
    }

    // 生成主角
    const mainCharacters: Character[] = (castData.mainCharacters || []).map((char, index) => ({
      id: `main_${Date.now()}_${index}`,
      name: char.name || `主角${index + 1}`,
      age: char.age || 20,
      gender: (char.gender || 'male') as 'male' | 'female' | 'other',
      personality: char.personality || '勇敢善良，富有正义感',
      background: char.background || '普通背景',
      appearance: char.appearance || '普通外貌',
      goals: char.goals || ['实现梦想'],
      fears: char.fears || ['失败'],
      skills: char.skills || ['基本技能'],
      relationships: [],
      role: char.role || '主角',
      importance: 'main' as const,
      // 人类写作风格 - 语言风格字段
      languageStyle: char.languageStyle || '说话直接，表达清晰',
      catchphrase: char.catchphrase || ['我说', '嗯'],
      dialectHint: char.dialectHint
    }))

    // 如果主角不足，生成默认主角
    if (mainCharacters.length === 0) {
      mainCharacters.push({
        id: `main_${Date.now()}_0`,
        name: '林风',
        age: 18,
        gender: 'male',
        personality: '性格坚韧，不畏困难，有着强烈的正义感和责任心。面对挫折从不轻易放弃，善于从失败中吸取教训。',
        background: '出生于普通家庭，从小就对武术有着浓厚的兴趣。在一次意外中获得了特殊能力，从此踏上了不平凡的人生道路。',
        appearance: '身材修长，面容俊朗，眼神中透着坚定和自信。',
        goals: ['成为最强者', '保护身边的人', '揭开身世之谜'],
        fears: ['失去重要的人', '被背叛'],
        skills: ['剑术', '内功心法', '洞察力'],
        relationships: [],
        role: '男主角',
        importance: 'main',
        // 人类写作风格 - 默认语言风格
        languageStyle: '说话简洁有力，不喜欢绕弯子，遇到重要事情会变得严肃',
        catchphrase: ['我说', '啧', '行吧'],
        dialectHint: '北方口音，偶尔会说"咋"、"啥"'
      })
    }

    // 生成配角
    const supportingCharacters: Character[] = (castData.supportingCharacters || []).map((char, index) => ({
      id: `support_${Date.now()}_${index}`,
      name: char.name || `配角${index + 1}`,
      age: char.age || 25,
      gender: (char.gender || 'male') as 'male' | 'female' | 'other',
      personality: char.personality || '性格温和，善解人意',
      background: char.background || '普通背景',
      appearance: char.appearance || '普通外貌',
      goals: char.goals || ['帮助主角'],
      fears: char.fears || ['失败'],
      skills: char.skills || ['基本技能'],
      relationships: [],
      role: char.role || '配角',
      importance: (char.importance || 'supporting') as 'supporting' | 'minor',
      // 人类写作风格 - 语言风格字段
      languageStyle: char.languageStyle || '说话温和，善于倾听',
      catchphrase: char.catchphrase || ['嗯嗯', '是吗'],
      dialectHint: char.dialectHint
    }))

    // 如果配角不足，生成默认配角
    if (supportingCharacters.length < 3) {
      const defaultSupporting = [
        {
          name: '苏婉儿',
          age: 17,
          gender: 'female' as const,
          personality: '温柔善良，聪慧过人，对主角有着特殊的感情。',
          background: '出身名门望族，从小接受良好教育，是主角的青梅竹马。',
          appearance: '容貌秀丽，气质高雅，举止端庄。',
          role: '女主角',
          importance: 'supporting' as const,
          languageStyle: '说话轻声细语，喜欢用叠词，表达含蓄',
          catchphrase: ['嗯...', '那个...', '其实'],
          dialectHint: '江南口音，说话带有"呢"、"呀"等语气词'
        },
        {
          name: '张铁',
          age: 20,
          gender: 'male' as const,
          personality: '豪爽直率，重情重义，是主角最好的朋友。',
          background: '出身武学世家，从小习武，性格豪爽。',
          appearance: '身材魁梧，面容刚毅，给人一种可靠的感觉。',
          role: '好友',
          importance: 'supporting' as const,
          languageStyle: '说话大声，直来直去，喜欢用感叹词',
          catchphrase: ['哈！', '这事儿包我身上', '兄弟'],
          dialectHint: '北方粗犷口音，常说"咋整"、"那啥"'
        },
        {
          name: '王老',
          age: 60,
          gender: 'male' as const,
          personality: '沉稳睿智，见多识广，是主角的导师。',
          background: '隐居多年的武学大师，看中主角的潜力。',
          appearance: '白发苍苍，精神矍铄，眼神深邃。',
          role: '导师',
          importance: 'supporting' as const,
          languageStyle: '说话慢条斯理，喜欢用古语和谚语，语气沉稳',
          catchphrase: ['且慢', '老夫以为', '嗯...'],
          dialectHint: '文言气息，偶尔说"老夫"、"此乃"'
        }
      ]

      defaultSupporting.forEach((char, _index) => {
        if (supportingCharacters.length < 5) {
          supportingCharacters.push({
            id: `support_${Date.now()}_${supportingCharacters.length}`,
            ...char,
            goals: ['帮助主角成长'],
            fears: ['主角走上歧途'],
            skills: ['武学', '智慧'],
            relationships: [],
          })
        }
      })
    }

    // 创建角色ID映射
    const allChars = [...mainCharacters, ...supportingCharacters]
    const charIdMap = new Map<string, string>()
    allChars.forEach(char => {
      charIdMap.set(char.name, char.id)
    })

    // 生成关系
    const relationships: Relationship[] = (castData.relationships || []).map((rel, index) => {
      // 尝试通过姓名找到角色ID
      let char1Id = rel.character1Id || ''
      let char2Id = rel.character2Id || ''
      
      // 如果ID是姓名，转换为真实ID
      charIdMap.forEach((id, name) => {
        if (rel.character1Id === name) char1Id = id
        if (rel.character2Id === name) char2Id = id
      })

      return {
        id: `rel_${Date.now()}_${index}`,
        character1Id: char1Id || allChars[0]?.id || '',
        character2Id: char2Id || allChars[1]?.id || '',
        type: (rel.type || 'friend') as 'family' | 'friend' | 'enemy' | 'lover' | 'colleague' | 'other',
        description: rel.description || '普通关系',
        strength: rel.strength || 5
      }
    })

    // 如果关系不足，生成默认关系
    if (relationships.length === 0 && allChars.length >= 2) {
      relationships.push(
        {
          id: `rel_${Date.now()}_0`,
          character1Id: mainCharacters[0]?.id || allChars[0].id,
          character2Id: supportingCharacters[0]?.id || allChars[1].id,
          type: 'friend',
          description: '青梅竹马，关系亲密',
          strength: 8
        },
        {
          id: `rel_${Date.now()}_1`,
          character1Id: mainCharacters[0]?.id || allChars[0].id,
          character2Id: supportingCharacters[1]?.id || allChars[2]?.id || allChars[1].id,
          type: 'friend',
          description: '生死之交',
          strength: 9
        }
      )
    }

    // 生成卷级职责
    const volumeResponsibilities: VolumeResponsibility[] = (castData.volumeResponsibilities || []).map((vol, index) => ({
      volumeId: vol.volumeId || `vol_${index + 1}`,
      volumeName: vol.volumeName || `第${index + 1}卷`,
      responsibilities: (vol.responsibilities || []).map(resp => {
        // 尝试通过姓名找到角色ID
        let charId = resp.characterId || ''
        charIdMap.forEach((id, name) => {
          if (resp.characterId === name || resp.characterName === name) charId = id
        })

        const char = allChars.find(c => c.id === charId) || allChars[0]

        return {
          characterId: charId || char.id,
          characterName: resp.characterName || char.name,
          responsibility: resp.responsibility || '参与主线剧情',
          importance: (resp.importance || 'minor') as 'major' | 'minor'
        }
      })
    }))

    // 如果卷级职责不足，生成默认职责
    if (volumeResponsibilities.length === 0) {
      volumeResponsibilities.push(
        {
          volumeId: 'vol_1',
          volumeName: '初入江湖',
          responsibilities: [
            {
              characterId: mainCharacters[0]?.id || allChars[0].id,
              characterName: mainCharacters[0]?.name || allChars[0].name,
              responsibility: '主角登场，建立基本世界观',
              importance: 'major'
            },
            {
              characterId: supportingCharacters[0]?.id || allChars[1]?.id || '',
              characterName: supportingCharacters[0]?.name || allChars[1]?.name || '',
              responsibility: '与主角建立关系',
              importance: 'major'
            }
          ]
        },
        {
          volumeId: 'vol_2',
          volumeName: '崭露头角',
          responsibilities: [
            {
              characterId: mainCharacters[0]?.id || allChars[0].id,
              characterName: mainCharacters[0]?.name || allChars[0].name,
              responsibility: '实力提升，遇到第一个挑战',
              importance: 'major'
            },
            {
              characterId: supportingCharacters[1]?.id || allChars[2]?.id || '',
              characterName: supportingCharacters[1]?.name || allChars[2]?.name || '',
              responsibility: '协助主角成长',
              importance: 'minor'
            }
          ]
        }
      )
    }

    return {
      mainCharacters,
      supportingCharacters,
      relationships,
      volumeResponsibilities
    }
  } catch (error) {
    console.error('生成角色阵容失败:', error)
    throw error
  }
}

// ============================================================================
// 灵感生成服务
// ============================================================================

export const generateInspirationService = async (data: {
  keyword?: string
  genre?: string
}): Promise<{
  directions: Array<{
    title: string
    description: string
    genre: string
    coreSellingPoint: string
    targetReaderFeeling: string
  }>
}> => {
  const prompt = `你是一位资深小说策划师，请根据以下信息生成3-5个创作方向：

关键词：${data.keyword || '无特定关键词'}
题材偏好：${data.genre || '不限'}

请为每个创作方向提供：
1. title: 作品标题（要有吸引力）
2. description: 故事简介（100-200字）
3. genre: 题材类型
4. coreSellingPoint: 核心卖点（一句话概括最吸引读者的点）
5. targetReaderFeeling: 目标读者感受（希望读者获得什么体验）

以JSON格式输出：{ "directions": [...] }`

  const aiResponse = await aiService.generateText(prompt, { temperature: 0.9, maxTokens: 4000 })
  
  let result
  try {
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
    result = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(aiResponse)
  } catch {
    result = { directions: [] }
  }

  if (!result.directions || result.directions.length === 0) {
    result.directions = [
      {
        title: data.keyword ? `${data.keyword}传奇` : '未命名传说',
        description: '一个充满冒险与成长的故事，主角在逆境中崛起，最终实现自我价值。',
        genre: data.genre || '玄幻',
        coreSellingPoint: '热血升级，爽感十足',
        targetReaderFeeling: '热血沸腾，欲罢不能'
      }
    ]
  }

  return result
}

// ============================================================================
// 项目设定生成服务
// ============================================================================

export const generateProjectSettingService = async (data: {
  title: string
  description: string
  genre?: string
  inspiration?: string
}): Promise<{
  title?: string
  description?: string
  genre: string
  coreSellingPoint: string
  targetReaderFeeling: string
  first30ChaptersPromise: string
  worldviewHint: string
  styleHint: string
}> => {
  const inspirationSection = data.inspiration 
    ? `\n\n【原始灵感】\n${data.inspiration}\n`
    : ''

  const hasBasicInfo = data.title !== '待定' && data.description !== '待定'
  const basicInfoSection = hasBasicInfo 
    ? `\n标题：${data.title}\n简介：${data.description}`
    : ''

  const prompt = `你是一位专业的小说策划顾问，请为以下小说创意生成详细的项目设定：
${inspirationSection}${basicInfoSection}
题材偏好：${data.genre || '不限'}

请生成以下内容：
${!hasBasicInfo ? '1. title: 推荐的书名（2-10个字，朗朗上口）\n2. description: 一句话简介（20-50字概括故事核心）\n' : ''}3. genre: 最适合的题材类型（如：玄幻、都市、科幻、仙侠、历史等）
4. coreSellingPoint: 核心卖点（100-200字，详细描述作品最吸引读者的核心元素，包括：独特设定、创新玩法、爽点设计、差异化卖点等）
5. targetReaderFeeling: 目标读者感受（100-200字，详细描述读者阅读时应该获得的情感体验，如爽感、感动、紧张刺激、新奇、成长感、代入感等）
6. first30ChaptersPromise: 前30章承诺（150-300字，详细描述前30章要展现的内容，包括：主线走向、核心看点、期待兑现、情感钩子、开篇钩子、金手指展示、第一次冲突、第一次逆袭、重要配角登场、世界观铺垫等）
7. worldviewHint: 世界观提示（50-100字，简要描述故事世界的特色）
8. styleHint: 风格提示（推荐的语言风格和叙事方式）

【重要】内容要丰富具体，避免空泛描述，要让读者能清晰感受到作品的独特魅力。

以JSON格式输出`

  const aiResponse = await aiService.generateText(prompt, { temperature: 0.8, maxTokens: 4000 })
  
  let result
  try {
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
    result = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(aiResponse)
  } catch {
    result = {}
  }

  return {
    title: result.title,
    description: result.description,
    genre: result.genre || data.genre || '玄幻',
    coreSellingPoint: result.coreSellingPoint || '独特的世界观设定',
    targetReaderFeeling: result.targetReaderFeeling || '热血沸腾',
    first30ChaptersPromise: result.first30ChaptersPromise || '主角初露锋芒',
    worldviewHint: result.worldviewHint || '',
    styleHint: result.styleHint || ''
  }
}

// ============================================================================
// 卷战略生成服务
// ============================================================================

// 小说写作技巧指南
const NOVEL_WRITING_TECHNIQUES = `
【小说写作技巧指南 - 提升故事质量】

一、铺垫和伏笔规则
1. 伏笔设置原则：
   - 每个重要情节转折前至少提前3-5章埋下伏笔
   - 伏笔要自然融入剧情，不要刻意强调
   - 伏笔回收时要有"意料之外，情理之中"的效果

2. 铺垫技巧：
   - 人物铺垫：在重要人物登场前，先通过他人之口提及
   - 事件铺垫：在重大事件发生前，先制造小规模类似事件
   - 情感铺垫：在情感爆发前，先积累足够的情感张力

3. 伏笔类型：
   - 物品伏笔：重要道具的提前出现
   - 人物伏笔：关键人物背景的暗示
   - 命运伏笔：通过预言、梦境等方式暗示
   - 细节伏笔：看似无关紧要的细节，后续成为关键

二、矛盾冲突规则
1. 冲突层次设计：
   - 外部冲突：主角与环境的冲突（生存、竞争、战争等）
   - 人际冲突：主角与其他角色的冲突（敌人、对手、误解等）
   - 内心冲突：主角内心的挣扎和抉择

2. 冲突升级节奏：
   - 初始冲突：小规模、低烈度，建立基本矛盾
   - 冲突升级：矛盾加深，范围扩大，烈度提升
   - 冲突高潮：矛盾集中爆发，达到顶点
   - 冲突解决：矛盾的解决或暂时缓解

3. 冲突设计要点：
   - 每个章节都要有至少一个小冲突
   - 每3-5章要有一个中等规模的冲突
   - 每卷结尾要有一个大冲突的爆发或转折

三、人物塑造规则
1. 人物弧光设计：
   - 起点：人物的初始状态和性格特点
   - 变化：经历事件后的性格转变
   - 终点：人物的最终状态，体现成长或堕落

2. 人物立体化技巧：
   - 给人物设置缺点和弱点，让人物更真实
   - 设计人物的内心矛盾，增加深度
   - 通过细节展现人物性格，而非直接描述

3. 人物关系网络：
   - 主角与配角的关系要有层次和变化
   - 人物关系要随剧情发展而演变
   - 关键关系转折要有足够的铺垫

四、情节节奏控制
1. 起承转合结构：
   - 起：开篇吸引，建立期待
   - 承：发展推进，积累张力
   - 转：转折变化，制造惊喜
   - 合：收束总结，留下悬念

2. 节奏变化技巧：
   - 张弛有度：紧张与舒缓交替
   - 快慢结合：快节奏推进与慢节奏铺垫结合
   - 高低起伏：高潮与低谷交替，避免平铺直叙

3. 悬念设置：
   - 每章结尾设置小悬念
   - 每卷结尾设置大悬念
   - 长线悬念贯穿全文，阶段性揭示
`

export const generateVolumeStrategyService = async (data: {
  title: string
  genre: string
  overallDirection: string
  coreConflict: string
  upgradeNodes: Array<{
    name: string
    chapterRange: { start: number; end: number }
    upgradeContent: string
    keyEvents: string[]
  }>
}): Promise<{
  volumes: Array<{
    name: string
    chapterRange: { start: number; end: number }
    coreEvent: string
    characterArc: string
    tensionLevel: number
    summary: string
    upgradeNodes: Array<{
      name: string
      upgradeContent: string
    }>
    endingHook: string
    // 新增：伏笔和冲突设计
    foreshadowing?: Array<{
      content: string
      setupChapter: number
      payoffChapter?: number
    }>
    conflicts?: Array<{
      type: 'external' | 'interpersonal' | 'internal'
      description: string
      intensity: number
    }>
  }>
}> => {
  const prompt = `你是一位专业的小说结构规划师，请根据以下信息生成卷级战略规划：

书名：${data.title}
题材：${data.genre}
整本走向：${data.overallDirection}
核心冲突：${data.coreConflict}
升级节点：${JSON.stringify(data.upgradeNodes)}

${NOVEL_WRITING_TECHNIQUES}

请生成2-6个卷，每卷包含：
1. name: 卷名（要有气势，如"初入江湖卷"、"风云际会卷"）
2. chapterRange: 章节范围 { start, end }
3. coreEvent: 核心事件（该卷最重要的剧情）
4. characterArc: 主角成长弧线（该卷主角的变化）
5. tensionLevel: 紧张度（1-10，10最紧张）
6. summary: 卷概要（50-100字）
7. upgradeNodes: 升级节点数组，每个包含 { name: "节点名称", upgradeContent: "升级内容描述" }，描述该卷主角的能力提升、境界突破、身份转变等关键成长点
8. endingHook: 卷尾钩子（30-50字），描述卷尾的悬念或吸引点，让读者迫不及待想看下一卷
9. foreshadowing: 伏笔设计数组，每个包含 { content: "伏笔内容", setupChapter: 埋设章节, payoffChapter?: 回收章节 }
10. conflicts: 冲突设计数组，每个包含 { type: "external"|"interpersonal"|"internal", description: "冲突描述", intensity: 烈度1-10 }

要求：
- 各卷章节范围要衔接，不重叠
- 紧张度呈波浪式递增
- 每卷结尾留悬念
- 升级节点要符合网文爽点规律，每卷至少1-2个升级节点
- 卷尾钩子要有吸引力，制造悬念或转折
- 每卷至少设置2-3个伏笔，为后续剧情铺垫
- 每卷要有层次丰富的冲突设计（外部、人际、内心）

以JSON格式输出：{ "volumes": [...] }`

  const aiResponse = await aiService.generateText(prompt, { temperature: 0.8, maxTokens: 4000 })
  
  let result
  try {
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
    result = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(aiResponse)
  } catch {
    result = { volumes: [] }
  }

  if (!result.volumes || result.volumes.length === 0) {
    result.volumes = [
      { name: '初露锋芒', chapterRange: { start: 1, end: 30 }, coreEvent: '主角初登场', characterArc: '从平凡到觉醒', tensionLevel: 4, summary: '主角踏入新世界', upgradeNodes: [{ name: '觉醒', upgradeContent: '主角获得特殊能力，开启修炼之路' }], endingHook: '主角在危机中意外觉醒神秘力量，引来神秘势力的关注' },
      { name: '风云际会', chapterRange: { start: 31, end: 80 }, coreEvent: '第一次大危机', characterArc: '实力提升', tensionLevel: 7, summary: '主角面对重大挑战', upgradeNodes: [{ name: '突破', upgradeContent: '突破第一境界，实力大增' }, { name: '名扬', upgradeContent: '在宗门大比中崭露头角' }], endingHook: '主角击败强敌后，发现背后隐藏着更大的阴谋' },
      { name: '巅峰对决', chapterRange: { start: 81, end: 120 }, coreEvent: '最终决战', characterArc: '完成蜕变', tensionLevel: 9, summary: '主角与宿敌的终极对决', upgradeNodes: [{ name: '蜕变', upgradeContent: '领悟至高功法，实力达到新境界' }], endingHook: '主角战胜宿敌，却发现这只是更大棋局的开端' }
    ]
  }

  return result
}

// ============================================================================
// 节奏拆章生成服务
// ============================================================================

export const generateRhythmBreakdownService = async (data: {
  title: string
  genre: string
  volumeName: string
  volumeChapterRange: { start: number; end: number }
  coreEvent: string
  characterArc: string
  tensionLevel: number
  characters: Array<{ name: string; role: string; languageStyle?: string; catchphrase?: string[] }>
}): Promise<{
  chapters: Array<{
    chapterNumber: number
    title: string
    summary: string
    tensionLevel: number
    pov: string
    keyEvents: string[]
    wordCountTarget: number
    // 新增：伏笔和冲突设计
    foreshadowing?: Array<{
      type: 'setup' | 'payoff'
      content: string
    }>
    conflict?: {
      type: 'external' | 'interpersonal' | 'internal'
      description: string
    }
    hookType?: 'suspense' | 'twist' | 'cliffhanger' | 'emotional'
  }>
}> => {
  // 构建角色语言风格信息
  const characterLanguageInfo = data.characters.map(c => {
    let info = `${c.name}(${c.role})`
    if (c.languageStyle) info += ` - 语言风格: ${c.languageStyle}`
    if (c.catchphrase && c.catchphrase.length > 0) info += ` - 口头禅: ${c.catchphrase.join('、')}`
    return info
  }).join('\n')

  const prompt = `你是一位专业的小说节奏规划师，请为以下卷生成详细的章节拆分：

书名：${data.title}
题材：${data.genre}
卷名：${data.volumeName}
章节范围：第${data.volumeChapterRange.start}章 - 第${data.volumeChapterRange.end}章
核心事件：${data.coreEvent}
主角成长弧线：${data.characterArc}
卷紧张度：${data.tensionLevel}/10

【主要角色及语言风格】
${characterLanguageInfo}

${NOVEL_WRITING_TECHNIQUES}

请为每章生成：
1. chapterNumber: 章节序号
2. title: 章节标题（要有吸引力）
3. summary: 章节概要（50-100字）
4. tensionLevel: 本章紧张度（1-10）
5. pov: 视角角色名
6. keyEvents: 关键事件列表（1-3个）
7. wordCountTarget: 目标字数（2000-4000）
8. foreshadowing: 伏笔设计数组，每个包含 { type: "setup"|"payoff", content: "伏笔内容" }
9. conflict: 本章主要冲突 { type: "external"|"interpersonal"|"internal", description: "冲突描述" }
10. hookType: 章节结尾钩子类型（"suspense"悬念 | "twist"转折 | "cliffhanger"悬念 | "emotional"情感）

节奏要求：
- 开头几章节奏较慢（铺垫），中间加速，高潮前有缓冲
- 紧张度呈波浪式变化
- 每章结尾要有钩子（悬念或转折）
- 每3-5章设置一个伏笔，为后续剧情铺垫
- 确保每章都有明确的冲突推动剧情

以JSON格式输出：{ "chapters": [...] }`

  const aiResponse = await aiService.generateText(prompt, { temperature: 0.8, maxTokens: 6000 })
  
  let result
  try {
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
    result = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(aiResponse)
  } catch {
    result = { chapters: [] }
  }

  if (!result.chapters || result.chapters.length === 0) {
    const start = data.volumeChapterRange.start
    const end = data.volumeChapterRange.end
    const chapters = []
    for (let i = start; i <= end; i++) {
      chapters.push({
        chapterNumber: i,
        title: `第${i}章`,
        summary: '待补充',
        tensionLevel: Math.min(10, Math.max(1, Math.round(data.tensionLevel * (0.5 + 0.5 * (i - start) / Math.max(1, end - start))))),
        pov: data.characters[0]?.name || '主角',
        keyEvents: ['推进剧情'],
        wordCountTarget: 3000
      })
    }
    result = { chapters }
  }

  return result
}

// ============================================================================
// 章节内容生成服务
// ============================================================================

const RHYTHM_CONFIGS = {
  fast: {
    name: '快节奏',
    description: '紧张刺激，快速推进',
    tensionLevel: '高',
    paceHint: '情节紧凑，快速推进，多写冲突和转折，少写铺垫和过渡',
    dialogueRatio: 0.4,
    actionRatio: 0.4,
    descriptionRatio: 0.2,
  },
  medium: {
    name: '中节奏',
    description: '张弛有度，稳步发展',
    tensionLevel: '中',
    paceHint: '张弛有度，稳步发展，适当铺垫，有节奏地推进情节',
    dialogueRatio: 0.35,
    actionRatio: 0.3,
    descriptionRatio: 0.35,
  },
  slow: {
    name: '慢节奏',
    description: '舒缓细腻，铺垫蓄势',
    tensionLevel: '低',
    paceHint: '舒缓细腻，铺垫蓄势，多写环境、心理和细节描写，营造氛围',
    dialogueRatio: 0.3,
    actionRatio: 0.2,
    descriptionRatio: 0.5,
  },
}

type RhythmType = keyof typeof RHYTHM_CONFIGS

export const generateChapterContentService = async (data: {
  title: string
  genre: string
  chapterTitle: string
  chapterSummary: string
  previousChapterSummary?: string
  characters: Array<{ name: string; role: string; personality?: string; languageStyle?: string; catchphrase?: string[]; dialectHint?: string }>
  styleHint?: string
  targetWordCount: number
  rhythmType?: RhythmType
  writingStyle?: string
  emotionalTone?: string
  specialRequirements?: string
  autoPolish?: boolean
  polishIntensity?: PolishIntensity
  // 人类写作风格配置
  humanWritingStyleConfig?: {
    enableBurstiness?: boolean      // 启用爆发性规则
    enablePerplexity?: boolean      // 启用困惑度控制
    enableEmotionalFluctuation?: boolean  // 启用情感波动
    enableColloquial?: boolean      // 启用口语化表达
    enableSensoryDetails?: boolean  // 启用感官细节
    enableThinkingSimulation?: boolean    // 启用思维模拟
    aiDetectionBypass?: 'zhuque' | 'zhipu' | 'gptzero' | 'general' | 'comprehensive'  // AI检测绕过策略
  }
}): Promise<{
  content: string
  wordCount: number
  polished?: boolean
  polishResult?: {
    aiFeaturesDetected: number
    improvements: string[]
  }
}> => {
  const minWordCount = Math.floor(data.targetWordCount * 0.9)
  const maxWordCount = Math.floor(data.targetWordCount * 1.1)
  const rhythmConfig = RHYTHM_CONFIGS[data.rhythmType || 'medium']
  
  // 获取人类写作风格配置
  const styleConfig = data.humanWritingStyleConfig || {
    enableBurstiness: true,
    enablePerplexity: true,
    enableEmotionalFluctuation: true,
    enableColloquial: true,
    enableSensoryDetails: true,
    enableThinkingSimulation: true,
    aiDetectionBypass: 'comprehensive' as const
  }

  // 构建人类写作风格指南
  const buildHumanWritingStyleGuide = (): string => {
    let guide = '\n【人类写作风格指南 - 让文字更自然】\n\n'
    
    // 1. 爆发性规则
    if (styleConfig.enableBurstiness) {
      guide += `一、爆发性（Burstiness）规则
- 长短句交替：刻意制造句子长度的显著差异，避免均匀分布
- 段落节奏变化：通过段落长度变化创造阅读节奏感
- 关键情节短句强调：在重要转折、情感爆发时使用极短句（1-5字）
- 场景描写长句铺陈：在环境、氛围、心理描写时使用复杂长句

示例：
- 短句强调："门开了。没有人。她僵住了。"
- 长句铺陈："窗外的梧桐树叶子已经落了大半，枯黄的叶片在风中打着旋儿，像是喝醉了的蝴蝶，摇摇晃晃地飘向地面。"

`
    }

    // 2. 困惑度控制
    if (styleConfig.enablePerplexity) {
      guide += `二、困惑度（Perplexity）控制
- 词汇多样性：避免重复使用相同词汇，同义词替换率应达到30%以上
- 避免"标准"用词：不要使用"首先、其次、最后"、"值得注意的是"、"需要指出的是"等AI常用表达
- 同义词替换：
  * "非常" → "要命"、"不行"、"厉害"、"够呛"
  * "说" → "嘟囔"、"嘀咕"、"开口"、"接话"、"插嘴"
  * "高兴" → "乐得不行"、"笑得合不拢嘴"

`
    }

    // 3. 情感波动
    if (styleConfig.enableEmotionalFluctuation) {
      const techniques = getEmotionalFluctuationTechniques()
      guide += `三、情感波动注入
- 情感曲线设计：在叙事中设计情感的起伏变化，避免平铺直叙
- 矛盾情感共存：展现人物内心的复杂性和矛盾性
- 情感非理性因素：加入不合逻辑但真实的情感反应
- 情感"不完美解决"：不追求情感的圆满解决，保留遗憾和悬念

技巧示例：
${techniques.slice(0, 5).map((t, i) => `  ${i + 1}. ${t}`).join('\n')}

`
    }

    // 4. 口语化表达
    if (styleConfig.enableColloquial) {
      guide += `四、口语化表达规则
- 句式省略：省略主语、谓语、连接词等，模拟真实说话习惯
- 语气词使用：适当使用"啊、吧、呢、嘛、呀、哦"等语气词
- 不完整句子：使用断句、省略、中断的句子
- 真实说话节奏：模拟人类说话的停顿、重复、犹豫

示例：
- 正式："我觉得这件事情不太好处理。"
- 口语："这事儿，难办。"
- 正式："他不知道应该说什么才好。"
- 口语："他张了张嘴，没说出话来。"

`
    }

    // 5. 感官细节
    if (styleConfig.enableSensoryDetails) {
      guide += `五、感官细节描写
- 视觉：颜色、光影、形状、动态（如：灰蒙蒙、金灿灿、斑驳、朦胧）
- 听觉：音量、音调、节奏、质感（如：沙沙、哗啦、咚咚、闷闷的）
- 嗅觉：气味、氛围、记忆触发（如：腥腥的、呛人、若有若无）
- 味觉：味道、口感、温度（如：涩涩的、发苦、回味）
- 触觉：温度、质地、压力、疼痛（如：黏糊糊、凉丝丝、刺痛）

注意：避免"美丽的"、"悦耳的"、"芳香的"等泛泛形容词

`
    }

    // 6. 思维模拟
    if (styleConfig.enableThinkingSimulation) {
      const thinkingTechniques = getThinkingSimulationTechniques()
      guide += `六、人类思维模拟
- 思维跳跃：模拟人类思维的跳跃性和联想性
- 意识流表达：展现思维的流动和变化
- 直觉与冲动：展现非理性的决策过程
- 决策犹豫反复：展现人类决策的不确定性

技巧示例：
${thinkingTechniques.slice(0, 4).map((t, i) => `  ${i + 1}. ${t}`).join('\n')}

`
    }

    return guide
  }

  // 构建AI检测绕过Prompt
  const buildAIDetectionBypassPrompt = (): string => {
    switch (styleConfig.aiDetectionBypass) {
      case 'zhuque':
        return `\n${ZHUQUE_BYPASS_PROMPT}\n`
      case 'zhipu':
        return `\n${ZHIPU_BYPASS_PROMPT}\n`
      case 'gptzero':
        return `\n${GPTZERO_BYPASS_PROMPT}\n`
      case 'comprehensive':
        return `\n${COMPREHENSIVE_AI_BYPASS_PROMPT}\n`
      case 'general':
      default: {
        const techniques = getGeneralAIDetectionBypassTechniques()
        return `
【通用AI检测绕过技巧】
${techniques.map((t, i) => `${i + 1}. ${t}`).join('\n')}

`
      }
    }
  }

  // 构建角色语言风格信息
  const buildCharacterLanguageInfo = (): string => {
    if (!data.characters || data.characters.length === 0) return ''
    
    let info = '\n【角色语言风格参考】\n'
    for (const char of data.characters) {
      if (char.languageStyle || char.catchphrase || char.dialectHint) {
        info += `\n${char.name}（${char.role}）：`
        if (char.languageStyle) info += `\n  - 语言风格：${char.languageStyle}`
        if (char.catchphrase && char.catchphrase.length > 0) {
          info += `\n  - 口头禅：${char.catchphrase.join('、')}`
        }
        if (char.dialectHint) info += `\n  - 方言特色：${char.dialectHint}`
      }
    }
    return info + '\n'
  }
  
  const generateContent = async (): Promise<string> => {
    const rhythmSection = `
【节奏类型：${rhythmConfig.name}】
- 节奏描述：${rhythmConfig.description}
- 紧张程度：${rhythmConfig.tensionLevel}
- 写作指导：${rhythmConfig.paceHint}
- 内容比例建议：
  - 对话约${Math.floor(rhythmConfig.dialogueRatio * 100)}%
  - 动作约${Math.floor(rhythmConfig.actionRatio * 100)}%
  - 描写约${Math.floor(rhythmConfig.descriptionRatio * 100)}%
`

    const styleSection = data.writingStyle ? `\n【写作风格】${data.writingStyle}` : ''
    const toneSection = data.emotionalTone ? `\n【情感基调】${data.emotionalTone}` : ''
    const specialSection = data.specialRequirements ? `\n【特殊要求】${data.specialRequirements}` : ''
    
    // 人类写作风格指南
    const humanStyleGuide = buildHumanWritingStyleGuide()
    
    // AI检测绕过Prompt
    const aiBypassPrompt = buildAIDetectionBypassPrompt()
    
    // 角色语言风格信息
    const characterLanguageInfo = buildCharacterLanguageInfo()

    const prompt = `你是一位专业的网络小说作家，请根据以下信息撰写章节内容：

书名：${data.title}
题材：${data.genre}
章节标题：${data.chapterTitle}
章节概要：${data.chapterSummary}
${data.previousChapterSummary ? `上一章概要：${data.previousChapterSummary}` : ''}
主要角色：${data.characters.map(c => `${c.name}(${c.role}${c.personality ? '，' + c.personality : ''})`).join('、')}
风格提示：${data.styleHint || '流畅自然，引人入胜'}
${rhythmSection}${styleSection}${toneSection}${specialSection}
${characterLanguageInfo}
${humanStyleGuide}
${aiBypassPrompt}

【字数要求 - 非常重要！！！必须严格遵守！！！】
目标字数：${data.targetWordCount}字
最低字数：${minWordCount}字
最高字数：${maxWordCount}字

⚠️ 警告：
1. 当前章节字数必须在${minWordCount}字到${maxWordCount}字之间！
2. 字数不足${minWordCount}字或超过${maxWordCount}字都将被视为不合格！
3. 请精确控制字数，不要超出范围！

写作要求：
1. 严格按照章节概要展开剧情，情节要连贯推进
2. 对话要自然，符合角色性格，多写对话互动，对话要详细
3. 场景描写要有画面感，详细描写环境、动作、表情、氛围
4. 心理描写要细腻，展现角色内心世界
5. 章节结尾留悬念或钩子
6. 【重要】禁止重复内容！每段内容都要有新的进展
7. 【重要】内容要丰富充实，不要草草结尾
8. 【重要】多写细节！多写对话！多写描写！确保字数达标！
9. 【重要】严格按照节奏类型"${rhythmConfig.name}"的指导进行写作！
10. 【重要】严格遵循人类写作风格指南，让文字更自然！
11. 【重要】使用角色独特的语言风格和口头禅，让对话更有辨识度！

内容结构建议：
- 开篇（约20%，${Math.floor(data.targetWordCount * 0.2)}字）：场景描写、人物登场、氛围营造
- 发展（约50%，${Math.floor(data.targetWordCount * 0.5)}字）：情节推进、对话互动、矛盾展开
- 高潮（约20%，${Math.floor(data.targetWordCount * 0.2)}字）：关键转折、情感爆发、冲突升级
- 结尾（约10%，${Math.floor(data.targetWordCount * 0.1)}字）：悬念留白、引出下文

请直接输出章节正文内容，不要输出标题、概要等元信息。内容要有明确的开始、发展和结尾。
字数必须控制在${minWordCount}字到${maxWordCount}字之间！`

    const content = await aiService.generateText(prompt, { 
      temperature: 0.8, 
      maxTokens: Math.min(data.targetWordCount * 3, 16000) 
    })
    
    return content.trim()
  }

  // 尝试生成，如果字数不足则重试一次
  let finalContent = await generateContent()
  
  // 检测并去除重复内容
  const paragraphs = finalContent.split('\n\n')
  const uniqueParagraphs: string[] = []
  const seenParagraphs = new Set<string>()
  
  for (const para of paragraphs) {
    const trimmedPara = para.trim()
    if (trimmedPara.length > 50 && seenParagraphs.has(trimmedPara)) {
      break
    }
    if (trimmedPara.length > 0) {
      uniqueParagraphs.push(trimmedPara)
      if (trimmedPara.length > 50) {
        seenParagraphs.add(trimmedPara)
      }
    }
  }
  
  finalContent = uniqueParagraphs.join('\n\n')
  
  // 字数检查和处理
  const currentWordCount = finalContent.length
  
  // 如果字数超过上限，进行截断
  if (currentWordCount > maxWordCount) {
    console.log(`生成内容字数超出上限: ${currentWordCount}/${maxWordCount}，进行截断...`)
    
    // 尝试在段落边界截断
    let truncatedContent = finalContent.slice(0, maxWordCount)
    const lastParagraphEnd = truncatedContent.lastIndexOf('\n\n')
    
    if (lastParagraphEnd > maxWordCount * 0.8) {
      truncatedContent = truncatedContent.slice(0, lastParagraphEnd)
    }
    
    // 添加结尾过渡
    if (!truncatedContent.endsWith('。') && !truncatedContent.endsWith('！') && !truncatedContent.endsWith('？')) {
      const lastSentenceEnd = Math.max(
        truncatedContent.lastIndexOf('。'),
        truncatedContent.lastIndexOf('！'),
        truncatedContent.lastIndexOf('？')
      )
      if (lastSentenceEnd > truncatedContent.length * 0.9) {
        truncatedContent = truncatedContent.slice(0, lastSentenceEnd + 1)
      }
    }
    
    finalContent = truncatedContent
    console.log(`截断后字数: ${finalContent.length}`)
  }
  
  // 如果字数仍然不足，尝试继续生成
  if (finalContent.length < minWordCount) {
    console.log(`生成内容字数不足: ${finalContent.length}/${minWordCount}，尝试继续生成...`)
    
    const remainingWords = minWordCount - finalContent.length
    const continuePrompt = `请继续为以下章节添加更多内容，当前字数不足。

章节标题：${data.chapterTitle}
当前内容：
${finalContent}

【重要】请继续写${Math.floor(remainingWords * 1.5)}字左右的内容，延续当前情节，添加更多细节、对话和描写。
【注意】总字数不要超过${maxWordCount}字，当前已有${finalContent.length}字。
直接输出续写内容，不要重复已有内容。`

    const additionalContent = await aiService.generateText(continuePrompt, {
      temperature: 0.8,
      maxTokens: Math.min(remainingWords * 3, 8000)
    })
    
    const combinedContent = finalContent + '\n\n' + additionalContent.trim()
    
    // 再次检查字数上限
    if (combinedContent.length > maxWordCount) {
      finalContent = combinedContent.slice(0, maxWordCount)
      const lastParagraphEnd = finalContent.lastIndexOf('\n\n')
      if (lastParagraphEnd > maxWordCount * 0.8) {
        finalContent = finalContent.slice(0, lastParagraphEnd)
      }
    } else {
      finalContent = combinedContent
    }
  }

  // 自动润色
  if (data.autoPolish && finalContent.length > 0) {
    console.log(`开始自动润色章节内容...`)
    
    try {
      const polishResult = await polishContent(finalContent, {
        intensity: data.polishIntensity || 'medium',
        targetAudience: '小说读者',
      })
      
      finalContent = polishResult.polishedContent
      
      console.log(`润色完成，检测到${polishResult.aiFeaturesDetected.length}处AI特征，已优化`)
      
      return {
        content: finalContent,
        wordCount: finalContent.length,
        polished: true,
        polishResult: {
          aiFeaturesDetected: polishResult.aiFeaturesDetected.length,
          improvements: polishResult.improvements,
        }
      }
    } catch (error) {
      console.error('自动润色失败，返回原始内容:', error)
    }
  }

  return {
    content: finalContent,
    wordCount: finalContent.length
  }
}
