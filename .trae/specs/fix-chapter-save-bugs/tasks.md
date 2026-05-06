# Tasks

- [x] Task 1: 修复自动保存——增加后端API保存调用
  - [x] SubTask 1.1: 在 ChapterExecutionPage.tsx 的自动保存 useEffect 中增加 saveChapterContent API 调用
  - [x] SubTask 1.2: 添加保存失败时的降级处理（保留localStorage内容 + UI提示）
  - [x] SubTask 1.3: 添加保存状态指示器（保存中/已保存/保存失败）

- [x] Task 2: 修复切换章节时未保存到后端
  - [x] SubTask 2.1: 在 handleChapterSelect 中增加当前章节的后端保存逻辑
  - [x] SubTask 2.2: 确保保存完成后再加载新章节内容（或并行保存不阻塞切换）

- [x] Task 3: 修复修复操作后未保存到后端
  - [x] SubTask 3.1: 在 handleApplyFix 中增加 saveChapterContent 调用
  - [x] SubTask 3.2: 在 handleBatchApplyFixes 中增加 saveChapterContent 调用
  - [x] SubTask 3.3: 在 handleManualFix 中增加 saveChapterContent 调用

- [x] Task 4: 修复清空章节内容时未同步到后端
  - [x] SubTask 4.1: 在清空操作回调中增加 saveChapterContent(chapterId, '') 调用

- [x] Task 5: 统一字数计算逻辑
  - [x] SubTask 5.1: 在 chapterExecutionService.ts 的 saveChapterContent 中引入 calculateWordCount
  - [x] SubTask 5.2: 在 novels.ts 路由的章节更新中使用 calculateWordCount 替代 content.length
  - [x] SubTask 5.3: 确认 calculateWordCount 函数可被两个服务共享（检查是否需要提取到公共工具）

- [x] Task 6: 修复 saveChapterContent INSERT 分支的外键约束问题
  - [x] SubTask 6.1: 修改 saveChapterContent，当章节不存在时先查找 workflow_id 和 title
  - [x] SubTask 6.2: 如果找不到关联信息，抛出明确错误而非创建无效记录

- [x] Task 7: 修复批量创建章节 INSERT OR REPLACE 覆盖已有内容
  - [x] SubTask 7.1: 将 INSERT OR REPLACE 改为 INSERT OR IGNORE + UPDATE（仅更新 title 和 chapter_number）
  - [x] SubTask 7.2: 确保已有章节的 content、word_count、status 不被覆盖

# Task Dependencies
- [Task 1] 是基础，其他任务可并行
- [Task 5] 独立于其他任务
- [Task 6] 和 [Task 7] 独立于其他任务
- [Task 2, 3, 4] 可并行执行
