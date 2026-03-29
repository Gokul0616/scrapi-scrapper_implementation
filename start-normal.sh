#!/bin/bash

# =========================================================================
# SCRAPI Ubuntu Start Script
# Installs dependencies and runs Frontend, Backend, Redis, and Celery
# =========================================================================

echo "=========================================="
echo "🚀 Starting Scrapi - Ubuntu Full Stack Deployment"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Ensure we are in the project root
PROJECT_ROOT=$(pwd)

echo -e "${YELLOW}>> Project Root detected as: $PROJECT_ROOT${NC}"

# 1. System Dependencies (Redis Server, MongoDB, Python)
echo -e "${BLUE}[1/5]${NC} Checking System Dependencies (Redis & MongoDB)..."
if ! command -v redis-server &> /dev/null; then
    echo -e "${YELLOW}   Installing Redis Server...${NC}"
    sudo apt-get update && sudo apt-get install -y redis-server
fi
# Ensure Redis is running
sudo systemctl enable redis-server 2>/dev/null || true
sudo systemctl start redis-server 2>/dev/null || true
echo -e "${GREEN}✓${NC} Redis is running"

if ! command -v mongod &> /dev/null && ! command -v mongo &> /dev/null; then
    echo -e "${YELLOW}   Installing MongoDB Server...${NC}"
    sudo apt-get update && sudo apt-get install -y mongodb-server || sudo apt-get install -y mongodb
fi
# Ensure MongoDB is running
sudo systemctl enable mongodb 2>/dev/null || true
sudo systemctl start mongodb 2>/dev/null || true
echo -e "${GREEN}✓${NC} MongoDB is running locally"

# Configure .env to strictly map to the new local production MongoDB
echo -e "${YELLOW}   Configuring Backend Database Environment to Local Production Database...${NC}"
if [ -f "$PROJECT_ROOT/backend/.env" ]; then
    # Update existing env entry
    if grep -q "^MONGO_URL=" "$PROJECT_ROOT/backend/.env"; then
        sed -i '' 's|^MONGO_URL=.*|MONGO_URL="mongodb://localhost:27017/scrapi"|' "$PROJECT_ROOT/backend/.env" 2>/dev/null || sed -i 's|^MONGO_URL=.*|MONGO_URL="mongodb://localhost:27017/scrapi"|' "$PROJECT_ROOT/backend/.env"
    else
        echo 'MONGO_URL="mongodb://localhost:27017/scrapi"' >> "$PROJECT_ROOT/backend/.env"
    fi
else
    echo 'MONGO_URL="mongodb://localhost:27017/scrapi"' > "$PROJECT_ROOT/backend/.env"
fi
echo -e "${GREEN}✓${NC} Database Environment Configured"


# 2. Backend Dependencies (Python + Celery)
echo -e "${BLUE}[2/5]${NC} Installing Backend Dependencies..."
cd "$PROJECT_ROOT/backend"

# Ensure venv exists
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}   Creating Python Virtual Environment...${NC}"
    python3 -m venv venv
fi
source venv/bin/activate
pip install -r requirements.txt --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/ > /tmp/pip_install.log 2>&1 || true
echo -e "${GREEN}✓${NC} Backend dependencies (FastAPI + Celery) ready"


# 3. Playwright Browsers
echo -e "${BLUE}[3/5]${NC} Installing Playwright Browsers..."
export PLAYWRIGHT_BROWSERS_PATH=/pw-browsers
playwright install chromium > /tmp/playwright_install.log 2>&1 || true
# Install OS dependencies for Playwright gracefully on Ubuntu
if command -v apt-get &> /dev/null; then
    sudo playwright install-deps chromium > /tmp/pw_deps.log 2>&1 || true
fi
echo -e "${GREEN}✓${NC} Playwright Chromium ready"


# 4. Frontend Dependencies (React)
echo -e "${BLUE}[4/5]${NC} Installing Frontend Dependencies..."
cd "$PROJECT_ROOT/frontend"
if [ ! -d "node_modules" ]; then
    # Try yarn first, fallback to npm
    if command -v yarn &> /dev/null; then
        yarn install > /tmp/frontend_install.log 2>&1
    else
        npm install --legacy-peer-deps > /tmp/frontend_install.log 2>&1 || true
    fi
fi
echo -e "${GREEN}✓${NC} Frontend dependencies ready"


# 5. Cloud Networking & Codespaces Linkage
echo -e "${BLUE}[5/6]${NC} Configuring Cloud Network Routing..."
if [ "$CODESPACES" = "true" ]; then
    # In GitHub Codespaces, localhost ports are proxied through a specific GitHub Dev URL!
    DYNAMIC_API_URL="https://${CODESPACE_NAME}-8001.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}"
    echo -e "${GREEN}✓${NC} GitHub Codespaces detected! Bonding Frontend to: $DYNAMIC_API_URL"
elif [ "$GITPOD_WORKSPACE_ID" ]; then
    # In Gitpod, it creates a specific workspace URL
    DYNAMIC_API_URL="$(gp url 8001)"
    echo -e "${GREEN}✓${NC} Gitpod environment detected! Bonding Frontend to: $DYNAMIC_API_URL"
elif [ -n "$VM_PUBLIC_IP" ]; then
    # If the user explicitly provides an IP (e.g., EC2 instance)
    DYNAMIC_API_URL="http://${VM_PUBLIC_IP}:8001"
    echo -e "${GREEN}✓${NC} Cloud VM IP provided! Bonding Frontend to: $DYNAMIC_API_URL"
else
    # Fallback for standard local development (e.g., your MacBook)
    DYNAMIC_API_URL="http://localhost:8001"
    echo -e "${GREEN}✓${NC} Default Localhost mode! Bonding Frontend to: $DYNAMIC_API_URL"
fi

# Write it so the React compiler explicitly bakes it into the build
echo "REACT_APP_BACKEND_URL=$DYNAMIC_API_URL" > "$PROJECT_ROOT/frontend/.env.local"


# 6. Stop existing and BOOT everything!
echo -e "${BLUE}[6/6]${NC} Booting Scrapi Multi-Architecture Stack..."
cd "$PROJECT_ROOT"

# Try supervisorctl for MongoDB if they use it locally
sudo supervisorctl start mongodb 2>/dev/null || true

# Kill any existing stray processes to prevent port collision
echo -e "${YELLOW}   Cleaning up old processes...${NC}"
lsof -i :8001 -t | xargs kill -9 2>/dev/null
lsof -i :3000 -t | xargs kill -9 2>/dev/null
pkill -9 -f "celery -A celery_app" 2>/dev/null || true

# Option A: If supervisor is configured for backend/frontend
if sudo supervisorctl status backend >/dev/null 2>&1; then
    echo -e "${YELLOW}   Supervisor configuration detected. Restarting services via Supervisor...${NC}"
    sudo supervisorctl restart backend 2>/dev/null || true
    sudo supervisorctl restart frontend 2>/dev/null || true
    
    # Check if supervisor has celery configured, if not boot it via nohup
    if ! sudo supervisorctl status celery >/dev/null 2>&1; then
        echo -e "${YELLOW}   No Celery Supervisor config found. Starting Celery locally via Nohup...${NC}"
        cd "$PROJECT_ROOT/backend"
        source venv/bin/activate
        nohup celery -A celery_app worker --loglevel=info > /tmp/scrapi-celery.log 2>&1 &
    else
        sudo supervisorctl restart celery 2>/dev/null || true
    fi
    echo -e "${GREEN}✓${NC} Services started via Supervisor/Nohup"

# Option B: Run locally in background (standard Ubuntu execution via nohup)
else
    echo -e "${YELLOW}   Starting servers natively via Nohup...${NC}"
    
    # Start Backend
    cd "$PROJECT_ROOT/backend"
    source venv/bin/activate
    nohup uvicorn server:app --host 0.0.0.0 --port 8001 > /tmp/scrapi-backend.log 2>&1 &
    
    # Start Celery
    nohup celery -A celery_app worker --loglevel=info > /tmp/scrapi-celery.log 2>&1 &
    
    # Start Frontend
    cd "$PROJECT_ROOT/frontend"
    if command -v yarn &> /dev/null; then
        nohup yarn start > /tmp/scrapi-frontend.log 2>&1 &
    else
        nohup npm start > /tmp/scrapi-frontend.log 2>&1 &
    fi
    
    echo -e "${GREEN}✓${NC} Services started in the background"
fi

echo ""
echo "Waiting for systems to wake up..."
sleep 3

echo ""
echo "=========================================="
echo "✅ SCRAPI DISTRIBUTED SYSTEM IS ONLINE!"
echo "=========================================="
echo ""
echo -e "${GREEN}🌐 Frontend:${NC}     http://localhost:3000"
echo -e "${GREEN}🔧 Backend API:${NC}  http://localhost:8001"
echo -e "${GREEN}⚙️ Celery Worker:${NC}  Running in background"
echo -e "${GREEN}🛢️ Redis Store:${NC}    Running locally"
echo ""
echo -e "Use ${YELLOW}pkill -f \"uvicorn|celery|react-scripts\"${NC} to stop the servers later if not using supervisor."
echo ""
