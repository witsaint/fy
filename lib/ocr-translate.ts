import OpenAI from 'openai';
import { config } from './config';

// 多模态 VL 模型必须走 DashScope 兼容端点
const visionClient = new OpenAI({
  apiKey: config.modelScope.apiKey,
  baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
});

// 纯文本模型走魔塔推理端点
const textClient = new OpenAI({
  apiKey: config.modelScope.apiKey,
  baseURL: config.modelScope.baseURL,
});

export interface TextPair {
  original: string;
  translated: string;
}

const LANG_NAMES: Record<string, string> = {
  en: 'English',
  ja: '日本語',
  ko: '한국어',
  fr: 'French',
  de: 'German',
  es: 'Spanish',
  pt: 'Portuguese',
  ru: 'Russian',
  ar: 'Arabic',
  th: 'Thai',
  vi: 'Vietnamese',
  id: 'Indonesian',
};

/**
 * Step 1：识别图片中的非商品文字（广告文案、标题、描述等）。
 * 排除：商品名称（品牌名/型号）、价格数字、品牌 Logo 字样。
 */
async function ocrAdText(base64: string, format: string): Promise<string[]> {
  let imageUrl = `data:image/${format};base64,${base64}`;
  if (!imageUrl.startsWith('data:')) {
    imageUrl = `data:image/jpeg;base64,${base64}`;
  }

  console.log('[Step1 OCR 开始]', { model: config.ocrModel.modelId });

  try {
    const completion = await visionClient.chat.completions.create({
      model: config.ocrModel.modelId,
      messages: [
        {
          role: 'system',
          content: '你是一个专业的广告图片文字识别助手，擅长从广告图片中识别文案文字。',
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `请识别图片中的广告文案文字，包括：标题、口号、描述、促销信息、活动文案等。
不要包含：商品名称（品牌名/型号）、价格数字、纯英文/数字内容。
仅返回JSON字符串数组，不要任何其他内容，如果没有则返回 []：
["文字1","文字2","文字3"]`,
            },
            {
              type: 'image_url',
              image_url: { url: imageUrl, detail: 'high' },
            },
          ],
        },
      ],
      temperature: config.ocrModel.temperature,
      max_tokens: config.ocrModel.maxTokens,
    });

    const content = completion.choices[0]?.message?.content ?? '[]';
    console.log('[Step1 OCR 完成]', { preview: content.substring(0, 100) });

    const match = content.match(/\[[\s\S]*?\]/);
    if (!match) return [];

    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((s): s is string => typeof s === 'string' && s.trim().length > 0);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[Step1 OCR 失败]', { model: config.ocrModel.modelId, error: msg });
    throw new Error(`OCR识别失败: ${msg}`);
  }
}

/**
 * Step 2：将识别到的文字批量翻译为目标语言。
 */
async function translateTexts(texts: string[], targetLang: string): Promise<TextPair[]> {
  if (texts.length === 0) return [];

  const langName = LANG_NAMES[targetLang] ?? targetLang;
  const numbered = texts.map((t, i) => `${i + 1}. ${t}`).join('\n');

  console.log('[Step2 翻译 开始]', { model: config.textModel.modelId, count: texts.length, lang: langName });

  try {
    const completion = await textClient.chat.completions.create({
      model: config.textModel.modelId,
      messages: [
        {
          role: 'system',
          content: '你是一个专业的广告文案翻译助手，擅长将中文广告文案准确翻译为目标语言，保持原有语气和风格。',
        },
        {
          role: 'user',
          content: `请将以下中文文本翻译成${langName}，保持编号顺序，仅返回JSON数组，不要任何其他内容：
[{"original":"原文","translated":"译文"}]

待翻译：
${numbered}`,
        },
      ],
      temperature: config.textModel.temperature,
      max_tokens: config.textModel.maxTokens,
    });

    const content = completion.choices[0]?.message?.content ?? '[]';
    console.log('[Step2 翻译 完成]', { preview: content.substring(0, 100) });

    const match = content.match(/\[[\s\S]*\]/);
    if (!match) return texts.map((t) => ({ original: t, translated: t }));

    const parsed = JSON.parse(match[0]) as TextPair[];
    return parsed.filter(
      (item) => typeof item.original === 'string' && typeof item.translated === 'string'
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[Step2 翻译 失败]', { model: config.textModel.modelId, error: msg });
    throw new Error(`翻译失败: ${msg}`);
  }
}

/**
 * 对外导出：识别 + 翻译，返回原文/译文对。
 */
export async function ocrAndTranslate(
  base64: string,
  format: string,
  targetLang: string
): Promise<TextPair[]> {
  const texts = await ocrAdText(base64, format);
  if (texts.length === 0) return [];
  return translateTexts(texts, targetLang);
}
