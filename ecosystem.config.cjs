module.exports = {
  apps: [
    {
      name: 'aipscust-c56303',
      script: 'npx',
      args: 'serve client/c01_client-first-app -l 56303',
      cwd: '/webs/AIPrivateSearch/repo/aiprivatesearchcustmgr',
      env: {
        NODE_ENV: 'production'
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      max_restarts: 5,
      min_uptime: '10s',
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log',
      log_file: './logs/frontend-combined.log',
      time: true
    },
    {
      name: 'aipscust-s56304',
      script: './server/s01_server-first-app/server.mjs',
      cwd: '/webs/AIPrivateSearch/repo/aiprivatesearchcustmgr',
      env: {
        PORT: 56304,
        NODE_ENV: 'production'
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      max_restarts: 5,
      min_uptime: '10s',
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_file: './logs/backend-combined.log',
      time: true
    }
  ]
};