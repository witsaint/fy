# 安全配置指南

## ⚠️ 重要提醒

**请勿将真实的 API Token 提交到代码仓库！**

## 🔒 保护敏感信息

### 1. 环境变量配置

所有敏感信息（如 API Token）应该存储在 `.env.local` 文件中：

```bash
# .env.local（此文件不会被提交到 Git）
MODELSCOPE_ACCESS_TOKEN=your_actual_token_here
```

### 2. Git 忽略配置

`.gitignore` 文件已经配置了忽略所有环境变量文件：

```gitignore
# local env files
.env*.local
.env.local
.env.development.local
.env.test.local
.env.production.local
```

### 3. 获取 API Token

#### ModelScope Token
1. 访问 [ModelScope](https://modelscope.cn/)
2. 登录你的账号
3. 进入 [我的访问令牌](https://modelscope.cn/my/myaccesstoken)
4. 复制你的 Access Token
5. 粘贴到 `.env.local` 文件中

## 📝 配置步骤

### 首次配置

1. **复制示例文件**：
   ```bash
   cp .env.example .env.local
   ```

2. **填写真实 Token**：
   编辑 `.env.local` 文件，将 `your_modelscope_token_here` 替换为你的真实 Token

3. **启动开发服务器**：
   ```bash
   pnpm run dev
   ```

### 团队协作

- ✅ 提交 `.env.example` 文件（包含示例配置）
- ❌ 不要提交 `.env.local` 文件（包含真实 Token）
- ✅ 每个开发者需要自己创建 `.env.local` 文件并配置 Token

## 🚨 如果 Token 泄露

如果不小心将 Token 提交到了代码仓库：

1. **立即撤销 Token**：
   - 访问 [ModelScope Token 管理页面](https://modelscope.cn/my/myaccesstoken)
   - 删除或重新生成 Token

2. **清理 Git 历史**：
   ```bash
   # 从 Git 历史中删除敏感文件（谨慎操作）
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch .env.local" \
     --prune-empty --tag-name-filter cat -- --all
   
   # 强制推送（需要团队成员重新克隆）
   git push origin --force --all
   ```

3. **更新本地配置**：
   使用新的 Token 更新 `.env.local` 文件

## 📚 最佳实践

1. **定期更换 Token**：建议每 3-6 个月更换一次
2. **最小权限原则**：只授予必要的权限
3. **监控使用情况**：定期检查 API 调用记录
4. **备份配置**：将配置模板保存在安全的地方
5. **文档说明**：在 README 中说明如何获取和配置 Token

## 🔍 检查清单

在提交代码前，请确认：

- [ ] `.env.local` 文件没有被添加到 Git
- [ ] 代码中没有硬编码的 Token
- [ ] 文档中的示例 Token 已替换为占位符
- [ ] `.gitignore` 包含了所有环境变量文件

## 📞 获取帮助

如有疑问，请查看：
- [ModelScope 官方文档](https://modelscope.cn/docs)
- [项目 README](./README.md)
- [环境变量配置示例](./.env.example)
