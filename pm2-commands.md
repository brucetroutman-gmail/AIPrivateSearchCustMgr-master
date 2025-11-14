# PM2 Commands for AI Private Search Customer Manager

## Start Application
```bash
pm2 start ecosystem.config.cjs
```

## Stop Application
```bash
pm2 stop ecosystem.config.cjs
```

## Restart Application
```bash
pm2 restart ecosystem.config.cjs
```

## Delete Application
```bash
pm2 delete ecosystem.config.cjs
```

## Monitor Applications
```bash
pm2 monit
```

## View Logs
```bash
# All logs
pm2 logs

# Frontend logs only
pm2 logs aipscust-frontend

# Backend logs only
pm2 logs aipscust-backend
```

## Application Status
```bash
pm2 status
```

## Save PM2 Configuration (Auto-start on boot)
```bash
pm2 save
pm2 startup
```

## Troubleshooting
```bash
# Check error logs
pm2 logs --err

# Check frontend logs
pm2 logs aipscust-frontend --err

# Check backend logs
pm2 logs aipscust-backend --err

# Delete errored apps and restart
pm2 delete all
pm2 start ecosystem.config.cjs

# Flush logs
pm2 flush
```

## Application URLs
- Frontend: http://localhost:56303
- Backend API: http://localhost:56304