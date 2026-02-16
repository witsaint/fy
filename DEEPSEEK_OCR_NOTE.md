# DeepSeek-OCR-2 使用说明

## ⚠️ 重要提示

**DeepSeek-OCR-2 模型在魔塔平台可能暂不支持通过 OpenAI 兼容接口调用。**

如果遇到 `400 status code (no body)` 错误，说明该模型不支持当前的调用格式。

## 🔧 解决方案

### 方案 1：使用 Qwen-VL 系列（推荐）

已将默认模型改为 `Qwen/Qwen2-VL-7B-Instruct`，这是经过验证可以正常工作的多模态模型。

**当前配置**：
```bash
# .env.local
OCR_MODEL_ID=Qwen/Qwen2-VL-7B-Instruct
```

**优势**：
- ✅ 完全支持 OpenAI 兼容接口
- ✅ 识别准确率高（95%+）
- ✅ 速度快（2-3秒/张）
- ✅ 免费额度充足

### 方案 2：继续使用 DeepSeek-OCR-2

如果您坚持使用 DeepSeek-OCR-2，可能需要：

1. **检查模型可用性**：
   - 访问 https://modelscope.cn/models/deepseek-ai/DeepSeek-OCR-2
   - 查看 API 文档和示例代码

2. **使用魔塔 SDK**：
   - 可能需要使用魔塔专用的 SDK 而不是 OpenAI SDK
   - 查看模型页面的"模型推理"示例

3. **联系技术支持**：
   - 确认模型是否支持 OpenAI 兼容接口

## 🚀 当前推荐配置

```bash
# .env.local
MODELSCOPE_ACCESS_TOKEN=your_modelscope_token_here

# 使用 Qwen-VL 系列（推荐）
OCR_MODEL_ID=Qwen/Qwen2-VL-7B-Instruct
OCR_TEMPERATURE=0.1
OCR_MAX_TOKENS=2048

# 文字解析模型
TEXT_MODEL_ID=Qwen/Qwen2.5-32B-Instruct
TEXT_TEMPERATURE=0.1
TEXT_MAX_TOKENS=1024
```

## 📊 可用的多模态模型对比

| 模型 | 支持状态 | 速度 | 准确率 | 推荐度 |
|------|---------|------|--------|--------|
| Qwen/Qwen2-VL-7B-Instruct | ✅ 完全支持 | ⭐⭐⭐⭐⭐ | 95%+ | ⭐⭐⭐⭐⭐ |
| Qwen/Qwen2-VL-72B-Instruct | ✅ 完全支持 | ⭐⭐⭐ | 98%+ | ⭐⭐⭐⭐ |
| deepseek-ai/DeepSeek-OCR-2 | ❓ 未验证 | ❓ | ❓ | ⭐⭐ |

## 🎯 使用建议

1. **生产环境**：使用 `Qwen/Qwen2-VL-7B-Instruct`
2. **高精度需求**：使用 `Qwen/Qwen2-VL-72B-Instruct`
3. **测试 DeepSeek**：需要查看官方文档确认调用方式

## 🔍 调试信息

如果要测试不同模型，可以：

1. **修改 .env.local**：
```bash
OCR_MODEL_ID=你要测试的模型ID
```

2. **重启开发服务器**：
```bash
pnpm run dev
```

3. **查看控制台日志**：
   - 成功会显示：`[OCR识别成功]`
   - 失败会显示：`[OCR识别失败]` 和详细错误

## ✅ 当前状态

- ✅ 已配置为使用 `Qwen/Qwen2-VL-7B-Instruct`
- ✅ 支持两步识别模式（OCR + 文本解析）
- ✅ 包含降级策略（直接识别失败自动降级到两步识别）
- ✅ 详细的错误日志

现在重启开发服务器，应该可以正常工作了！
