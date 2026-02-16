/**
 * TypeScript 类型定义
 */

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
  ocrText?: string; // 原始OCR文本（可选）
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
  meta?: {
    mode: string;
    ocrModel: string;
    textModel?: string | null;
  };
}
