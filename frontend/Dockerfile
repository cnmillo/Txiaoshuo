# 构建阶段
FROM node:20-alpine AS builder

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
FROM nginx:alpine

# 安装运行时依赖
RUN apk add --no-cache curl

# 复制构建产物到nginx目录
COPY --from=builder /app/dist /usr/share/nginx/html

# 复制nginx配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 暴露端口
EXPOSE 80

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD curl -f http://localhost || exit 1

# 启动nginx
CMD ["nginx", "-g", "daemon off;"]
