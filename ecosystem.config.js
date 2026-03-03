/** @type {import('pm2').StartOptions} */
module.exports = {
  apps: [
    {
      name: 'fy',
      script: 'node_modules/.bin/next',
      args: 'start',

      // 工作目录
      cwd: '/www/wwwroot/fy',

      // 实例数：'max' 使用所有 CPU 核心，生产环境推荐；开发可改为 1
      instances: 1,

      // 启用集群模式（instances > 1 时自动负载均衡）
      exec_mode: 'fork',

      // 环境变量（生产）
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },

      // 环境变量（开发）
      env_development: {
        NODE_ENV: 'development',
        PORT: 3000,
      },

      // 崩溃后自动重启
      autorestart: true,

      // 监听文件变化自动重启（生产环境建议关闭）
      watch: false,

      // 内存超过 512MB 自动重启
      max_memory_restart: '512M',

      // 日志配置
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      out_file: './logs/pm2-out.log',
      error_file: './logs/pm2-error.log',
      merge_logs: true,

      // 进程启动等待时间（ms）
      wait_ready: true,
      listen_timeout: 10000,

      // 优雅关闭等待时间（ms）
      kill_timeout: 5000,

      // 最小运行时间（ms），低于此值视为异常重启
      min_uptime: 3000,

      // 最大重启次数（超过后停止重启，防止无限崩溃循环）
      max_restarts: 10,
    },
  ],
};
