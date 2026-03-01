# 房源图片信息提取 — 开发文档

## 功能概述

上传房源截图（微信群截图、中介发的图片等），AI 自动识别并结构化提取 8 大核心字段，结果以表格展示并可导出 Excel。

---

## 架构

```
用户上传图片（JPG/PNG，≤10MB，最多 20 张）
     ↓
POST /api/recognize
     ↓
魔塔 VL 多模态模型直接识别 → 输出 JSON
     ↓
data-normalizer 数据规整
     ↓
前端表格展示 / 编辑 / 导出 Excel
```

---

## 识别字段

| 字段 | 说明 | 示例 |
|------|------|------|
| region | 区域 | 瑶海区 |
| building | 楼盘/大厦名称 | 万事通大厦 |
| roomNumber | 房间号 | 1005 |
| area | 面积 | 252㎡ |
| price | 租金 | 42元/㎡/天 |
| propertyFee | 物业费 | 3.5元/㎡/月 |
| commission | 佣金说明 | 全佣金 |
| remarks | 备注 | 含家具，电梯口 |

---

## 模型配置

在 `.env.local` 中配置：

```bash
# 多模态 OCR 识别模型（推荐按精度需求选择）
OCR_MODEL_ID=Qwen/Qwen3-VL-30B-A3B-Instruct   # 高精度（推荐生产）
# OCR_MODEL_ID=Qwen/Qwen2-VL-72B-Instruct     # 最高精度，速度最慢
# OCR_MODEL_ID=Qwen/Qwen2-VL-7B-Instruct      # 速度最快，精度稍低

OCR_TEMPERATURE=0.1     # 越低输出越稳定
OCR_MAX_TOKENS=2048

# 结构化解析文本模型
TEXT_MODEL_ID=Qwen/Qwen2.5-32B-Instruct
TEXT_TEMPERATURE=0.1
TEXT_MAX_TOKENS=1024
```

---

## API 接口

### `POST /api/recognize`

**请求：**
```json
{ "image": "base64字符串（不含 data:image/ 前缀）" }
```

**响应（成功）：**
```json
{
  "success": true,
  "data": {
    "id": "prop-abc123",
    "region": "瑶海区",
    "building": "万事通大厦",
    "roomNumber": "1005",
    "area": "252㎡",
    "price": "42元/㎡/天",
    "propertyFee": "3.5元/㎡/月",
    "commission": "全佣金",
    "remarks": "含家具，电梯口",
    "confidence": 0.96
  },
  "meta": { "count": 1, "ocrModel": "Qwen/Qwen3-VL-30B-A3B-Instruct" }
}
```

**响应（失败）：**
```json
{ "success": false, "error": "识别失败：无法提取结构化数据" }
```

---

## 相关文件

| 文件 | 说明 |
|------|------|
| `app/page.tsx` | 房源识别主页面 |
| `app/api/recognize/route.ts` | API 路由 |
| `lib/ocr-vision.ts` | 多模态识别逻辑 |
| `lib/data-normalizer.ts` | 字段规整 |
| `lib/config.ts` | 模型 & 应用配置 |
| `types/property.ts` | 房源 TypeScript 类型 |

---

## 性能参考

| 指标 | 数值 |
|------|------|
| 识别速度 | 2–3 秒 / 张 |
| 准确率（核心字段） | 95%+ |
| 并发 | 前端最多 5 张同时处理 |
| 成本 | ≈ 0.001 元 / 张 |

---

## 常见问题

**Q：识别结果字段为空？**  
A：图片模糊或字段本身不存在。可切换到 72B 大模型，或确保图片清晰度 ≥ 720p。

**Q：识别速度慢？**  
A：切换到 7B 小模型，或减小 `OCR_MAX_TOKENS`。

**Q：某字段格式不对？**  
A：编辑 `lib/data-normalizer.ts` 中对应字段的规整逻辑。
