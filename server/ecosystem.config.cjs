module.exports = {
  apps: [
    {
      name: 'diary-api',
      script: 'dist/index.js',
      cwd: '/Users/yezi/Coding/Obsidian Diary Post/server',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      merge_logs: false,
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'diary-app',
      script: 'serve',
      args: '-s -l 4000',
      cwd: '/Users/yezi/Coding/Obsidian Diary Post',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './server/logs/app-error.log',
      out_file: './server/logs/app-out.log',
      merge_logs: false,
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
}