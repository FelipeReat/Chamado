module.exports = {
  apps: [
    {
      name: 'locador-api',
      script: 'dist/api/server.js',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      autorestart: true,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
}
