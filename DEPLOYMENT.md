# 部署到 GitHub Pages

本指南将帮助你将小说生成器网站部署到 GitHub Pages。

## 前提条件

1. 拥有一个 GitHub 账号
2. 在本地安装了 Git
3. 项目已在本地完成开发和测试

## 部署步骤

### 1. 初始化 Git 仓库（如果尚未初始化）

```bash
# 在项目根目录执行
git init
git add .
git commit -m "Initial commit"
```

### 2. 创建 GitHub 仓库

1. 登录 GitHub
2. 点击 "New repository"
3. 填写仓库名称（例如 "novel-generator"）
4. 选择公开或私有
5. 点击 "Create repository"

### 3. 关联本地仓库与 GitHub 仓库

```bash
# 替换 YOUR_USERNAME 和 YOUR_REPOSITORY 为你的 GitHub 用户名和仓库名
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
git push -u origin main
```

### 4. 配置 GitHub Pages

1. 进入 GitHub 仓库页面
2. 点击 "Settings"
3. 在左侧菜单中选择 "Pages"
4. 在 "Source" 部分，选择 "Deploy from a branch"
5. 在 "Branch" 部分，选择 "gh-pages" 分支和 "/ (root)" 目录
6. 点击 "Save"

### 5. 触发部署

推送代码到 main 分支会自动触发 GitHub Actions 工作流，开始部署过程：

```bash
git push origin main
```

### 6. 查看部署状态

1. 进入 GitHub 仓库页面
2. 点击 "Actions" 标签
3. 查看最新的 workflow 运行状态
4. 部署完成后，页面会显示 "deploy" 任务成功

### 7. 访问部署后的网站

部署完成后，你可以通过以下 URL 访问你的网站：

```
https://YOUR_USERNAME.github.io/YOUR_REPOSITORY/
```

## 注意事项

1. **API 调用**：由于 GitHub Pages 是静态网站托管服务，无法运行后端服务，因此：
   - 前端将无法调用后端 API
   - 你需要配置前端使用外部 API 服务或使用 Mock 数据

2. **环境变量**：如果前端需要 API 基础 URL，请在 `.env` 文件中设置：
   ```
   VITE_API_BASE_URL=https://your-api-server.com/api
   ```

3. **构建优化**：前端构建后会生成静态文件，确保这些文件不包含敏感信息。

4. **自定义域名**：如果需要使用自定义域名，请在 GitHub Pages 设置中配置。

## 故障排除

1. **部署失败**：检查 GitHub Actions 日志，查看具体错误信息
2. **网站无法访问**：确保 gh-pages 分支已成功创建，且 GitHub Pages 设置正确
3. **API 调用失败**：检查 API 基础 URL 是否正确配置，以及后端服务是否可用

## 本地测试

在部署前，你可以在本地预览构建后的网站：

```bash
cd frontend
npm run preview
```

然后访问 `http://localhost:4173` 查看效果。
