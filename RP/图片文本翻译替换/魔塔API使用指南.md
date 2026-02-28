# 魔塔（ModelScope）API 使用指南

## 一、获取 Access Token

1. 访问 https://modelscope.cn/ 注册账号
2. 头像 → 个人中心 → 访问令牌 → 创建新令牌
3. 复制 Token（格式：`ms-xxxxxxxxx`）

```bash
# .env.local
MODELSCOPE_ACCESS_TOKEN=ms-xxxxxxxxxxxxxxxxx
```

---

## 二、初始化客户端

魔塔 API 完全兼容 OpenAI SDK，只需修改 `baseURL`：

```typescript
// lib/modelscope.ts
import OpenAI from 'openai';

export const client = new OpenAI({
  apiKey: process.env.MODELSCOPE_ACCESS_TOKEN!,
  baseURL: 'https://api-inference.modelscope.cn/v1/'
});
```

---

## 三、本项目使用的模型

| 模型 | 用途 | 特点 |
| --- | --- | --- |
| `qwen-vl-plus` | 识别图片中的中文文本及位置 | 多模态，支持图片输入 |
| `qwen-turbo` | 翻译文本 | 速度快，成本低 |

**升级选项（效果更好但成本更高）：**
- 识别：`qwen-vl-max`
- 翻译：`qwen-plus`

---

## 四、图片识别调用（qwen-vl-plus）

```typescript
const res = await client.chat.completions.create({
  model: 'qwen-vl-plus',
  messages: [{
    role: 'user',
    content: [
      {
        type: 'image_url',
        image_url: { url: `data:image/jpeg;base64,${imageBase64}` }
      },
      {
        type: 'text',
        text: '识别图片中所有中文文本，返回JSON数组：[{"text":"...","x":0,"y":0,"width":0,"height":0,"fontSize":0,"color":"#000","bgColor":"#fff"}]，没有中文返回[]'
      }
    ]
  }],
  temperature: 0.1,
  max_tokens: 2048
});
```

---

## 五、翻译调用（qwen-turbo）

```typescript
const res = await client.chat.completions.create({
  model: 'qwen-turbo',
  messages: [
    { role: 'system', content: '将中文翻译成英语，保持简洁。' },
    { role: 'user', content: '逐行翻译，只返回译文：\n你好\n立即购买' }
  ],
  temperature: 0.1,
  max_tokens: 1024
});
// 返回：Hello\nBuy Now
```

---

## 六、成本参考

| 模型 | 单张图片约消耗 | 约成本 |
| --- | --- | --- |
| qwen-vl-plus（识别） | 1000-2000 tokens | 0.003-0.006元 |
| qwen-turbo（翻译） | 200-500 tokens | 0.0001元 |
| **合计** | | **约0.003-0.007元/张** |

---

## 七、常见问题

**Q：识别位置不准确？**
A：在 Prompt 中强调「精确返回像素坐标」，或升级到 `qwen-vl-max`。

**Q：API 调用失败？**
A：检查 Token 是否正确，查看控制台错误码（401=Token无效，429=频率超限）。

**Q：可以换 OpenAI？**
A：只需修改 `baseURL` 和 `apiKey`，模型改为 `gpt-4o`（识别）和 `gpt-4o-mini`（翻译）。

---

## 八、相关链接

- 官网：https://modelscope.cn/
- API文档：https://help.aliyun.com/zh/model-studio/
- qwen-vl文档：https://help.aliyun.com/zh/model-studio/user-guide/vision
