import { randomUUID } from 'crypto'
import logger from '../utils/logger.js'
import type {
  WritingTemplate,
  WritingTemplateCreate,
  WritingTemplateUpdate,
  StyleGuide,
  TemplateFilter
} from '../types/shared.js'

/**
 * 写作模板服务类
 * 处理写作模板的CRUD操作和风格指南生成
 */
class WritingTemplateService {
  private templates: WritingTemplate[] = []

  /**
   * 初始化写作模板
   */
  initWritingTemplates(): void {
    // 预定义写作模板
    const predefinedTemplates: WritingTemplate[] = [
      {
        id: 'template-novel-basic',
        name: '小说基础模板',
        description: '适合新手的小说基础结构模板',
        type: 'novel',
        structure: {
          title: '小说标题',
          chapters: [
            {
              title: '第一章',
              sections: [
                '开场介绍',
                '主角登场',
                '冲突引入',
                '悬念设置'
              ]
            },
            {
              title: '第二章',
              sections: [
                '情节发展',
                '人物关系',
                '冲突升级',
                '伏笔铺垫'
              ]
            },
            {
              title: '第三章',
              sections: [
                '高潮部分',
                '冲突解决',
                '结局',
                '尾声'
              ]
            }
          ]
        },
        guidelines: [
          '每个章节控制在3000-5000字',
          '保持情节紧凑，避免冗余描写',
          '注重人物性格塑造',
          '设置合理的悬念和伏笔'
        ],
        isDefault: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'template-novel-fantasy',
        name: '玄幻小说模板',
        description: '专为玄幻小说设计的写作模板',
        type: 'novel',
        structure: {
          title: '玄幻小说标题',
          chapters: [
            {
              title: '第一章 平凡开端',
              sections: [
                '主角背景介绍',
                '平凡生活描写',
                '奇遇触发',
                '修炼之路开启'
              ]
            },
            {
              title: '第二章 修炼入门',
              sections: [
                '修炼体系介绍',
                '第一次修炼',
                '遇到贵人/师傅',
                '初步成长'
              ]
            },
            {
              title: '第三章 挑战与机遇',
              sections: [
                '第一次挑战',
                '获得宝物/技能',
                '敌人出现',
                '危机爆发'
              ]
            },
            {
              title: '第四章 成长与突破',
              sections: [
                '逆境中成长',
                '境界突破',
                '新的目标',
                '更大的挑战'
              ]
            }
          ]
        },
        guidelines: [
          '构建完整的修炼体系和世界观',
          '主角成长要有阶段性和逻辑性',
          '战斗场面要精彩详细',
          '设置合理的升级节奏',
          '加入适当的机遇和挑战'
        ],
        isDefault: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'template-novel-romance',
        name: '言情小说模板',
        description: '专为言情小说设计的写作模板',
        type: 'novel',
        structure: {
          title: '言情小说标题',
          chapters: [
            {
              title: '第一章 初遇',
              sections: [
                '主角背景介绍',
                '相遇场景描写',
                '第一印象',
                '初步互动'
              ]
            },
            {
              title: '第二章 渐生好感',
              sections: [
                '进一步接触',
                '情感萌芽',
                '小插曲',
                '关系升温'
              ]
            },
            {
              title: '第三章 误会与考验',
              sections: [
                '误会产生',
                '情感波动',
                '矛盾升级',
                '内心挣扎'
              ]
            },
            {
              title: '第四章 和解与结局',
              sections: [
                '误会解除',
                '情感升华',
                '承诺与表白',
                '幸福结局'
              ]
            }
          ]
        },
        guidelines: [
          '注重情感描写和心理活动',
          '人物性格要鲜明立体',
          '情节发展要自然流畅',
          '设置合理的情感冲突',
          '语言风格要细腻动人'
        ],
        isDefault: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'template-short-story',
        name: '短篇小说模板',
        description: '适合短篇小说创作的模板',
        type: 'short_story',
        structure: {
          title: '短篇小说标题',
          sections: [
            '开场设置',
            '人物介绍',
            '冲突引入',
            '情节发展',
            '高潮',
            '结局'
          ]
        },
        guidelines: [
          '控制在5000-10000字',
          '集中描写一个主要事件',
          '人物不宜过多',
          '情节紧凑，节奏明快',
          '结尾要有深意'
        ],
        isDefault: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]

    this.templates = predefinedTemplates
    logger.info('写作模板初始化完成')
  }

  /**
   * 获取所有写作模板
   */
  getAllTemplates(filter?: TemplateFilter): WritingTemplate[] {
    try {
      let result = [...this.templates]

      if (filter?.type) {
        result = result.filter(template => template.type === filter.type)
      }

      if (filter?.search) {
        const searchLower = filter.search.toLowerCase()
        result = result.filter(template => 
          template.name.toLowerCase().includes(searchLower) ||
          template.description.toLowerCase().includes(searchLower)
        )
      }

      // 按默认模板优先，然后按创建时间排序
      result.sort((a, b) => {
        if (a.isDefault && !b.isDefault) return -1
        if (!a.isDefault && b.isDefault) return 1
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      })

      return result
    } catch (error) {
      logger.error('获取写作模板列表失败', error)
      throw new Error('获取写作模板列表失败')
    }
  }

  /**
   * 根据ID获取写作模板
   */
  getTemplateById(id: string): WritingTemplate | undefined {
    try {
      return this.templates.find(template => template.id === id)
    } catch (error) {
      logger.error(`获取写作模板失败: ${id}`, error)
      throw new Error('获取写作模板失败')
    }
  }

  /**
   * 创建写作模板
   */
  createTemplate(request: WritingTemplateCreate): WritingTemplate {
    try {
      const template: WritingTemplate = {
        id: randomUUID(),
        name: request.name,
        description: request.description,
        type: request.type,
        structure: request.structure,
        guidelines: request.guidelines || [],
        isDefault: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      this.templates.push(template)
      logger.info(`创建写作模板成功: ${template.id}`)
      return template
    } catch (error) {
      logger.error('创建写作模板失败', error)
      throw new Error('创建写作模板失败')
    }
  }

  /**
   * 更新写作模板
   */
  updateTemplate(id: string, request: WritingTemplateUpdate): WritingTemplate {
    try {
      const index = this.templates.findIndex(template => template.id === id)
      if (index === -1) {
        throw new Error('模板不存在')
      }

      const existingTemplate = this.templates[index]
      if (existingTemplate.isDefault) {
        throw new Error('默认模板不能修改')
      }

      const updatedTemplate: WritingTemplate = {
        ...existingTemplate,
        ...request,
        updatedAt: new Date().toISOString()
      }

      this.templates[index] = updatedTemplate
      logger.info(`更新写作模板成功: ${id}`)
      return updatedTemplate
    } catch (error) {
      logger.error(`更新写作模板失败: ${id}`, error)
      throw error instanceof Error ? error : new Error('更新写作模板失败')
    }
  }

  /**
   * 删除写作模板
   */
  deleteTemplate(id: string): void {
    try {
      const index = this.templates.findIndex(template => template.id === id)
      if (index === -1) {
        throw new Error('模板不存在')
      }

      const template = this.templates[index]
      if (template.isDefault) {
        throw new Error('默认模板不能删除')
      }

      this.templates.splice(index, 1)
      logger.info(`删除写作模板成功: ${id}`)
    } catch (error) {
      logger.error(`删除写作模板失败: ${id}`, error)
      throw error instanceof Error ? error : new Error('删除写作模板失败')
    }
  }

  /**
   * 生成风格指南
   */
  generateStyleGuide(templateId: string, styleId?: string): StyleGuide {
    try {
      const template = this.getTemplateById(templateId)
      if (!template) {
        throw new Error('模板不存在')
      }

      // 基础风格指南
      const guide: StyleGuide = {
        templateId: template.id,
        templateName: template.name,
        structureGuide: this.generateStructureGuide(template),
        writingTips: this.generateWritingTips(template),
        styleSuggestions: this.generateStyleSuggestions(template, styleId),
        examples: this.generateExamples(template)
      }

      return guide
    } catch (error) {
      logger.error(`生成风格指南失败: ${templateId}`, error)
      throw error instanceof Error ? error : new Error('生成风格指南失败')
    }
  }

  /**
   * 生成结构指南
   */
  private generateStructureGuide(template: WritingTemplate): string[] {
    const guide: string[] = []

    if (template.structure.title) {
      guide.push(`1. 标题: ${template.structure.title}`)
    }

    if (template.structure.chapters) {
      template.structure.chapters.forEach((chapter, index) => {
        guide.push(`\n${index + 1}. ${chapter.title}`)
        chapter.sections.forEach((section, secIndex) => {
          guide.push(`   ${secIndex + 1}. ${section}`)
        })
      })
    } else if (template.structure.sections) {
      template.structure.sections.forEach((section, index) => {
        guide.push(`${index + 1}. ${section}`)
      })
    }

    return guide
  }

  /**
   * 生成写作技巧
   */
  private generateWritingTips(template: WritingTemplate): string[] {
    // 基础写作技巧
    const baseTips = [
      '保持一致的叙事视角',
      '注重细节描写，增强画面感',
      '合理安排情节节奏，张弛有度',
      '塑造鲜明的人物性格',
      '使用恰当的修辞手法'
    ]

    // 模板特定的写作技巧
    const templateSpecificTips = template.guidelines || []

    return [...baseTips, ...templateSpecificTips]
  }

  /**
   * 生成风格建议
   */
  private generateStyleSuggestions(template: WritingTemplate, styleId?: string): string[] {
    const suggestions: string[] = []

    // 根据模板类型提供风格建议
    switch (template.type) {
      case 'novel':
        suggestions.push(
          '长篇小说需要更丰富的人物塑造和情节铺垫',
          '注意章节之间的过渡和衔接',
          '保持整体风格的一致性',
          '合理设置伏笔和悬念'
        )
        break
      case 'short_story':
        suggestions.push(
          '短篇小说要集中在一个核心事件上',
          '人物不宜过多，重点突出主要角色',
          '情节紧凑，节奏明快',
          '结尾要有深意，给读者留下思考空间'
        )
        break
    }

    // 如果提供了风格ID，可以根据具体风格提供更详细的建议
    if (styleId) {
      suggestions.push('根据选定的风格调整语言和叙事方式')
    }

    return suggestions
  }

  /**
   * 生成示例
   */
  private generateExamples(template: WritingTemplate): string[] {
    const examples: string[] = []

    // 根据模板类型提供示例
    switch (template.type) {
      case 'novel':
        examples.push(
          '开场示例: "清晨的阳光透过窗帘洒进房间，李阳从梦中醒来，习惯性地伸手去摸床头的手机，却发现床头柜上放着一封陌生的信件。"',
          '对话示例: "你真的要离开吗？"她眼中含着泪水，声音颤抖着问道。\n"是的，我必须去，这是我的使命。"他转身望向窗外，语气坚定。"',
          '环境描写示例: "古老的城堡坐落在山顶，周围环绕着茂密的森林，城堡的尖顶在月光下泛着冷光，仿佛在诉说着古老的故事。"'
        )
        break
      case 'short_story':
        examples.push(
          '开场示例: "雨下了整整一天，街道上积满了水，我撑着伞站在公交站，看着一辆辆公交车驶过，却没有我要等的那一班。"',
          '冲突示例: "当我打开门的那一刻，我简直不敢相信自己的眼睛，那个我以为永远不会再见到的人，正站在我面前。"',
          '结尾示例: "她转身离开，消失在人群中，我手里还攥着她留给我的纸条，上面只有一行字：有些事情，错过了就是错过了。"'
        )
        break
    }

    return examples
  }
}

// 导出单例实例
export const writingTemplateService = new WritingTemplateService()

// 导出类型
export type { WritingTemplateService }
