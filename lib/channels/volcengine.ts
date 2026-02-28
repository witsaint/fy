import crypto from 'crypto';
import type { TextPair } from '@/lib/ocr-translate';

const ACCESS_KEY = process.env.VOLCENGINE_ACCESS_KEY ?? '';
const SECRET_KEY = process.env.VOLCENGINE_SECRET_KEY ?? '';
const ENDPOINT = 'https://visual.volcengineapi.com';
const SERVICE = 'cv';
const REGION = 'cn-north-1';
const ACTION = 'CVProcess';
const VERSION = '2022-08-31';
const REQ_KEY = 'img2img_edit_v3'; // SeedEdit 3.0

// ──────────────────────────────────────────
// 签名工具函数（HMAC-SHA256，火山引擎规范）
// ──────────────────────────────────────────

function hmac(key: Buffer | string, data: string): Buffer {
  return crypto.createHmac('sha256', key).update(data, 'utf8').digest();
}

function sha256Hex(data: string | Buffer): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function getDateTimeNow(): string {
  return new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
}

function buildSignature(
  method: string,
  path: string,
  query: Record<string, string>,
  headers: Record<string, string>,
  bodyHash: string,
  datetime: string
): string {
  const date = datetime.substring(0, 8);

  // 规范化查询字符串（key 排序）
  const canonicalQuery = Object.keys(query)
    .sort()
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(query[k])}`)
    .join('&');

  // 参与签名的 headers：host + x-date + x-content-sha256
  const signHeaderKeys = ['host', 'x-content-sha256', 'x-date'];
  const canonicalHeaders = signHeaderKeys
    .map((k) => `${k}:${headers[k] ?? ''}\n`)
    .join('');
  const signedHeaders = signHeaderKeys.join(';');

  const canonicalRequest = [
    method.toUpperCase(),
    path,
    canonicalQuery,
    canonicalHeaders,
    signedHeaders,
    bodyHash,
  ].join('\n');

  const credentialScope = `${date}/${REGION}/${SERVICE}/request`;
  const stringToSign = ['HMAC-SHA256', datetime, credentialScope, sha256Hex(canonicalRequest)].join('\n');

  const kDate = hmac(SECRET_KEY, date);
  const kRegion = hmac(kDate, REGION);
  const kService = hmac(kRegion, SERVICE);
  const kSigning = hmac(kService, 'request');
  const signature = hmac(kSigning, stringToSign).toString('hex');

  return `HMAC-SHA256 Credential=${ACCESS_KEY}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
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
 * 调用火山引擎 SeedEdit 3.0 进行图生图。
 * 传入原图 base64、翻译文本对，返回处理后图片的 base64。
 */
export async function volcengineEditImage(
  base64: string,
  pairs: TextPair[]
): Promise<string> {
  if (!ACCESS_KEY || !SECRET_KEY) {
    throw new Error('缺少火山引擎鉴权配置 VOLCENGINE_ACCESS_KEY / VOLCENGINE_SECRET_KEY');
  }

  const prompt = buildPrompt(pairs);

  const bodyObj = {
    req_key: REQ_KEY,
    image_base64: base64,
    prompt,
    seed: -1,
    scale: 0.7,
    return_url: false,
  };

  const bodyStr = JSON.stringify(bodyObj);
  const bodyHash = sha256Hex(bodyStr);
  const datetime = getDateTimeNow();
  const host = 'visual.volcengineapi.com';

  const query: Record<string, string> = {
    Action: ACTION,
    Version: VERSION,
  };

  const headers: Record<string, string> = {
    host,
    'x-date': datetime,
    'x-content-sha256': bodyHash,
    'content-type': 'application/json',
  };

  const authorization = buildSignature('POST', '/', query, headers, bodyHash, datetime);

  const queryStr = Object.keys(query)
    .sort()
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(query[k])}`)
    .join('&');

  const url = `${ENDPOINT}/?${queryStr}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      ...headers,
      Authorization: authorization,
    },
    body: bodyStr,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`火山引擎请求失败 (${res.status}): ${errText}`);
  }

  const data = (await res.json()) as {
    code?: number;
    message?: string;
    data?: {
      algorithm_base_resp?: { status_code?: number; status_message?: string };
      binary_data_base64?: string[];
      image_urls?: string[];
    };
  };

  if (data.code !== 10000) {
    throw new Error(`火山引擎错误 ${data.code}: ${data.message}`);
  }

  // 优先使用 binary_data_base64（直接 base64，无需二次下载）
  const b64 = data.data?.binary_data_base64?.[0];
  if (b64) return b64;

  // 降级：下载 image_url
  const imgUrl = data.data?.image_urls?.[0];
  if (imgUrl) {
    const imgRes = await fetch(imgUrl);
    if (!imgRes.ok) throw new Error(`下载结果图片失败 (${imgRes.status})`);
    const buf = await imgRes.arrayBuffer();
    return Buffer.from(buf).toString('base64');
  }

  throw new Error('火山引擎未返回图片数据');
}
