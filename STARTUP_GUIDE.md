# 🚀 Scrapi Application - Startup Guide

Welcome to Scrapi! This guide will help you get started with the application.

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Available Modes](#available-modes)
- [Startup Scripts](#startup-scripts)
- [Troubleshooting](#troubleshooting)
- [Service Management](#service-management)

## ⚡ Quick Start

### Option 1: Interactive Launcher (Recommended)
```bash
bash /app/start-scrapi.sh
```
This will present you with an interactive menu to choose your desired mode.

### Option 2: Direct Script Execution
```bash
# For normal application
bash /app/start-normal.sh

# For admin console
bash /app/start-admin-console.sh

# For landing site
bash /app/start-landing-site.sh
```

## 🎯 Available Modes

### 1. Normal Mode (Main Application)
**Script:** `start-normal.sh`

Runs the main Scrapi application with:
- ✅ React Frontend (port 3000)
- ✅ FastAPI Backend (port 8001)
- ✅ MongoDB Database

**Access:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8001
- API Docs: http://localhost:8001/docs

### 2. Admin Console Mode
**Script:** `start-admin-console.sh`

Runs the administrative interface with:
- ✅ Admin Console UI (port 3000)
- ✅ FastAPI Backend (port 8001)
- ✅ MongoDB Database

**Access:**
- Admin Console: http://localhost:3000
- Backend API: http://localhost:8001
- API Docs: http://localhost:8001/docs

### 3. Landing Site Mode
**Script:** `start-landing-site.sh`

Runs the marketing/landing site with:
- ✅ Landing Site UI (port 3000)
- ✅ FastAPI Backend (port 8001)
- ✅ MongoDB Database

**Access:**
- Landing Site: http://localhost:3000
- Backend API: http://localhost:8001
- API Docs: http://localhost:8001/docs

## 🔧 Startup Scripts

### Main Scripts

| Script | Purpose | Components |
|--------|---------|------------|
| `start-scrapi.sh` | Interactive launcher | Menu-based selection |
| `start-normal.sh` | Start main app | Frontend + Backend |
| `start-admin-console.sh` | Start admin console | Admin Console + Backend |
| `start-landing-site.sh` | Start landing site | Landing Site + Backend |
| `check-dependencies.sh` | Verify dependencies | Diagnostic tool |

### What Each Script Does

All startup scripts perform these steps:
1. ✅ Install/verify backend dependencies (Python packages)
2. ✅ Install/verify Playwright browsers (for scraping)
3. ✅ Install/verify frontend dependencies (Node modules)
4. ✅ Stop conflicting services
5. ✅ Start required services
6. ✅ Verify services are responding

## 🔍 Dependency Checker

Check if all dependencies are properly installed:

```bash
bash /app/check-dependencies.sh
```

This will verify:
- ✅ Python and pip versions
- ✅ Node.js and yarn versions
- ✅ Backend Python packages
- ✅ Frontend Node modules
- ✅ Admin console dependencies
- ✅ Landing site dependencies
- ✅ Playwright browsers

## 🛠️ Service Management

### Check Service Status
```bash
sudo supervisorctl status
```

### Restart Services
```bash
# Restart backend only
sudo supervisorctl restart backend

# Restart frontend only
sudo supervisorctl restart frontend

# Restart all services
sudo supervisorctl restart all
```

### View Logs
```bash
# Backend logs (stdout)
tail -f /var/log/supervisor/backend.out.log

# Backend errors (stderr)
tail -f /var/log/supervisor/backend.err.log

# Frontend logs (stdout)
tail -f /var/log/supervisor/frontend.out.log

# Frontend errors (stderr)
tail -f /var/log/supervisor/frontend.err.log

# Admin console logs
tail -f /var/log/admin-console.log

# Landing site logs
tail -f /var/log/landing-site.log
```

## 🐛 Troubleshooting

### Services Not Starting

1. **Check logs for errors:**
   ```bash
   tail -f /var/log/supervisor/backend.err.log
   tail -f /var/log/supervisor/frontend.err.log
   ```

2. **Verify dependencies:**
   ```bash
   bash /app/check-dependencies.sh
   ```

3. **Reinstall dependencies:**
   ```bash
   # Backend
   cd /app/backend
   pip install -r requirements.txt --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/
   
   # Frontend
   cd /app/frontend
   rm -rf node_modules
   yarn install
   ```

### Port Already in Use

If you see "port already in use" errors:

```bash
# Stop all services
sudo supervisorctl stop all

# Kill any processes on port 3000
lsof -ti:3000 | xargs kill -9

# Kill any processes on port 8001
lsof -ti:8001 | xargs kill -9

# Restart
bash /app/start-normal.sh
```

### Playwright Browser Issues

If Playwright browsers fail to install:

```bash
export PLAYWRIGHT_BROWSERS_PATH=/pw-browsers
playwright install chromium
```

### Frontend Not Loading

1. Wait 10-15 seconds after startup (React/Vite needs time to compile)
2. Check frontend logs: `tail -f /var/log/supervisor/frontend.err.log`
3. Clear browser cache and reload
4. Verify frontend is running: `curl http://localhost:3000`

### Backend API Not Responding

1. Check if backend is running: `sudo supervisorctl status backend`
2. Check backend logs: `tail -f /var/log/supervisor/backend.err.log`
3. Verify MongoDB is running: `sudo supervisorctl status mongodb`
4. Test backend health: `curl http://localhost:8001/health`

### MongoDB Connection Issues

```bash
# Check MongoDB status
sudo supervisorctl status mongodb

# Restart MongoDB
sudo supervisorctl restart mongodb

# Check MongoDB logs
tail -f /var/log/supervisor/mongodb.log
```

## 📦 Dependencies

### Backend (Python)
- FastAPI - Web framework
- Uvicorn - ASGI server
- Motor/PyMongo - MongoDB driver
- Playwright - Web scraping
- Bcrypt - Password hashing
- Many more (see `/app/backend/requirements.txt`)

### Frontend (React)
- React 19 - UI framework
- React Router - Routing
- Axios - HTTP client
- Radix UI - Component library
- Tailwind CSS - Styling
- Many more (see `/app/frontend/package.json`)

### Admin Console (React + Vite)
- React 19 - UI framework
- Vite - Build tool
- React Router - Routing
- Tailwind CSS - Styling
- TypeScript - Type safety

### Landing Site (React + Vite)
- React 19 - UI framework
- Vite - Build tool
- React Router - Routing
- Tailwind CSS - Styling

## 🌐 URLs & Endpoints

### Development URLs
- **Frontend/UI**: http://localhost:3000
- **Backend API**: http://localhost:8001
- **API Documentation**: http://localhost:8001/docs
- **API Redoc**: http://localhost:8001/redoc

### Health Check
```bash
# Check backend health
curl http://localhost:8001/health

# Check frontend
curl http://localhost:3000
```

## 🔄 Switching Between Modes

To switch from one mode to another:

```bash
# From Normal to Admin Console
bash /app/start-admin-console.sh

# From Admin Console to Landing Site
bash /app/start-landing-site.sh

# Back to Normal Mode
bash /app/start-normal.sh
```

**Note:** Each script automatically stops conflicting services before starting.

## 📝 Environment Variables

Environment variables are managed in:
- `/app/backend/.env` - Backend configuration
- `/app/frontend/.env` - Frontend configuration

**Important:** Never commit `.env` files to version control!

## 🤝 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Run the dependency checker: `bash /app/check-dependencies.sh`
3. Check service logs in `/var/log/supervisor/`
4. Ensure all services are running: `sudo supervisorctl status`

## 📄 License

See LICENSE file for details.

---

**Happy Scraping! 🚀**
