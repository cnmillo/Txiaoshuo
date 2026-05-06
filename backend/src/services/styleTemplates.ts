import type {
  StyleTemplate,
  StyleConfig,
  StyleOption,
  StyleConfigOptions,
  NovelGenre
} from '../types/shared.js'

/**
 * 小说类型选项
 */
export const genreOptions: StyleOption[] = [
  { value: 'fantasy', label: '玄幻', description: '魔法、斗气、异世界等奇幻元素' },
  { value: 'wuxia', label: '武侠', description: '江湖恩怨、武功秘籍、侠义精神' },
  { value: 'xianxia', label: '仙侠', description: '修仙问道、长生不老、法术神通' },
  { value: 'romance', label: '言情', description: '爱情、情感、人际关系' },
  { value: 'scifi', label: '科幻', description: '未来科技、外星文明、时空穿越' },
  { value: 'mystery', label: '悬疑', description: '推理、侦探、解谜' },
  { value: 'history', label: '历史', description: '古代背景、历史事件、朝代更迭' },
  { value: 'urban', label: '都市', description: '现代城市生活、职场、情感' },
  { value: 'game', label: '游戏', description: '虚拟游戏、电竞、游戏世界' },
  { value: 'horror', label: '恐怖', description: '惊悚、灵异、恐怖氛围' },
  { value: 'military', label: '军事', description: '战争、军旅、战略战术' },
  { value: 'general', label: '一般', description: '通用类型，无特定风格' }
]

/**
 * 叙事视角选项
 */
export const perspectiveOptions: StyleOption[] = [
  { value: 'first_person', label: '第一人称', description: '以"我"的视角叙述，代入感强' },
  { value: 'third_person', label: '第三人称', description: '以"他/她"的视角叙述，客观全面' },
  { value: 'omniscient', label: '全知视角', description: '叙述者知晓一切，可深入各角色内心' },
  { value: 'limited', label: '有限视角', description: '跟随单一角色，所知有限' }
]

/**
 * 语言风格选项
 */
export const languageOptions: StyleOption[] = [
  { value: 'classical', label: '古典', description: '文言色彩，典雅庄重' },
  { value: 'modern', label: '现代', description: '白话文，通俗易懂' },
  { value: 'colloquial', label: '口语化', description: '贴近日常对话，亲切自然' },
  { value: 'literary', label: '文艺', description: '富有诗意，意境优美' },
  { value: 'concise', label: '简洁', description: '言简意赅，不拖泥带水' }
]

/**
 * 描写风格选项
 */
export const descriptionOptions: StyleOption[] = [
  { value: 'detailed', label: '细腻', description: '细节丰富，刻画入微' },
  { value: 'concise', label: '简洁', description: '点到为止，留白想象' },
  { value: 'ornate', label: '华丽', description: '辞藻华美，修辞繁复' },
  { value: 'vivid', label: '生动', description: '形象鲜活，画面感强' },
  { value: 'atmospheric', label: '氛围感', description: '营造气氛，情绪渲染' }
]

/**
 * 节奏风格选项
 */
export const pacingOptions: StyleOption[] = [
  { value: 'fast', label: '快节奏', description: '情节紧凑，发展迅速' },
  { value: 'moderate', label: '适中', description: '张弛有度，缓急相宜' },
  { value: 'slow', label: '慢节奏', description: '娓娓道来，注重细节' },
  { value: 'variable', label: '变化多端', description: '快慢结合，跌宕起伏' }
]

/**
 * 对话风格选项
 */
export const dialogueOptions: StyleOption[] = [
  { value: 'natural', label: '自然', description: '生活化对话，真实可信' },
  { value: 'witty', label: '机智', description: '妙语连珠，智慧交锋' },
  { value: 'formal', label: '正式', description: '规范用语，庄重得体' },
  { value: 'humorous', label: '幽默', description: '风趣诙谐，轻松愉快' },
  { value: 'dramatic', label: '戏剧化', description: '富有张力，情感强烈' }
]

/**
 * 获取所有风格配置选项
 */
export function getStyleConfigOptions(): StyleConfigOptions {
  return {
    genres: genreOptions,
    perspectives: perspectiveOptions,
    languages: languageOptions,
    descriptions: descriptionOptions,
    pacings: pacingOptions,
    dialogues: dialogueOptions
  }
}

/**
 * 默认风格配置
 */
export const defaultStyleConfig: StyleConfig = {
  genre: 'general',
  perspective: 'third_person',
  language: 'modern',
  description: 'vivid',
  pacing: 'moderate',
  dialogue: 'natural'
}

/**
 * 预定义风格模板
 */
export const predefinedStyleTemplates: StyleTemplate[] = [
  // 玄幻风格模板
  {
    id: 'template-fantasy-classic',
    name: '经典玄幻',
    description: '传统玄幻风格，注重修炼体系和战斗场面',
    genre: 'fantasy',
    config: {
      genre: 'fantasy',
      perspective: 'third_person',
      language: 'modern',
      description: 'vivid',
      pacing: 'fast',
      dialogue: 'dramatic'
    },
    promptTemplate: '请以经典玄幻风格创作小说。风格要求：世界观构建完整的修炼体系，战斗场面激烈精彩，人物成长从弱小到强大，情节节奏紧凑快速，语言风格现代白话。',
    sampleText: '苍穹之上，雷云翻滚。林轩立于山巅，衣袂猎猎作响。他双目微闭，体内灵力如潮水般涌动，在经脉中奔腾不息。'
  },
  {
    id: 'template-fantasy-epic',
    name: '史诗玄幻',
    description: '宏大史诗风格，世界观广阔，人物众多',
    genre: 'fantasy',
    config: {
      genre: 'fantasy',
      perspective: 'omniscient',
      language: 'literary',
      description: 'detailed',
      pacing: 'variable',
      dialogue: 'dramatic'
    },
    promptTemplate: '请以史诗玄幻风格创作小说。风格要求：构建广阔的世界观，多线叙事，人物众多且性格鲜明，场景描写宏大壮观，语言风格富有文学性，情节节奏张弛有度。',
    sampleText: '在那遥远的大陆上，七座圣山矗立天地之间，每座山峰都承载着一个古老的传说。当天空中的星辰开始坠落，一场影响整个世界的变革即将拉开帷幕。'
  },
  
  // 武侠风格模板
  {
    id: 'template-wuxia-traditional',
    name: '传统武侠',
    description: '经典武侠风格，注重门派恩怨和武功招式',
    genre: 'wuxia',
    config: {
      genre: 'wuxia',
      perspective: 'third_person',
      language: 'classical',
      description: 'detailed',
      pacing: 'moderate',
      dialogue: 'formal'
    },
    promptTemplate: '请以传统武侠风格创作小说。风格要求：描绘江湖恩怨和门派斗争，详细描写武功招式和内力修为，人物性格鲜明，语言风格带有古典韵味，情节发展循序渐进。',
    sampleText: '剑眉星目，面如冠玉，少年侠客负剑而行。他步法轻盈，衣袂飘飞，腰间的青锋剑在阳光下闪烁着冷冽的光芒。'
  },
  
  // 仙侠风格模板
  {
    id: 'template-xianxia-cultivation',
    name: '修仙问道',
    description: '仙侠风格，注重修炼境界和仙法神通',
    genre: 'xianxia',
    config: {
      genre: 'xianxia',
      perspective: 'third_person',
      language: 'modern',
      description: 'vivid',
      pacing: 'fast',
      dialogue: 'dramatic'
    },
    promptTemplate: '请以仙侠风格创作小说。风格要求：构建完整的修仙境界体系，描写仙法神通和天地异象，人物追求长生不老，情节节奏快速紧凑，语言风格现代流畅。',
    sampleText: '云海之上，凌仙站在飞舟船头，俯瞰下方的群山。他运转体内的仙力，引动天地灵气，身边浮现出一道道金色的光纹。'
  },
  
  // 言情风格模板
  {
    id: 'template-romance-contemporary',
    name: '现代言情',
    description: '现代都市言情风格，注重情感描写和人物关系',
    genre: 'romance',
    config: {
      genre: 'romance',
      perspective: 'first_person',
      language: 'modern',
      description: 'detailed',
      pacing: 'moderate',
      dialogue: 'natural'
    },
    promptTemplate: '请以现代言情风格创作小说。风格要求：以第一人称视角描写情感经历，注重心理活动和细节描写，人物关系真实可信，语言风格现代自然，情节发展细腻动人。',
    sampleText: '当他走进咖啡店的那一刻，我就知道我的生活将会被彻底改变。他的笑容如阳光般温暖，眼神中带着一丝我无法抗拒的魅力。'
  },
  
  // 科幻风格模板
  {
    id: 'template-scifi-hard',
    name: '硬科幻',
    description: '硬科幻风格，注重科学原理和技术细节',
    genre: 'scifi',
    config: {
      genre: 'scifi',
      perspective: 'third_person',
      language: 'concise',
      description: 'concise',
      pacing: 'moderate',
      dialogue: 'formal'
    },
    promptTemplate: '请以硬科幻风格创作小说。风格要求：基于科学原理构建未来世界，详细描写技术细节和科学概念，情节逻辑严密，语言风格简洁准确，人物形象鲜明。',
    sampleText: '2157年，人类的首艘星际殖民舰“方舟号”正以光速的百分之一航行在前往半人马座α星的途中。船上的量子计算机正在分析前方的空间数据，为即将到来的超空间跳跃做准备。'
  },
  
  // 悬疑风格模板
  {
    id: 'template-mystery-detective',
    name: '侦探悬疑',
    description: '侦探悬疑风格，注重推理和线索铺垫',
    genre: 'mystery',
    config: {
      genre: 'mystery',
      perspective: 'first_person',
      language: 'modern',
      description: 'detailed',
      pacing: 'variable',
      dialogue: 'witty'
    },
    promptTemplate: '请以侦探悬疑风格创作小说。风格要求：以侦探视角展开推理，注重线索铺垫和逻辑分析，情节紧凑悬念迭起，语言风格现代流畅，人物对话机智幽默。',
    sampleText: '我点燃一支香烟，盯着办公桌上的案件资料。死者是一位知名企业家，死于自己的办公室，现场没有任何挣扎的痕迹，也没有发现凶器。这看起来像是一起完美的谋杀案，但我知道，没有完美的犯罪。'
  },
  
  // 历史风格模板
  {
    id: 'template-history-epic',
    name: '历史史诗',
    description: '历史题材风格，注重历史细节和时代背景',
    genre: 'history',
    config: {
      genre: 'history',
      perspective: 'omniscient',
      language: 'classical',
      description: 'detailed',
      pacing: 'moderate',
      dialogue: 'formal'
    },
    promptTemplate: '请以历史史诗风格创作小说。风格要求：基于真实历史背景，详细描写历史事件和社会风貌，人物形象符合时代特征，语言风格带有古典韵味，情节发展宏大叙事。',
    sampleText: '大唐贞观年间，长安城繁华似锦，万国来朝。街道上车水马龙，店铺鳞次栉比，胡商的驼队从西市进进出出，带来了遥远国度的奇珍异宝。'
  },
  
  // 都市风格模板
  {
    id: 'template-urban-modern',
    name: '现代都市',
    description: '现代都市风格，注重职场生活和情感故事',
    genre: 'urban',
    config: {
      genre: 'urban',
      perspective: 'first_person',
      language: 'colloquial',
      description: 'concise',
      pacing: 'fast',
      dialogue: 'natural'
    },
    promptTemplate: '请以现代都市风格创作小说。风格要求：描写现代城市生活和职场经历，语言风格口语化贴近生活，人物关系真实复杂，情节节奏快速紧凑，情感表达细腻真实。',
    sampleText: '周一的早晨总是特别拥挤，地铁里人满为患。我挤在人群中，看着手机上的工作群消息，新的项目任务已经下来了，这个月又要加班到很晚。'
  }
]

/**
 * 根据ID获取风格模板
 */
export function getStyleTemplateById(id: string): StyleTemplate | undefined {
  return predefinedStyleTemplates.find(template => template.id === id)
}

/**
 * 根据小说类型获取风格模板
 */
export function getStyleTemplatesByGenre(genre: NovelGenre): StyleTemplate[] {
  return predefinedStyleTemplates.filter(template => template.genre === genre)
}

/**
 * 获取所有风格模板
 */
export function getAllStyleTemplates(): StyleTemplate[] {
  return [...predefinedStyleTemplates]
}

/**
 * 根据配置生成提示词模板
 */
export function generatePromptTemplate(config: StyleConfig): string {
  const genreLabel = genreOptions.find(g => g.value === config.genre)?.label || '一般'
  const perspectiveLabel = perspectiveOptions.find(p => p.value === config.perspective)?.label || '第三人称'
  const languageLabel = languageOptions.find(l => l.value === config.language)?.label || '现代'
  const descriptionLabel = descriptionOptions.find(d => d.value === config.description)?.label || '生动'
  const pacingLabel = pacingOptions.find(p => p.value === config.pacing)?.label || '适中'
  const dialogueLabel = dialogueOptions.find(d => d.value === config.dialogue)?.label || '自然'

  return `请以${genreLabel}风格创作小说。风格要求：小说类型${genreLabel}，叙事视角${perspectiveLabel}，语言风格${languageLabel}，描写风格${descriptionLabel}，节奏风格${pacingLabel}，对话风格${dialogueLabel}。`
}

/**
 * 获取风格配置的中文标签
 */
export function getStyleConfigLabels(config: StyleConfig): Record<string, string> {
  return {
    genre: genreOptions.find(g => g.value === config.genre)?.label || config.genre,
    perspective: perspectiveOptions.find(p => p.value === config.perspective)?.label || config.perspective,
    language: languageOptions.find(l => l.value === config.language)?.label || config.language,
    description: descriptionOptions.find(d => d.value === config.description)?.label || config.description,
    pacing: pacingOptions.find(p => p.value === config.pacing)?.label || config.pacing,
    dialogue: dialogueOptions.find(d => d.value === config.dialogue)?.label || config.dialogue
  }
}