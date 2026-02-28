import config from '@/lib/config';

const DASHSCOPE_API_URL =
  'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation';

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
 * 调用 qwen-image-edit（DashScope 图片编辑端点）。
 * 传入原图 base64 + 翻译指令，直接返回替换了中文文字的图片 base64。
 */
export async function editImageText(
  base64: string,
  format: string,
  targetLang: string
): Promise<string> {
  const apiKey = config.modelScope.apiKey;
  if (!apiKey) {
    throw new Error('缺少环境变量 MODELSCOPE_ACCESS_TOKEN');
  }

  const langName = LANG_NAMES[targetLang] ?? targetLang;
  const prompt = `请将图片中所有中文文字翻译成${langName}，并将原位置的中文替换为对应的${langName}翻译，保持原有字体大小、颜色和排版风格不变，其他内容不做任何改动。`;

  const requestBody = {
    model: 'qwen-image-edit',
    input: {
      messages: [
        {
          role: 'user',
          content: [
            { image: `data:image/${format};base64,${base64}` },
            { text: prompt },
          ],
        },
      ],
    },
    parameters: {
      n: 1,
      watermark: false,
      prompt_extend: false,
    },
  };

  const response = await fetch(DASHSCOPE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`qwen-image-edit 请求失败 (${response.status}): ${errText}`);
  }

  const data = (await response.json()) as {
    output?: {
      choices?: Array<{
        message?: {
          content?: Array<{ image?: string }>;
        };
      }>;
    };
    code?: string;
    message?: string;
  };

  if (data.code) {
    throw new Error(`qwen-image-edit 错误 ${data.code}: ${data.message}`);
  }

  const imageUrl = data.output?.choices?.[0]?.message?.content?.[0]?.image;
  if (!imageUrl) {
    throw new Error('qwen-image-edit 未返回图片');
  }

  // 模型返回图片 URL，下载后转为 base64
  const imgResponse = await fetch(imageUrl);
  if (!imgResponse.ok) {
    throw new Error(`下载结果图片失败 (${imgResponse.status})`);
  }
  const arrayBuffer = await imgResponse.arrayBuffer();
  return Buffer.from(arrayBuffer).toString('base64');
}
