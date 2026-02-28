'use client';

import { useState, useCallback } from 'react';
import type { ImageItem, ChannelKey } from '@/types/translate';

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // 去掉 "data:image/xxx;base64," 前缀
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function useTranslate() {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [targetLang, setTargetLang] = useState('en');
  const [channel, setChannel] = useState<ChannelKey>('volcengine');
  const [isProcessing, setIsProcessing] = useState(false);

  const updateImage = useCallback((id: string, updates: Partial<ImageItem>) => {
    setImages((prev) =>
      prev.map((img) => (img.id === id ? { ...img, ...updates } : img))
    );
  }, []);

  const addImages = useCallback((files: File[]) => {
    const newItems: ImageItem[] = files.map((file) => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
      status: 'idle',
    }));
    setImages((prev) => [...prev, ...newItems]);
  }, []);

  const removeImage = useCallback((id: string) => {
    setImages((prev) => {
      const img = prev.find((i) => i.id === id);
      if (img) URL.revokeObjectURL(img.previewUrl);
      return prev.filter((i) => i.id !== id);
    });
  }, []);

  const clearAll = useCallback(() => {
    setImages((prev) => {
      prev.forEach((i) => URL.revokeObjectURL(i.previewUrl));
      return [];
    });
  }, []);

  const processOne = useCallback(
    async (image: ImageItem) => {
      updateImage(image.id, { status: 'processing', errorMessage: undefined });
      try {
        const base64 = await fileToBase64(image.file);
        const format = image.file.type.split('/')[1] ?? 'jpeg';

        const res = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: image.id, base64, format, targetLang, channel }),
        });

        const data = await res.json();

        if (data.success) {
          updateImage(image.id, {
            status: 'done',
            translatedBase64: data.translatedBase64,
            texts: data.texts,
          });
        } else {
          updateImage(image.id, {
            status: 'error',
            errorMessage: data.error ?? '处理失败',
          });
        }
      } catch {
        updateImage(image.id, { status: 'error', errorMessage: '网络错误，请重试' });
      }
    },
    [targetLang, channel, updateImage]
  );

  // 批量处理：前端逐张调用 /api/translate，最多 3 张并发
  const startTranslate = useCallback(async () => {
    const pending = images.filter(
      (img) => img.status === 'idle' || img.status === 'error'
    );
    if (pending.length === 0) return;

    setIsProcessing(true);
    const CONCURRENCY = 3;
    for (let i = 0; i < pending.length; i += CONCURRENCY) {
      await Promise.all(pending.slice(i, i + CONCURRENCY).map(processOne));
    }
    setIsProcessing(false);
  }, [images, processOne]);

  // 重试单张失败的图片
  const retryOne = useCallback(
    (id: string) => {
      const img = images.find((i) => i.id === id);
      if (img) processOne(img);
    },
    [images, processOne]
  );

  const doneImages = images.filter((i) => i.status === 'done');
  const hasPending = images.some((i) => i.status === 'idle' || i.status === 'error');

  return {
    images,
    targetLang,
    channel,
    isProcessing,
    doneImages,
    hasPending,
    setTargetLang,
    setChannel,
    addImages,
    removeImage,
    clearAll,
    startTranslate,
    retryOne,
  };
}
