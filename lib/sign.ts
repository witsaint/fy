/*
Copyright (year) Beijing Volcano Engine Technology Ltd.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import crypto from 'crypto';
import { debuglog } from 'util';

const debug = debuglog('signer');

/**
 * 不参与加签过程的 header key
 */
const HEADER_KEYS_TO_IGNORE = new Set([
  'authorization',
  'content-type',
  'content-length',
  'user-agent',
  'presigned-expires',
  'expect',
]);

export interface SignParams {
  headers?: Record<string, string>;
  query?: Record<string, string | string[] | undefined | null>;
  region?: string;
  serviceName?: string;
  method?: string;
  pathName?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  needSignHeaderKeys?: string[];
  bodySha?: string;
}

export function sign(params: SignParams): string {
  const {
    headers = {},
    query = {},
    region = '',
    serviceName = '',
    method = '',
    pathName = '/',
    accessKeyId = '',
    secretAccessKey = '',
    needSignHeaderKeys = [],
    bodySha,
  } = params;

  const datetime = headers['X-Date'];
  const date = datetime.substring(0, 8); // YYYYMMDD

  const [signedHeaders, canonicalHeaders] = getSignHeaders(headers, needSignHeaderKeys);
  const canonicalRequest = [
    method.toUpperCase(),
    pathName,
    queryParamsToString(query) || '',
    `${canonicalHeaders}\n`,
    signedHeaders,
    bodySha || hashHex(''),
  ].join('\n');

  const credentialScope = [date, region, serviceName, 'request'].join('/');
  const stringToSign = ['HMAC-SHA256', datetime, credentialScope, hashHex(canonicalRequest)].join('\n');

  const kDate = hmac(secretAccessKey, date);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, serviceName);
  const kSigning = hmac(kService, 'request');
  const signature = hmac(kSigning, stringToSign).toString('hex');

  debug('--------CanonicalString:\n%s\n--------SignString:\n%s', canonicalRequest, stringToSign);

  return [
    'HMAC-SHA256',
    `Credential=${accessKeyId}/${credentialScope},`,
    `SignedHeaders=${signedHeaders},`,
    `Signature=${signature}`,
  ].join(' ');
}

function hmac(secret: Buffer | string, s: string): Buffer {
  return crypto.createHmac('sha256', secret).update(s, 'utf8').digest();
}

function hashHex(s: string): string {
  return crypto.createHash('sha256').update(s, 'utf8').digest('hex');
}

function queryParamsToString(params: Record<string, string | string[] | undefined | null>): string {
  return Object.keys(params)
    .sort()
    .map((key) => {
      const val = params[key];
      if (typeof val === 'undefined' || val === null) return undefined;
      const escapedKey = uriEscape(key);
      if (!escapedKey) return undefined;
      if (Array.isArray(val)) {
        return `${escapedKey}=${val.map(uriEscape).sort().join(`&${escapedKey}=`)}`;
      }
      return `${escapedKey}=${uriEscape(val)}`;
    })
    .filter((v): v is string => v !== undefined)
    .join('&');
}

function getSignHeaders(
  originHeaders: Record<string, string>,
  needSignHeaders: string[]
): [string, string] {
  function trimHeaderValue(header: string): string {
    return header.toString().trim().replace(/\s+/g, ' ');
  }

  let h = Object.keys(originHeaders);
  if (Array.isArray(needSignHeaders) && needSignHeaders.length > 0) {
    const needSignSet = new Set([...needSignHeaders, 'x-date', 'host'].map((k) => k.toLowerCase()));
    h = h.filter((k) => needSignSet.has(k.toLowerCase()));
  }
  h = h.filter((k) => !HEADER_KEYS_TO_IGNORE.has(k.toLowerCase()));

  const signedHeaderKeys = h
    .slice()
    .map((k) => k.toLowerCase())
    .sort()
    .join(';');

  const canonicalHeaders = h
    .sort((a, b) => (a.toLowerCase() < b.toLowerCase() ? -1 : 1))
    .map((k) => `${k.toLowerCase()}:${trimHeaderValue(originHeaders[k])}`)
    .join('\n');

  return [signedHeaderKeys, canonicalHeaders];
}

function uriEscape(str: string): string {
  try {
    return encodeURIComponent(str)
      .replace(/[^A-Za-z0-9_.~\-%]+/g, encodeURIComponent)
      .replace(/[*]/g, (ch) => `%${ch.charCodeAt(0).toString(16).toUpperCase()}`);
  } catch {
    return '';
  }
}

export function getDateTimeNow(): string {
  return new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
}

export function getBodySha(body: string | Buffer | URLSearchParams): string {
  const h = crypto.createHash('sha256');
  if (typeof body === 'string') {
    h.update(body);
  } else if (body instanceof URLSearchParams) {
    h.update(body.toString());
  } else if (Buffer.isBuffer(body)) {
    h.update(body);
  }
  return h.digest('hex');
}
