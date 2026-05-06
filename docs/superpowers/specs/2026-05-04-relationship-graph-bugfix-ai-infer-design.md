# 角色关系图谱 BUG 修复 & AI 推断关系功能设计

## 概述

本次变更包含两部分：
1. 修复 Canvas 关系图谱的 5 个 BUG
2. 新增「AI 推断关系」功能，用户可在图谱上点击按钮让大模型自动推断角色关系

## 一、BUG 修复

### 1.1 关系线颜色解析错误

**文件**：`frontend/src/components/CharacterPreparationView.tsx`

**问题**：`getRelationshipConfig` 返回的 `color` 是 Tailwind 类名（如 `text-red-600`），Canvas 绘制时用 `replace('text-', '').replace('-500', '')` 解析，得到 `red-6` 等无效 CSS 颜色值。

**修复**：在 `getRelationshipConfig` 中增加 `color` 字段使用标准 CSS 颜色值，原 `color` 重命名为 `textColor` 保留给 HTML 元素：

```typescript
function getRelationshipConfig(type: Relationship['type']) {
  const configs = {
    family:     { label: '家人', color: '#ef4444', textColor: 'text-red-500',   bgColor: 'bg-red-100'   },
    friend:     { label: '朋友', color: '#22c55e', textColor: 'text-green-500',  bgColor: 'bg-green-100'  },
    enemy:      { label: '敌人', color: '#dc2626', textColor: 'text-red-600',    bgColor: 'bg-red-100'    },
    lover:      { label: '恋人', color: '#ec4899', textColor: 'text-pink-500',   bgColor: 'bg-pink-100'   },
    colleague:  { label: '同事', color: '#3b82f6', textColor: 'text-blue-500',   bgColor: 'bg-blue-100'   },
    other:      { label: '其他', color: '#6b7280', textColor: 'text-gray-500',   bgColor: 'bg-gray-100'   },
  }
  return configs[type] || configs.other
}
```

Canvas 绘制用 `config.color`，HTML 元素用 `config.textColor` / `config.bgColor`。

### 1.2 节点颜色解析错误

**文件**：`frontend/src/components/CharacterPreparationView.tsx`

**问题**：`getImportanceConfig` 返回 `bg-gradient-to-r from-amber-500 to-orange-600`，Canvas 绘制时用 `replace('bg-gradient-to-r from-', '').split(' ')[0]` 解析，得到 `amber-500` 无效值。

**修复**：在 `getImportanceConfig` 中增加 `canvasColor` 字段：

```typescript
main:      { ..., canvasColor: '#f59e0b' },  // amber-500
supporting:{ ..., canvasColor: '#3b82f6' },  // blue-500
minor:     { ..., canvasColor: '#9ca3af' },  // gray-400
```

Canvas 绘制节点时使用 `config.canvasColor`。

### 1.3 关系线重叠

**文件**：`frontend/src/components/CharacterPreparationView.tsx`

**问题**：同一对角色间多条关系线使用直线，完全重叠，只能看到最后一条。

**修复**：当同一对角色有多条关系线时，使用贝塞尔曲线偏移。计算每条线的控制点向垂直方向偏移不同距离：

- 单条关系：直线
- 多条关系：`quadraticCurveTo`，控制点垂直偏移 `(index - (count-1)/2) * 30` 像素

关系标签也相应偏移到曲线中点。

### 1.4 ID Fallback 匹配错误

**文件**：`backend/src/services/storyPlanService.ts`

**问题**：L1101 当姓名匹配失败时，`char1Id` fallback 到 `allChars[0]?.id`，可能创建错误的关系。

**修复**：匹配失败时跳过该关系，使用 `charIdMap.get()` 替代 `forEach` 遍历，返回 `null` 后 `filter` 过滤：

```typescript
const char1Id = charIdMap.get(rel.character1Id || '')
const char2Id = charIdMap.get(rel.character2Id || '')
if (!char1Id || !char2Id) return null
```

### 1.5 Canvas DPI 缩放模糊

**文件**：`frontend/src/components/CharacterPreparationView.tsx`

**问题**：Canvas 在高分辨率屏幕（devicePixelRatio > 1）上模糊。

**修复**：在绘制 useEffect 中根据 `devicePixelRatio` 缩放 Canvas：

1. Canvas 元素用 CSS 设置 `width: 600px; height: 500px`
2. 绘制前设置 `canvas.width = 600 * dpr; canvas.height = 500 * dpr`
3. `ctx.scale(dpr, dpr)` 后用 CSS 坐标绘制
4. 点击事件坐标不需要额外转换（`getBoundingClientRect` 返回 CSS 坐标）

## 二、AI 推断关系功能

### 2.1 架构

后端 API 驱动模式，与现有 `generateCharacterCast` 架构一致。

**流程**：前端点击「AI 推断关系」→ 调用后端 API → 后端构建提示词调用 LLM → 返回关系列表 → 前端追加到图谱

### 2.2 后端 API

**路由**：`POST /api/story-plan/character-relationships/infer`

**请求体**：
```typescript
{
  characters: Character[]
  existingRelationships: Relationship[]
  context: {
    title: string
    genre: string
    coreConflict: string
    worldviewSummary?: string
  }
}
```

**响应体**：
```typescript
{
  relationships: Relationship[]
}
```

### 2.3 后端提示词

核心策略：将角色信息 + 已有关系 + 故事上下文交给大模型，要求只生成尚未覆盖的关系。

提示词要点：
- 列出所有角色的姓名、重要性、定位、性格摘要、背景摘要
- 列出已有关系，明确要求不重复
- 使用 `character1Name`/`character2Name`（姓名）而非 ID，LLM 更擅长处理姓名
- 后端通过 `charIdMap` 将姓名转换为真实 ID
- 限制生成数量 3-10 条
- 关系类型限定为 6 种：family、friend、enemy、lover、colleague、other
- 要求关系描述具体、有故事性（20-50 字）

### 2.4 后端服务函数

在 `backend/src/services/storyPlanService.ts` 中新增 `inferRelationshipsService`：

1. 构建提示词
2. 调用 `aiService.generateText`
3. 解析 JSON 响应
4. 姓名 → ID 映射（复用 `charIdMap` 模式）
5. 过滤无法匹配的、与已有关系重复的
6. 返回新关系数组

### 2.5 前端交互

**UI 变更**：在 `RelationshipGraph` 组件工具栏中，在「添加关系」按钮旁增加「AI 推断关系」按钮：

```
[角色关系图谱]          [+ 添加关系] [✨ AI推断关系]
```

**交互流程**：
1. 用户点击「AI 推断关系」
2. 按钮变为 loading 状态，显示「推断中...」
3. 调用后端 API，传入当前所有角色 + 已有关系 + 故事上下文
4. 返回后，新关系追加到现有关系列表
5. 图谱自动刷新
6. 显示 toast：「已推断 N 条新关系」

**Props 扩展**：`RelationshipGraph` 需要新增 `storyContext` prop 接收故事上下文数据。

### 2.6 前端 API 调用

在 `frontend/src/services/api.ts` 中新增 `inferRelationships` 函数。

## 三、涉及文件清单

| 文件 | 变更类型 |
|------|---------|
| `frontend/src/components/CharacterPreparationView.tsx` | 修改：BUG 修复 + AI 推断按钮 |
| `backend/src/services/storyPlanService.ts` | 修改：ID fallback 修复 + 新增推断服务 |
| `backend/src/routes/storyPlan.ts` | 修改：新增推断关系路由 |
| `frontend/src/services/api.ts` | 修改：新增推断关系 API 调用 |
