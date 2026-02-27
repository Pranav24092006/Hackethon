// PM2 Ecosystem Configuration
// 
// Configuration for PM2 process manager on EC2.
// Requirements: 12.1, 12.6

module.exports = {
  apps: [
    {
      name: 'emergency-route-optimizer',
      script: './dist/index.js',
      instances: 1,
      exec_mode: 'cluster',
      
      // Environment variables
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      
      // Logging
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // Auto-restart configuration
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '500M',
      
      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 3000,
      
      // Watch and reload (disabled in production)
      watch: false,
      ignore_watch: ['node_modules', 'logs', '*.log'],
      
      // Advanced features
      exp_backoff_restart_delay: 100,
    },
  ],
};
