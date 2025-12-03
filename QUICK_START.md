# 🚀 Scrapi Quick Start Guide

## Two Simple Commands to Run Scrapi

### Option 1: Run Normal Application (User-Facing)
```bash
./start-normal.sh
```
- ✅ Regular Scrapi frontend on port 3000
- ✅ Backend API on port 8001
- ✅ Full web scraping platform

**Access at:** http://localhost:3000

---

### Option 2: Run Admin Console (Management Dashboard)
```bash
./start-admin-console.sh
```
- ✅ Admin console on port 3000
- ✅ Backend API on port 8001
- ✅ User & system management

**Access at:** http://localhost:3000

---

## That's It! 🎉

Both scripts handle:
- Installing all dependencies
- Setting up Playwright browsers
- Starting the correct services
- Switching between modes automatically

For detailed documentation, see: [STARTUP_SCRIPTS.md](./STARTUP_SCRIPTS.md)

---

## Quick Commands

### Check Status
```bash
sudo supervisorctl status
```

### View Logs
```bash
# Backend logs
tail -f /var/log/supervisor/backend.out.log

# Admin console logs
tail -f /var/log/admin-console.log
```

### Switch Modes
```bash
# Switch to normal mode
./start-normal.sh

# Switch to admin console mode
./start-admin-console.sh
```

---

**Happy Scraping! 🎯**
