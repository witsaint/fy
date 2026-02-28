import type { ChannelKey } from '@/types/translate';
import type { TextPair } from '@/lib/ocr-translate';
import { volcengineEditImage } from './volcengine';

/**
 * 根据渠道 key 分发到对应的图生图实现。
 * 返回处理后图片的 base64 字符串。
 */
export async function dispatchChannel(
  channel: ChannelKey,
  base64: string,
  pairs: TextPair[]
): Promise<string> {
  switch (channel) {
    case 'volcengine':
      return volcengineEditImage(base64, pairs);
    default:
      throw new Error(`未知渠道：${channel}`);
  }
}
