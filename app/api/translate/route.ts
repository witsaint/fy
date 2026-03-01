import { NextRequest, NextResponse } from 'next/server';
import type { ChannelKey } from '@/types/translate';
import { ocrAndTranslate } from '@/lib/ocr-translate';
import { dispatchSubmitTask } from '@/lib/channels';

export async function POST(request: NextRequest) {
  let id: string | undefined;

  try {
    const body = await request.json();
    id = body.id;
    const {
      base64,
      format = 'jpeg',
      targetLang,
      channel = 'volcengine',
    } = body as {
      id: string;
      base64: string;
      format?: string;
      targetLang: string;
      channel?: ChannelKey;
    };

    if (!id || !base64 || !targetLang) {
      return NextResponse.json(
        { id, success: false, error: '缺少必要参数（id / base64 / targetLang）' },
        { status: 400 }
      );
    }

    // Step 1 + 2：识别非商品文字 → 翻译
    const pairs = await ocrAndTranslate(base64, format, targetLang);

    if (pairs.length === 0) {
      return NextResponse.json({ id, success: false, error: '未识别到广告文案文字' });
    }

    // Step 3：提交异步图生图任务，返回 taskId
    const taskId = await dispatchSubmitTask(channel, base64, pairs, targetLang);

    return NextResponse.json({
      id,
      success: true,
      taskId,
      channel,
      texts: pairs,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '处理失败';
    console.error('[/api/translate]', err);
    return NextResponse.json(
      { id, success: false, error: message },
      { status: 500 }
    );
  }
}
