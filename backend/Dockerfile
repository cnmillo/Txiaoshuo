# 构建阶段
FROM node:20-alpine AS builder

# 安装构建依赖
RUN apk add --no-cache python3 make g++

# 设置工作目录
WORKDIR /app

# 复制 package.json
COPY package.json ./
COPY ../shared/package.json ../shared/

# 安装依赖
RUN npm install

# 复制源代码
COPY . .
COPY ../shared ../shared

# 构建应用
RUN npm run build

# 生产阶段
FROM node:20-alpine

# 安装运行时依赖
RUN apk add --no-cache curl

# 设置工作目录
WORKDIR /app

# 复制 package.json
COPY package.json ./

# 只安装生产依赖
RUN npm install --production

# 从构建阶段复制构建产物
COPY --from=builder /app/dist ./dist

# 创建数据目录
RUN mkdir -p /app/data /app/uploads

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3001

# 暴露端口
EXPOSE 3001

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3001/api/health || exit 1

# 启动应用
CMD ["node", "dist/index.js"]
