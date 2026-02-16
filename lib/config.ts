/**
 * 应用配置文件
 * 统一管理所有配置项
 */

export const config = {
  // 魔塔API配置
  modelScope: {
    apiKey: process.env.MODELSCOPE_ACCESS_TOKEN || '',
    baseURL: 'https://api-inference.modelscope.cn/v1/',
  },

  // OCR识别模型配置（多模态模型）
  ocrModel: {
    modelId: process.env.OCR_MODEL_ID || 'Qwen/Qwen2-VL-7B-Instruct', // DeepSeek-OCR-2 可能不支持，使用 Qwen 作为默认
    temperature: parseFloat(process.env.OCR_TEMPERATURE || '0.1'),
    maxTokens: parseInt(process.env.OCR_MAX_TOKENS || '2048', 10),
  },

  // 文字解析模型配置
  textModel: {
    modelId: process.env.TEXT_MODEL_ID || 'Qwen/Qwen2.5-32B-Instruct',
    temperature: parseFloat(process.env.TEXT_TEMPERATURE || '0.1'),
    maxTokens: parseInt(process.env.TEXT_MAX_TOKENS || '1024', 10),
  },

  // 百度OCR配置（备选方案）
  baiduOCR: {
    apiKey: process.env.BAIDU_API_KEY || '',
    secretKey: process.env.BAIDU_SECRET_KEY || '',
  },

  // 应用配置
  app: {
    // 单次最多上传图片数量
    maxUploadFiles: 20,
    // 单个图片最大大小（字节）
    maxFileSize: 10 * 1024 * 1024, // 10MB
    // 允许的图片格式
    allowedFormats: ['image/jpeg', 'image/png', 'image/jpg'] as const,
    // 并发识别数量
    concurrentRecognitions: 5,
  },
} as const;

// 验证必需的环境变量
export function validateConfig(): void {
  const errors: string[] = [];

  if (!config.modelScope.apiKey) {
    errors.push('缺少 MODELSCOPE_ACCESS_TOKEN 环境变量');
  }

  if (errors.length > 0) {
    console.error('配置错误:', errors);
    throw new Error(`配置错误：\n${errors.join('\n')}`);
  }
}

// 导出类型
export type Config = typeof config;

// 默认导出
export default config;
