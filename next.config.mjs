/** @type {import('next').NextConfig} */
const nextConfig = {
  // 严格模式
  reactStrictMode: true,
  
  // 启用SWC压缩
  swcMinify: true,
  
  // 环境变量（客户端可访问的需要NEXT_PUBLIC_前缀）
  env: {
    APP_NAME: '房源信息汇总工具',
    APP_VERSION: '1.0.0',
  },
  
  // 图片优化配置
  images: {
    domains: [],
    formats: ['image/webp'],
  },
  
  // TypeScript配置
  typescript: {
    // 生产构建时是否忽略类型错误（建议开发时修复所有错误）
    ignoreBuildErrors: false,
  },
  
  // ESLint配置
  eslint: {
    // 生产构建时是否忽略ESLint错误（建议开发时修复所有错误）
    ignoreDuringBuilds: false,
  },
  
  // 实验性功能
  experimental: {
    // 服务器Actions配置
    serverActions: {
      bodySizeLimit: '10mb', // 允许上传较大的图片（Base64编码）
    },
  },
};

export default nextConfig;
