import { NextRequest, NextResponse } from 'next/server';
import { editImageText } from '@/lib/image-edit';

export async function POST(request: NextRequest) {
  let id: string | undefined;

  try {
    const body = await request.json();
    id = body.id;
    const { base64, format = 'jpeg', targetLang } = body;

    if (!id || !base64 || !targetLang) {
      return NextResponse.json(
        { id, success: false, error: '缺少必要参数（id / base64 / targetLang）' },
        { status: 400 }
      );
    }

    // qwen-image-edit 一步完成：识别中文 + 翻译 + 替换图内文字，直接返回处理后图片
    const translatedBase64 = await editImageText(base64, format, targetLang);

    return NextResponse.json({
      id,
      success: true,
      translatedBase64,
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
