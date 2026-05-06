# Tasks

- [x] Task 1: 新增 antiTemplateConstraints.ts 反模板硬约束引擎
  - [x] SubTask 1.1: 定义AI高频隐喻词黑名单（噪音、信号、底色、光谱等16+词）
  - [x] SubTask 1.2: 定义AI伪口语化高频词黑名单（拆一拆、盘一盘、划重点等10+词）
  - [x] SubTask 1.3: 定义AI高频分析动词黑名单及全文频次限制（拆解、梳理、剖析等13词，≤2）
  - [x] SubTask 1.4: 定义降维引导语黑名单及全文频次限制（说白了、本质上等8词，≤1）
  - [x] SubTask 1.5: 定义"而是"变体禁用规则（全文≤1）
  - [x] SubTask 1.6: 定义协作/教学路标词禁用规则
  - [x] SubTask 1.7: 定义冒号预算规则（1500-3000字目标0-2个）
  - [x] SubTask 1.8: 定义AI高频关联句式禁用规则及频次限制（全文≤2）
  - [x] SubTask 1.9: 定义AI戏剧化揭露修辞禁用规则（正文清零）
  - [x] SubTask 1.10: 定义AI极值判断句式禁用规则（全文≤1）
  - [x] SubTask 1.11: 定义"分析师讲解"语姿禁用规则
  - [x] SubTask 1.12: 实现文本检测函数 detectAntiTemplateViolations()
  - [x] SubTask 1.13: 实现提示词生成函数 buildAntiTemplatePrompt()

- [x] Task 2: 增强 humanWritingStyle.ts 新增三个模块
  - [x] SubTask 2.1: 新增 AI_HIGH_FREQUENCY_WORDS 模块（整合antiTemplateConstraints中的黑名单）
  - [x] SubTask 2.2: 新增 NARRATIVE_STRUCTURE_GUIDE 叙事结构指导模块（铺垫、伏笔、闪回/闪前、明暗线、悬念节奏）
  - [x] SubTask 2.3: 新增 DEEP_DETECTION_COUNTERMEASURES 深度检测对抗模块（朱雀、智谱、GPTZero的深度对抗策略）
  - [x] SubTask 2.4: 更新 HumanWritingStyleConfig 类型定义，包含新增模块
  - [x] SubTask 2.5: 更新 HUMAN_WRITING_STYLE_CONFIG 导出

- [x] Task 3: 重构 prompts.ts 提示词构建系统
  - [x] SubTask 3.1: 创建模块化提示词构建器 buildPromptModules()，按需组合各模块
  - [x] SubTask 3.2: 重构 getChapterPrompt() 使用新构建器
  - [x] SubTask 3.3: 重构 getContextAwareChapterPrompt() 使用新构建器
  - [x] SubTask 3.4: 重构 generateContinuationPrompt() 使用新构建器
  - [x] SubTask 3.5: 重构 generatePolishPrompt() 使用新构建器
  - [x] SubTask 3.6: 重构 optimizePrompt() 使用新构建器
  - [x] SubTask 3.7: 确保所有提示词注入叙事结构指导模块
  - [x] SubTask 3.8: 确保所有提示词注入反模板硬约束模块
  - [x] SubTask 3.9: 确保所有提示词注入深度检测对抗模块

- [x] Task 4: 增强 humanizeService.ts 后处理闭环
  - [x] SubTask 4.1: 在 humanizeText() 中集成 detectAntiTemplateViolations() 检测
  - [x] SubTask 4.2: 在 textRewriter.ts 中应用反模板硬约束改写规则
  - [x] SubTask 4.3: 在 styleOptimizer.ts 中增加AI高频词替换策略
  - [x] SubTask 4.4: 确保 humanizeService 的后处理与 prompts.ts 的前置注入使用相同的规则集

- [x] Task 5: 验证与测试
  - [x] SubTask 5.1: 验证 antiTemplateConstraints.ts 的检测函数能正确识别违规模式
  - [x] SubTask 5.2: 验证提示词构建器正确组合所有模块
  - [x] SubTask 5.3: 验证章节生成提示词包含所有新增模块
  - [x] SubTask 5.4: 验证后处理闭环正确应用反模板约束
  - [x] SubTask 5.5: 编译通过，无TypeScript错误

# Task Dependencies
- [Task 2] depends on [Task 1]
- [Task 3] depends on [Task 1, Task 2]
- [Task 4] depends on [Task 1]
- [Task 5] depends on [Task 1, Task 2, Task 3, Task 4]
