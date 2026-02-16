# 快速启动指南

## 1. 安装依赖

```bash
npm install
```

新增的 shadcn/ui 相关依赖：
- `@radix-ui/react-slot` - Radix UI 插槽组件
- `class-variance-authority` - CVA 类变体工具
- `clsx` - 类名合并工具
- `lucide-react` - 图标库
- `tailwind-merge` - Tailwind 类名合并

## 2. 配置环境变量

创建 `.env.local` 文件：

```bash
# 魔塔 API Token
MODELSCOPE_ACCESS_TOKEN=your_modelscope_token_here

# OCR 模型（DeepSeek-OCR-2）
OCR_MODEL_ID=deepseek-ai/DeepSeek-OCR-2
OCR_TEMPERATURE=0.1
OCR_MAX_TOKENS=2048

# 文字解析模型
TEXT_MODEL_ID=Qwen/Qwen2.5-32B-Instruct
TEXT_TEMPERATURE=0.1
TEXT_MAX_TOKENS=1024
```

## 3. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

## 4. 使用说明

1. 点击上传区域选择房源图片（JPG/PNG，≤10MB）
2. 点击"开始识别"按钮
3. 等待 AI 识别（约 2-5 秒）
4. 查看右侧识别结果

## 5. 功能特点

- ✅ 使用 DeepSeek-OCR-2 多模态模型
- ✅ shadcn/ui 风格的现代化界面
- ✅ 支持深色模式
- ✅ 响应式布局
- ✅ 实时识别进度
- ✅ 显示置信度
- ✅ 查看 OCR 原始文本

## 6. 目录结构

```
fy/
├── app/
│   ├── page.tsx              # 主页面（上传+识别）
│   ├── layout.tsx            # 根布局
│   ├── globals.css           # 全局样式
│   └── api/
│       └── recognize/
│           └── route.ts      # 识别 API
├── components/
│   └── ui/
│       ├── button.tsx        # 按钮组件
│       └── card.tsx          # 卡片组件
├── lib/
│   ├── config.ts             # 配置管理
│   ├── utils.ts              # 工具函数
│   ├── ocr-vision.ts         # OCR 服务
│   ├── ai-parser-text.ts     # 文本解析
│   └── data-normalizer.ts    # 数据规整
└── types/
    └── property.ts           # 类型定义
```

## 7. 技术栈

- **框架**: Next.js 14 (App Router)
- **语言**: TypeScript
- **样式**: Tailwind CSS
- **UI**: shadcn/ui
- **图标**: Lucide React
- **AI**: DeepSeek-OCR-2 (魔塔)

## 8. 常见问题

### Q: 识别速度慢？
A: DeepSeek-OCR-2 是大模型，首次调用需要初始化，后续会快很多。

### Q: 识别准确率？
A: DeepSeek-OCR-2 对中文和表格识别准确率很高，通常 >95%。

### Q: 支持哪些图片格式？
A: 支持 JPG、PNG 格式，单张不超过 10MB。

## 9. 下一步

查看更多文档：
- `RP/技术实现方案-NextJS.md` - 完整技术方案
- `RP/魔塔API使用指南.md` - API 详细说明
- `RP/模型配置指南.md` - 模型配置
