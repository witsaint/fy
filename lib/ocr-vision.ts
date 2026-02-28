/**
 * OCR识别服务 - 使用多模态模型
 * 支持直接从图片中识别文字和表格信息
 */

import OpenAI from 'openai';
import { config } from './config';

// 
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
      headers: error.headers,
      body: error.error,
      response: error.response?.data
    });
    throw new Error(`OCR识别失败: ${error.message}`);
  }
}

/**
 * 使用多模态模型直接提取结构化房源信息（支持多个房源）
 * @param base64Image Base64编码的图片
 * @returns 结构化的房源信息JSON（可能是单个对象或数组）
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
          content: '你是一个专业的房源信息提取助手，擅长从图片中识别并提取结构化的房源数据。请仔细识别图片中的所有文字和表格信息。如果图片中有多个房源，请全部提取。'
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `请从这张房源信息图片中提取所有房源信息，每个房源包含以下9个字段：

**字段要求：**
1. region（区域）：房源所属行政区域，必须是以下之一：瑶海区、经开区、蜀山区、庐阳区、包河区、新站区
2. building（楼盘）：楼盘名称全称
3. roomNumber（房号）：房间编号，保留原格式
4. area（面积）：面积+单位，如"252㎡"或"10个工位"
5. price（价格）：租金价格+单位，如"42元/㎡/天"
6. propertyFee（物业费）：物业费+单位，如"3.5元/㎡/月"，如包含在租金内则标注"含在租金内"
7. commission（佣金）：佣金政策，如"全佣金"
8. rented（已出租）：**重点识别**，判断该房源是否已出租：
   - 如果该行文字上有**横线穿过**（删除线效果）
   - 或者文字显示为**灰色/浅色**（被划掉的样式）
   - 或者有"已租"、"已出租"等文字标记
   - 或者整行被划横线标记
   - **只要符合以上任一条件，该字段必须填写"是"**
   - 如果该行文字清晰可见，没有任何划线或标记，填写"否"
9. remarks（备注）：其他补充信息

**识别已出租的关键要点：**
- 仔细观察每行文字是否有横线、删除线、划掉的痕迹
- 注意文字的颜色，灰色或浅色可能表示已出租
- 查看是否有"已租"、"已出"等文字标记
- 横线可能是水平线穿过文字，或者是文字上的删除线样式
- **即使横线不太明显，只要有划线痕迹就应该识别为"是"**

**注意事项：**
- 如果某个字段无法识别或图片中没有该信息，请填写"无"
- 面积无单位时自动补充"㎡"
- 区域名称必须标准化（如"瑶海"改为"瑶海区"）
- 如果图片中只有一个房源，返回单个JSON对象
- 如果图片中有多个房源（如表格中多行），返回JSON数组

**返回格式（单个房源）：**
{
  "region": "",
  "building": "",
  "roomNumber": "",
  "area": "",
  "price": "",
  "propertyFee": "",
  "commission": "",
  "rented": "",
  "remarks": ""
}

**返回格式（多个房源）：**
[
  {
    "region": "",
    "building": "",
    "roomNumber": "",
    "area": "",
    "price": "",
    "propertyFee": "",
    "commission": "",
    "rented": "",
    "remarks": ""
  },
  ...
]

请仅返回JSON格式，不要markdown代码块，不要其他说明。`
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
      max_tokens: 4096, // 增加token限制以支持多个房源
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
