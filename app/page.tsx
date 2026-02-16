'use client';

import { useState } from 'react';
import { Upload, FileImage, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface RecognitionResult {
  success: boolean;
  data?: {
    id: string;
    region: string;
    building: string;
    roomNumber: string;
    area: string;
    price: string;
    propertyFee: string;
    commission: string;
    remarks: string;
    confidence: number;
    ocrText?: string;
  };
  error?: string;
}

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RecognitionResult | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    if (!file.type.match(/image\/(jpeg|jpg|png)/)) {
      alert('仅支持 JPG/PNG 格式的图片');
      return;
    }

    // 验证文件大小
    if (file.size > 10 * 1024 * 1024) {
      alert('图片大小不能超过 10MB');
      return;
    }

    setSelectedFile(file);
    setResult(null);

    // 生成预览
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRecognize = async () => {
    if (!selectedFile || !preview) return;

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/recognize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: preview,
          mode: 'direct',
        }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('识别失败:', error);
      setResult({
        success: false,
        error: '识别失败，请重试',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreview('');
    setResult(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-12">
        {/* 标题 */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-4">
            房源信息汇总工具
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-lg">
            使用 DeepSeek-OCR-2 智能识别房源表格信息
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
          {/* 左侧：上传区域 */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                上传房源图片
              </CardTitle>
              <CardDescription>
                支持 JPG、PNG 格式，单张图片不超过 10MB
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!preview ? (
                <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border-slate-300 dark:border-slate-600">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <FileImage className="w-12 h-12 mb-4 text-slate-400" />
                    <p className="mb-2 text-sm text-slate-600 dark:text-slate-400">
                      <span className="font-semibold">点击上传</span> 或拖拽图片到此处
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-500">
                      支持 JPG、PNG 格式
                    </p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/jpeg,image/jpg,image/png"
                    onChange={handleFileSelect}
                  />
                </label>
              ) : (
                <div className="space-y-4">
                  <div className="relative rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                    <img
                      src={preview}
                      alt="预览"
                      className="w-full h-auto max-h-96 object-contain bg-slate-100 dark:bg-slate-800"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleRecognize}
                      disabled={loading}
                      className="flex-1"
                      size="lg"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          识别中...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          开始识别
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={handleReset}
                      variant="outline"
                      disabled={loading}
                      size="lg"
                    >
                      重新上传
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 右侧：识别结果 */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileImage className="w-5 h-5" />
                识别结果
              </CardTitle>
              <CardDescription>
                AI 自动提取的房源信息
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!result ? (
                <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                  <FileImage className="w-16 h-16 mb-4 opacity-50" />
                  <p>上传图片后将显示识别结果</p>
                </div>
              ) : result.success ? (
                <div className="space-y-4">
                  {/* 成功提示 */}
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="font-medium">识别成功</span>
                    <span className="text-sm ml-auto">
                      置信度: {(result.data!.confidence * 100).toFixed(0)}%
                    </span>
                  </div>

                  {/* 识别信息 */}
                  <div className="space-y-3">
                    <InfoRow label="区域" value={result.data!.region} />
                    <InfoRow label="楼盘" value={result.data!.building} />
                    <InfoRow label="房号" value={result.data!.roomNumber} />
                    <InfoRow label="面积" value={result.data!.area} />
                    <InfoRow label="价格" value={result.data!.price} />
                    <InfoRow label="物业费" value={result.data!.propertyFee} />
                    <InfoRow label="佣金" value={result.data!.commission} />
                    <InfoRow label="备注" value={result.data!.remarks} />
                  </div>

                  {/* OCR原始文本（可选） */}
                  {result.data!.ocrText && (
                    <details className="mt-4">
                      <summary className="cursor-pointer text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200">
                        查看 OCR 原始文本
                      </summary>
                      <pre className="mt-2 p-3 bg-slate-100 dark:bg-slate-800 rounded text-xs overflow-x-auto">
                        {result.data!.ocrText}
                      </pre>
                    </details>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64">
                  <div className="flex items-center gap-2 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                    <XCircle className="w-5 h-5" />
                    <div>
                      <p className="font-medium">识别失败</p>
                      <p className="text-sm mt-1">{result.error}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 底部说明 */}
        <div className="mt-12 text-center text-sm text-slate-500 dark:text-slate-400">
          <p>基于 DeepSeek-OCR-2 模型 · Next.js + TypeScript + Tailwind CSS</p>
        </div>
      </div>
    </div>
  );
}

// 信息行组件
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
      <span className="text-sm font-medium text-slate-600 dark:text-slate-400 min-w-[80px]">
        {label}:
      </span>
      <span className="text-sm text-slate-900 dark:text-slate-100 flex-1">
        {value || '无'}
      </span>
    </div>
  );
}
