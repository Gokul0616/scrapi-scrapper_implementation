# 🗺️ Scrapi - Powerful Web Scraping Platform

Scrapi is a powerful web scraping platform (Apify clone) built with FastAPI, React, and MongoDB. It features Playwright-based scraping, AI-powered lead engagement, and comprehensive data extraction capabilities.

## 🚀 Quick Start

### Method 1: Simple Starter Script (Recommended)

```bash
# Run the starter script
./starter.sh
```

This will:
- ✅ Install all backend dependencies
- ✅ Install Playwright browsers (Chromium)
- ✅ Install frontend dependencies
- ✅ Start all services automatically

### Method 2: Manual Installation

```bash
# 1. Install backend dependencies
cd /app/backend
pip install -r requirements.txt

# 2. Install Playwright browsers
playwright install chromium

# 3. Install frontend dependencies
cd /app/frontend
yarn install

# 4. Restart all services
sudo supervisorctl restart all
```

### Method 3: Complete Startup Script

```bash
# Run the comprehensive startup script
./startup.sh
```

This provides detailed status checks and verification at each step.

## 🌐 Access Points

After startup, access the application at:

- **Frontend (Web App):** http://localhost:3000
- **Backend API:** http://localhost:8001
- **API Documentation:** http://localhost:8001/docs
- **MongoDB:** mongodb://localhost:27017

## ✨ Features

- **🔐 JWT Authentication** - Secure user registration and login
- **🎭 Playwright Scraping Engine** - Advanced browser automation
- **🗺️ Google Maps Scraper** - Extract business data from Google Maps
- **🛒 Amazon Scraper** - Extract product data from Amazon
- **🤖 AI Lead Chat** - AI-powered lead engagement advice
- **💬 Global Chat Assistant** - Natural language app control
- **🔄 Proxy Management** - Custom proxy rotation system
- **📊 Dataset Management** - Export data in JSON/CSV formats
- **⚡ Real-time Monitoring** - Live run status updates
- **🔗 Social Media Extraction** - Automatic social link detection

## 📝 Useful Commands

### Service Management
```bash
# Check status of all services
sudo supervisorctl status

# Restart all services
sudo supervisorctl restart all

# Restart individual services
sudo supervisorctl restart backend
sudo supervisorctl restart frontend

# Stop all services
sudo supervisorctl stop all
```

### View Logs
```bash
# Backend logs
sudo supervisorctl tail -f backend

# Frontend logs
sudo supervisorctl tail -f frontend

# Backend error logs
tail -f /var/log/supervisor/backend.err.log

# Frontend error logs
tail -f /var/log/supervisor/frontend.err.log
```

## 🛠️ Configuration

### Backend Environment Variables
Edit `/app/backend/.env`:
```env
MONGO_URL=mongodb://localhost:27017/scrapi
JWT_SECRET=your-secret-key-change-in-production
EMERGENT_LLM_KEY=your-emergent-llm-key
OPENAI_API_KEY=your-openai-key
```

### Frontend Environment Variables
Edit `/app/frontend/.env`:
```env
REACT_APP_BACKEND_URL=http://localhost:8001
```

## 🎯 Default Test Account

- **Username:** test
- **Password:** test

Or register a new account through the web interface.

## 🐛 Troubleshooting

### Services won't start
```bash
# Check if MongoDB is running
sudo supervisorctl status mongodb

# Check if ports are available
netstat -tulpn | grep -E '3000|8001|27017'

# View error logs
tail -n 50 /var/log/supervisor/backend.err.log
```

### Playwright browser errors
```bash
# Reinstall Playwright browsers
cd /app/backend
playwright install chromium
```

### Frontend build issues
```bash
# Clear cache and reinstall
cd /app/frontend
rm -rf node_modules
yarn install
sudo supervisorctl restart frontend
```

## 📚 Tech Stack

- **Backend:** FastAPI (Python 3.11+)
- **Frontend:** React 18 with Tailwind CSS
- **Database:** MongoDB
- **Scraping:** Playwright (Chromium)
- **AI:** Emergent LLM / OpenAI GPT
- **Process Manager:** Supervisor
- **Package Manager:** Yarn (Frontend), pip (Backend)

## 🔧 Development

### Backend Development
```bash
cd /app/backend
# Backend auto-reloads on file changes
```

### Frontend Development
```bash
cd /app/frontend
# Frontend hot-reloads on file changes
```

## 📖 API Documentation

Visit http://localhost:8001/docs for interactive API documentation (Swagger UI).

## 🎨 Home Page Fix

The home page now displays:
- ✅ Dynamic actor icons and names (not hardcoded)
- ✅ Proper duration display in seconds
- ✅ Support for all actor types (Google Maps, Amazon, custom scrapers)

## 🚀 Recent Updates

- ✅ Fixed home page to show dynamic actor names instead of hardcoded "Google Maps Scraper"
- ✅ Added `actor_icon` field to Run model
- ✅ Fixed duration display format (now shows seconds correctly)
- ✅ Installed Playwright browsers for web scraping
- ✅ Created comprehensive starter scripts for easy deployment

## 📄 License

Proprietary - All rights reserved.
