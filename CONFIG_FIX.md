# 配置文件说明

## 已修复的问题

### 1. Next.js 配置文件
- ✅ 使用 `next.config.mjs` 替代重复的 `next.config.js`
- ✅ 使用 ESM 模块格式（推荐）
- ✅ 移除冗余配置

### 2. PostCSS 配置文件
- ✅ 使用 `postcss.config.mjs` 替代重复的 `postcss.config.js`
- ✅ 使用 ESM 模块格式
- ✅ 简化配置

### 3. lib/config.ts 修复
- ✅ 修复 `parseInt` 缺少基数参数（添加第二个参数 10）
- ✅ 添加 `as const` 类型断言，提高类型安全
- ✅ 修复 `validateConfig` 函数返回类型
- ✅ 添加默认导出
- ✅ 添加错误日志输出

## 配置文件清单

### next.config.mjs
Next.js 主配置文件
- 严格模式
- SWC 压缩
- 图片优化
- 服务器 Actions 配置（10MB body limit）

### postcss.config.mjs
PostCSS 配置文件
- Tailwind CSS
- Autoprefixer

### lib/config.ts
应用配置管理
- 魔塔 API 配置
- OCR 模型配置
- 文本模型配置
- 应用配置

## 使用方法

### 导入配置
```typescript
// 命名导入
import { config, validateConfig } from '@/lib/config';

// 默认导入
import config from '@/lib/config';

// 使用配置
console.log(config.modelScope.apiKey);
console.log(config.ocrModel.modelId);

// 验证配置
validateConfig();
```

### 类型支持
```typescript
import type { Config } from '@/lib/config';

// 现在 config 有完整的类型提示
const apiKey: string = config.modelScope.apiKey;
const maxTokens: number = config.ocrModel.maxTokens;
```

## 注意事项

1. 环境变量必须在 `.env.local` 中配置
2. `parseInt` 的第二个参数指定了进制（10 进制）
3. `as const` 使配置成为只读，防止意外修改
4. 使用 ESM 模块格式（.mjs）避免配置冲突
