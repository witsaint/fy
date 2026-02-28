'use client';

import { useState } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Download, Trash2, Play, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

import { useTranslate } from '@/hooks/useTranslate';
import UploadZone from '@/components/UploadZone';
import ImageCard from '@/components/ImageCard';
import LanguageSelector from '@/components/LanguageSelector';
import { Button } from '@/components/ui/button';

export default function TranslatePage() {
  const {
    images,
    targetLang,
    isProcessing,
    doneImages,
    hasPending,
    setTargetLang,
    addImages,
    removeImage,
    clearAll,
    startTranslate,
    retryOne,
  } = useTranslate();

  const [isZipping, setIsZipping] = useState(false);

  async function handleBatchDownload() {
    if (doneImages.length === 0) return;
    setIsZipping(true);
    try {
      const zip = new JSZip();
      doneImages.forEach((img) => {
        if (!img.translatedBase64) return;
        const ext = img.file.name.split('.').pop() ?? 'jpg';
        const baseName = img.file.name.replace(/\.[^.]+$/, '');
        zip.file(`${baseName}_translated.${ext}`, img.translatedBase64, { base64: true });
      });
      const blob = await zip.generateAsync({ type: 'blob' });
      const ts = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
      saveAs(blob, `translated_${ts}.zip`);
      toast.success(`已打包 ${doneImages.length} 张图片`);
    } catch {
      toast.error('打包失败，请重试');
    } finally {
      setIsZipping(false);
    }
  }

  const processingCount = images.filter((i) => i.status === 'processing').length;
  const doneCount = doneImages.length;
  const errorCount = images.filter((i) => i.status === 'error').length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 页头 */}
      <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-lg font-semibold text-foreground">图片文本翻译替换</h1>
            <p className="text-xs text-muted-foreground">
              上传图片，AI 自动识别中文并替换为目标语言
            </p>
          </div>
          {/* 统计信息 */}
          {images.length > 0 && (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span>共 {images.length} 张</span>
              {processingCount > 0 && (
                <span className="text-blue-500">处理中 {processingCount}</span>
              )}
              {doneCount > 0 && (
                <span className="text-green-600">已完成 {doneCount}</span>
              )}
              {errorCount > 0 && (
                <span className="text-red-500">失败 {errorCount}</span>
              )}
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-5 px-4 py-6">
        {/* 语言选择 */}
        <LanguageSelector
          value={targetLang}
          onChange={setTargetLang}
          disabled={isProcessing}
        />

        {/* 上传区域 */}
        <UploadZone
          onFilesAdded={addImages}
          currentCount={images.length}
          disabled={isProcessing}
        />

        {/* 图片列表 */}
        {images.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {images.map((img) => (
              <ImageCard
                key={img.id}
                image={img}
                onRemove={removeImage}
                onRetry={retryOne}
              />
            ))}
          </div>
        )}

        {/* 空状态 */}
        {images.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground">
            <ImageIcon className="h-12 w-12 opacity-30" />
            <p className="text-sm">上传图片后开始翻译</p>
          </div>
        )}

        {/* 操作栏 */}
        {images.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-white px-4 py-3 shadow-sm">
            <Button
              onClick={startTranslate}
              disabled={!hasPending || isProcessing}
              className="gap-2"
            >
              <Play className="h-4 w-4" />
              {isProcessing ? `处理中（${processingCount} 张）...` : '开始翻译'}
            </Button>

            <Button
              variant="outline"
              onClick={handleBatchDownload}
              disabled={doneCount === 0 || isZipping}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              {isZipping ? '打包中...' : `批量下载（${doneCount} 张）`}
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                clearAll();
                toast.success('已清空所有图片');
              }}
              disabled={isProcessing}
              className="gap-2 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              清空
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
