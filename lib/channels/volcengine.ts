import type { TextPair } from '@/lib/ocr-translate';
import { sign, getDateTimeNow, getBodySha } from '@/lib/sign';

const ACCESS_KEY = process.env.VOLCENGINE_ACCESS_KEY ?? '';
const SECRET_KEY = process.env.VOLCENGINE_SECRET_KEY ?? '';
const ENDPOINT = 'https://visual.volcengineapi.com';
const SERVICE = 'cv';
const REGION = 'cn-north-1';
const VERSION = '2022-08-31';
const REQ_KEY = 'seededit_v3.0'; // SeedEdit 3.0
const REQ_KEY_4 = 'jimeng_t2i_v40'; // 即梦图生图 v4.0
const REQ_KEY_3 = 'jimeng_i2i_v30'; // 即梦图生图 v3.0

export type TaskStatus = 'in_queue' | 'generating' | 'done' | 'not_found' | 'expired';

export interface SubmitTaskResult {
  taskId: string;
}

export interface QueryTaskResult {
  status: TaskStatus;
  base64?: string;
  imageUrl?: string;
}

// ──────────────────────────────────────────
// 内部：构造签名请求并发送
// ──────────────────────────────────────────

async function callApi(action: string, bodyObj: Record<string, unknown>): Promise<Response> {
  if (!ACCESS_KEY || !SECRET_KEY) {
    throw new Error('缺少火山引擎鉴权配置 VOLCENGINE_ACCESS_KEY / VOLCENGINE_SECRET_KEY');
  }

  const bodyStr = JSON.stringify(bodyObj);
  const bodyBytes = Buffer.from(bodyStr, 'utf8');
  const bodyHash = getBodySha(bodyBytes);
  const datetime = getDateTimeNow();
  const host = 'visual.volcengineapi.com';
  const contentType = 'application/json';

  const query: Record<string, string> = { Action: action, Version: VERSION };

  const headers: Record<string, string> = {
    'Content-Type': contentType,
    Host: host,
    'X-Date': datetime,
    'X-Content-Sha256': bodyHash,
  };

  const authorization = sign({
    method: 'POST',
    pathName: '/',
    query,
    headers,
    region: REGION,
    serviceName: SERVICE,
    accessKeyId: ACCESS_KEY,
    secretAccessKey: SECRET_KEY,
    bodySha: bodyHash,
    needSignHeaderKeys: ['host', 'x-date', 'x-content-sha256', 'content-type'],
  });

  const queryStr = Object.keys(query)
    .sort()
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(query[k])}`)
    .join('&');

  return fetch(`${ENDPOINT}/?${queryStr}`, {
    method: 'POST',
    headers: { ...headers, Authorization: authorization },
    body: bodyBytes,
  });
}

// ──────────────────────────────────────────
// SeedEdit 3.0 图生图
// ──────────────────────────────────────────

const LANG_NAMES: Record<string, string> = {
  en: 'English（英语）',
  ja: '日本語（日语）',
  ko: '한국어（韩语）',
  fr: 'French（法语）',
  de: 'German（德语）',
  es: 'Spanish（西班牙语）',
  pt: 'Portuguese（葡萄牙语）',
  ru: 'Russian（俄语）',
  ar: 'Arabic（阿拉伯语）',
  th: 'Thai（泰语）',
  vi: 'Vietnamese（越南语）',
  id: 'Indonesian（印尼语）',
};

/**
 * 构造翻译指令 prompt：将识别到的原文替换为译文。
 *
 * 设计要点：
 * - 明确声明目标语言，让模型以正确语言渲染译文
 * - 逐条列出每个替换项，让模型精确定位原文位置
 * - 多次强调"仅替换文字"、"禁止在其他区域添加文字或图案"
 * - 不修改背景、颜色、图形、非替换文字等所有其他元素
 */
function buildPrompt(pairs: TextPair[], targetLang: string): string {
  const langLabel = LANG_NAMES[targetLang] ?? targetLang;

  const replacements = pairs
    .map((p, i) => `${i + 1}. 将图片中文字"${p.original}"原位替换为${langLabel}译文"${p.translated}"`)
    .join('\n');

  const prompt = [
    `【文字替换任务】目标语言：${langLabel}。严格按照以下规则仅做文字替换，禁止对图片做任何其他修改：`,
    '',
    replacements,
    '',
    '【强制约束，必须全部遵守】',
    `- 所有替换文字必须使用${langLabel}，不得使用其他语言`,
    '- 只替换上述指定文字，*不得修改图片中任何其他文字，但是对应文本得替换*',
    '- 禁止在图片任何位置新增、添加或生成额外文字、图案、水印、标注',
    '- 替换后的文字须保持与原文字相同的*位置、字体大小、颜色、对齐方式和排版风格*',
    '- 译文须完整显示，不得截断或变形，若译文较长可适当调整字号以适应原文区域',
    '- 图片背景、商品图像、装饰元素、品牌Logo、价格数字等所有非替换内容保持原样不变',
    '- 如某处原文与多个替换项相似，以编号顺序为准，精确匹配后再替换',
  ].join('\n');

  console.log('[buildPrompt]', prompt);
  return prompt;
}

/**
 * 提交图生图任务，返回 task_id（异步模式）。
 */
export async function volcengineSubmitTask(
  base64: string,
  pairs: TextPair[],
  targetLang: string
): Promise<SubmitTaskResult> {
  const prompt = buildPrompt(pairs, targetLang);

  const res = await callApi('CVSync2AsyncSubmitTask', {
    req_key: REQ_KEY_4,
    binary_data_base64: [base64],
    prompt,
    seed: -1,
    scale: 0.5,
    return_url: false,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`火山引擎请求失败 (${res.status}): ${errText}`);
  }

  const data = (await res.json()) as {
    code?: number;
    message?: string;
    request_id?: string;
    data?: { task_id?: string };
  };

  if (data.code !== 10000) {
    throw new Error(`火山引擎错误 ${data.code}: ${data.message}`);
  }

  const taskId = data.data?.task_id;
  if (!taskId) {
    throw new Error('火山引擎未返回 task_id');
  }

  return { taskId };
}

/**
 * 查询异步任务状态和结果。
 */
export async function volcengineQueryTask(taskId: string): Promise<QueryTaskResult> {
  const res = await callApi('CVSync2AsyncGetResult', {
    req_key: REQ_KEY,
    task_id: taskId,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`火山引擎查询失败 (${res.status}): ${errText}`);
  }

  const data = (await res.json()) as {
    code?: number;
    message?: string;
    data?: {
      status?: TaskStatus;
      binary_data_base64?: string[];
      image_urls?: string[];
    };
  };

  if (data.code !== 10000) {
    throw new Error(`火山引擎查询错误 ${data.code}: ${data.message}`);
  }

  const status = data.data?.status ?? 'not_found';

  if (status !== 'done') {
    return { status };
  }

  const base64 = data.data?.binary_data_base64?.[0];
  if (base64) {
    return { status, base64 };
  }

  const imageUrl = data.data?.image_urls?.[0];
  if (imageUrl) {
    return { status, imageUrl };
  }

  return { status };
}
