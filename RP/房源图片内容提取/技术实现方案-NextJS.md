# Next.js 技术实现方案

## 一、技术栈详情

### 核心技术
- **框架**：Next.js 14+ (App Router)
- **语言**：TypeScript
- **UI组件库**：Ant Design 5.x
- **样式方案**：Tailwind CSS + CSS Modules
- **状态管理**：React State (useState + useReducer)
- **Excel处理**：xlsx / exceljs

### 第三方服务
- **OCR服务**：百度OCR API（推荐） / 腾讯OCR API
- **AI解析**：魔塔（ModelScope）API - OpenAI兼容接口

---

## 二、项目结构

```
fy/
├── app/
│   ├── page.tsx                    # 主页面
│   ├── layout.tsx                  # 根布局
│   ├── api/
│   │   ├── recognize/
│   │   │   └── route.ts            # 图片识别API路由
│   │   └── parse/
│   │       └── route.ts            # AI解析API路由
│   └── globals.css                 # 全局样式
├── components/
│   ├── UploadArea.tsx              # 上传区域组件
│   ├── ImagePreview.tsx            # 图片预览组件
│   ├── PropertyTable.tsx           # 房源表格组件
│   ├── EditModal.tsx               # 编辑弹窗组件
│   └── ProgressBar.tsx             # 进度条组件
├── lib/
│   ├── ocr.ts                      # OCR服务封装
│   ├── ai-parser.ts                # AI解析服务
│   ├── data-normalizer.ts          # 数据规整函数
│   ├── excel-export.ts             # Excel导出函数
│   └── constants.ts                # 常量定义
├── types/
│   └── property.ts                 # TypeScript类型定义
├── public/
│   └── ...                         # 静态资源
├── .env.local                      # 环境变量
├── next.config.js                  # Next.js配置
├── package.json
└── tsconfig.json
```

---

## 三、核心实现方案

### 3.1 数据存储方案：内存 + React State

**设计理念**：无数据库，批次数据仅在内存中存储

#### 数据流
```typescript
// 主页面维护当前批次的所有数据
const [properties, setProperties] = useState<Property[]>([]);
const [images, setImages] = useState<ImageFile[]>([]);

// 用户操作流程
上传图片 → 保存到 images 状态
识别完成 → 添加到 properties 状态
用户编辑 → 更新 properties 状态
导出Excel → 从 properties 状态读取数据
清空数据 → 重置 properties 和 images 状态
```

#### 特点
- ✅ 无需数据库配置
- ✅ 部署简单
- ✅ 数据隔离（每个用户独立会话）
- ⚠️ 刷新页面数据丢失（符合批次处理场景）

---

### 3.2 图片上传方案

#### 方案：前端直接处理，转Base64上传

```typescript
// components/UploadArea.tsx
import { Upload, message } from 'antd';
import type { UploadFile } from 'antd';

const UploadArea = ({ onUploadComplete }) => {
  const handleUpload = async (file: File) => {
    // 1. 前端验证
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      message.error('仅支持JPG/PNG格式');
      return false;
    }
    
    if (file.size > 10 * 1024 * 1024) {
      message.error('单张图片不得超过10MB');
      return false;
    }
    
    // 2. 转换为Base64
    const base64 = await fileToBase64(file);
    
    // 3. 保存到状态（用于预览）
    const imageData = {
      id: generateId(),
      name: file.name,
      base64: base64,
      file: file
    };
    
    return imageData;
  };
  
  return (
    <Upload
      multiple
      accept=".jpg,.jpeg,.png"
      maxCount={20}
      beforeUpload={handleUpload}
      showUploadList={false}
    >
      <Button size="large">上传房源图片</Button>
    </Upload>
  );
};

// 工具函数
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
```

---

### 3.3 图片识别方案

#### API路由：/api/recognize/route.ts

```typescript
// app/api/recognize/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { recognizeImage } from '@/lib/ocr';
import { parseProperty } from '@/lib/ai-parser';
import { normalizeProperty } from '@/lib/data-normalizer';

export async function POST(request: NextRequest) {
  try {
    const { image } = await request.json(); // Base64图片
    
    // 1. OCR识别
    const ocrText = await recognizeImage(image);
    
    // 2. AI解析
    const rawProperty = await parseProperty(ocrText);
    
    // 3. 数据规整
    const property = normalizeProperty(rawProperty);
    
    // 4. 返回结果
    return NextResponse.json({
      success: true,
      data: property
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
```

#### OCR服务封装：lib/ocr.ts

```typescript
// lib/ocr.ts
import axios from 'axios';

// 百度OCR示例
export async function recognizeImage(base64Image: string): Promise<string> {
  const accessToken = await getBaiduAccessToken();
  
  const response = await axios.post(
    `https://aip.baidubce.com/rest/2.0/ocr/v1/accurate_basic?access_token=${accessToken}`,
    {
      image: base64Image.split(',')[1], // 去除data:image/jpeg;base64,前缀
    },
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }
  );
  
  // 提取所有文字，按位置排序
  const words = response.data.words_result || [];
  return words.map(item => item.words).join('\n');
}

async function getBaiduAccessToken(): Promise<string> {
  const response = await axios.post(
    'https://aip.baidubce.com/oauth/2.0/token',
    null,
    {
      params: {
        grant_type: 'client_credentials',
        client_id: process.env.BAIDU_API_KEY,
        client_secret: process.env.BAIDU_SECRET_KEY
      }
    }
  );
  
  return response.data.access_token;
}
```

#### AI解析服务：lib/ai-parser.ts

```typescript
// lib/ai-parser.ts
import OpenAI from 'openai';

// 使用魔塔（ModelScope）API - OpenAI兼容接口
const client = new OpenAI({
  apiKey: process.env.MODELSCOPE_ACCESS_TOKEN || 'your_modelscope_token_here',
  baseURL: 'https://api-inference.modelscope.cn/v1/'
});

export async function parseProperty(ocrText: string): Promise<RawProperty> {
  const prompt = `你是房源信息提取助手。请从以下OCR识别的文本中，精准提取8个字段：

1. 区域：房源所属行政区域（瑶海区、经开区、蜀山区、庐阳区、包河区、新站区）
2. 楼盘：楼盘名称全称
3. 房号：房间编号（保留原格式）
4. 面积：面积+单位（如252㎡）
5. 价格：租金价格+单位（如42元/㎡/天）
6. 物业费：物业费+单位（如3.5元/㎡/月）
7. 佣金：佣金政策
8. 备注：关键补充信息

OCR识别结果：
${ocrText}

请以JSON格式返回（仅返回JSON，不要其他内容）：
{
  "region": "",
  "building": "",
  "roomNumber": "",
  "area": "",
  "price": "",
  "propertyFee": "",
  "commission": "",
  "remarks": ""
}`;

  const completion = await client.chat.completions.create({
    model: 'qwen-plus', // 魔塔推荐模型，可选：qwen-turbo, qwen-max
    messages: [
      { role: 'system', content: '你是一个专业的房源信息提取助手，擅长从文本中提取结构化数据。' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.1, // 降低随机性，提高准确性
    max_tokens: 1024
  });
  
  const responseText = completion.choices[0]?.message?.content || '';
  
  // 提取JSON（处理可能的markdown代码块）
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('AI解析失败：无法提取JSON');
  }
  
  return JSON.parse(jsonMatch[0]);
}

interface RawProperty {
  region: string;
  building: string;
  roomNumber: string;
  area: string;
  price: string;
  propertyFee: string;
  commission: string;
  remarks: string;
}
```

**魔塔API说明**：
- **API兼容性**：完全兼容OpenAI API接口规范
- **Base URL**：`https://api-inference.modelscope.cn/v1/`
- **推荐模型**：
  - `qwen-turbo`：速度快，成本低（推荐用于生产）
  - `qwen-plus`：平衡性能和成本
  - `qwen-max`：最高精度
- **免费额度**：新用户有免费调用额度
- **Token获取**：访问 https://modelscope.cn/ 注册获取Access Token

#### 数据规整：lib/data-normalizer.ts

```typescript
// lib/data-normalizer.ts
import { Property, RawProperty } from '@/types/property';

const VALID_REGIONS = ['瑶海区', '经开区', '蜀山区', '庐阳区', '包河区', '新站区'];

export function normalizeProperty(raw: RawProperty): Property {
  return {
    id: generateId(),
    region: normalizeRegion(raw.region),
    building: raw.building?.trim() || '识别失败',
    roomNumber: raw.roomNumber?.trim() || '识别失败',
    area: normalizeArea(raw.area),
    price: normalizePrice(raw.price),
    propertyFee: normalizePropertyFee(raw.propertyFee),
    commission: raw.commission?.trim() || '无',
    remarks: raw.remarks?.trim() || '无',
    confidence: calculateConfidence(raw),
    createdAt: new Date().toISOString()
  };
}

function normalizeRegion(region: string): string {
  if (!region) return '识别失败';
  
  // 区域映射表
  const regionMap: Record<string, string> = {
    '摇海区': '瑶海区',
    '瑶海': '瑶海区',
    '经济开发区': '经开区',
    '经开': '经开区',
    '蜀山': '蜀山区',
    '庐阳': '庐阳区',
    '包河': '包河区',
    '新站': '新站区'
  };
  
  const normalized = regionMap[region] || region;
  return VALID_REGIONS.includes(normalized) ? normalized : region;
}

function normalizeArea(area: string): string {
  if (!area) return '无';
  if (area.includes('㎡') || area.includes('工位')) return area;
  if (/^\d+$/.test(area)) return area + '㎡';
  return area;
}

function normalizePrice(price: string): string {
  if (!price) return '无';
  if (price.includes('面议') || price.includes('面谈')) return '面议';
  return price;
}

function normalizePropertyFee(fee: string): string {
  if (!fee) return '无';
  if (fee.includes('含') || fee.includes('包含')) return '含在租金内';
  if (fee.includes('免')) return '免物业费';
  return fee;
}

function calculateConfidence(raw: RawProperty): number {
  let score = 0;
  
  // 核心字段
  if (raw.region && raw.region !== '识别失败') score += 0.15;
  if (raw.building && raw.building !== '识别失败') score += 0.15;
  if (raw.roomNumber && raw.roomNumber !== '识别失败') score += 0.15;
  if (raw.price && raw.price !== '无') score += 0.15;
  
  // 其他字段
  if (raw.area && raw.area !== '无') score += 0.1;
  if (raw.propertyFee && raw.propertyFee !== '无') score += 0.1;
  if (raw.commission && raw.commission !== '无') score += 0.1;
  if (raw.remarks && raw.remarks !== '无') score += 0.1;
  
  return score;
}

function generateId(): string {
  return `prop-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
```

---

### 3.4 批量识别实现

#### 主页面批量处理逻辑

```typescript
// app/page.tsx
'use client';

import { useState } from 'react';
import { message } from 'antd';

export default function Home() {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [recognizing, setRecognizing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  // 批量识别
  const handleBatchRecognize = async () => {
    if (images.length === 0) {
      message.warning('请先上传图片');
      return;
    }
    
    setRecognizing(true);
    setProgress({ current: 0, total: images.length });
    
    const results: Property[] = [];
    const concurrency = 5; // 并发数限制
    
    // 分批处理
    for (let i = 0; i < images.length; i += concurrency) {
      const batch = images.slice(i, i + concurrency);
      
      // 并发处理当前批次
      const batchPromises = batch.map(async (image) => {
        try {
          const response = await fetch('/api/recognize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: image.base64 })
          });
          
          const result = await response.json();
          
          if (result.success) {
            return { ...result.data, imageId: image.id };
          }
          
          return null;
        } catch (error) {
          console.error('识别失败:', error);
          return null;
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      
      // 过滤成功的结果
      const validResults = batchResults.filter(r => r !== null) as Property[];
      results.push(...validResults);
      
      // 更新进度
      setProgress({ 
        current: Math.min(i + concurrency, images.length), 
        total: images.length 
      });
    }
    
    // 保存结果到状态
    setProperties(results);
    setRecognizing(false);
    
    message.success(`识别完成，共提取${results.length}条房源信息`);
  };

  return (
    <div className="container">
      <h1>房源信息汇总工具</h1>
      
      <UploadArea 
        onImagesChange={setImages}
        disabled={recognizing}
      />
      
      <ImagePreview 
        images={images}
        onDelete={(id) => setImages(images.filter(img => img.id !== id))}
      />
      
      <Button 
        type="primary" 
        onClick={handleBatchRecognize}
        loading={recognizing}
      >
        {recognizing ? `识别中 ${progress.current}/${progress.total}` : '开始识别'}
      </Button>
      
      <PropertyTable 
        data={properties}
        onChange={setProperties}
      />
      
      <ExportButton data={properties} />
    </div>
  );
}
```

---

### 3.5 Excel导出方案

#### 前端生成Excel（无需后端）

```typescript
// lib/excel-export.ts
import * as XLSX from 'xlsx';
import { Property } from '@/types/property';

export function exportToExcel(properties: Property[], fileName?: string) {
  // 1. 准备数据
  const data = properties.map(p => ({
    '区域': p.region,
    '楼盘': p.building,
    '房号': p.roomNumber,
    '面积(㎡)': p.area,
    '价格': p.price,
    '物业费(元/㎡/月)': p.propertyFee,
    '佣金': p.commission,
    '备注': p.remarks
  }));
  
  // 2. 创建工作表
  const worksheet = XLSX.utils.json_to_sheet(data);
  
  // 3. 设置列宽
  worksheet['!cols'] = [
    { wch: 12 },  // 区域
    { wch: 20 },  // 楼盘
    { wch: 12 },  // 房号
    { wch: 12 },  // 面积
    { wch: 18 },  // 价格
    { wch: 18 },  // 物业费
    { wch: 18 },  // 佣金
    { wch: 30 }   // 备注
  ];
  
  // 4. 创建工作簿
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '房源汇总');
  
  // 5. 生成文件名
  const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const finalFileName = fileName || `房源汇总表_${date}.xlsx`;
  
  // 6. 下载
  XLSX.writeFile(workbook, finalFileName);
}
```

#### 导出按钮组件

```typescript
// components/ExportButton.tsx
import { Button, message } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { exportToExcel } from '@/lib/excel-export';

interface Props {
  data: Property[];
  filteredData?: Property[]; // 筛选后的数据
}

export function ExportButton({ data, filteredData }: Props) {
  const handleExport = () => {
    const exportData = filteredData || data;
    
    if (exportData.length === 0) {
      message.warning('暂无数据可导出');
      return;
    }
    
    try {
      exportToExcel(exportData);
      message.success('Excel已保存至下载文件夹');
    } catch (error) {
      message.error('导出失败，请重试');
      console.error(error);
    }
  };
  
  return (
    <Button
      type="primary"
      size="large"
      icon={<DownloadOutlined />}
      onClick={handleExport}
      disabled={data.length === 0}
    >
      导出Excel
    </Button>
  );
}
```

---

### 3.6 表格组件实现

```typescript
// components/PropertyTable.tsx
import { useState } from 'react';
import { Table, Select, Button, Modal, Form, Input, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Property } from '@/types/property';

const REGIONS = ['瑶海区', '经开区', '蜀山区', '庐阳区', '包河区', '新站区'];

interface Props {
  data: Property[];
  onChange: (data: Property[]) => void;
}

export function PropertyTable({ data, onChange }: Props) {
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [form] = Form.useForm();
  
  // 筛选数据
  const filteredData = selectedRegion
    ? data.filter(p => p.region === selectedRegion)
    : data;
  
  // 删除房源
  const handleDelete = (id: string) => {
    Modal.confirm({
      title: '确定删除该房源信息？',
      onOk: () => {
        onChange(data.filter(p => p.id !== id));
        message.success('删除成功');
      }
    });
  };
  
  // 编辑房源
  const handleEdit = (property: Property) => {
    setEditingProperty(property);
    form.setFieldsValue(property);
  };
  
  // 保存编辑
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const updated = data.map(p => 
        p.id === editingProperty?.id ? { ...p, ...values } : p
      );
      onChange(updated);
      setEditingProperty(null);
      message.success('修改成功');
    } catch (error) {
      console.error('验证失败:', error);
    }
  };
  
  const columns: ColumnsType<Property> = [
    {
      title: '区域',
      dataIndex: 'region',
      width: 100,
      sorter: (a, b) => a.region.localeCompare(b.region)
    },
    {
      title: '楼盘',
      dataIndex: 'building',
      width: 150,
      ellipsis: true
    },
    {
      title: '房号',
      dataIndex: 'roomNumber',
      width: 100
    },
    {
      title: '面积(㎡)',
      dataIndex: 'area',
      width: 100
    },
    {
      title: '价格',
      dataIndex: 'price',
      width: 120
    },
    {
      title: '物业费(元/㎡/月)',
      dataIndex: 'propertyFee',
      width: 120
    },
    {
      title: '佣金',
      dataIndex: 'commission',
      width: 120
    },
    {
      title: '备注',
      dataIndex: 'remarks',
      width: 200,
      ellipsis: true
    },
    {
      title: '操作',
      width: 100,
      fixed: 'right',
      render: (_, record) => (
        <>
          <Button type="link" onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Button type="link" danger onClick={() => handleDelete(record.id)}>
            删除
          </Button>
        </>
      )
    }
  ];
  
  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <Select
          style={{ width: 200 }}
          placeholder="按区域筛选"
          allowClear
          value={selectedRegion || undefined}
          onChange={setSelectedRegion}
        >
          {REGIONS.map(region => (
            <Select.Option key={region} value={region}>
              {region}
            </Select.Option>
          ))}
        </Select>
        
        <span style={{ marginLeft: 16 }}>
          共 {filteredData.length} 条
        </span>
      </div>
      
      <Table
        columns={columns}
        dataSource={filteredData}
        rowKey="id"
        pagination={{ pageSize: 20, showTotal: (total) => `共 ${total} 条` }}
        scroll={{ x: 1200 }}
      />
      
      {/* 编辑弹窗 */}
      <Modal
        title="编辑房源信息"
        open={!!editingProperty}
        onOk={handleSave}
        onCancel={() => setEditingProperty(null)}
      >
        <Form form={form} layout="vertical">
          <Form.Item label="区域" name="region" rules={[{ required: true }]}>
            <Select>
              {REGIONS.map(region => (
                <Select.Option key={region} value={region}>
                  {region}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item label="楼盘" name="building" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          
          <Form.Item label="房号" name="roomNumber" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          
          <Form.Item label="面积" name="area">
            <Input />
          </Form.Item>
          
          <Form.Item label="价格" name="price">
            <Input />
          </Form.Item>
          
          <Form.Item label="物业费" name="propertyFee">
            <Input />
          </Form.Item>
          
          <Form.Item label="佣金" name="commission">
            <Input />
          </Form.Item>
          
          <Form.Item label="备注" name="remarks">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
```

---

## 四、TypeScript类型定义

```typescript
// types/property.ts

export interface Property {
  id: string;
  imageId?: string;
  region: string;
  building: string;
  roomNumber: string;
  area: string;
  price: string;
  propertyFee: string;
  commission: string;
  remarks: string;
  confidence: number;
  createdAt: string;
}

export interface ImageFile {
  id: string;
  name: string;
  base64: string;
  file: File;
}

export interface RawProperty {
  region: string;
  building: string;
  roomNumber: string;
  area: string;
  price: string;
  propertyFee: string;
  commission: string;
  remarks: string;
}

export interface RecognizeResponse {
  success: boolean;
  data?: Property;
  error?: string;
}
```

---

## 五、环境变量配置

```bash
# .env.local

# 百度OCR（必需）
BAIDU_API_KEY=your_baidu_api_key
BAIDU_SECRET_KEY=your_baidu_secret_key

# 魔塔（ModelScope）AI解析（必需）
MODELSCOPE_ACCESS_TOKEN=your_modelscope_token_here

# 说明：
# 1. 百度OCR用于图片文字识别
# 2. 魔塔API用于AI解析，使用OpenAI兼容接口
# 3. 魔塔支持的模型：qwen-turbo（推荐）、qwen-plus、qwen-max
```

### 魔塔API获取方式

1. **访问官网**：https://modelscope.cn/
2. **注册/登录**：使用手机号或GitHub账号
3. **获取Token**：
   - 进入「个人中心」→「访问令牌」
   - 创建新的Access Token
   - 复制Token到环境变量
4. **查看文档**：https://modelscope.cn/docs/

### 魔塔API优势
- ✅ **OpenAI兼容**：无需改代码，直接替换baseURL
- ✅ **中文优化**：对中文理解更好
- ✅ **免费额度**：新用户有免费调用次数
- ✅ **国内访问**：无需代理，速度快
- ✅ **多种模型**：qwen系列模型可选

---

## 六、依赖安装

```json
// package.json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "typescript": "^5.0.0",
    "antd": "^5.12.0",
    "@ant-design/icons": "^5.2.0",
    "xlsx": "^0.18.5",
    "axios": "^1.6.0",
    "openai": "^4.28.0",
    "tailwindcss": "^3.4.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0"
  }
}
```

安装命令：
```bash
npm install next react react-dom typescript
npm install antd @ant-design/icons xlsx axios openai
npm install -D tailwindcss @types/node @types/react @types/react-dom
```

**依赖说明**：
- `openai`: 用于调用魔塔API（OpenAI兼容接口）
- `axios`: 用于HTTP请求（OCR服务）
- `xlsx`: 用于前端生成Excel文件
- `antd`: UI组件库

---

## 七、开发与部署

### 开发环境
```bash
npm run dev
# 访问 http://localhost:3000
```

### 生产构建
```bash
npm run build
npm run start
```

### 部署方案

#### 选项1：Vercel部署（推荐）
- 免费托管
- 自动HTTPS
- 全球CDN
- 注意：API路由有10秒超时限制

#### 选项2：本地部署
```bash
npm run build
npm run start
# 或使用 PM2
pm2 start npm --name "fy" -- start
```

#### 选项3：Docker部署
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

---

## 八、性能优化建议

### 1. 图片压缩
```typescript
// 上传前压缩图片（可选）
import imageCompression from 'browser-image-compression';

async function compressImage(file: File) {
  const options = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920
  };
  
  return await imageCompression(file, options);
}
```

### 2. 并发控制
```typescript
// 限制并发数，避免API限流
const concurrency = 5; // 每次最多5个并发请求
```

### 3. 缓存优化
```typescript
// 使用SWR缓存API响应（如需要）
import useSWR from 'swr';
```

---

## 九、常见问题FAQ

### Q1：刷新页面数据会丢失吗？
**A**：是的，因为没有数据库，数据仅存储在内存中。刷新页面后需要重新上传识别。这符合批次处理的使用场景。

### Q2：如何保存历史数据？
**A**：用户可以通过导出Excel保存数据。如果需要保存在系统中，可以考虑：
- localStorage（浏览器本地存储，最大5-10MB）
- IndexedDB（浏览器数据库，容量更大）
- 添加数据库支持（如需要）

### Q3：API调用超时怎么办？
**A**：
- Vercel部署时API路由有10秒超时限制
- 如果图片识别超时，可以：
  1. 使用更快的OCR服务
  2. 优化AI Prompt减少token消耗
  3. 考虑使用Vercel Pro（60秒超时）

### Q4：支持多少张图片批量处理？
**A**：
- 前端限制：最多20张（可调整）
- 实际限制取决于：
  - 浏览器内存
  - API调用次数限制
  - 网络速度

---

## 十、开发检查清单

### 初始化
- [ ] 创建Next.js项目
- [ ] 安装依赖
- [ ] 配置环境变量
- [ ] 配置Tailwind CSS

### 功能开发
- [ ] 图片上传组件
- [ ] 图片预览组件
- [ ] OCR识别API路由
- [ ] AI解析服务
- [ ] 数据规整函数
- [ ] 表格展示组件
- [ ] 编辑功能
- [ ] 筛选功能
- [ ] Excel导出功能

### 测试
- [ ] 上传功能测试
- [ ] 识别准确率测试
- [ ] 表格交互测试
- [ ] Excel导出测试
- [ ] 错误处理测试

### 优化
- [ ] 性能优化
- [ ] 错误提示优化
- [ ] 响应式布局
- [ ] 加载状态优化

### 部署
- [ ] 生产构建测试
- [ ] 环境变量配置
- [ ] 部署到服务器
- [ ] 域名配置（可选）
