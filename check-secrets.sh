#!/bin/bash

# 敏感信息检查脚本
# 在提交代码前运行此脚本，确保没有泄露敏感信息

echo "🔍 检查源代码中的敏感信息..."

# 检查是否有真实的 token
if git grep -E "ms-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}" -- '*.ts' '*.tsx' '*.js' '*.jsx' '*.json' '*.md'; then
    echo "❌ 错误: 发现真实的 ModelScope Token!"
    echo "请将其替换为 'your_modelscope_token_here'"
    exit 1
fi

# 检查 .env.local 是否被误添加
if git ls-files | grep -E "\.env\.local$"; then
    echo "❌ 错误: .env.local 文件不应该被提交到 Git!"
    echo "请运行: git rm --cached .env.local"
    exit 1
fi

# 检查其他可能的敏感信息
if git grep -iE "(password|secret|api_key|apikey).*=.*['\"][\w-]{20,}" -- '*.ts' '*.tsx' '*.js' '*.jsx' '*.json'; then
    echo "⚠️  警告: 发现可能的敏感信息，请检查！"
    exit 1
fi

echo "✅ 检查通过！没有发现敏感信息。"
exit 0
