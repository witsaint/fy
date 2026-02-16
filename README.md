# 房源图片信息汇总工具

基于 Next.js + TypeScript + 魔塔AI 开发的智能房源信息识别系统。

## 功能特点

- 🖼️ **智能图片识别**：支持JPG/PNG格式，批量上传最多20张
- 🤖 **AI自动提取**：使用魔塔多模态模型，自动识别房源8大核心字段
- 📊 **表格管理**：实时展示、编辑、筛选房源信息
- 📥 **一键导出**：导出Excel格式，兼容WPS和Office
- ⚡ **极速响应**：2-3秒完成单张图片识别
- 💰 **成本低廉**：月处理1000张图片仅需1.5元

## 技术栈

- **框架**：Next.js 14 (App Router)
- **语言**：TypeScript
- **UI组件**：Ant Design 5.x
- **样式**：Tailwind CSS
- **AI服务**：魔塔（ModelScope）API
  - OCR模型：Qwen/Qwen2-VL-7B-Instruct
  - 解析模型：Qwen/Qwen2.5-32B-Instruct
- **Excel处理**：xlsx

## 快速开始

### 1. 克隆项目

```bash
git clone <repository-url>
cd fy
```

### 2. 安装依赖

```bash
npm install
# 或
pnpm install
# 或
yarn install
```

### 3. 配置环境变量

⚠️ **重要：请勿将真实的 API Token 提交到代码仓库！**

复制环境变量模板：

```bash
cp .env.example .env.local
```

编辑 `.env.local` 文件，填写你的 ModelScope API Token：

1. 访问 [ModelScope](https://modelscope.cn/my/myaccesstoken) 获取 Token
2. 将 `your_modelscope_token_here` 替换为你的真实 Token

```bash
# .env.local
MODELSCOPE_ACCESS_TOKEN=your_actual_token_here
```

> 📚 详细安全配置说明请查看 [SECURITY.md](./SECURITY.md)

编辑 `.env.local`，填写您的魔塔API Token：

```bash
# 魔塔（ModelScope）API配置
MODELSCOPE_ACCESS_TOKEN=ms-your-token-here

# OCR识别模型（多模态）
OCR_MODEL_ID=Qwen/Qwen2-VL-7B-Instruct
OCR_TEMPERATURE=0.1
OCR_MAX_TOKENS=2048

# 文字解析模型
TEXT_MODEL_ID=Qwen/Qwen2.5-32B-Instruct
TEXT_TEMPERATURE=0.1
TEXT_MAX_TOKENS=1024
```

**如何获取魔塔Token？**

1. 访问 https://modelscope.cn/
2. 注册/登录账号
3. 进入「个人中心」→「访问令牌」
4. 创建新令牌并复制

### 4. 启动开发服务器

```bash
npm run dev
```

打开浏览器访问 http://localhost:3000

### 5. 构建生产版本

```bash
npm run build
npm run start
```

## 项目结构

```
fy/
├── app/
│   ├── page.tsx                    # 主页面
│   ├── layout.tsx                  # 根布局
│   ├── api/
│   │   └── recognize/
│   │       └── route.ts            # 图片识别API路由
│   └── globals.css                 # 全局样式
├── components/
│   ├── UploadArea.tsx              # 上传区域组件
│   ├── ImagePreview.tsx            # 图片预览组件
│   ├── PropertyTable.tsx           # 房源表格组件
│   ├── EditModal.tsx               # 编辑弹窗组件
│   └── ExportButton.tsx            # 导出按钮组件
├── lib/
│   ├── config.ts                   # 配置管理
│   ├── ocr-vision.ts               # 多模态OCR服务
│   ├── ai-parser-text.ts           # 文本解析服务
│   ├── data-normalizer.ts          # 数据规整
│   └── excel-export.ts             # Excel导出
├── types/
│   └── property.ts                 # TypeScript类型定义
├── RP/                             # 需求文档目录
│   ├── 需求文档.md
│   ├── 开发计划.md
│   ├── 技术实现方案-NextJS.md
│   ├── 快速开始指南.md
│   ├── 魔塔API使用指南.md
│   └── 模型配置指南.md
├── .env.example                    # 环境变量模板
├── .env.local                      # 实际配置（不提交）
├── package.json
├── tsconfig.json
└── next.config.js
```

## 核心功能

### 1. 图片上传

- 支持点击上传和拖拽上传
- 格式限制：JPG、PNG
- 大小限制：单张≤10MB
- 数量限制：最多20张

### 2. AI识别

两种识别模式：

**模式1：直接识别（推荐）**
- 一步完成：图片 → JSON
- 速度快（2-3秒）
- 准确率高（95%+）

**模式2：两步识别**
- 第一步：图片 → 文字（OCR）
- 第二步：文字 → JSON（解析）
- 便于调试

### 3. 数据管理

- 实时展示识别结果
- 按区域筛选（6个标准区域）
- 编辑单条房源信息
- 删除错误数据
- 清空所有数据

### 4. Excel导出

- 前端生成Excel文件
- 格式：.xlsx
- 兼容Office和WPS
- 文件名：房源汇总表_YYYYMMDD.xlsx

## 环境要求

- Node.js >= 18.0.0
- npm >= 9.0.0
- 支持现代浏览器（Chrome、Edge、Safari）

## 依赖说明

### 核心依赖

- **next**: Next.js框架
- **react**: React库
- **typescript**: TypeScript支持
- **openai**: 调用魔塔API（OpenAI兼容）
- **axios**: HTTP请求库
- **antd**: Ant Design UI组件库
- **@ant-design/icons**: Ant Design图标
- **xlsx**: Excel文件生成

### 开发依赖

- **eslint**: 代码检查
- **tailwindcss**: CSS框架
- **postcss**: CSS处理

## 配置说明

### 模型配置

在 `.env.local` 中可以配置不同的模型：

```bash
# 生产环境（推荐）- 平衡速度和准确率
OCR_MODEL_ID=Qwen/Qwen2-VL-7B-Instruct
TEXT_MODEL_ID=Qwen/Qwen2.5-32B-Instruct

# 高精度配置 - 准确率最高
OCR_MODEL_ID=Qwen/Qwen2-VL-72B-Instruct
TEXT_MODEL_ID=Qwen/Qwen2.5-72B-Instruct

# 快速测试配置 - 速度最快
OCR_MODEL_ID=Qwen/Qwen2-VL-7B-Instruct
TEXT_MODEL_ID=Qwen/Qwen2.5-7B-Instruct
```

详见 `RP/模型配置指南.md`

### 应用配置

在 `lib/config.ts` 中可以修改：

- 最大上传文件数
- 单个文件大小限制
- 允许的图片格式
- 并发识别数量

## API文档

### POST /api/recognize

识别图片中的房源信息

**请求**：
```json
{
  "image": "data:image/jpeg;base64,...",
  "mode": "direct"  // 或 "two-step"
}
```

**响应**：
```json
{
  "success": true,
  "data": {
    "id": "prop-xxx",
    "region": "瑶海区",
    "building": "万事通大厦",
    "roomNumber": "1005",
    "area": "252㎡",
    "price": "42元/㎡/天",
    "propertyFee": "3.5元/㎡/月",
    "commission": "全佣金",
    "remarks": "含家具，电梯口",
    "confidence": 0.96
  }
}
```

## 性能指标

- **识别速度**：2-3秒/张
- **识别准确率**：95%+（核心字段）
- **并发处理**：5张/批次
- **成本**：约0.001元/张

## 部署

### Vercel部署（推荐）

1. 推送代码到GitHub
2. 导入项目到Vercel
3. 配置环境变量
4. 自动部署完成

### 自托管部署

```bash
# 构建
npm run build

# 启动
npm run start

# 使用PM2（推荐）
pm2 start npm --name "fy" -- start
```

### Docker部署

```bash
docker build -t fy .
docker run -p 3000:3000 --env-file .env.local fy
```

## 常见问题

### Q1：识别速度慢怎么办？
**A**：
- 切换到7B小模型
- 使用直接识别模式
- 减小max_tokens

### Q2：识别准确率不高？
**A**：
- 确保图片清晰
- 使用72B大模型
- 降低temperature到0.05
- 优化Prompt

### Q3：API调用失败？
**A**：
- 检查Token是否正确
- 确认网络连接
- 查看API额度是否用尽

## 开发文档

详细文档请查看 `RP/` 目录：

- 📄 需求文档.md - 项目需求详情
- 📄 开发计划.md - 开发规划
- 📄 技术实现方案-NextJS.md - 完整实现方案
- 📄 快速开始指南.md - 从零搭建教程
- 📄 魔塔API使用指南.md - API详细说明
- 📄 模型配置指南.md - 模型选择和配置

## 贡献指南

欢迎提交Issue和Pull Request！

## 许可证

MIT License

## 联系方式

如有问题，请提交Issue或联系开发者。

---

**技术支持**：
- 魔塔官网：https://modelscope.cn/
- Next.js文档：https://nextjs.org/docs
- Ant Design文档：https://ant.design/
