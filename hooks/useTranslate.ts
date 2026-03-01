'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type { ImageItem, ChannelKey, TaskPollStatus } from '@/types/translate';

const POLL_INTERVAL_MS = 3000; // 每 3 秒轮询一次
const POLL_MAX_MS = 10 * 60 * 1000; // 最多轮询 10 分钟

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
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

  // 记录每个正在轮询 item 的起始时间，用于超时判断
  const pollStartRef = useRef<Map<string, number>>(new Map());

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
    pollStartRef.current.clear();
  }, []);

  // 提交任务：OCR + 翻译 + 提交图生图，拿到 taskId 后切换为 polling 状态
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

        const data = (await res.json()) as {
          success: boolean;
          taskId?: string;
          texts?: { original: string; translated: string }[];
          error?: string;
        };

        if (data.success && data.taskId) {
          pollStartRef.current.set(image.id, Date.now());
          updateImage(image.id, {
            status: 'polling',
            taskId: data.taskId,
            channel,
            texts: data.texts,
          });
        } else {
          updateImage(image.id, {
            status: 'error',
            errorMessage: data.error ?? '提交任务失败',
          });
        }
      } catch {
        updateImage(image.id, { status: 'error', errorMessage: '网络错误，请重试' });
      }
    },
    [targetLang, channel, updateImage]
  );

  // 批量处理：最多 3 张并发
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

  // ── 定时轮询 ──────────────────────────────────────
  useEffect(() => {
    const pollingImages = images.filter((i) => i.status === 'polling' && i.taskId);
    if (pollingImages.length === 0) return;

    const timer = setInterval(async () => {
      const snapshot = pollingImages;

      await Promise.all(
        snapshot.map(async (img) => {
          const startedAt = pollStartRef.current.get(img.id) ?? 0;
          if (Date.now() - startedAt > POLL_MAX_MS) {
            pollStartRef.current.delete(img.id);
            updateImage(img.id, {
              status: 'error',
              errorMessage: '任务超时，请重试',
            });
            return;
          }

          try {
            const res = await fetch(
              `/api/task/${img.taskId}?channel=${img.channel ?? 'volcengine'}`
            );
            const data = (await res.json()) as {
              success: boolean;
              status?: TaskPollStatus;
              base64?: string;
              error?: string;
            };

            if (!data.success) {
              pollStartRef.current.delete(img.id);
              updateImage(img.id, {
                status: 'error',
                errorMessage: data.error ?? '查询任务失败',
              });
              return;
            }

            const taskStatus = data.status;

            if (taskStatus === 'done') {
              pollStartRef.current.delete(img.id);
              if (data.base64) {
                updateImage(img.id, {
                  status: 'done',
                  translatedBase64: data.base64,
                });
              } else {
                updateImage(img.id, {
                  status: 'error',
                  errorMessage: '任务完成但未返回图片',
                });
              }
            } else if (taskStatus === 'not_found' || taskStatus === 'expired') {
              pollStartRef.current.delete(img.id);
              updateImage(img.id, {
                status: 'error',
                errorMessage: taskStatus === 'expired' ? '任务已过期，请重试' : '任务未找到，请重试',
              });
            }
            // in_queue / generating：继续轮询，不做任何处理
          } catch {
            // 网络抖动，下次继续
          }
        })
      );
    }, POLL_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [images, updateImage]);
  // ────────────────────────────────────────────────

  const doneImages = images.filter((i) => i.status === 'done');
  const hasPending = images.some((i) => i.status === 'idle' || i.status === 'error');
  const isPolling = images.some((i) => i.status === 'polling');

  return {
    images,
    targetLang,
    channel,
    isProcessing,
    isPolling,
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
