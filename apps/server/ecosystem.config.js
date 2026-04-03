module.exports = {
  apps: [
    {
      name: 'qr-order-server',
      script: './apps/server/dist/main.js',
      instances: process.env.PM2_INSTANCES || 1,
      exec_mode: 'cluster',
      kill_timeout: 5000,
      listen_timeout: 10000,
      max_memory_restart: '300M',
      restart_delay: 1000,
      max_restarts: 10,
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
