'use client';

import Image from 'next/image';
import { X, Download, RefreshCw, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ImageItem } from '@/types/translate';

interface Props {
  image: ImageItem;
  onRemove: (id: string) => void;
  onRetry: (id: string) => void;
}

const STATUS_STYLES: Record<string, string> = {
  idle: 'border-border',
  processing: 'border-blue-400 shadow-blue-100',
  done: 'border-green-400 shadow-green-100',
  error: 'border-red-400 shadow-red-100',
};

function downloadImage(image: ImageItem) {
  if (!image.translatedBase64) return;
  const ext = image.file.name.split('.').pop() ?? 'jpg';
  const baseName = image.file.name.replace(/\.[^.]+$/, '');
  const link = document.createElement('a');
  link.href = `data:image/jpeg;base64,${image.translatedBase64}`;
  link.download = `${baseName}_translated.${ext}`;
  link.click();
}

export default function ImageCard({ image, onRemove, onRetry }: Props) {
  const { id, file, previewUrl, status, translatedBase64, errorMessage } = image;

  // 已完成时展示翻译后的图片，否则展示原图
  const displaySrc =
    status === 'done' && translatedBase64
      ? `data:image/jpeg;base64,${translatedBase64}`
      : previewUrl;

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border-2 bg-white shadow-sm transition-all',
        STATUS_STYLES[status]
      )}
    >
      {/* 图片预览 */}
      <div className="relative aspect-square w-full overflow-hidden bg-muted">
        <Image
          src={displaySrc}
          alt={file.name}
          fill
          className="object-cover"
          unoptimized
        />

        {/* 处理中遮罩 */}
        {status === 'processing' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/40 text-white">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="text-xs font-medium">处理中...</span>
          </div>
        )}

        {/* 删除按钮（右上角） */}
        {status !== 'processing' && (
          <button
            onClick={() => onRemove(id)}
            className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/70"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* 底部信息栏 */}
      <div className="px-2.5 py-2">
        {/* 文件名 */}
        <p className="truncate text-xs text-muted-foreground" title={file.name}>
          {file.name}
        </p>

        {/* 状态行 */}
        <div className="mt-1.5 flex items-center justify-between gap-1">
          {status === 'idle' && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-gray-300" />
              待处理
            </span>
          )}

          {status === 'processing' && (
            <span className="flex items-center gap-1 text-xs text-blue-500">
              <Loader2 className="h-3 w-3 animate-spin" />
              处理中
            </span>
          )}

          {status === 'done' && (
            <>
              <span className="flex items-center gap-1 text-xs text-green-600">
                <CheckCircle2 className="h-3 w-3" />
                已完成
              </span>
              <Button
                size="sm"
                variant="outline"
                className="h-6 gap-1 px-2 text-xs"
                onClick={() => downloadImage(image)}
              >
                <Download className="h-3 w-3" />
                下载
              </Button>
            </>
          )}

          {status === 'error' && (
            <>
              <span
                className="flex items-center gap-1 text-xs text-red-500"
                title={errorMessage}
              >
                <AlertCircle className="h-3 w-3 shrink-0" />
                <span className="truncate max-w-[80px]">{errorMessage ?? '失败'}</span>
              </span>
              <Button
                size="sm"
                variant="outline"
                className="h-6 gap-1 px-2 text-xs"
                onClick={() => onRetry(id)}
              >
                <RefreshCw className="h-3 w-3" />
                重试
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
