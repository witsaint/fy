/**
 * 图片识别API路由 - 完整版
 * 支持两种识别方式：
 * 1. 多模态直接识别（推荐）
 * 2. OCR文字识别 + 文本模型解析
 */

import { NextRequest, NextResponse } from 'next/server';
import { recognizeImageWithVisionModel, recognizeImageWithStructure } from '@/lib/ocr-vision';
import { parsePropertyFromText } from '@/lib/ai-parser-text';
import { normalizeProperty } from '@/lib/data-normalizer';
import { config, validateConfig } from '@/lib/config';


// 识别模式
type RecognitionMode = 'direct' | 'two-step';

export async function POST(request: NextRequest) {
  try {
    // 验证配置
    validateConfig();

    const body = await request.json();
    const { image, mode = 'two-step' } = body as { 
      image: string; 
      mode?: RecognitionMode 
    };
    
    if (!image) {
      return NextResponse.json({
        success: false,
        error: '缺少图片数据'
      }, { status: 400 });
    }

    console.log('[识别开始]', { 
      mode,
      ocrModel: config.ocrModel.modelId,
      textModel: config.textModel.modelId,
      imageSize: image.length
    });

    let rawProperty;

    // 暂时使用两步识别模式，因为 DeepSeek-OCR-2 可能不支持直接结构化输出
    if (mode === 'direct') {
      console.log('[尝试多模态直接识别]');
      
      try {
        const structuredText = await recognizeImageWithStructure(image);
        
        // 提取JSON
        const jsonMatch = structuredText.match(/\{[\s\S]*?\}/);
        if (!jsonMatch) {
          console.warn('[直接识别失败，降级到两步识别]');
          // 降级到两步识别
          const ocrText = await recognizeImageWithVisionModel(image);
          rawProperty = await parsePropertyFromText(ocrText);
        } else {
          rawProperty = JSON.parse(jsonMatch[0]);
        }
      } catch (error: any) {
        console.warn('[直接识别失败，降级到两步识别]', error.message);
        // 降级到两步识别
        const ocrText = await recognizeImageWithVisionModel(image);
        rawProperty = await parsePropertyFromText(ocrText);
      }
      
    } else {
      // 方式2：两步识别（推荐）
      console.log('[使用两步识别：OCR + 文本解析]');
      
      // 步骤1：多模态模型识别文字
      const ocrText = await recognizeImageWithVisionModel(image);
      console.log('[OCR识别完成]', { 
        textLength: ocrText.length,
        preview: ocrText.substring(0, 200)
      });
      
      // 步骤2：文本模型解析结构
      rawProperty = await parsePropertyFromText(ocrText);
      console.log('[文本解析完成]', { fields: Object.keys(rawProperty).length });
    }

    // 数据规整
    const property = normalizeProperty(rawProperty);
    
    console.log('[识别完成]', {
      id: property.id,
      region: property.region,
      building: property.building,
      confidence: property.confidence
    });

    return NextResponse.json({
      success: true,
      data: property,
      meta: {
        mode,
        ocrModel: config.ocrModel.modelId,
        textModel: mode === 'two-step' ? config.textModel.modelId : null
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
