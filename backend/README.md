# 全自动小说生成器 - 后端API

基于 Express + TypeScript + SQLite 的 RESTful API 服务。

## 功能特性

- **小说管理**：创建、读取、更新、删除小说和章节
- **AI生成**：支持根据提示词或大纲自动生成小说内容
- **导出功能**：支持导出为 TXT、Markdown、HTML、EPUB、PDF 格式
- **设置管理**：AI配置、主题设置、模板管理
- **速率限制**：防止API滥用
- **中文错误信息**：所有错误信息均为中文

## 技术栈

- Express 4.18.2
- TypeScript 5.3.3
- SQLite (better-sqlite3)
- Zod 数据验证
- Axios HTTP客户端
- Helmet 安全中间件
- CORS 跨域支持

## 快速开始

### 安装依赖

```bash
cd backend
npm install
```

### 环境变量配置

复制 `.env.example` 为 `.env` 并配置：

```env
PORT=3001
NODE_ENV=development
DATABASE_PATH=./data/novels.db
AI_API_KEY=your-api-key-here
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4
CORS_ORIGIN=http://localhost:5173
```

### 启动开发服务器

```bash
npm run dev
```

### 生产构建

```bash
npm run build
npm start
```

## API 文档

### 基础信息

- 基础URL: `http://localhost:3001/api`
- 响应格式: JSON
- 所有时间戳使用 ISO 8601 格式

### 响应格式

成功响应：
```json
{
  "success": true,
  "data": { ... },
  "message": "操作成功"
}
```

错误响应：
```json
{
  "success": false,
  "message": "错误描述",
  "code": "ERROR_CODE"
}
```

分页响应：
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  }
}
```

## API 端点

### 健康检查

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/health` | 健康检查 |
| GET | `/api/stats` | 统计数据 |
| GET | `/api/system` | 系统信息 |
| GET | `/api/types` | 小说类型列表 |

### 小说管理

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/novels` | 获取小说列表（支持分页、搜索、筛选） |
| GET | `/api/novels/:id` | 获取小说详情 |
| POST | `/api/novels` | 创建新小说 |
| PUT | `/api/novels/:id` | 更新小说 |
| DELETE | `/api/novels/:id` | 删除小说 |
| GET | `/api/novels/:id/chapters` | 获取章节列表 |
| GET | `/api/novels/:id/chapters/:chapterId` | 获取章节详情 |
| POST | `/api/novels/:id/chapters` | 添加章节 |
| PUT | `/api/novels/:id/chapters/:chapterId` | 更新章节 |
| DELETE | `/api/novels/:id/chapters/:chapterId` | 删除章节 |

**查询参数（获取小说列表）**：
- `page`: 页码（默认1）
- `limit`: 每页数量（默认20）
- `search`: 搜索关键词
- `type`: 类型筛选
- `status`: 状态筛选（generating/completed/failed/draft）
- `sortBy`: 排序字段（created_at/updated_at/word_count/title）
- `sortOrder`: 排序方向（asc/desc）

### 小说生成

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/api/generate` | 生成小说 |
| POST | `/api/generate/outline` | 根据大纲生成 |
| GET | `/api/generate/progress/:id` | 获取生成进度 |
| POST | `/api/generate/cancel` | 取消生成 |

**生成请求体**：
```json
{
  "title": "小说标题",
  "prompt": "生成提示",
  "style": "风格",
  "wordCount": 50000,
  "outline": "大纲（可选）",
  "type": "类型"
}
```

### 导出

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/export/:id/txt` | 导出为TXT |
| GET | `/api/export/:id/md` | 导出为Markdown |
| GET | `/api/export/:id/html` | 导出为HTML |
| GET | `/api/export/:id/epub` | 导出为EPUB |
| GET | `/api/export/:id/pdf` | 导出为PDF |

**查询参数**：
- `includeTitle`: 是否包含标题（默认true）
- `includeAuthor`: 是否包含作者（默认false）
- `authorName`: 作者名称

### 设置

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/settings` | 获取设置 |
| PUT | `/api/settings` | 更新设置 |
| POST | `/api/settings/test-ai` | 测试AI配置 |
| GET | `/api/settings/templates` | 获取模板列表 |
| GET | `/api/settings/templates/:id` | 获取模板详情 |
| POST | `/api/settings/templates` | 创建模板 |
| PUT | `/api/settings/templates/:id` | 更新模板 |
| DELETE | `/api/settings/templates/:id` | 删除模板 |

### AI模型

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/api/ai/generate` | 调用AI生成文本 |
| POST | `/api/ai/generate-stream` | 流式生成文本 |
| POST | `/api/ai/custom-curl` | 使用自定义CURL调用 |
| GET | `/api/ai/config` | 获取AI配置 |
| PUT | `/api/ai/config` | 更新AI配置 |
| POST | `/api/ai/test` | 测试AI连接 |

## 数据库表结构

### novels（小说表）

| 字段 | 类型 | 描述 |
|------|------|------|
| id | TEXT | 主键 |
| title | TEXT | 标题 |
| type | TEXT | 类型 |
| status | TEXT | 状态（generating/completed/failed/draft） |
| word_count | INTEGER | 字数 |
| target_word_count | INTEGER | 目标字数 |
| prompt | TEXT | 生成提示 |
| outline | TEXT | 大纲 |
| description | TEXT | 描述 |
| style | TEXT | 风格 |
| created_at | TEXT | 创建时间 |
| updated_at | TEXT | 更新时间 |

### chapters（章节表）

| 字段 | 类型 | 描述 |
|------|------|------|
| id | TEXT | 主键 |
| novel_id | TEXT | 小说ID（外键） |
| title | TEXT | 标题 |
| content | TEXT | 内容 |
| order_index | INTEGER | 排序索引 |
| word_count | INTEGER | 字数 |
| created_at | TEXT | 创建时间 |
| updated_at | TEXT | 更新时间 |

### settings（设置表）

| 字段 | 类型 | 描述 |
|------|------|------|
| key | TEXT | 主键 |
| value | TEXT | 值 |

### templates（模板表）

| 字段 | 类型 | 描述 |
|------|------|------|
| id | TEXT | 主键 |
| name | TEXT | 名称 |
| type | TEXT | 类型 |
| content | TEXT | 内容 |
| created_at | TEXT | 创建时间 |

### generate_tasks（生成任务表）

| 字段 | 类型 | 描述 |
|------|------|------|
| id | TEXT | 主键 |
| novel_id | TEXT | 小说ID |
| status | TEXT | 状态 |
| progress | INTEGER | 进度（0-100） |
| current_chapter | INTEGER | 当前章节 |
| total_chapters | INTEGER | 总章节数 |
| message | TEXT | 消息 |
| error | TEXT | 错误信息 |
| created_at | TEXT | 创建时间 |
| updated_at | TEXT | 更新时间 |

## 错误代码

| 代码 | 描述 |
|------|------|
| INTERNAL_ERROR | 服务器内部错误 |
| INVALID_REQUEST | 无效的请求参数 |
| NOVEL_NOT_FOUND | 小说不存在 |
| CHAPTER_NOT_FOUND | 章节不存在 |
| GENERATION_NOT_FOUND | 生成任务不存在 |
| AI_SERVICE_ERROR | AI服务调用失败 |
| EXPORT_FAILED | 导出失败 |

## 开发说明

### 项目结构

```
backend/
├── src/
│   ├── database/      # 数据库连接和初始化
│   ├── middleware/    # Express中间件
│   ├── routes/        # API路由
│   ├── services/      # 业务逻辑
│   ├── types/         # TypeScript类型定义
│   ├── utils/         # 工具函数
│   └── index.ts       # 入口文件
├── data/              # SQLite数据库文件
├── exports/           # 导出文件目录
├── logs/              # 日志文件目录
└── package.json
```

### 添加新API

1. 在 `src/routes/` 创建路由文件
2. 在 `src/services/` 创建服务文件（如需要）
3. 在 `src/index.ts` 注册路由

### 日志

日志文件保存在 `logs/` 目录：
- `app.log`: 所有日志
- `error.log`: 错误日志

## 许可证

MIT
