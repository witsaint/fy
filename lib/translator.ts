import { modelscopeClient } from './modelscope';

const LANG_MAP: Record<string, string> = {
  en: '英语',
  ja: '日语',
  ko: '韩语',
  es: '西班牙语',
  fr: '法语',
  de: '德语',
  ru: '俄语',
  th: '泰语',
  vi: '越南语',
  id: '印度尼西亚语',
};

export async function translateTexts(texts: string[], targetLang: string): Promise<string[]> {
  if (texts.length === 0) return [];

  const langName = LANG_MAP[targetLang] ?? '英语';

  const res = await modelscopeClient.chat.completions.create({
    model: 'qwen-turbo',
    messages: [
      {
        role: 'system',
        content: `你是专业翻译助手，将中文翻译成${langName}。翻译要简洁准确，适合在图片中展示。`,
      },
      {
        role: 'user',
        content: `请将以下每行中文翻译成${langName}，逐行对应，只返回译文，不要编号和解释：\n${texts.join('\n')}`,
      },
    ],
    temperature: 0.1,
    max_tokens: 1024,
  });

  const lines = (res.choices[0]?.message?.content ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  // 确保返回数量与输入一致，缺失时回退到原文
  return texts.map((original, i) => lines[i] ?? original);
}
