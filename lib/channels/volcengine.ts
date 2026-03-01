import type { TextPair } from '@/lib/ocr-translate';
import { sign, getDateTimeNow, getBodySha } from '@/lib/sign';

const ACCESS_KEY = process.env.VOLCENGINE_ACCESS_KEY ?? '';
const SECRET_KEY = process.env.VOLCENGINE_SECRET_KEY ?? '';
const ENDPOINT = 'https://visual.volcengineapi.com';
const SERVICE = 'cv';
const REGION = 'cn-north-1';
const VERSION = '2022-08-31';
const REQ_KEY = 'seededit_v3.0'; // SeedEdit 3.0

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

/**
 * 构造翻译指令 prompt：将识别到的原文替换为译文
 */
function buildPrompt(pairs: TextPair[]): string {
  const replacements = pairs
    .map((p) => `将"${p.original}"替换为"${p.translated}"`)
    .join('，');
  return `${replacements}，其他内容保持不变，保持原有排版和风格`;
}

/**
 * 提交图生图任务，返回 task_id（异步模式）。
 */
export async function volcengineSubmitTask(
  base64: string,
  pairs: TextPair[]
): Promise<SubmitTaskResult> {
  const prompt = buildPrompt(pairs);

  const res = await callApi('CVSync2AsyncSubmitTask', {
    req_key: REQ_KEY,
    binary_data_base64: [base64],
    prompt,
    seed: -1,
    scale: 0.7,
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
