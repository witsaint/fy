import { dashscopeClient } from './modelscope';

export interface OcrItem {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  color: string;
  bgColor: string;
}

export async function recognizeText(base64: string, format = 'jpeg'): Promise<OcrItem[]> {
  const mime =
    format === 'png' ? 'image/png' :
    format === 'webp' ? 'image/webp' :
    'image/jpeg';

  const res = await dashscopeClient.chat.completions.create({
    model: 'qwen-vl-plus',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: `data:${mime};base64,${base64}` },
          },
          {
            type: 'text',
            text: `请识别图片中所有的中文文本，返回每段文字的内容和位置信息。
坐标以图片左上角为原点，单位为像素。
仅返回JSON数组，不要任何其他内容：
[{"text":"文字内容","x":左上角x,"y":左上角y,"width":宽度,"height":高度,"fontSize":字号,"color":"#文字颜色","bgColor":"#背景颜色"}]
如果图片中没有中文文字，返回空数组 []`,
          },
        ],
      },
    ],
    temperature: 0.1,
    max_tokens: 2048,
  });

  const content = res.choices[0]?.message?.content ?? '[]';
  const match = content.match(/\[[\s\S]*\]/);
  if (!match) return [];

  try {
    const parsed = JSON.parse(match[0]) as OcrItem[];
    return parsed.filter(
      (item) =>
        typeof item.text === 'string' &&
        item.text.trim().length > 0 &&
        typeof item.x === 'number' &&
        typeof item.y === 'number'
    );
  } catch {
    return [];
  }
}
