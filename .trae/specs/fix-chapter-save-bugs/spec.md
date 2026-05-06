# 章节内容保存BUG修复 Spec

## Why
章节内容保存存在严重的系统性问题：自动保存只写入localStorage（且会被strip清空），不保存到后端数据库；切换章节、修复建议应用、手动修复等操作均未触发后端保存。用户编辑内容后若未手动点击"保存"按钮，刷新页面后内容将永久丢失。

## What Changes
- 自动保存（3秒防抖）增加后端API保存调用
- 切换章节时保存当前章节内容到后端
- 修复建议应用后触发后端保存
- 手动修复后触发后端保存
- 清空章节内容时同步到后端
- 统一字数计算逻辑（后端统一使用 calculateWordCount）
- 修复 saveChapterContent INSERT 分支的外键约束问题
- 修复批量创建章节的 INSERT OR REPLACE 覆盖已有内容问题
- 修复 novels 路由中字数计算不一致问题

## Impact
- Affected specs: 章节执行流程、内容持久化、数据一致性
- Affected code:
  - `frontend/src/pages/ChapterExecutionPage.tsx` -- 自动保存、章节切换、修复建议、手动修复、清空操作
  - `frontend/src/stores/workflowStore.ts` -- localStorage 持久化策略
  - `backend/src/services/chapterExecutionService.ts` -- saveChapterContent、batchCreateChapters
  - `backend/src/routes/novels.ts` -- 章节更新字数计算

## ADDED Requirements

### Requirement: 自动保存必须持久化到后端
系统在自动保存时 SHALL 同时将章节内容保存到后端数据库，而非仅保存到 localStorage。

#### Scenario: 用户编辑内容后等待自动保存
- **WHEN** 用户在编辑器中修改章节内容并等待3秒以上
- **THEN** 系统自动将内容保存到后端数据库（调用 saveChapterContent API），并更新 localStorage 缓存

#### Scenario: 自动保存失败时的降级处理
- **WHEN** 后端保存失败（网络错误、服务器错误等）
- **THEN** 系统仍保留 localStorage 中的内容，并在UI上提示用户保存失败，建议手动保存

### Requirement: 切换章节时保存当前章节到后端
系统在切换章节时 SHALL 先将当前章节内容保存到后端，再加载新章节。

#### Scenario: 用户从章节A切换到章节B
- **WHEN** 用户选择切换到另一个章节
- **THEN** 系统先将章节A的内容保存到后端，成功后再加载章节B的内容

### Requirement: 修复操作后触发后端保存
系统在应用修复建议或手动修复后 SHALL 将修改后的内容保存到后端。

#### Scenario: 用户应用单条修复建议
- **WHEN** 用户点击应用某条修复建议
- **THEN** 系统将修复后的内容保存到后端

#### Scenario: 用户批量应用修复建议
- **WHEN** 用户点击批量应用修复建议
- **THEN** 系统将修复后的内容保存到后端

#### Scenario: 用户手动修复内容
- **WHEN** 用户在手动修复面板中提交修改
- **THEN** 系统将修复后的内容保存到后端

### Requirement: 清空章节内容时同步到后端
系统在清空章节内容时 SHALL 同步清空后端数据库中的内容。

#### Scenario: 用户清空当前章节
- **WHEN** 用户确认清空当前章节内容
- **THEN** 系统将空内容保存到后端，确保刷新后仍为空

## MODIFIED Requirements

### Requirement: 字数计算统一
系统 SHALL 在所有位置使用统一的字数计算函数 `calculateWordCount`（中文字符 + 英文单词），替代 `content.length` 和 `stripHtmlTags(content).length`。

#### Scenario: 后端 chapterExecutionService 保存章节
- **WHEN** 保存章节内容到 workflow_chapters 表
- **THEN** 使用 calculateWordCount 计算字数

#### Scenario: 后端 novels 路由更新章节
- **WHEN** 通过 novels 路由更新章节内容
- **THEN** 使用 calculateWordCount 计算字数

### Requirement: saveChapterContent INSERT 分支安全
saveChapterContent 的 INSERT 分支 SHALL 不创建无效记录。当章节ID不存在于数据库时，SHALL 查找对应的 workflow_id 和 title，而非使用空值。

#### Scenario: 保存新章节内容时章节记录不存在
- **WHEN** 调用 saveChapterContent 但章节ID在数据库中不存在
- **THEN** 系统从 workflowStore 中查找该章节的 workflow_id 和 title，创建完整的记录

### Requirement: 批量创建章节不覆盖已有内容
批量创建章节时 SHALL 保留已有章节的内容，仅插入新章节或更新元数据（title、chapter_number）而不清空 content。

#### Scenario: 批量创建章节时某章节已存在且有内容
- **WHEN** 批量创建章节遇到已存在的章节ID
- **THEN** 保留该章节的 content、word_count、status，仅更新 title 和 chapter_number

## REMOVED Requirements
无移除的需求。
