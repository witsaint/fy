/**
 * 数据规整模块
 * 将AI识别的原始数据标准化为规范格式
 */

import { Property, RawProperty } from '@/types/property';

const VALID_REGIONS = ['瑶海区', '经开区', '蜀山区', '庐阳区', '包河区', '新站区'];

/**
 * 规整房源数据
 */
export function normalizeProperty(raw: RawProperty): Omit<Property, 'ocrText'> {
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
    createdAt: new Date().toISOString(),
  };
}

/**
 * 区域标准化
 */
function normalizeRegion(region: string): string {
  if (!region) return '识别失败';
  
  const regionMap: Record<string, string> = {
    '摇海区': '瑶海区',
    '瑶海': '瑶海区',
    '经济开发区': '经开区',
    '经开': '经开区',
    '蜀山': '蜀山区',
    '庐阳': '庐阳区',
    '包河': '包河区',
    '新站': '新站区',
  };
  
  const normalized = regionMap[region] || region;
  return VALID_REGIONS.includes(normalized) ? normalized : region;
}

/**
 * 面积标准化
 */
function normalizeArea(area: string): string {
  if (!area) return '无';
  if (area.includes('㎡') || area.includes('工位')) return area;
  if (/^\d+$/.test(area)) return area + '㎡';
  return area;
}

/**
 * 价格标准化
 */
function normalizePrice(price: string): string {
  if (!price) return '无';
  if (price.includes('面议') || price.includes('面谈')) return '面议';
  return price;
}

/**
 * 物业费标准化
 */
function normalizePropertyFee(fee: string): string {
  if (!fee) return '无';
  if (fee.includes('含') || fee.includes('包含')) return '含在租金内';
  if (fee.includes('免')) return '免物业费';
  return fee;
}

/**
 * 计算识别置信度
 */
function calculateConfidence(raw: RawProperty): number {
  let score = 0;
  
  // 核心字段（每个占0.15分，共0.6分）
  if (raw.region && raw.region !== '识别失败') score += 0.15;
  if (raw.building && raw.building !== '识别失败') score += 0.15;
  if (raw.roomNumber && raw.roomNumber !== '识别失败') score += 0.15;
  if (raw.price && raw.price !== '无') score += 0.15;
  
  // 其他字段（每个占0.1分，共0.4分）
  if (raw.area && raw.area !== '无') score += 0.1;
  if (raw.propertyFee && raw.propertyFee !== '无') score += 0.1;
  if (raw.commission && raw.commission !== '无') score += 0.1;
  if (raw.remarks && raw.remarks !== '无') score += 0.1;
  
  return score;
}

/**
 * 生成唯一ID
 */
function generateId(): string {
  return `prop-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
