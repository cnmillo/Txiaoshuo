# 全流程手动测试 Spec

## Why
需要全面测试网站所有功能，确保小说生成、保存、导出流程完整可用无BUG。

## What Changes
- 修复 `saveChapterContent` 中创建默认工作流时使用了不存在的 `status` 列的问题
- 修复 `FixSuggestions` 组件中 `SEVERITY_CONFIG[issue.severity]` 可能为 undefined 的崩溃问题
- 确认所有页面加载无控制台错误
- 确认章节保存、读取、更新、清空API正常工作

## Impact
- Affected specs: 章节保存流程、FixSuggestions组件
- Affected code:
  - `backend/src/services/chapterExecutionService.ts` -- saveChapterContent 创建默认工作流的SQL
  - `frontend/src/components/FixSuggestions.tsx` -- SEVERITY_CONFIG 安全访问

## ADDED Requirements

### Requirement: 全流程测试覆盖
系统 SHALL 通过以下所有测试项：

#### Scenario: 页面加载测试
- **WHEN** 访问首页、设置、故事规划、小说列表、任务中心、生成页面
- **THEN** 所有页面正常加载，无控制台错误

#### Scenario: API健康检查
- **WHEN** 调用 /api/health
- **THEN** 返回 ok

#### Scenario: AI模型列表
- **WHEN** 调用 /api/ai-models
- **THEN** 返回200和模型列表

#### Scenario: 章节保存
- **WHEN** PUT /api/chapter-execution/chapter/:id/content
- **THEN** 返回200和 {success: true, wordCount: N}

#### Scenario: 章节读取回写
- **WHEN** 保存章节后GET同一章节内容
- **THEN** 返回的内容与保存的一致

#### Scenario: 章节更新
- **WHEN** 更新章节内容后再读取
- **THEN** 返回更新后的内容

#### Scenario: 空内容保存
- **WHEN** 保存空字符串内容
- **THEN** 返回200成功

#### Scenario: 小说列表API
- **WHEN** 调用 /api/novels
- **THEN** 返回200

#### Scenario: 404处理
- **WHEN** 访问不存在的页面
- **THEN** 应用不崩溃，显示404页面

## MODIFIED Requirements

### Requirement: saveChapterContent 创建默认工作流
当章节不存在且 workflow_states 表中无记录时，SHALL 创建一个包含正确列的默认工作流记录（id, current_stage, stages, version, created_at, updated_at），而非使用不存在的 status 列。

### Requirement: FixSuggestions 组件安全访问
FixSuggestions 组件在访问 SEVERITY_CONFIG[issue.severity] 时 SHALL 先检查该配置是否存在，不存在时使用默认值。

## REMOVED Requirements
无
