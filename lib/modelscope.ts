import OpenAI from 'openai';

if (!process.env.MODELSCOPE_ACCESS_TOKEN) {
  throw new Error('缺少环境变量 MODELSCOPE_ACCESS_TOKEN，请在 .env.local 中配置');
}

// 文本模型（qwen-turbo 等）使用魔塔推理端点
export const modelscopeClient = new OpenAI({
  apiKey: process.env.MODELSCOPE_ACCESS_TOKEN,
  baseURL: 'https://api-inference.modelscope.cn/v1/',
});

// 多模态视觉模型（qwen-vl-plus 等）必须走 DashScope 兼容端点
// 魔塔 Token 与 DashScope Token 相同，直接复用
export const dashscopeClient = new OpenAI({
  apiKey: process.env.MODELSCOPE_ACCESS_TOKEN,
  baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
});
