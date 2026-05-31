const path = require('path');

module.exports = {
  apps: [
    {
      name: 'diary-api',
      script: 'dist/index.js',
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      merge_logs: false,
      env: {
        NODE_ENV: 'production',
        TZ: 'Asia/Shanghai'
      }
    },
    {
      name: 'diary-app',
      script: 'python3',
      args: `-m http.server 4000 --directory ${path.join(__dirname, '..', 'dist')}`,
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/app-error.log',
      out_file: './logs/app-out.log',
      merge_logs: false,
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
