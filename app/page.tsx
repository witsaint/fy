'use client';

import { useState, useMemo } from 'react';
import { Upload, FileImage, Loader2, CheckCircle2, XCircle, Trash2, Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface PropertyData {
  id: string;
  region: string;
  building: string;
  roomNumber: string;
  area: string;
  price: string;
  propertyFee: string;
  commission: string;
  rented: string; // 新增：已出租字段
  remarks: string;
  confidence: number;
  ocrText?: string;
}

interface RecognitionResult {
  success: boolean;
  data?: PropertyData | PropertyData[]; // 支持单个或多个房源
  error?: string;
  meta?: {
    count?: number;
    ocrModel?: string;
  };
}

interface ImageTask {
  id: string;
  file: File;
  preview: string;
  status: 'pending' | 'loading' | 'success' | 'error';
  result?: RecognitionResult;
}

type SortField = 'area' | 'price' | 'propertyFee' | null;
type SortDirection = 'asc' | 'desc';

export default function Home() {
  const [imageTasks, setImageTasks] = useState<ImageTask[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]); // 区域筛选

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newTasks: ImageTask[] = [];

    files.forEach((file) => {
      // 验证文件类型
      if (!file.type.match(/image\/(jpeg|jpg|png)/)) {
        alert(`${file.name}: 仅支持 JPG/PNG 格式的图片`);
        return;
      }

      // 验证文件大小
      if (file.size > 10 * 1024 * 1024) {
        alert(`${file.name}: 图片大小不能超过 10MB`);
        return;
      }

      // 生成预览
      const reader = new FileReader();
      reader.onload = (e) => {
        const preview = e.target?.result as string;
        const task: ImageTask = {
          id: `${Date.now()}-${Math.random()}`,
          file,
          preview,
          status: 'pending',
        };
        setImageTasks((prev) => [...prev, task]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRecognize = async (taskId: string) => {
    const task = imageTasks.find((t) => t.id === taskId);
    if (!task) return;

    // 更新状态为 loading
    setImageTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: 'loading' as const } : t))
    );

    try {
      const response = await fetch('/api/recognize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: task.preview,
        }),
      });

      const data = await response.json();

      // 更新结果
      setImageTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? {
                ...t,
                status: data.success ? ('success' as const) : ('error' as const),
                result: data,
              }
            : t
        )
      );
    } catch (error) {
      console.error('识别失败:', error);
      setImageTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? {
                ...t,
                status: 'error' as const,
                result: {
                  success: false,
                  error: '识别失败，请重试',
                },
              }
            : t
        )
      );
    }
  };

  const handleRecognizeAll = async () => {
    const pendingTasks = imageTasks.filter((t) => t.status === 'pending');
    for (const task of pendingTasks) {
      await handleRecognize(task.id);
    }
  };

  const handleRemoveTask = (taskId: string) => {
    setImageTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  const handleReset = () => {
    setImageTasks([]);
  };

  // 获取所有成功的识别结果（展平多个房源）
  const successResults = imageTasks
    .filter((t) => t.status === 'success' && t.result?.success)
    .flatMap((t) => {
      const data = t.result!.data!;
      return Array.isArray(data) ? data : [data];
    });

  // 获取所有唯一的区域
  const allRegions = useMemo(() => {
    const regions = new Set(successResults.map((r) => r.region).filter(Boolean));
    return Array.from(regions).sort();
  }, [successResults]);

  // 切换区域筛选
  const toggleRegion = (region: string) => {
    setSelectedRegions((prev) =>
      prev.includes(region) ? prev.filter((r) => r !== region) : [...prev, region]
    );
  };

  // 提取数字的辅助函数
  const extractNumber = (value: string): number => {
    const match = value.match(/[\d.]+/);
    return match ? parseFloat(match[0]) : 0;
  };

  // 搜索和排序后的结果
  const filteredAndSortedResults = useMemo(() => {
    let results = [...successResults];

    // 区域筛选
    if (selectedRegions.length > 0) {
      results = results.filter((item) => selectedRegions.includes(item.region));
    }

    // 搜索过滤
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      results = results.filter(
        (item) =>
          item.region.toLowerCase().includes(query) ||
          item.building.toLowerCase().includes(query) ||
          item.area.toLowerCase().includes(query) ||
          item.roomNumber.toLowerCase().includes(query)
      );
    }

    // 排序
    if (sortField) {
      results.sort((a, b) => {
        let aVal = 0;
        let bVal = 0;

        if (sortField === 'area') {
          aVal = extractNumber(a.area);
          bVal = extractNumber(b.area);
        } else if (sortField === 'price') {
          aVal = extractNumber(a.price);
          bVal = extractNumber(b.price);
        } else if (sortField === 'propertyFee') {
          aVal = extractNumber(a.propertyFee);
          bVal = extractNumber(b.propertyFee);
        }

        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      });
    }

    return results;
  }, [successResults, selectedRegions, searchQuery, sortField, sortDirection]);

  // 排序处理函数
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // 切换排序方向
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // 设置新的排序字段
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // 排序图标组件
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 ml-1 inline opacity-50" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-4 h-4 ml-1 inline text-blue-500" />
    ) : (
      <ArrowDown className="w-4 h-4 ml-1 inline text-blue-500" />
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-12">
        {/* 标题 */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-4">
            房源信息汇总工具
          </h1>
        </div>

        {/* 上传区域 */}
        <Card className="shadow-lg mb-8 max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              批量上传房源图片
            </CardTitle>
            <CardDescription>
              支持 JPG、PNG 格式，单张图片不超过 10MB，可同时上传多张图片
            </CardDescription>
          </CardHeader>
          <CardContent>
            <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-lg cursor-pointer bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border-slate-300 dark:border-slate-600">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <FileImage className="w-12 h-12 mb-4 text-slate-400" />
                <p className="mb-2 text-sm text-slate-600 dark:text-slate-400">
                  <span className="font-semibold">点击上传</span> 或拖拽图片到此处
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-500">
                  支持 JPG、PNG 格式，可多选
                </p>
              </div>
              <input
                type="file"
                className="hidden"
                accept="image/jpeg,image/jpg,image/png"
                multiple
                onChange={handleFileSelect}
              />
            </label>

            {imageTasks.length > 0 && (
              <div className="mt-4 flex gap-2">
                <Button
                  onClick={handleRecognizeAll}
                  disabled={imageTasks.every((t) => t.status !== 'pending')}
                  className="flex-1"
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  批量识别全部
                </Button>
                <Button onClick={handleReset} variant="outline">
                  <Trash2 className="mr-2 h-4 w-4" />
                  清空全部
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 识别结果列表 */}
        {imageTasks.length > 0 && (
          <div className="space-y-6 max-w-7xl mx-auto mb-12">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              识别结果 ({imageTasks.length})
            </h2>
            {imageTasks.map((task) => (
              <Card key={task.id} className="shadow-lg">
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* 左侧：原图 */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                          原始图片
                        </h3>
                        <Button
                          onClick={() => handleRemoveTask(task.id)}
                          variant="ghost"
                          size="sm"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="relative rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 max-h-96">
                        <img
                          src={task.preview}
                          alt="预览"
                          className="w-full h-auto max-h-96 object-contain bg-slate-100 dark:bg-slate-800"
                        />
                      </div>
                      <p className="text-sm text-slate-500">{task.file.name}</p>
                    </div>

                    {/* 右侧：识别信息 */}
                    <div className="space-y-4">
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                        识别信息
                      </h3>

                      {task.status === 'pending' && (
                        <div className="flex flex-col items-center justify-center h-64">
                          <FileImage className="w-16 h-16 mb-4 text-slate-400 opacity-50" />
                          <p className="text-slate-500 mb-4">等待识别</p>
                          <Button onClick={() => handleRecognize(task.id)}>
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            开始识别
                          </Button>
                        </div>
                      )}

                      {task.status === 'loading' && (
                        <div className="flex flex-col items-center justify-center h-64">
                          <Loader2 className="w-16 h-16 mb-4 text-blue-500 animate-spin" />
                          <p className="text-slate-600 dark:text-slate-400">识别中...</p>
                        </div>
                      )}

                      {task.status === 'success' && task.result?.success && (() => {
                        const data = task.result.data!;
                        const properties = Array.isArray(data) ? data : [data];
                        const isMultiple = properties.length > 1;

                        return (
                          <div className="space-y-4">
                            {/* 成功提示 */}
                            <div className="flex items-center gap-2 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                              <CheckCircle2 className="w-5 h-5" />
                              <span className="font-medium">识别成功</span>
                              <span className="text-sm ml-auto">
                                {isMultiple ? `识别到 ${properties.length} 个房源` : `置信度: ${(properties[0].confidence * 100).toFixed(0)}%`}
                              </span>
                            </div>

                            {/* 识别信息 */}
                            {isMultiple ? (
                              // 多个房源：表格展示，限制高度并支持滚动
                              <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                                <div className="overflow-auto max-h-96">
                                  <table className="w-full text-xs">
                                    <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0">
                                      <tr className="border-b border-slate-200 dark:border-slate-700">
                                        <th className="text-left p-2 font-semibold text-slate-700 dark:text-slate-300">区域</th>
                                        <th className="text-left p-2 font-semibold text-slate-700 dark:text-slate-300">楼盘</th>
                                        <th className="text-left p-2 font-semibold text-slate-700 dark:text-slate-300">房号</th>
                                        <th className="text-left p-2 font-semibold text-slate-700 dark:text-slate-300">面积</th>
                                        <th className="text-left p-2 font-semibold text-slate-700 dark:text-slate-300">价格</th>
                                        <th className="text-left p-2 font-semibold text-slate-700 dark:text-slate-300">物业费</th>
                                        <th className="text-left p-2 font-semibold text-slate-700 dark:text-slate-300">佣金</th>
                                        <th className="text-left p-2 font-semibold text-slate-700 dark:text-slate-300">已出租</th>
                                        <th className="text-left p-2 font-semibold text-slate-700 dark:text-slate-300">备注</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {properties.map((prop, index) => (
                                        <tr
                                          key={index}
                                          className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                        >
                                          <td className="p-2 text-slate-900 dark:text-slate-100">{prop.region || '-'}</td>
                                          <td className="p-2 text-slate-900 dark:text-slate-100">{prop.building || '-'}</td>
                                          <td className="p-2 text-slate-900 dark:text-slate-100">{prop.roomNumber || '-'}</td>
                                          <td className="p-2 text-slate-900 dark:text-slate-100">{prop.area || '-'}</td>
                                          <td className="p-2 text-slate-900 dark:text-slate-100">{prop.price || '-'}</td>
                                          <td className="p-2 text-slate-900 dark:text-slate-100">{prop.propertyFee || '-'}</td>
                                          <td className="p-2 text-slate-900 dark:text-slate-100">{prop.commission || '-'}</td>
                                          <td className="p-2 text-slate-900 dark:text-slate-100">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                                              prop.rented === '是' 
                                                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' 
                                                : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                            }`}>
                                              {prop.rented || '-'}
                                            </span>
                                          </td>
                                          <td className="p-2 text-slate-900 dark:text-slate-100">{prop.remarks || '-'}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            ) : (
                              // 单个房源：列表展示
                              <div className="space-y-3">
                                <InfoRow label="区域" value={properties[0].region} />
                                <InfoRow label="楼盘" value={properties[0].building} />
                                <InfoRow label="房号" value={properties[0].roomNumber} />
                                <InfoRow label="面积" value={properties[0].area} />
                                <InfoRow label="价格" value={properties[0].price} />
                                <InfoRow label="物业费" value={properties[0].propertyFee} />
                                <InfoRow label="佣金" value={properties[0].commission} />
                                <InfoRow label="已出租" value={properties[0].rented} />
                                <InfoRow label="备注" value={properties[0].remarks} />
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {task.status === 'error' && (
                        <div className="flex flex-col items-center justify-center h-64">
                          <div className="flex items-center gap-2 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                            <XCircle className="w-5 h-5" />
                            <div>
                              <p className="font-medium">识别失败</p>
                              <p className="text-sm mt-1">{task.result?.error}</p>
                            </div>
                          </div>
                          <Button
                            onClick={() => handleRecognize(task.id)}
                            variant="outline"
                            className="mt-4"
                          >
                            重试
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* 汇总表格 */}
        {successResults.length > 0 && (
          <Card className="shadow-lg max-w-7xl mx-auto">
            <CardHeader>
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>数据汇总表</CardTitle>
                    <CardDescription>
                      共识别成功 {successResults.length} 条房源信息
                      {(searchQuery || selectedRegions.length > 0) && ` · 筛选后 ${filteredAndSortedResults.length} 条`}
                    </CardDescription>
                  </div>
                  {/* 搜索框 */}
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      type="text"
                      placeholder="搜索区域、楼盘、面积..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* 区域筛选器 */}
                {allRegions.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300 self-center">
                      区域筛选：
                    </span>
                    {allRegions.map((region) => (
                      <button
                        key={region}
                        onClick={() => toggleRegion(region)}
                        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                          selectedRegions.includes(region)
                            ? 'bg-blue-500 text-white hover:bg-blue-600'
                            : 'bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
                        }`}
                      >
                        {region}
                      </button>
                    ))}
                    {selectedRegions.length > 0 && (
                      <button
                        onClick={() => setSelectedRegions([])}
                        className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
                      >
                        清除筛选
                      </button>
                    )}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {/* 固定高度的表格容器 */}
              <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                <div className="overflow-auto max-h-96">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0 z-10">
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        <th className="text-left p-3 font-semibold text-slate-700 dark:text-slate-300">
                          区域
                        </th>
                        <th className="text-left p-3 font-semibold text-slate-700 dark:text-slate-300">
                          楼盘
                        </th>
                        <th className="text-left p-3 font-semibold text-slate-700 dark:text-slate-300">
                          房号
                        </th>
                        <th 
                          className="text-left p-3 font-semibold text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 select-none"
                          onClick={() => handleSort('area')}
                        >
                          面积
                          <SortIcon field="area" />
                        </th>
                        <th 
                          className="text-left p-3 font-semibold text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 select-none"
                          onClick={() => handleSort('price')}
                        >
                          价格
                          <SortIcon field="price" />
                        </th>
                        <th 
                          className="text-left p-3 font-semibold text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 select-none"
                          onClick={() => handleSort('propertyFee')}
                        >
                          物业费
                          <SortIcon field="propertyFee" />
                        </th>
                        <th className="text-left p-3 font-semibold text-slate-700 dark:text-slate-300">
                          佣金
                        </th>
                        <th className="text-left p-3 font-semibold text-slate-700 dark:text-slate-300">
                          已出租
                        </th>
                        <th className="text-left p-3 font-semibold text-slate-700 dark:text-slate-300">
                          备注
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAndSortedResults.length > 0 ? (
                        filteredAndSortedResults.map((data, index) => (
                          <tr
                            key={data.id || index}
                            className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                          >
                            <td className="p-3 text-slate-900 dark:text-slate-100">
                              {data.region || '-'}
                            </td>
                            <td className="p-3 text-slate-900 dark:text-slate-100">
                              {data.building || '-'}
                            </td>
                            <td className="p-3 text-slate-900 dark:text-slate-100">
                              {data.roomNumber || '-'}
                            </td>
                            <td className="p-3 text-slate-900 dark:text-slate-100">
                              {data.area || '-'}
                            </td>
                            <td className="p-3 text-slate-900 dark:text-slate-100">
                              {data.price || '-'}
                            </td>
                            <td className="p-3 text-slate-900 dark:text-slate-100">
                              {data.propertyFee || '-'}
                            </td>
                            <td className="p-3 text-slate-900 dark:text-slate-100">
                              {data.commission || '-'}
                            </td>
                            <td className="p-3 text-slate-900 dark:text-slate-100">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                data.rented === '是' 
                                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' 
                                  : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              }`}>
                                {data.rented || '-'}
                              </span>
                            </td>
                            <td className="p-3 text-slate-900 dark:text-slate-100">
                              {data.remarks || '-'}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={9} className="p-8 text-center text-slate-500">
                            没有找到匹配的结果
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
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
