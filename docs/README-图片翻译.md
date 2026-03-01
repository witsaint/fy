# 图片文本翻译替换 — 开发文档

## 功能概述

上传广告图片 → AI 识别图中中文广告文案（自动排除品牌名/产品名）→ 翻译成目标语言 → 火山引擎 SeedEdit 3.0 原位替换图片中的文字 → 返回处理后图片供预览和下载。

---

## 整体流程

```
前端上传图片
     ↓
POST /api/translate
  Step 1: 魔塔 VL 模型 OCR
          识别广告文案（排除品牌名/产品名/价格/纯英文）
  Step 2: 魔塔文本模型
          翻译文案 → TextPair[]
  Step 3: 提交火山引擎 CVSync2AsyncSubmitTask
          → 返回 task_id
     ↓
前端每 3 秒轮询 GET /api/task/[taskId]
  CVSync2AsyncGetResult
  状态：in_queue → generating → done
     ↓
完成 → 返回 base64 → 前端展示 / 下载
```

---

## 接口文档

### `POST /api/translate` — 提交翻译任务

**请求：**
```json
{
  "id": "前端 UUID",
  "base64": "图片 base64（不含 data:image/ 前缀）",
  "format": "jpeg",
  "targetLang": "en",
  "channel": "volcengine"
}
```

**响应（成功）：**
```json
{
  "id": "前端 UUID",
  "success": true,
  "taskId": "7392616336519610409",
  "channel": "volcengine",
  "texts": [
    { "original": "立即购买", "translated": "Buy Now" },
    { "original": "限时特惠", "translated": "Limited Time Offer" }
  ]
}
```

**响应（无可翻译文字）：**
```json
{ "id": "...", "success": false, "error": "未识别到广告文案文字" }
```

---

### `GET /api/task/[taskId]?channel=volcengine` — 查询任务状态

**响应（进行中）：**
```json
{ "success": true, "status": "generating" }
```

**响应（完成）：**
```json
{ "success": true, "status": "done", "base64": "处理后图片base64" }
```

**响应（失败/过期）：**
```json
{ "success": true, "status": "not_found" }
```

**任务状态说明：**

| 状态 | 含义 |
|------|------|
| `in_queue` | 已提交，排队中 |
| `generating` | 处理中 |
| `done` | 完成（可能成功或失败，看外层 code） |
| `not_found` | 任务不存在或已过期（12 小时） |
| `expired` | 任务已过期，需重新提交 |

---

## 前端状态机

图片卡片共 5 种状态：

```
idle → processing → polling → done
                 ↘           ↘
                  error      error（polling 超时 / 任务失败）
```

| 状态 | 说明 |
|------|------|
| `idle` | 待处理 |
| `processing` | 提交中（OCR + 翻译 + 提交火山引擎） |
| `polling` | 生成中（每 3 秒轮询任务状态） |
| `done` | 完成，展示译图 |
| `error` | 失败，可重试 |

轮询最长等待 **10 分钟**，超时自动标记为失败。

---

## 提示词设计

### OCR 识别（Step 1）

**System Prompt 要点：**
- 仅识别广告正文文案（标题、口号、描述、促销等）
- **严格排除**：品牌名（华为/Apple/小米等）、产品型号（iPhone 15 Pro等）、价格、纯英文/数字、网址、电话

**User Prompt：**
> 请识别图片中需要翻译的广告文案，严格排除品牌名和产品名称/型号。  
> 仅返回JSON字符串数组，不要任何其他内容，如果没有需要翻译的文字则返回 []

### 翻译（Step 2）

**System Prompt 要点：**
- 品牌名/产品名如混入文案，保持原样不翻译
- 翻译要自然流畅，符合目标语言广告表达习惯

### 图生图 Prompt（Step 3）

发给火山引擎 SeedEdit 的指令，设计要点：

```
【文字替换任务】严格按照以下规则仅做文字替换，禁止对图片做任何其他修改：

1. 将图片中文字"立即购买"原位替换为"Buy Now"
2. 将图片中文字"限时特惠"原位替换为"Limited Time Offer"

【强制约束，必须全部遵守】
- 只替换上述指定文字，不得修改图片中任何其他文字
- 禁止在图片任何位置新增、添加或生成额外文字、图案、水印、标注
- 替换后的文字须保持与原文字相同的位置、字体大小、颜色、对齐方式和排版风格
- 图片背景、商品图像、装饰元素、品牌Logo、价格数字等所有非替换内容保持原样不变
- 如某处原文与多个替换项相似，以编号顺序为准，精确匹配后再替换
```

**`scale` 参数设置为 `0.5`**（越低越忠于原图，越不自由发挥）。若仍出现多余内容，可进一步降低至 `0.3`。

---

## 火山引擎接入

### 鉴权方式

HMAC-SHA256 签名，参考 `lib/sign.ts`，参与签名的 Header：
- `host`
- `x-date`
- `x-content-sha256`
- `content-type`

### 接口

| 接口 | Action | 说明 |
|------|--------|------|
| 提交任务 | `CVSync2AsyncSubmitTask` | 返回 `task_id` |
| 查询任务 | `CVSync2AsyncGetResult` | 返回状态和图片 |

- Endpoint：`https://visual.volcengineapi.com`
- Service：`cv`
- Region：`cn-north-1`
- Version：`2022-08-31`
- req_key：`seededit_v3.0`

---

## 下载文件名规则

| 场景 | 文件名格式 |
|------|-----------|
| 单张下载 | `原文件名_translated.扩展名` |
| 批量 ZIP 内 | `原文件名_translated.扩展名` |
| ZIP 包本身 | `translated_YYYY-MM-DDTHH-MM-SS.zip` |

示例：原文件 `banner.png` → 下载为 `banner_translated.png`

---

## 相关文件

| 文件 | 说明 |
|------|------|
| `app/translate/page.tsx` | 翻译页面 |
| `app/api/translate/route.ts` | 提交任务接口 |
| `app/api/task/[taskId]/route.ts` | 查询任务接口 |
| `hooks/useTranslate.ts` | 状态管理 + 轮询 schedule |
| `lib/ocr-translate.ts` | OCR 识别 + 文本翻译 |
| `lib/channels/volcengine.ts` | 火山引擎 SeedEdit 实现 |
| `lib/channels/index.ts` | 渠道分发器 |
| `lib/sign.ts` | HMAC-SHA256 签名工具 |
| `components/ImageCard.tsx` | 图片卡片（含 Lightbox 放大） |
| `types/translate.ts` | 类型定义 |

---

## 常见问题

**Q：图片其他区域出现了额外文字或图案？**  
A：这是 SeedEdit 模型"创作"导致的。已通过以下措施缓解：
1. Prompt 中明确「禁止在任何位置新增文字/图案」
2. `scale` 参数设置为 `0.5`（低值更忠于原图）

如仍有问题，可继续将 `scale` 降至 `0.3`，在 `lib/channels/volcengine.ts` 的 `volcengineSubmitTask` 中修改。

**Q：翻译了不该翻译的品牌名？**  
A：在 OCR system prompt 的排除列表中补充对应的品牌名/产品名，或在翻译 system prompt 中强调保留原文。

**Q：任务一直处于 `in_queue` 或 `generating`？**  
A：正常情况下 SeedEdit 3.0 任务约 30–120 秒完成。高峰期可能更长。前端最多等待 10 分钟后自动超时。

**Q：任务返回 `not_found`？**  
A：任务 ID 有效期 12 小时。刷新页面后 task_id 丢失，需重新提交。
