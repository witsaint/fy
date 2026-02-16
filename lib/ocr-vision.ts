/**
 * OCR识别服务 - 使用多模态模型
 * 支持直接从图片中识别文字和表格信息
 */

import OpenAI from 'openai';
import { config } from './config';

// 初始化客户端
const client = new OpenAI({
  apiKey: config.modelScope.apiKey,
  baseURL: config.modelScope.baseURL,
});

/**
 * 使用多模态模型识别图片中的文字内容
 * @param base64Image Base64编码的图片
 * @returns 识别出的文字内容
 */
export async function recognizeImageWithVisionModel(base64Image: string): Promise<string> {
  try {
    // 准备图片URL（确保格式正确）
    let imageUrl = base64Image;
    if (!imageUrl.startsWith('data:')) {
      // 如果没有data:前缀，添加默认的JPEG格式
      imageUrl = `data:image/jpeg;base64,${base64Image}`;
    }

    console.log('[开始OCR识别]', {
      model: config.ocrModel.modelId,
      imageUrlPrefix: imageUrl.substring(0, 50) + '...',
    });

    // 调用多模态模型进行OCR识别
    const completion = await client.chat.completions.create({
      model: config.ocrModel.modelId,
      messages: [
        {
          role: 'system',
          content: '你是一个专业的OCR识别助手，请准确识别图片中的所有文字内容，包括表格、标题、正文等。'
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: '请识别这张图片中的所有文字内容，保持原有格式和结构，如有表格请标注清楚。只返回识别的文字内容，不要添加任何说明或注释。'
            },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl,
                detail: 'high' // 使用高清模式以提高识别精度
              }
            }
          ]
        }
      ],
      temperature: config.ocrModel.temperature,
      max_tokens: config.ocrModel.maxTokens,
    });

    const result = completion.choices[0]?.message?.content || '';
    
    if (!result) {
      throw new Error('模型未返回识别结果');
    }

    console.log('[OCR识别成功]', {
      model: config.ocrModel.modelId,
      resultLength: result.length,
      preview: result.substring(0, 200)
    });

    return result;
    
  } catch (error: any) {
    console.error('[OCR识别失败]', {
      model: config.ocrModel.modelId,
      error: error.message,
      status: error.status,
      response: error.response?.data
    });
    throw new Error(`OCR识别失败: ${error.message}`);
  }
}

/**
 * 使用多模态模型直接提取结构化房源信息
 * @param base64Image Base64编码的图片
 * @returns 结构化的房源信息JSON
 */
export async function recognizeImageWithStructure(base64Image: string): Promise<string> {
  try {
    // 准备图片URL（确保格式正确）
    let imageUrl = base64Image;
    if (!imageUrl.startsWith('data:')) {
      // 如果没有data:前缀，添加默认的JPEG格式
      imageUrl = `data:image/jpeg;base64,${base64Image}`;
    }

    console.log('[开始结构化识别]', {
      model: config.ocrModel.modelId,
      imageUrlPrefix: imageUrl.substring(0, 50) + '...',
    });

    // 调用多模态模型
    const completion = await client.chat.completions.create({
      model: config.ocrModel.modelId,
      messages: [
        {
          role: 'system',
          content: '你是一个专业的房源信息提取助手，擅长从图片中识别并提取结构化的房源数据。请仔细识别图片中的所有文字和表格信息。'
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `请从这张房源信息图片中提取以下8个字段，并以JSON格式返回：

**字段要求：**
1. region（区域）：房源所属行政区域，必须是以下之一：瑶海区、经开区、蜀山区、庐阳区、包河区、新站区
2. building（楼盘）：楼盘名称全称
3. roomNumber（房号）：房间编号，保留原格式
4. area（面积）：面积+单位，如"252㎡"或"10个工位"
5. price（价格）：租金价格+单位，如"42元/㎡/天"
6. propertyFee（物业费）：物业费+单位，如"3.5元/㎡/月"，如包含在租金内则标注"含在租金内"
7. commission（佣金）：佣金政策，如"全佣金"
8. remarks（备注）：其他补充信息

**注意事项：**
- 如果某个字段无法识别或图片中没有该信息，请填写"无"
- 面积无单位时自动补充"㎡"
- 区域名称必须标准化（如"瑶海"改为"瑶海区"）

**请仅返回JSON格式，不要markdown代码块，不要其他说明：**
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
            },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl,
                detail: 'high' // 使用高清模式以提高识别精度
              }
            }
          ]
        }
      ],
      temperature: config.ocrModel.temperature,
      max_tokens: config.ocrModel.maxTokens,
    });

    const result = completion.choices[0]?.message?.content || '';
    
    if (!result) {
      throw new Error('模型未返回识别结果');
    }

    console.log('[结构化识别成功]', {
      model: config.ocrModel.modelId,
      resultLength: result.length,
      preview: result.substring(0, 200)
    });

    return result;
    
  } catch (error: any) {
    console.error('[结构化识别失败]', {
      model: config.ocrModel.modelId,
      error: error.message,
      status: error.status,
      response: error.response?.data
    });
    throw new Error(`结构化识别失败: ${error.message}`);
  }
}
