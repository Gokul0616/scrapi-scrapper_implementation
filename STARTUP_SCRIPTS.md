# Scrapi Startup Scripts

This document explains the two startup scripts available for running Scrapi in different configurations.

## 📋 Available Scripts

### 1. **start-normal.sh** - Regular Frontend + Backend
```bash
./start-normal.sh
```

**What it does:**
- ✅ Installs backend Python dependencies from `requirements.txt`
- ✅ Installs Playwright browsers (Chromium) for web scraping
- ✅ Installs frontend dependencies (React app)
- ✅ Stops any running admin console
- ✅ Starts backend API on port 8001
- ✅ Starts regular frontend on port 3000

**Use this when:**
- You want to run the standard Scrapi application
- You need the user-facing scraping interface
- You're working on regular features and development

**Access URLs:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8001
- API Docs: http://localhost:8001/docs

---

### 2. **start-admin-console.sh** - Admin Console + Backend
```bash
./start-admin-console.sh
```

**What it does:**
- ✅ Installs backend Python dependencies from `requirements.txt`
- ✅ Installs Playwright browsers (Chromium) for web scraping
- ✅ Installs admin console dependencies (Vite + React + TypeScript)
- ✅ Stops regular frontend service
- ✅ Starts backend API on port 8001
- ✅ Starts admin console on port 3000

**Use this when:**
- You want to access the admin/management dashboard
- You need to manage users, actors, and system settings
- You're working on admin features or SEO optimization

**Access URLs:**
- Admin Console: http://localhost:3000
- Backend API: http://localhost:8001
- API Docs: http://localhost:8001/docs

---

## 🚀 Quick Start

### First Time Setup (Normal Mode)
```bash
cd /app
./start-normal.sh
```

### Switch to Admin Console Mode
```bash
cd /app
./start-admin-console.sh
```

### Switch Back to Normal Mode
```bash
cd /app
./start-normal.sh
```

---

## 🔧 Troubleshooting

### Check Service Status
```bash
sudo supervisorctl status
```

### View Backend Logs
```bash
# Real-time logs
tail -f /var/log/supervisor/backend.out.log

# Error logs
tail -f /var/log/supervisor/backend.err.log
```

### View Frontend Logs (Normal Mode)
```bash
tail -f /var/log/supervisor/frontend.out.log
```

### View Admin Console Logs
```bash
tail -f /var/log/admin-console.log
```

### Restart Services Manually

**Backend:**
```bash
sudo supervisorctl restart backend
```

**Frontend (Normal Mode):**
```bash
sudo supervisorctl restart frontend
```

**Admin Console:**
```bash
# Stop admin console
pkill -f "scrapi-admin-console"

# Start admin console
cd /app/scrapi-admin-console
yarn dev &
```

### Check Which Frontend is Running
```bash
# Check if normal frontend is running
ps aux | grep "craco" | grep -v grep

# Check if admin console is running
ps aux | grep "vite" | grep -v grep

# Check port 3000
netstat -tlnp | grep 3000
```

---

## 📁 File Locations

- **Backend**: `/app/backend/`
- **Regular Frontend**: `/app/frontend/`
- **Admin Console**: `/app/scrapi-admin-console/`
- **Backend Logs**: `/var/log/supervisor/backend.*.log`
- **Frontend Logs**: `/var/log/supervisor/frontend.*.log`
- **Admin Console Logs**: `/var/log/admin-console.log`

---

## ⚙️ Script Details

### Dependencies Installed

**Backend (both scripts):**
- FastAPI, Uvicorn
- Playwright (web scraping)
- MongoDB drivers (Motor, PyMongo)
- OpenAI, Emergent Integrations
- BeautifulSoup, LXML (parsing)
- JWT, authentication libraries
- And more (see `requirements.txt`)

**Frontend (start-normal.sh):**
- React + CRA with Craco
- Tailwind CSS
- Axios, React Router
- UI libraries

**Admin Console (start-admin-console.sh):**
- React 19
- Vite (build tool)
- TypeScript
- Tailwind CSS v4
- React Router v7
- Lucide React (icons)

---

## 💡 Tips

1. **Always use the scripts** instead of manually starting services to ensure all dependencies are installed.

2. **Only one frontend can run at a time** on port 3000. The scripts handle switching automatically.

3. **Backend stays the same** in both modes - only the frontend changes.

4. **Logs are your friend** - always check logs if something isn't working.

5. **Admin console runs in background** - use `pkill -f "scrapi-admin-console"` to stop it.

---

## 🔄 Switch Between Modes

The scripts are designed to cleanly switch between modes:

```bash
# Currently in normal mode? Switch to admin console:
./start-admin-console.sh

# Currently in admin console? Switch to normal:
./start-normal.sh
```

Each script:
- Stops the other frontend automatically
- Ensures only one frontend runs on port 3000
- Restarts backend for clean state
- Shows status of all services

---

## 🐛 Common Issues

### Issue: "Port 3000 already in use"
**Solution:**
```bash
# Find what's using port 3000
sudo lsof -i :3000

# Kill the process
sudo kill -9 <PID>

# Or stop both frontends
sudo supervisorctl stop frontend
pkill -f "scrapi-admin-console"
```

### Issue: "Module not found" errors
**Solution:**
```bash
# Re-run the script to reinstall dependencies
./start-normal.sh  # or ./start-admin-console.sh
```

### Issue: Backend not responding
**Solution:**
```bash
# Check backend logs
tail -f /var/log/supervisor/backend.err.log

# Restart backend
sudo supervisorctl restart backend
```

### Issue: Admin console not loading
**Solution:**
```bash
# Check admin console logs
tail -f /var/log/admin-console.log

# Restart admin console
pkill -f "scrapi-admin-console"
cd /app/scrapi-admin-console
yarn dev &
```

---

## 📞 Need Help?

If you encounter issues:
1. Check the logs (see Troubleshooting section)
2. Verify services are running: `sudo supervisorctl status`
3. Ensure you're on the correct git branch
4. Try restarting the relevant service

---

**Happy Scraping! 🚀**
