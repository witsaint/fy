# 魔塔（ModelScope）API 使用指南

## 一、什么是魔塔API

魔塔（ModelScope）是阿里云推出的AI模型服务平台，提供OpenAI兼容的API接口。

### 核心优势
- ✅ **OpenAI兼容**：完全兼容OpenAI API规范，代码无需改动
- ✅ **中文优化**：qwen系列模型对中文理解能力强
- ✅ **国内服务**：无需代理，访问速度快，稳定可靠
- ✅ **免费额度**：新用户有免费调用额度
- ✅ **价格优惠**：比OpenAI便宜，性价比高

---

## 二、获取Access Token

### 步骤1：注册账号
1. 访问：https://modelscope.cn/
2. 点击右上角「登录/注册」
3. 支持手机号、邮箱、GitHub账号注册

### 步骤2：获取Token
1. 登录后，点击右上角头像
2. 进入「个人中心」
3. 左侧菜单选择「访问令牌」
4. 点击「创建新令牌」
5. 填写令牌名称（如：房源识别工具）
6. 复制生成的Token（格式：ms-xxxxxxxxx）

### 步骤3：配置到项目
```bash
# .env.local
MODELSCOPE_ACCESS_TOKEN=your_modelscope_token_here
```

---

## 三、代码集成

### 安装依赖
```bash
npm install openai
```

### 基础配置
```typescript
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.MODELSCOPE_ACCESS_TOKEN,
  baseURL: 'https://api-inference.modelscope.cn/v1/'
});
```

### 调用示例
```typescript
async function callModelScope() {
  const completion = await client.chat.completions.create({
    model: 'qwen-turbo', // 推荐模型
    messages: [
      { role: 'system', content: '你是一个有帮助的助手。' },
      { role: 'user', content: '你好，请介绍一下自己。' }
    ],
    temperature: 0.7,
    max_tokens: 1000
  });
  
  const response = completion.choices[0]?.message?.content;
  console.log(response);
}
```

---

## 四、可用模型

### qwen系列（推荐）

| 模型名称 | 特点 | 速度 | 成本 | 适用场景 |
|---------|------|------|------|----------|
| qwen-turbo | 速度快，成本低 | ⭐⭐⭐⭐⭐ | ⭐ | 生产环境推荐 |
| qwen-plus | 平衡性能和成本 | ⭐⭐⭐⭐ | ⭐⭐ | 需要更高精度 |
| qwen-max | 最高精度 | ⭐⭐⭐ | ⭐⭐⭐ | 复杂任务 |
| qwen-vl-plus | 多模态（图+文） | ⭐⭐⭐ | ⭐⭐⭐ | 图片理解 |

### 其他模型
- `llama3-8b-instruct`: Meta开源模型
- `deepseek-chat`: DeepSeek模型
- `yi-large`: 零一万物大模型

---

## 五、本项目中的使用

### 在房源识别中的应用

```typescript
// lib/ai-parser.ts
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.MODELSCOPE_ACCESS_TOKEN,
  baseURL: 'https://api-inference.modelscope.cn/v1/'
});

export async function parseProperty(ocrText: string) {
  const prompt = `你是房源信息提取助手。请从以下OCR识别的文本中，精准提取8个字段：

1. 区域：房源所属行政区域（瑶海区、经开区、蜀山区、庐阳区、包河区、新站区）
2. 楼盘：楼盘名称全称
3. 房号：房间编号（保留原格式）
4. 面积：面积+单位（如252㎡）
5. 价格：租金价格+单位（如42元/㎡/天）
6. 物业费：物业费+单位（如3.5元/㎡/月）
7. 佣金：佣金政策
8. 备注：关键补充信息

OCR识别结果：
${ocrText}

请以JSON格式返回（仅返回JSON，不要其他内容）：
{
  "region": "",
  "building": "",
  "roomNumber": "",
  "area": "",
  "price": "",
  "propertyFee": "",
  "commission": "",
  "remarks": ""
}`;

  const completion = await client.chat.completions.create({
    model: 'qwen-turbo',
    messages: [
      { role: 'system', content: '你是一个专业的房源信息提取助手，擅长从文本中提取结构化数据。' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.1, // 降低随机性，提高准确性
    max_tokens: 1024
  });
  
  const responseText = completion.choices[0]?.message?.content || '';
  
  // 提取JSON
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('AI解析失败');
  }
  
  return JSON.parse(jsonMatch[0]);
}
```

### 参数说明

#### temperature（温度）
- **范围**：0.0 - 2.0
- **作用**：控制输出的随机性
- **推荐值**：
  - `0.1`: 结构化数据提取（本项目使用）
  - `0.7`: 日常对话
  - `1.5`: 创意写作

#### max_tokens（最大token数）
- **作用**：限制输出长度
- **推荐值**：
  - `1024`: 本项目使用（JSON输出）
  - `2048`: 长文本生成
  - `4096`: 最大输出

#### model（模型选择）
- **qwen-turbo**: 推荐，速度快，成本低
- **qwen-plus**: 需要更高精度时使用
- **qwen-max**: 复杂表格识别场景

---

## 六、成本估算

### 定价（参考）
| 模型 | 输入价格 | 输出价格 |
|------|---------|---------|
| qwen-turbo | 0.3元/百万tokens | 0.6元/百万tokens |
| qwen-plus | 0.8元/百万tokens | 2元/百万tokens |
| qwen-max | 4元/百万tokens | 12元/百万tokens |

### 本项目成本估算
- **单次识别token消耗**：约500-800 tokens（输入+输出）
- **使用qwen-turbo**：
  - 单次成本：约0.0004元（不到1分钱）
  - 识别1000张图片：约0.4元
  - 月成本（日均50张）：约0.6元/月

### 免费额度
- 新用户注册送免费额度
- 具体额度请查看官网：https://modelscope.cn/

---

## 七、常见问题

### Q1：魔塔API和OpenAI API有什么区别？
**A**：
- **接口兼容**：完全兼容OpenAI API规范
- **模型不同**：魔塔使用qwen系列，OpenAI使用GPT系列
- **中文能力**：魔塔对中文理解更好
- **访问方式**：魔塔国内直连，OpenAI需要代理
- **价格**：魔塔更便宜

### Q2：如何切换到OpenAI？
**A**：只需修改配置：
```typescript
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: 'https://api.openai.com/v1/' // 改回OpenAI
});

// 模型改为GPT系列
model: 'gpt-4o-mini'
```

### Q3：如何查看我的API调用量？
**A**：
1. 登录魔塔官网
2. 进入「个人中心」
3. 查看「使用统计」

### Q4：API调用失败怎么办？
**A**：
- 检查Token是否正确
- 检查网络连接
- 查看控制台错误信息
- 确认API额度是否用尽

### Q5：可以使用其他AI模型吗？
**A**：可以，魔塔支持多种模型：
```typescript
model: 'qwen-turbo'      // 推荐
model: 'qwen-plus'       // 更高精度
model: 'qwen-max'        // 最高精度
model: 'llama3-8b-instruct'  // 开源模型
```

### Q6：如何提高识别准确率？
**A**：
1. 优化Prompt提示词
2. 调低temperature（如0.1）
3. 使用更高精度模型（qwen-plus/qwen-max）
4. 增加示例（few-shot learning）

---

## 八、优化建议

### 1. Prompt优化
```typescript
// 好的Prompt示例
const prompt = `你是房源信息提取助手。

任务：从OCR文本中提取8个字段
格式要求：
1. 区域必须是6个标准区域之一
2. 面积无单位时补充㎡
3. 无值字段标注"无"

OCR文本：
${ocrText}

输出JSON格式（仅JSON，无其他内容）：
{ ... }`;
```

### 2. 错误处理
```typescript
try {
  const result = await parseProperty(ocrText);
  return result;
} catch (error) {
  console.error('AI解析失败:', error);
  // 降级方案：返回默认值或重试
  return {
    region: '识别失败',
    building: '识别失败',
    // ...
  };
}
```

### 3. 缓存优化
```typescript
// 对相同OCR文本结果进行缓存（可选）
const cache = new Map<string, RawProperty>();

export async function parsePropertyWithCache(ocrText: string) {
  const cacheKey = hashCode(ocrText);
  
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }
  
  const result = await parseProperty(ocrText);
  cache.set(cacheKey, result);
  
  return result;
}
```

---

## 九、相关链接

- **官方网站**：https://modelscope.cn/
- **文档中心**：https://modelscope.cn/docs/
- **API文档**：https://help.aliyun.com/zh/model-studio/
- **模型广场**：https://modelscope.cn/models
- **定价说明**：https://modelscope.cn/pricing

---

## 十、技术支持

### 遇到问题时
1. 查看官方文档
2. 查看控制台错误信息
3. 访问魔塔社区提问
4. 联系技术支持

### 反馈渠道
- 官方社区：https://modelscope.cn/community
- GitHub：https://github.com/modelscope/modelscope

---

**总结**：魔塔API是OpenAI的优秀替代方案，特别适合中文场景。在本项目中，我们使用魔塔API进行房源信息的结构化提取，效果优秀，成本低廉。
