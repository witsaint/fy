/**
 * AI文字解析服务
 * 使用文本模型将OCR识别的文字解析为结构化数据
 */

import OpenAI from 'openai';
import { config } from './config';
import { RawProperty } from '@/types/property';

// 初始化客户端
const client = new OpenAI({
  apiKey: config.modelScope.apiKey,
  baseURL: config.modelScope.baseURL,
});

/**
 * 将OCR识别的文字解析为结构化的房源信息
 * @param ocrText OCR识别的文字内容
 * @returns 结构化的房源信息
 */
export async function parsePropertyFromText(ocrText: string): Promise<RawProperty> {
  try {
    const completion = await client.chat.completions.create({
      model: config.textModel.modelId,
      messages: [
        {
          role: 'system',
          content: `你是一个专业的房源信息提取助手，擅长从文本中提取结构化数据。

你的任务是从OCR识别的文本中，精准提取8个字段，并以JSON格式返回。

字段规范：
1. region（区域）：必须是以下6个区域之一：瑶海区、经开区、蜀山区、庐阳区、包河区、新站区
2. building（楼盘）：楼盘名称全称，保留原文
3. roomNumber（房号）：房间编号，保留原格式（含字母、符号）
4. area（面积）：面积+单位，无单位时补充"㎡"
5. price（价格）：租金价格+单位，保留完整表达式
6. propertyFee（物业费）：物业费+单位，包含在租金则标注"含在租金内"
7. commission（佣金）：佣金政策，完整保留
8. remarks（备注）：关键补充信息，如装修、位置等

注意事项：
- 无法识别的字段填写"无"
- 区域名称必须标准化（如"瑶海"→"瑶海区"）
- 仅返回JSON，不要markdown代码块或其他说明文字`
        },
        {
          role: 'user',
          content: `请从以下OCR识别的文本中提取房源信息：

${ocrText}

请以JSON格式返回（仅JSON，无其他内容）：
{
  "region": "",
  "building": "",
  "roomNumber": "",
  "area": "",
  "price": "",
  "propertyFee": "",
  "commission": "",
  "remarks": ""
}`
        }
      ],
      temperature: config.textModel.temperature,
      max_tokens: config.textModel.maxTokens,
      stream: false,
    });

    const responseText = completion.choices[0]?.message?.content || '';
    
    // 提取JSON（处理可能的markdown代码块）
    const jsonMatch = responseText.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) {
      console.error('[AI解析失败] 无法提取JSON', { responseText });
      throw new Error('AI解析失败：无法提取JSON格式数据');
    }

    const parsedData = JSON.parse(jsonMatch[0]) as RawProperty;
    
    console.log('[AI解析成功]', {
      model: config.textModel.modelId,
      fields: Object.keys(parsedData).length
    });

    return parsedData;
    
  } catch (error: any) {
    console.error('[AI解析失败]', {
      model: config.textModel.modelId,
      error: error.message
    });
    throw new Error(`AI解析失败: ${error.message}`);
  }
}

/**
 * 流式解析（可选）
 * @param ocrText OCR识别的文字内容
 * @param onProgress 进度回调
 */
export async function parsePropertyWithStream(
  ocrText: string,
  onProgress?: (partialJson: string) => void
): Promise<RawProperty> {
  try {
    const stream = await client.chat.completions.create({
      model: config.textModel.modelId,
      messages: [
        {
          role: 'system',
          content: '你是一个专业的房源信息提取助手。'
        },
        {
          role: 'user',
          content: `请从以下文本中提取房源信息并返回JSON：\n\n${ocrText}`
        }
      ],
      temperature: config.textModel.temperature,
      max_tokens: config.textModel.maxTokens,
      stream: true,
    });

    let fullResponse = '';
    
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      fullResponse += content;
      
      if (onProgress && content) {
        onProgress(fullResponse);
      }
    }

    // 提取JSON
    const jsonMatch = fullResponse.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) {
      throw new Error('流式解析失败：无法提取JSON');
    }

    return JSON.parse(jsonMatch[0]);
    
  } catch (error: any) {
    console.error('[流式解析失败]', error);
    throw new Error(`流式解析失败: ${error.message}`);
  }
}

/**
 * 批量解析（优化版）
 * @param ocrTexts 多个OCR文本
 * @returns 解析结果数组
 */
export async function parseBatchProperties(ocrTexts: string[]): Promise<RawProperty[]> {
  // 并发处理，但限制并发数
  const concurrency = config.app.concurrentRecognitions;
  const results: RawProperty[] = [];
  
  for (let i = 0; i < ocrTexts.length; i += concurrency) {
    const batch = ocrTexts.slice(i, i + concurrency);
    const batchPromises = batch.map(text => parsePropertyFromText(text));
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }
  
  return results;
}
