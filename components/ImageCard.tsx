'use client';

import { useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { X, Download, RefreshCw, Loader2, CheckCircle2, AlertCircle, ZoomIn, ChevronLeft, ChevronRight } from 'lucide-react';
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
  polling: 'border-violet-400 shadow-violet-100',
  done: 'border-green-400 shadow-green-100',
  error: 'border-red-400 shadow-red-100',
};

function getTranslatedFileName(originalName: string): string {
  const ext = originalName.split('.').pop() ?? 'jpg';
  const baseName = originalName.replace(/\.[^.]+$/, '');
  return `${baseName}_translated.${ext}`;
}

function downloadImage(image: ImageItem) {
  if (!image.translatedBase64) return;
  const link = document.createElement('a');
  link.href = `data:image/jpeg;base64,${image.translatedBase64}`;
  link.download = getTranslatedFileName(image.file.name);
  link.click();
}

// ── Lightbox ─────────────────────────────────────────────────────────────────

interface LightboxProps {
  image: ImageItem;
  onClose: () => void;
}

function Lightbox({ image, onClose }: LightboxProps) {
  const { file, previewUrl, status, translatedBase64 } = image;
  const hasBoth = status === 'done' && !!translatedBase64;

  // 0 = 原图, 1 = 翻译后（仅 done 时可切换）
  const [side, setSide] = useState<0 | 1>(hasBoth ? 1 : 0);

  const src =
    side === 1 && translatedBase64
      ? `data:image/jpeg;base64,${translatedBase64}`
      : previewUrl;

  // ESC 关闭
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[90vh] max-w-[90vw] flex-col items-center gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute -right-3 -top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-md hover:bg-white"
        >
          <X className="h-4 w-4" />
        </button>

        {/* 图片 */}
        <div className="relative max-h-[75vh] max-w-[85vw] overflow-hidden rounded-xl shadow-2xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={file.name}
            className="max-h-[75vh] max-w-[85vw] object-contain"
          />
        </div>

        {/* 底部工具栏 */}
        <div className="flex items-center gap-3 rounded-xl bg-white/90 px-4 py-2 shadow-lg backdrop-blur-sm">
          {/* 切换原图/译图 */}
          {hasBoth && (
            <div className="flex items-center rounded-lg border bg-white overflow-hidden">
              <button
                onClick={() => setSide(0)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium transition-colors',
                  side === 0 ? 'bg-gray-900 text-white' : 'hover:bg-gray-100 text-gray-600'
                )}
              >
                <ChevronLeft className="inline h-3 w-3 mr-0.5" />
                原图
              </button>
              <button
                onClick={() => setSide(1)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium transition-colors',
                  side === 1 ? 'bg-gray-900 text-white' : 'hover:bg-gray-100 text-gray-600'
                )}
              >
                译图
                <ChevronRight className="inline h-3 w-3 ml-0.5" />
              </button>
            </div>
          )}

          {/* 文件名 */}
          <span className="max-w-[200px] truncate text-xs text-gray-500" title={file.name}>
            {side === 1 ? getTranslatedFileName(file.name) : file.name}
          </span>

          {/* 下载 */}
          {status === 'done' && translatedBase64 && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 px-2 text-xs"
              onClick={() => downloadImage(image)}
            >
              <Download className="h-3 w-3" />
              下载译图
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── ImageCard ─────────────────────────────────────────────────────────────────

export default function ImageCard({ image, onRemove, onRetry }: Props) {
  const { id, file, previewUrl, status, translatedBase64, errorMessage } = image;
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const openLightbox = useCallback(() => setLightboxOpen(true), []);
  const closeLightbox = useCallback(() => setLightboxOpen(false), []);

  // 已完成时展示翻译后的图片，否则展示原图
  const displaySrc =
    status === 'done' && translatedBase64
      ? `data:image/jpeg;base64,${translatedBase64}`
      : previewUrl;

  const isLoading = status === 'processing' || status === 'polling';

  return (
    <>
      <div
        className={cn(
          'group relative overflow-hidden rounded-xl border-2 bg-white shadow-sm transition-all',
          STATUS_STYLES[status] ?? 'border-border'
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
          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/40 text-white">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="text-xs font-medium">
                {status === 'processing' ? '提交中...' : '生成中...'}
              </span>
            </div>
          )}

          {/* 放大按钮（hover 时显示，非加载状态） */}
          {!isLoading && (
            <button
              onClick={openLightbox}
              className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/20 group-hover:opacity-100"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-md">
                <ZoomIn className="h-4 w-4 text-gray-700" />
              </span>
            </button>
          )}

          {/* 删除按钮（右上角） */}
          {!isLoading && (
            <button
              onClick={() => onRemove(id)}
              className="absolute right-1.5 top-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/70"
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
                提交中
              </span>
            )}

            {status === 'polling' && (
              <span className="flex items-center gap-1 text-xs text-violet-500">
                <Loader2 className="h-3 w-3 animate-spin" />
                生成中
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

      {/* Lightbox */}
      {lightboxOpen && <Lightbox image={image} onClose={closeLightbox} />}
    </>
  );
}
