# FY — 图片 AI 处理平台

基于 **Next.js 14 + TypeScript + 魔塔 AI + 火山引擎** 构建的图片智能处理工具，目前集成两大功能模块。

---

## 功能模块

### 模块一：房源图片信息提取

> 路由：`/`（主页）

上传房源截图，AI 自动识别并结构化提取房源核心字段，支持导出 Excel。

| 特性 | 说明 |
|------|------|
| 图片格式 | JPG / PNG，单张 ≤ 10MB，最多 20 张 |
| 识别字段 | 区域、楼盘、房号、面积、价格、物业费、佣金、备注 |
| AI 模型 | 魔塔多模态 VL 模型（OCR）+ 文本模型（解析） |
| 识别速度 | 2–3 秒 / 张 |
| 导出格式 | `.xlsx`（兼容 Office / WPS） |

### 模块二：图片文本翻译替换

> 路由：`/translate`

上传广告图片，AI 识别图中中文广告文案 → 翻译成目标语言 → 调用火山引擎 SeedEdit 3.0 将原图中的文字原位替换为译文，返回处理后的图片。

| 特性 | 说明 |
|------|------|
| 图片格式 | JPG / PNG / WebP，单张 ≤ 10MB，最多 20 张 |
| 目标语言 | 英语、日语、韩语、西班牙语、法语、德语、俄语、泰语、越南语、印尼语 |
| 识别排除 | 品牌名、产品型号、价格数字、纯英文/数字内容自动跳过，不参与翻译 |
| 图生图引擎 | 火山引擎 SeedEdit 3.0（异步任务，自动轮询） |
| 下载文件名 | `原文件名_translated.扩展名` |
| 批量下载 | 前端打包 ZIP，ZIP 内每张图文件名同上 |
| 图片预览 | 点击卡片可放大，支持原图 / 译图切换 |

---

## 技术栈

| 层次 | 技术 |
|------|------|
| 框架 | Next.js 14（App Router） |
| 语言 | TypeScript |
| 样式 | Tailwind CSS + shadcn/ui |
| AI OCR & 翻译 | 魔塔（ModelScope）DashScope 兼容 API |
| 图生图 | 火山引擎视觉服务 `visual.volcengineapi.com` |
| 签名 | 自实现 HMAC-SHA256（Volcengine 规范） |
| 打包下载 | JSZip + file-saver |

---

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置环境变量

```bash
cp .env.example .env.local
```

编辑 `.env.local`：

```bash
# 魔塔 API（房源识别 + 翻译）
# 获取：https://modelscope.cn/my/myaccesstoken
MODELSCOPE_ACCESS_TOKEN=ms-xxxxxxxxxxxxxxxx

# OCR 识别模型（多模态 VL）
OCR_MODEL_ID=Qwen/Qwen3-VL-30B-A3B-Instruct
OCR_TEMPERATURE=0.1
OCR_MAX_TOKENS=2048

# 翻译文本模型
TEXT_MODEL_ID=Qwen/Qwen2.5-32B-Instruct
TEXT_TEMPERATURE=0.1
TEXT_MAX_TOKENS=1024

# 火山引擎（图生图 SeedEdit 3.0）
# 获取：https://console.volcengine.com/iam/keymanage/
VOLCENGINE_ACCESS_KEY=your_access_key
VOLCENGINE_SECRET_KEY=your_secret_key
```

### 3. 启动开发服务器

```bash
pnpm dev
```

访问 http://localhost:3000

### 4. 构建生产版本

```bash
pnpm build
pnpm start
```

---

## 项目结构

```
fy/
├── app/
│   ├── page.tsx                        # 房源识别页面
│   ├── translate/
│   │   └── page.tsx                    # 图片翻译页面
│   └── api/
│       ├── recognize/route.ts          # 房源识别接口
│       ├── translate/route.ts          # 翻译任务提交接口
│       └── task/[taskId]/route.ts      # 异步任务查询接口
├── components/
│   ├── ImageCard.tsx                   # 图片卡片（含放大 Lightbox）
│   ├── UploadZone.tsx                  # 拖拽上传区域
│   ├── LanguageSelector.tsx            # 目标语言选择
│   └── ChannelSelector.tsx             # 图生图渠道选择
├── hooks/
│   └── useTranslate.ts                 # 翻译状态管理 + 轮询 schedule
├── lib/
│   ├── config.ts                       # 全局配置
│   ├── sign.ts                         # 火山引擎 HMAC-SHA256 签名
│   ├── ocr-translate.ts                # OCR 识别 + 文本翻译
│   ├── ocr-vision.ts                   # 房源识别（多模态）
│   ├── channels/
│   │   ├── index.ts                    # 渠道分发器
│   │   └── volcengine.ts               # 火山引擎 SeedEdit 实现
│   └── data-normalizer.ts              # 房源数据规整
├── types/
│   ├── translate.ts                    # 翻译模块类型定义
│   └── property.ts                     # 房源类型定义
├── docs/                               # 详细开发文档
│   ├── README-房源识别.md
│   └── README-图片翻译.md
├── .env.example                        # 环境变量模板
└── .env.local                          # 实际配置（不提交 Git）
```

---

## API 接口

### POST `/api/recognize` — 房源识别

```json
// 请求
{ "image": "base64字符串" }

// 响应
{
  "success": true,
  "data": {
    "region": "瑶海区",
    "building": "万事通大厦",
    "area": "252㎡",
    "price": "42元/㎡/天"
  }
}
```

### POST `/api/translate` — 提交翻译任务

```json
// 请求
{ "id": "uuid", "base64": "...", "format": "jpeg", "targetLang": "en", "channel": "volcengine" }

// 响应
{ "id": "uuid", "success": true, "taskId": "7392616336519610409", "texts": [...] }
```

### GET `/api/task/[taskId]?channel=volcengine` — 查询任务状态

```json
// 响应（生成中）
{ "success": true, "status": "generating" }

// 响应（完成）
{ "success": true, "status": "done", "base64": "处理后图片base64" }
```

任务状态：`in_queue` → `generating` → `done` / `not_found` / `expired`

---

## 图生图工作流

```
前端上传图片
     ↓
POST /api/translate
     ↓
Step 1: 魔塔 VL 模型 OCR 识别广告文案（排除品牌名/产品名）
     ↓
Step 2: 魔塔文本模型 翻译文案
     ↓
Step 3: 提交火山引擎 SeedEdit 3.0 异步任务 → 返回 task_id
     ↓
前端每 3 秒轮询 GET /api/task/[taskId]
     ↓
任务完成 → 返回处理后图片 base64 → 前端展示 / 下载
```

---

## 部署

### Vercel（推荐）

1. 推送代码到 GitHub
2. 在 Vercel 导入项目
3. 配置上述所有环境变量
4. 自动部署

### 自托管

```bash
pnpm build && pnpm start

# 或使用 PM2
pm2 start npm --name "fy" -- start
```

---

## 详细文档

| 文档 | 说明 |
|------|------|
| [docs/README-房源识别.md](./docs/README-房源识别.md) | 房源识别模块开发细节、模型配置、字段说明 |
| [docs/README-图片翻译.md](./docs/README-图片翻译.md) | 图片翻译模块架构、火山引擎接入、异步轮询设计 |

---

## 环境要求

- Node.js ≥ 18
- pnpm ≥ 8

## 许可证

MIT
