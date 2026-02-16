/**
 * 图片识别API路由 - 完整版
 * 使用多模态模型直接识别（推荐）
 * 支持单个或多个房源识别
 */

import { NextRequest, NextResponse } from 'next/server';
import { recognizeImageWithStructure } from '@/lib/ocr-vision';
import { normalizeProperty } from '@/lib/data-normalizer';
import { config, validateConfig } from '@/lib/config';

export async function POST(request: NextRequest) {
  try {
    // 验证配置
    validateConfig();

    const body = await request.json();
    const { image } = body as { image: string };
    
    if (!image) {
      return NextResponse.json({
        success: false,
        error: '缺少图片数据'
      }, { status: 400 });
    }

    console.log('[识别开始]', { 
      ocrModel: config.ocrModel.modelId,
      imageSize: image.length
    });

    // 使用多模态模型直接识别
    console.log('[使用多模态直接识别]');
    
    const structuredText = await recognizeImageWithStructure(image);
    console.log('[模型返回结果]', { 
      resultLength: structuredText.length,
      preview: structuredText.substring(0, 300)
    });
    
    // 提取JSON（支持单个对象或数组）
    let jsonMatch = structuredText.match(/\[[\s\S]*?\]/) || structuredText.match(/\{[\s\S]*?\}/);
    
    if (!jsonMatch) {
      console.error('[识别失败] 无法提取JSON', { structuredText });
      return NextResponse.json({
        success: false,
        error: '识别失败：无法提取结构化数据'
      }, { status: 500 });
    }

    const parsedData = JSON.parse(jsonMatch[0]);
    console.log('[JSON解析成功]', { 
      isArray: Array.isArray(parsedData),
      count: Array.isArray(parsedData) ? parsedData.length : 1
    });

    // 处理单个或多个房源
    let properties;
    if (Array.isArray(parsedData)) {
      // 多个房源
      properties = parsedData.map(raw => normalizeProperty(raw));
    } else {
      // 单个房源
      properties = [normalizeProperty(parsedData)];
    }
    
    console.log('[识别完成]', {
      totalProperties: properties.length,
      properties: properties.map(p => ({
        id: p.id,
        region: p.region,
        building: p.building
      }))
    });

    return NextResponse.json({
      success: true,
      data: properties.length === 1 ? properties[0] : properties,
      meta: {
        count: properties.length,
        ocrModel: config.ocrModel.modelId
      }
    });
    
  } catch (error: any) {
    console.error('[识别失败]', {
      error: error.message,
      stack: error.stack
    });

    return NextResponse.json({
      success: false,
      error: error.message || '识别失败，请重试'
    }, { status: 500 });
  }
}

// 获取配置信息（可选，用于调试）
export async function GET() {
  return NextResponse.json({
    ocrModel: {
      modelId: config.ocrModel.modelId,
      temperature: config.ocrModel.temperature,
      maxTokens: config.ocrModel.maxTokens,
    },
    textModel: {
      modelId: config.textModel.modelId,
      temperature: config.textModel.temperature,
      maxTokens: config.textModel.maxTokens,
    },
    app: {
      maxUploadFiles: config.app.maxUploadFiles,
      maxFileSize: config.app.maxFileSize,
      allowedFormats: config.app.allowedFormats,
    }
  });
}
