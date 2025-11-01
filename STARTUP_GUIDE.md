# 🚀 Scrapi Application - Complete Startup Guide

## 📋 Table of Contents
1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Prerequisites](#prerequisites)
4. [Installation](#installation)
5. [Application Architecture](#application-architecture)
6. [Features](#features)
7. [Configuration](#configuration)
8. [Service Management](#service-management)
9. [API Documentation](#api-documentation)
10. [Troubleshooting](#troubleshooting)
11. [Development](#development)

---

## 🎯 Overview

**Scrapi** is a powerful web scraping platform built as an Apify clone. It provides enterprise-grade web scraping capabilities with AI-powered features, proxy management, and a modern user interface.

### Tech Stack
- **Backend**: FastAPI (Python 3.11)
- **Frontend**: React 18
- **Database**: MongoDB
- **Scraping Engine**: Playwright (Chromium)
- **AI Integration**: OpenAI GPT / Emergent LLM
- **Process Management**: Supervisor

---

## ⚡ Quick Start

### One-Command Startup

Simply run the startup script to install all dependencies and start the application:

```bash
cd /app
./startup.sh
```

This script will:
1. ✅ Check all prerequisites (Python, Node.js, Yarn, MongoDB)
2. ✅ Install backend Python dependencies
3. ✅ Install Playwright browsers (Chromium)
4. ✅ Install frontend Node.js dependencies
5. ✅ Verify environment configuration
6. ✅ Start MongoDB service
7. ✅ Start backend server (FastAPI on port 8001)
8. ✅ Start frontend server (React on port 3000)

### Access the Application

Once started, access the application at:
- **Web Interface**: http://localhost:3000
- **API Backend**: http://localhost:8001
- **API Documentation**: http://localhost:8001/docs

---

## 📦 Prerequisites

### System Requirements
- **OS**: Linux (Debian/Ubuntu recommended)
- **CPU**: 2+ cores recommended
- **RAM**: 4GB minimum, 8GB recommended
- **Disk**: 5GB+ free space

### Required Software

The startup script will check for these automatically:

1. **Python 3.11+**
   ```bash
   python3 --version
   ```

2. **Node.js 18+**
   ```bash
   node --version
   ```

3. **Yarn Package Manager**
   ```bash
   yarn --version
   ```

4. **MongoDB**
   ```bash
   mongod --version
   ```

5. **Supervisor** (for process management)
   ```bash
   supervisorctl --version
   ```

---

## 🔧 Installation

### Manual Installation Steps

If you prefer to install components manually:

#### 1. Backend Setup

```bash
cd /app/backend

# Install Python dependencies
pip install -r requirements.txt

# Install Playwright browsers
playwright install chromium
playwright install-deps chromium
```

#### 2. Frontend Setup

```bash
cd /app/frontend

# Install Node.js dependencies (use Yarn, NOT npm)
yarn install
```

#### 3. Environment Configuration

**Backend (.env)**
```bash
cd /app/backend
cat > .env << 'EOF'
MONGO_URL=mongodb://localhost:27017/scrapi
JWT_SECRET=your-secret-key-change-in-production
EMERGENT_LLM_KEY=your-emergent-llm-key
OPENAI_API_KEY=your-openai-api-key
EOF
```

**Frontend (.env)**
```bash
cd /app/frontend
cat > .env << 'EOF'
REACT_APP_BACKEND_URL=http://localhost:8001
EOF
```

#### 4. Start Services

```bash
# Start MongoDB
sudo systemctl start mongodb  # or mongod

# Start Backend
sudo supervisorctl start backend

# Start Frontend
sudo supervisorctl start frontend
```

---

## 🏗️ Application Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     SCRAPI ARCHITECTURE                     │
└─────────────────────────────────────────────────────────────┘

┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│              │         │              │         │              │
│   Frontend   │────────▶│   Backend    │────────▶│   MongoDB    │
│  React App   │  HTTP   │  FastAPI     │  Async  │   Database   │
│  Port: 3000  │         │  Port: 8001  │         │  Port: 27017 │
│              │         │              │         │              │
└──────────────┘         └──────────────┘         └──────────────┘
                                 │
                                 │
                                 ▼
                         ┌──────────────┐
                         │              │
                         │  Playwright  │
                         │   Scraping   │
                         │    Engine    │
                         │              │
                         └──────────────┘
```

### Component Details

#### Frontend (React)
- **Location**: `/app/frontend`
- **Port**: 3000
- **Main Pages**:
  - Home: Dashboard with recent activity
  - Store: Browse available scrapers
  - Actors: Manage scraping actors
  - Runs: Monitor scraping jobs
  - Datasets: View and export scraped data

#### Backend (FastAPI)
- **Location**: `/app/backend`
- **Port**: 8001
- **Key Modules**:
  - `server.py`: Main FastAPI application
  - `routes.py`: API endpoints
  - `auth.py`: JWT authentication
  - `models.py`: MongoDB data models
  - `scraper_engine.py`: Core scraping engine
  - `google_maps_scraper_v3.py`: Google Maps scraper
  - `global_chat_service_v2.py`: AI chat assistant
  - `task_manager.py`: Parallel task execution

#### Database (MongoDB)
- **Port**: 27017
- **Database Name**: scrapi
- **Collections**:
  - `users`: User accounts
  - `actors`: Scraper definitions
  - `runs`: Scraping job executions
  - `datasets`: Scraped data storage
  - `dataset_items`: Individual scraped records
  - `proxies`: Proxy server configurations
  - `lead_chats`: Lead-specific AI conversations
  - `global_chat_history`: Global chat conversations

---

## ✨ Features

### 🔐 Authentication System
- JWT-based authentication
- Secure password hashing with bcrypt
- User registration and login
- Protected API endpoints
- Session management

### 🤖 Scraping Engine
- **Playwright-based**: Browser automation with anti-detection
- **Google Maps Scraper V3**: Extract business information
  - Business names, addresses, phone numbers
  - Ratings, reviews, categories
  - Opening hours, price levels
  - Email addresses (from websites)
  - Social media links (6 platforms)
  - Geographic data (city, state, country code)

### 🧠 AI-Powered Features
- **Lead Chat Assistant**: Personalized engagement advice
- **Global Chat Assistant**: App help with function calling
- **Natural Language Processing**: Create scraping jobs from chat
- **Outreach Template Generation**: AI-generated email templates

### 🔄 Proxy Management
- Custom proxy rotation system
- Health monitoring
- Auto-rotation on failures
- Free proxy fetching
- Statistics tracking

### 📊 Dataset Management
- View scraped data in table format
- Export to JSON/CSV
- Real-time updates
- Pagination and filtering
- Social media link extraction

### ⚙️ Advanced Features
- **Parallel Task Execution**: Run multiple scraping jobs simultaneously
- **Real-time Monitoring**: Live status updates for running jobs
- **Background Processing**: Non-blocking scraping operations
- **Error Handling**: Retry logic and graceful failures
- **Progress Tracking**: Detailed logging with emojis

---

## ⚙️ Configuration

### Environment Variables

#### Backend Configuration (`/app/backend/.env`)

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `MONGO_URL` | MongoDB connection string | Yes | `mongodb://localhost:27017/scrapi` |
| `JWT_SECRET` | Secret key for JWT tokens | Yes | - |
| `EMERGENT_LLM_KEY` | Emergent AI API key | No | - |
| `OPENAI_API_KEY` | OpenAI API key | No | - |

**Example:**
```env
MONGO_URL=mongodb://localhost:27017/scrapi
JWT_SECRET=super-secret-key-change-me-in-production
EMERGENT_LLM_KEY=emg_xxx_your_key_here
OPENAI_API_KEY=sk-xxx-your-openai-key
```

#### Frontend Configuration (`/app/frontend/.env`)

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `REACT_APP_BACKEND_URL` | Backend API URL | Yes | `http://localhost:8001` |

**Example:**
```env
REACT_APP_BACKEND_URL=http://localhost:8001
```

### Port Configuration

| Service | Port | Protocol | Purpose |
|---------|------|----------|---------|
| Frontend | 3000 | HTTP | React development server |
| Backend | 8001 | HTTP | FastAPI application |
| MongoDB | 27017 | TCP | Database server |

**Note**: Ports are managed by supervisor and should not be changed without updating supervisor configuration.

---

## 🎮 Service Management

### Using Supervisor

All services are managed by Supervisor for reliability and automatic restart.

#### Check Status
```bash
sudo supervisorctl status
```

Expected output:
```
backend    RUNNING   pid 861, uptime 0:10:00
frontend   RUNNING   pid 874, uptime 0:10:00
mongodb    RUNNING   pid 32, uptime 1:00:00
```

#### Restart Services
```bash
# Restart backend only
sudo supervisorctl restart backend

# Restart frontend only
sudo supervisorctl restart frontend

# Restart all services
sudo supervisorctl restart all
```

#### Stop Services
```bash
# Stop specific service
sudo supervisorctl stop backend

# Stop all services
sudo supervisorctl stop all
```

#### View Logs
```bash
# Follow backend logs
sudo supervisorctl tail -f backend

# Follow frontend logs
sudo supervisorctl tail -f frontend

# View last 100 lines of backend errors
tail -n 100 /var/log/supervisor/backend.err.log

# View last 100 lines of frontend errors
tail -n 100 /var/log/supervisor/frontend.err.log
```

### Manual Service Start (Development)

If you need to run services manually (not recommended for production):

#### Backend
```bash
cd /app/backend
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

#### Frontend
```bash
cd /app/frontend
yarn start
```

---

## 📚 API Documentation

### Interactive API Docs

FastAPI provides automatic interactive API documentation:

- **Swagger UI**: http://localhost:8001/docs
- **ReDoc**: http://localhost:8001/redoc

### Key API Endpoints

#### Authentication
```
POST   /api/auth/register      - Register new user
POST   /api/auth/login         - Login with username/email
GET    /api/auth/me            - Get current user info
```

#### Actors (Scrapers)
```
GET    /api/actors             - List all actors
GET    /api/actors/{id}        - Get actor details
POST   /api/actors             - Create new actor
PATCH  /api/actors/{id}        - Update actor
DELETE /api/actors/{id}        - Delete actor
GET    /api/actors-used        - Get actors with run history
```

#### Runs (Scraping Jobs)
```
GET    /api/runs               - List all runs (paginated)
GET    /api/runs/{id}          - Get run details
POST   /api/runs               - Create new run
DELETE /api/runs/{id}          - Delete run
```

#### Datasets (Scraped Data)
```
GET    /api/datasets/{run_id}/items     - Get dataset items
GET    /api/datasets/{run_id}/export    - Export dataset (JSON/CSV)
```

#### AI Chat
```
POST   /api/chat/global                     - Global chat (app help)
GET    /api/chat/global/history             - Get chat history
DELETE /api/chat/global/history             - Clear chat history
POST   /api/leads/{lead_id}/chat            - Lead-specific chat
GET    /api/leads/{lead_id}/chat            - Get lead chat history
POST   /api/leads/{lead_id}/outreach-template - Generate outreach template
```

#### Proxies
```
GET    /api/proxies            - List proxies
POST   /api/proxies            - Add proxy
DELETE /api/proxies/{id}       - Delete proxy
GET    /api/proxies/health     - Check proxy health
POST   /api/proxies/fetch-free - Fetch free proxies
```

### Authentication

Most endpoints require authentication using JWT tokens.

1. **Register** or **Login** to get a token
2. Include token in requests:
   ```
   Authorization: Bearer <your-jwt-token>
   ```

---

## 🐛 Troubleshooting

### Common Issues

#### 1. Services Won't Start

**Symptoms**: Backend or frontend shows "STOPPED" status

**Solutions**:
```bash
# Check if ports are in use
sudo netstat -tulpn | grep -E '3000|8001'

# Kill processes using the ports
sudo kill -9 $(sudo lsof -t -i:3000)
sudo kill -9 $(sudo lsof -t -i:8001)

# Restart services
sudo supervisorctl restart all
```

#### 2. MongoDB Connection Failed

**Symptoms**: Backend logs show "Connection refused" or "MongoDB not found"

**Solutions**:
```bash
# Check MongoDB status
sudo systemctl status mongodb

# Start MongoDB
sudo systemctl start mongodb

# Check if MongoDB is listening
sudo netstat -tulpn | grep 27017

# Test connection
mongosh --eval "db.runCommand({ connectionStatus: 1 })"
```

#### 3. Chromium/Playwright Issues

**Symptoms**: Scraping jobs fail with "Browser not found"

**Solutions**:
```bash
# Reinstall Playwright browsers
cd /app/backend
playwright install chromium
playwright install-deps chromium

# Check Playwright installation
playwright --version
```

#### 4. Frontend Build Errors

**Symptoms**: Frontend shows blank page or errors in console

**Solutions**:
```bash
cd /app/frontend

# Clear cache and reinstall
rm -rf node_modules yarn.lock
yarn install

# Check for environment variables
cat .env

# Restart frontend
sudo supervisorctl restart frontend
```

#### 5. Backend API Errors

**Symptoms**: API returns 500 errors or crashes

**Solutions**:
```bash
# Check backend logs
tail -n 100 /var/log/supervisor/backend.err.log

# Check environment variables
cd /app/backend
cat .env

# Verify Python dependencies
pip list | grep -E 'fastapi|playwright|pymongo'

# Restart backend
sudo supervisorctl restart backend
```

#### 6. AI Chat Not Working

**Symptoms**: Chat returns errors or generic messages

**Solutions**:
```bash
# Check if API keys are set
cd /app/backend
grep -E 'OPENAI_API_KEY|EMERGENT_LLM_KEY' .env

# Check backend logs for LLM errors
tail -f /var/log/supervisor/backend.err.log | grep -i 'llm\|openai\|chat'

# Restart backend after updating keys
sudo supervisorctl restart backend
```

### Log Locations

```bash
# Backend Logs
/var/log/supervisor/backend.out.log     # Standard output
/var/log/supervisor/backend.err.log     # Error output

# Frontend Logs
/var/log/supervisor/frontend.out.log    # Standard output
/var/log/supervisor/frontend.err.log    # Error output

# MongoDB Logs
/var/log/mongodb/mongod.log             # MongoDB logs

# Supervisor Logs
/var/log/supervisor/supervisord.log     # Supervisor main log
```

### Health Check Commands

```bash
# Check all services
sudo supervisorctl status

# Test backend API
curl http://localhost:8001/api/health

# Test frontend
curl http://localhost:3000

# Test MongoDB
mongosh --eval "db.serverStatus()"

# Check system resources
free -h    # Memory
df -h      # Disk space
top        # CPU and processes
```

---

## 💻 Development

### Project Structure

```
/app/
├── backend/                      # Backend (FastAPI)
│   ├── server.py                # Main application
│   ├── routes.py                # API endpoints
│   ├── auth.py                  # Authentication
│   ├── models.py                # Data models
│   ├── scraper_engine.py        # Scraping engine
│   ├── google_maps_scraper_v3.py # Google Maps scraper
│   ├── global_chat_service_v2.py # AI chat
│   ├── task_manager.py          # Task management
│   ├── proxy_manager.py         # Proxy handling
│   ├── requirements.txt         # Python dependencies
│   └── .env                     # Environment config
│
├── frontend/                     # Frontend (React)
│   ├── src/
│   │   ├── pages/               # React pages
│   │   ├── components/          # React components
│   │   ├── contexts/            # React contexts
│   │   └── App.js               # Main app component
│   ├── public/                  # Static assets
│   ├── package.json             # Node dependencies
│   └── .env                     # Environment config
│
├── tests/                       # Test files
├── startup.sh                   # Startup script
├── STARTUP_GUIDE.md            # This file
└── test_result.md              # Testing documentation
```

### Adding New Dependencies

#### Backend (Python)
```bash
cd /app/backend

# Add package to requirements.txt
echo "new-package==1.0.0" >> requirements.txt

# Install
pip install -r requirements.txt

# Restart backend
sudo supervisorctl restart backend
```

#### Frontend (Node.js)
```bash
cd /app/frontend

# Add package with Yarn (NOT npm)
yarn add new-package

# Restart frontend
sudo supervisorctl restart frontend
```

### Creating New Scrapers

1. **Create scraper file**: `/app/backend/my_scraper.py`
2. **Implement scraper class**: Extend `BaseScraper`
3. **Register in server.py**: Add to startup event
4. **Test scraper**: Create actor and run

Example:
```python
# my_scraper.py
from base_scraper import BaseScraper

class MyCustomScraper(BaseScraper):
    async def scrape(self, input_data: dict):
        # Your scraping logic here
        results = []
        # ... scrape data ...
        return results
```

### Running Tests

```bash
# Backend tests
cd /app/backend
pytest tests/

# Frontend tests
cd /app/frontend
yarn test

# End-to-end tests
python /app/backend_test.py
```

---

## 📝 Default Credentials

For testing purposes, you can use:

- **Username**: test
- **Password**: test

Or register a new account through the UI.

---

## 🔒 Security Considerations

### Production Deployment

Before deploying to production:

1. **Change JWT Secret**
   ```bash
   # Generate secure random secret
   openssl rand -base64 32
   ```

2. **Use Environment Variables**
   - Never commit `.env` files to version control
   - Use secure secret management (AWS Secrets Manager, etc.)

3. **Enable HTTPS**
   - Use reverse proxy (Nginx, Traefik)
   - Configure SSL certificates

4. **Database Security**
   - Enable MongoDB authentication
   - Use strong passwords
   - Restrict network access

5. **API Rate Limiting**
   - Implement rate limiting on endpoints
   - Use API keys for external access

---

## 📞 Support

For issues or questions:

1. Check this documentation
2. Review logs in `/var/log/supervisor/`
3. Check `test_result.md` for known issues
4. Review API documentation at `/docs`

---

## 📄 License

This project is proprietary software. All rights reserved.

---

## 🎉 Quick Reference Card

```bash
# Start application
./startup.sh

# Check status
sudo supervisorctl status

# View logs
sudo supervisorctl tail -f backend
sudo supervisorctl tail -f frontend

# Restart services
sudo supervisorctl restart all

# Access application
# Web:  http://localhost:3000
# API:  http://localhost:8001/docs
```

---

**Last Updated**: Generated during application startup
**Version**: 1.0.0
**Platform**: Scrapi - Web Scraping Platform
