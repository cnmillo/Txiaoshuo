# 全自动小说生成器

一款基于AI技术的全自动小说生成网页应用，用户可以通过输入一句话或小说目录结构，生成完整的小说内容，支持多种文本格式输出。

## 功能特性

- **AI智能生成**：基于先进的AI技术，一键生成高质量小说内容
- **多种风格支持**：支持玄幻、武侠、言情、科幻、悬疑等多种小说风格
- **长篇创作**：支持10万字甚至100万字的长篇小说生成
- **大纲管理**：支持自定义大纲，按章节批量生成
- **多种格式导出**：支持TXT、PDF、EPUB等多种格式导出
- **去除AI痕迹**：智能优化算法，让内容更加自然流畅
- **自定义AI配置**：支持自定义CURL命令调用不同的大模型API
- **全中文界面**：所有界面元素均为中文显示

## 技术栈

### 前端

- React 18 + TypeScript
- Vite 5
- Tailwind CSS
- React Router
- Zustand (状态管理)
- React Query (数据获取)
- Axios (HTTP客户端)

### 后端

- Node.js + Express
- TypeScript
- SQLite
- Zod (数据验证)

### 部署

- Docker
- Docker Compose
- Nginx

## 项目结构

```
novel-generator/
├── frontend/              # React前端应用
│   ├── src/
│   │   ├── components/    # 组件
│   │   ├── pages/         # 页面
│   │   ├── services/      # API服务
│   │   ├── store/         # 状态管理
│   │   └── utils/         # 工具函数
│   ├── package.json
│   └── Dockerfile
├── backend/               # Express后端API
│   ├── src/
│   │   ├── database/      # 数据库
│   │   ├── middleware/    # 中间件
│   │   ├── routes/        # 路由
│   │   └── services/      # 服务
│   ├── package.json
│   └── Dockerfile
├── shared/                # 共享类型定义和工具
│   └── src/
│       ├── types/         # TypeScript类型
│       └── utils/         # 工具函数
├── docker-compose.yml     # Docker编排配置
├── start.bat / start.sh   # 一键启动脚本
├── install.bat / install.sh # 安装脚本
└── README.md
```

## 快速开始

### 环境要求

- Node.js 18.0.0 或更高版本
- npm 9.0.0 或更高版本
- Docker (可选，用于Docker部署)

### 方式一：使用一键启动脚本（推荐）

#### Windows

```bash
# 1. 安装依赖
install.bat

# 2. 启动开发服务器
start.bat
```

#### Linux/macOS

```bash
# 1. 安装依赖
chmod +x install.sh
./install.sh

# 2. 启动开发服务器
chmod +x start.sh
./start.sh
```

### 方式二：手动安装

```bash
# 1. 安装根目录依赖
npm install

# 2. 安装shared模块依赖
cd shared && npm install && cd ..

# 3. 安装backend依赖
cd backend && npm install && cd ..

# 4. 安装frontend依赖
cd frontend && npm install && cd ..

# 5. 启动开发服务器
npm run dev
```

### 方式三：使用Docker部署

```bash
# 1. 构建并启动容器
docker-compose up -d

# 2. 查看日志
docker-compose logs -f

# 3. 停止服务
docker-compose down
```

## 访问应用

- 前端地址：<http://localhost:5173>
- 后端API：<http://localhost:3001>
- API健康检查：<http://localhost:3001/api/health>

## 开发指南

### 开发命令

```bash
# 启动前后端开发服务器
npm run dev

# 仅启动前端
npm run dev:frontend

# 仅启动后端
npm run dev:backend

# 构建项目
npm run build

# 构建前端
npm run build:frontend

# 构建后端
npm run build:backend

# 生产环境启动
npm start
```

### Docker命令

```bash
# 构建镜像
npm run docker:build

# 启动容器
npm run docker:up

# 停止容器
npm run docker:down

# 查看日志
npm run docker:logs
```

## 配置说明

### 环境变量

创建 `.env` 文件（参考 `.env.example`）：

```env
# 数据库配置
DATABASE_URL=sqlite:./data/novel-generator.db

# JWT配置
JWT_SECRET=your-jwt-secret-key-change-in-production
JWT_EXPIRES_IN=7d

# 服务器配置
PORT=3001
NODE_ENV=development

# 前端配置
VITE_API_BASE_URL=http://localhost:3001/api
VITE_APP_TITLE=全自动小说生成器

# AI模型配置（可选）
OPENAI_API_KEY=your-openai-api-key
OPENAI_BASE_URL=https://api.openai.com/v1
```

### AI模型配置

在设置页面中，您可以配置：

1. **API密钥**：输入您的AI模型API密钥
2. **API基础URL**：设置API端点地址
3. **模型名称**：选择或输入模型名称
4. **自定义CURL**：使用自定义CURL命令调用AI模型

## API文档

### 小说相关API

#### 获取所有小说

```http
GET /api/novels
```

#### 获取单本小说

```http
GET /api/novels/:id
```

#### 生成小说

```http
POST /api/novels/generate
Content-Type: application/json

{
  "title": "小说标题",
  "prompt": "创作提示",
  "style": "fantasy",
  "wordCount": 10000,
  "outline": "可选的大纲"
}
```

#### 更新小说

```http
PATCH /api/novels/:id
Content-Type: application/json

{
  "title": "新标题",
  "content": "新内容"
}
```

#### 删除小说

```http
DELETE /api/novels/:id
```

#### 导出小说

```http
GET /api/novels/:id/export?format=txt|pdf|epub
```

### 设置相关API

#### 获取所有设置

```http
GET /api/settings
```

#### 更新设置

```http
PATCH /api/settings
Content-Type: application/json

{
  "aiConfig": {
    "apiKey": "your-api-key",
    "baseUrl": "https://api.openai.com/v1",
    "model": "gpt-4"
  }
}
```

## 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 使用指南

### 1. 基本使用流程

1. **创建小说**：在首页点击"创建小说"按钮，输入小说标题和创作提示
2. **选择风格**：选择适合的小说风格（玄幻、武侠、言情等）
3. **设置参数**：设置目标字数、章节数等参数
4. **生成小说**：点击"开始生成"按钮，系统会自动生成小说内容
5. **编辑内容**：生成完成后，可以在编辑器中修改和完善内容
6. **导出小说**：选择合适的格式（TXT、PDF、EPUB）导出小说

### 2. 高级功能

#### 大纲管理

- 在"大纲管理"页面，您可以创建和编辑小说大纲
- 支持按章节批量生成内容
- 可以调整章节顺序和层级

#### 人物管理

- 在"人物管理"页面，您可以创建和管理小说中的人物角色
- 为每个角色设置详细的背景信息和性格特点
- 系统会根据人物设定生成符合角色特点的内容

#### 风格设置

- 在"风格设置"页面，您可以自定义小说的写作风格
- 选择不同的语言风格、叙事方式和情感基调
- 保存多个风格模板，方便在不同小说中使用

#### 一致性检查

- 在"一致性管理"页面，系统会自动检测小说中的前后矛盾之处
- 提供修改建议，确保小说内容的一致性
- 支持检查人物设定、情节发展和时间线等方面

## 故障排除

### 常见问题

1. **AI生成失败**
   - 检查API密钥是否正确配置
   - 确保网络连接正常
   - 尝试调整生成参数，减少单次生成的字数
2. **导出失败**
   - 确保小说内容不为空
   - 检查磁盘空间是否充足
   - 尝试使用不同的导出格式
3. **Docker部署失败**
   - 检查Docker是否正确安装
   - 确保端口没有被占用
   - 查看容器日志获取详细错误信息
4. **前端无法连接后端**
   - 检查后端服务是否正常运行
   - 确认API地址配置正确
   - 检查网络防火墙设置

### 错误代码

- `401 Unauthorized`：API密钥错误或过期
- `429 Too Many Requests`：API请求过于频繁，需要等待
- `500 Internal Server Error`：服务器内部错误，查看日志获取详细信息
- `502 Bad Gateway`：Nginx无法连接到后端服务

## 部署指南

### 生产环境部署

#### 使用Docker Compose（推荐）

```bash
# 1. 克隆仓库
git clone https://github.com/yourusername/novel-generator.git
cd novel-generator

# 2. 配置环境变量
cp .env.example .env
# 编辑.env文件，设置必要的环境变量

# 3. 构建并启动容器
docker-compose up -d --build

# 4. 验证部署
curl http://localhost:3001/api/health
# 应该返回 {"status": "ok"}

# 5. 访问应用
# 前端：http://localhost
# 后端API：http://localhost:3001/api
```

#### 手动部署

```bash
# 1. 克隆仓库
git clone https://github.com/yourusername/novel-generator.git
cd novel-generator

# 2. 安装依赖
npm run install:all

# 3. 构建项目
npm run build

# 4. 启动服务
npm start

# 5. 配置反向代理（推荐使用Nginx）
# 参考frontend/nginx.conf配置
```

### 环境变量配置

| 变量名                 | 描述           | 默认值                              | 必填               |
| ------------------- | ------------ | -------------------------------- | ---------------- |
| `PORT`              | 后端服务端口       | 3001                             | 否                |
| `NODE_ENV`          | 运行环境         | development                      | 否                |
| `DATABASE_URL`      | 数据库连接字符串     | sqlite:./data/novel-generator.db | 否                |
| `JWT_SECRET`        | JWT密钥        | your-jwt-secret-key              | 是（生产环境）          |
| `VITE_API_BASE_URL` | 前端API基础地址    | <http://localhost:3001/api>      | 否                |
| `VITE_APP_TITLE`    | 应用标题         | 全自动小说生成器                         | 否                |
| `OPENAI_API_KEY`    | OpenAI API密钥 | -                                | 否（使用自定义CURL时不需要） |

## 性能优化

1. **AI生成优化**
   - 合理设置生成参数，避免单次生成过多内容
   - 使用自定义CURL命令时，优化prompt格式
   - 考虑使用本地部署的AI模型以提高响应速度
2. **服务器优化**
   - 生产环境使用PM2进行进程管理
   - 配置适当的内存和CPU资源
   - 启用Gzip压缩减少网络传输
3. **数据库优化**
   - 定期清理不必要的数据
   - 对于大型小说，考虑使用更强大的数据库

## 安全注意事项

1. **API密钥保护**
   - 不要在代码中硬编码API密钥
   - 使用环境变量或配置文件管理敏感信息
   - 定期更换API密钥
2. **输入验证**
   - 所有用户输入都应该经过验证
   - 避免SQL注入和XSS攻击
3. **权限控制**
   - 生产环境应该设置适当的访问权限
   - 限制API请求频率，防止滥用

## 联系方式

如有问题或建议，欢迎提交 Issue 或 Pull Request。

***

**注意**：本项目仅供学习和研究使用，请遵守相关法律法规。
#   a i - n o v e l  
 #   T x i a o s h u o  
 