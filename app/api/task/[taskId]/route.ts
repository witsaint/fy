import { NextRequest, NextResponse } from 'next/server';
import type { ChannelKey } from '@/types/translate';
import { dispatchQueryTask } from '@/lib/channels';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;
    const channel = (request.nextUrl.searchParams.get('channel') ?? 'volcengine') as ChannelKey;

    if (!taskId) {
      return NextResponse.json({ success: false, error: '缺少 taskId' }, { status: 400 });
    }

    const result = await dispatchQueryTask(channel, taskId);

    // 如果任务完成但只有 imageUrl，下载并转为 base64 返回
    if (result.status === 'done' && !result.base64 && result.imageUrl) {
      const imgRes = await fetch(result.imageUrl);
      if (!imgRes.ok) {
        throw new Error(`下载结果图片失败 (${imgRes.status})`);
      }
      const buf = await imgRes.arrayBuffer();
      const base64 = Buffer.from(buf).toString('base64');
      return NextResponse.json({ success: true, status: result.status, base64 });
    }

    return NextResponse.json({
      success: true,
      status: result.status,
      base64: result.base64,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '查询失败';
    console.error('[/api/task]', err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
