# Deployment Workflow - AI Private Search Customer Manager

## Development & Testing Workflow

### Environment Setup

**Development (macOS):**
- Location: `/Users/Shared/AIPrivateSearch/repo/aiprivatesearchcustmgr`
- Ports: 56303 (frontend), 56304 (backend)
- Start: `./start.sh`

**Production Test (Ubuntu 20+):**
- Location: `/webs/AIPrivateSearch/repo/aiprivatesearchcustmgr`
- URL: `https://custmgr.aiprivatesearch.com`
- Process Manager: PM2
- Reverse Proxy: Caddy

---

## Standard Deployment Process

### 1. Development (macOS)

```bash
# Navigate to project
cd /Users/Shared/AIPrivateSearch/repo/aiprivatesearchcustmgr

# Make your changes
# Edit files as needed

# Test locally
./start.sh

# Verify at http://localhost:56303
```

### 2. Commit Changes

```bash
# Stage changes
git add .

# Commit with version format
git commit -m "v1.21: Description of changes"

# Push to GitHub
git push origin main
```

### 3. Deploy to Ubuntu Server

```bash
# SSH to server
ssh user@your-ubuntu-server

# Navigate to project
cd /webs/AIPrivateSearch/repo/aiprivatesearchcustmgr

# Pull latest changes
git pull origin main

# PM2 will auto-restart, or manually restart:
pm2 restart ecosystem.config.cjs

# Verify deployment
pm2 status
pm2 logs aipscust-c56303 --lines 20
pm2 logs aipscust-s56304 --lines 20
```

### 4. Verify Production

```bash
# Check application status
curl https://custmgr.aiprivatesearch.com/api/health

# Expected response:
# {"status":"healthy","timestamp":"...","service":"aiprivatesearch-custmgr"}

# Test in browser
# https://custmgr.aiprivatesearch.com
```

---

## Quick Reference Commands

### macOS Development

```bash
# Start development server
./start.sh

# Run linting
npm run lint

# Security check
npm run security-check

# Install dependencies
npm run install-all
```

### Ubuntu Server

```bash
# Check PM2 status
pm2 status

# View logs
pm2 logs                          # All logs
pm2 logs aipscust-c56303         # Frontend logs
pm2 logs aipscust-s56304         # Backend logs

# Restart services
pm2 restart ecosystem.config.cjs  # Restart all
pm2 restart aipscust-c56303      # Restart frontend
pm2 restart aipscust-s56304      # Restart backend

# Stop services
pm2 stop ecosystem.config.cjs

# Start services
pm2 start ecosystem.config.cjs

# Monitor in real-time
pm2 monit
```

---

## Troubleshooting

### Issue: Changes not reflecting after git pull

```bash
# Hard reset (careful!)
git fetch origin
git reset --hard origin/main

# Clear PM2 and restart
pm2 delete all
pm2 start ecosystem.config.cjs
```

### Issue: Port already in use

```bash
# Find process using port
lsof -ti :56303
lsof -ti :56304

# Kill process
kill -9 $(lsof -ti :56303)
kill -9 $(lsof -ti :56304)

# Restart PM2
pm2 restart ecosystem.config.cjs
```

### Issue: Database connection errors

```bash
# Check MySQL is running
sudo systemctl status mysql

# Check .env file exists
ls -la /Users/Shared/AIPrivateSearch/.env    # macOS
ls -la /webs/AIPrivateSearch/.env            # Ubuntu

# Test database connection
mysql -u root -p -e "SHOW DATABASES;"
```

### Issue: Frontend not loading

```bash
# Check Caddy configuration
sudo systemctl status caddy

# Check Caddy logs
sudo journalctl -u caddy -n 50

# Verify reverse proxy
curl -I https://custmgr.aiprivatesearch.com
```

---

## Environment Files

### .env Location

**macOS:** `/Users/Shared/AIPrivateSearch/.env`  
**Ubuntu:** `/webs/AIPrivateSearch/.env`

The application tries multiple paths automatically:
1. `/Users/Shared/AIPrivateSearch/.env` (macOS)
2. `/webs/AIPrivateSearch/.env` (Ubuntu)
3. `.env` (local fallback)

### Required Variables

```bash
# Server
NODE_ENV=production
PORT=56304

# Database
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=your_password
DB_DATABASE=aiprivatesearch

# Security
ADMIN_DEFAULT_PASSWORD=123
ALLOWED_ORIGINS=http://localhost:56303,https://custmgr.aiprivatesearch.com

# Optional
JWT_PRIVATE_KEY=auto-generated
JWT_PUBLIC_KEY=auto-generated
```

---

## PM2 Configuration

### ecosystem.config.cjs

```javascript
module.exports = {
  apps: [
    {
      name: 'aipscust-c56303',           // Frontend
      script: 'npx',
      args: 'serve client/c01_client-first-app -l 56303',
      cwd: '/webs/AIPrivateSearch/repo/aiprivatesearchcustmgr',
      instances: 1,
      autorestart: true,
      max_memory_restart: '512M'
    },
    {
      name: 'aipscust-s56304',           // Backend
      script: './server/s01_server-first-app/server.mjs',
      cwd: '/webs/AIPrivateSearch/repo/aiprivatesearchcustmgr',
      env: { PORT: 56304, NODE_ENV: 'production' },
      instances: 1,
      autorestart: true,
      max_memory_restart: '1G'
    }
  ]
};
```

---

## Caddy Reverse Proxy

### Expected Configuration

```caddy
custmgr.aiprivatesearch.com {
    reverse_proxy localhost:56303
    
    # API requests go to backend
    handle /api/* {
        reverse_proxy localhost:56304
    }
}
```

---

## Health Checks

### Backend Health Check

```bash
curl http://localhost:56304/api/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "service": "aiprivatesearch-custmgr"
}
```

### Frontend Health Check

```bash
curl -I http://localhost:56303
```

**Expected Response:**
```
HTTP/1.1 200 OK
```

### Licensing Service Check

```bash
curl http://localhost:56304/api/licensing/status
```

**Expected Response:**
```json
{
  "service": "AIPrivateSearch Licensing",
  "status": "active",
  "version": "1.0.0",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

## Deployment Checklist

### Before Deployment

- [ ] Code changes tested locally on macOS
- [ ] ESLint passes (`npm run lint`)
- [ ] Security check passes (`npm run security-check`)
- [ ] Changes committed with proper version message
- [ ] Changes pushed to GitHub

### During Deployment

- [ ] SSH to Ubuntu server
- [ ] Navigate to project directory
- [ ] Run `git pull`
- [ ] Check PM2 status
- [ ] Review logs for errors

### After Deployment

- [ ] Test health endpoint
- [ ] Test login functionality
- [ ] Test licensing endpoints
- [ ] Verify in browser
- [ ] Check PM2 logs for errors

---

## Rollback Procedure

If deployment fails:

```bash
# On Ubuntu server
cd /webs/AIPrivateSearch/repo/aiprivatesearchcustmgr

# View commit history
git log --oneline -10

# Rollback to previous commit
git reset --hard <commit-hash>

# Restart services
pm2 restart ecosystem.config.cjs

# Verify
pm2 logs
```

---

## Monitoring

### Real-time Monitoring

```bash
# PM2 monitoring dashboard
pm2 monit

# Tail logs
pm2 logs --lines 100

# Watch specific service
watch -n 2 'pm2 status'
```

### Log Files

**PM2 Logs:**
- `/webs/AIPrivateSearch/repo/aiprivatesearchcustmgr/logs/frontend-error.log`
- `/webs/AIPrivateSearch/repo/aiprivatesearchcustmgr/logs/frontend-out.log`
- `/webs/AIPrivateSearch/repo/aiprivatesearchcustmgr/logs/backend-error.log`
- `/webs/AIPrivateSearch/repo/aiprivatesearchcustmgr/logs/backend-out.log`

**Application Logs:**
- `/webs/AIPrivateSearch/repo/aiprivatesearchcustmgr/logs/backend-startup.log`

---

## Best Practices

1. **Always test locally first** - Use `./start.sh` on macOS before deploying
2. **Use descriptive commit messages** - Follow `vX.XX: description` format
3. **Check logs after deployment** - Verify no errors in PM2 logs
4. **Keep .env in sync** - Ensure environment variables match between environments
5. **Monitor PM2 status** - Check `pm2 status` regularly
6. **Backup before major changes** - Consider database backups for schema changes

---

## Contact & Support

**Repository:** GitHub (private)  
**Production URL:** https://custmgr.aiprivatesearch.com  
**Development:** macOS local environment  
**Testing:** Ubuntu 20+ server
