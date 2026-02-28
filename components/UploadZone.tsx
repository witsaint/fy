'use client';

import { useCallback } from 'react';
import { useDropzone, type FileRejection } from 'react-dropzone';
import { Upload } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const MAX_SIZE_MB = 10;
const MAX_COUNT = 20;
const ACCEPT_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
};

interface Props {
  onFilesAdded: (files: File[]) => void;
  currentCount: number;
  disabled?: boolean;
}

export default function UploadZone({ onFilesAdded, currentCount, disabled }: Props) {
  const remaining = MAX_COUNT - currentCount;

  const onDrop = useCallback(
    (accepted: File[], rejected: FileRejection[]) => {
      // 处理被拒绝的文件
      rejected.forEach(({ file, errors }) => {
        if (errors[0]?.code === 'file-too-large') {
          toast.error(`${file.name} 超过 ${MAX_SIZE_MB}MB 限制，已跳过`);
        } else if (errors[0]?.code === 'file-invalid-type') {
          toast.error(`${file.name} 格式不支持，仅支持 JPG / PNG / WebP`);
        }
      });

      if (accepted.length === 0) return;

      // 超出数量限制时截断
      const toAdd = accepted.slice(0, remaining);
      if (accepted.length > remaining) {
        toast.warning(`最多上传 ${MAX_COUNT} 张，已忽略超出部分`);
      }

      if (toAdd.length > 0) onFilesAdded(toAdd);
    },
    [remaining, onFilesAdded]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPT_TYPES,
    maxSize: MAX_SIZE_MB * 1024 * 1024,
    disabled: disabled || remaining <= 0,
    multiple: true,
  });

  const isDisabled = disabled || remaining <= 0;

  return (
    <div
      {...getRootProps()}
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 text-center transition-colors',
        isDragActive
          ? 'border-primary bg-primary/5'
          : 'border-border bg-white hover:border-primary/50',
        isDisabled && 'cursor-not-allowed opacity-50'
      )}
    >
      <input {...getInputProps()} />
      <div className={cn(
        'flex h-14 w-14 items-center justify-center rounded-full transition-colors',
        isDragActive ? 'bg-primary/10' : 'bg-muted'
      )}>
        <Upload className={cn('h-6 w-6', isDragActive ? 'text-primary' : 'text-muted-foreground')} />
      </div>
      <div>
        <p className="font-medium text-foreground">
          {isDragActive ? '松开鼠标上传' : '拖拽图片到这里，或点击上传'}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          支持 JPG / PNG / WebP，单张 ≤ {MAX_SIZE_MB}MB，最多 {MAX_COUNT} 张
          {currentCount > 0 && (
            <span className="ml-1 text-primary">
              （已上传 {currentCount} 张，还可上传 {remaining} 张）
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
