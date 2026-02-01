#!/bin/bash

# Scrapi - Normal Setup Script
# This script installs dependencies and runs the regular frontend + backend

set -e

echo "=========================================="
echo "🚀 Scrapi Normal Setup"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to handle errors
handle_error() {
    echo -e "${RED}❌ Error: $1${NC}"
    echo -e "${YELLOW}💡 Check logs for more details${NC}"
    exit 1
}

# Step 1: Install Backend Dependencies
echo -e "${BLUE}[1/6]${NC} Installing backend dependencies..."
cd /app/backend
if pip install -r requirements.txt --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/ > /tmp/backend_install.log 2>&1; then
    echo -e "${GREEN}✓${NC} Backend dependencies installed"
else
    echo -e "${YELLOW}⚠${NC} Some dependencies may have issues, but continuing..."
    tail -n 5 /tmp/backend_install.log
fi
echo ""

# Step 2: Install Playwright Browsers
echo -e "${BLUE}[2/6]${NC} Installing Playwright browsers (Chromium)..."
export PLAYWRIGHT_BROWSERS_PATH=/pw-browsers
if playwright install chromium > /tmp/playwright_install.log 2>&1; then
    echo -e "${GREEN}✓${NC} Playwright browsers installed"
else
    echo -e "${YELLOW}⚠${NC} Playwright installation had warnings, but may work..."
    tail -n 3 /tmp/playwright_install.log | grep -v "^$" || true
fi
echo ""

# Step 3: Verify Playwright installation
echo -e "${BLUE}[3/6]${NC} Verifying Playwright installation..."
if [ -d "/pw-browsers/chromium-1124" ] || playwright --version > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Playwright is ready"
else
    echo -e "${YELLOW}⚠${NC} Playwright may not be fully installed, but continuing..."
fi
echo ""

# Step 4: Install Frontend Dependencies
echo -e "${BLUE}[4/6]${NC} Installing frontend dependencies..."
cd /app/frontend
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing packages (this may take a moment)...${NC}"
    if yarn install > /tmp/frontend_install.log 2>&1; then
        echo -e "${GREEN}✓${NC} Frontend dependencies installed"
    else
        handle_error "Frontend dependency installation failed. Check /tmp/frontend_install.log"
    fi
else
    echo -e "${YELLOW}⚠${NC} node_modules already exists, verifying..."
    if [ -f "yarn.lock" ] && [ -f "package.json" ]; then
        echo -e "${GREEN}✓${NC} Frontend dependencies appear valid"
    else
        echo -e "${RED}⚠${NC} Dependencies may be corrupted. Consider: rm -rf node_modules && yarn install"
    fi
fi
echo ""

# Step 5: Stop conflicting services
echo -e "${BLUE}[5/6]${NC} Stopping conflicting services..."
sudo supervisorctl stop scrapi_admin_console 2>/dev/null || true
sudo supervisorctl stop landing_site 2>/dev/null || true
pkill -f "scrapi-admin-console" 2>/dev/null || true
pkill -f "landing-site" 2>/dev/null || true
echo -e "${GREEN}✓${NC} Conflicting services stopped"
echo ""

# Step 6: Start Services
echo -e "${BLUE}[6/6]${NC} Starting services..."
echo -e "  ${YELLOW}→${NC} Restarting backend..."
if sudo supervisorctl restart backend > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓${NC} Backend restarted"
else
    handle_error "Failed to restart backend"
fi

echo -e "  ${YELLOW}→${NC} Starting frontend..."
if sudo supervisorctl start frontend > /dev/null 2>&1 || sudo supervisorctl restart frontend > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓${NC} Frontend started"
else
    handle_error "Failed to start frontend"
fi
echo ""

# Wait for services to start
echo -e "${YELLOW}⏳${NC} Waiting for services to initialize..."
sleep 5

# Check service status
echo ""
echo "=========================================="
echo "📊 Service Status"
echo "=========================================="
sudo supervisorctl status backend frontend mongodb 2>/dev/null || echo -e "${RED}Could not get service status${NC}"

# Verify services are responding
echo ""
echo "=========================================="
echo "🔍 Verifying Services"
echo "=========================================="

# Check backend
if curl -s http://localhost:8001/health > /dev/null 2>&1 || curl -s http://localhost:8001/docs > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Backend API responding"
else
    echo -e "${YELLOW}⚠${NC} Backend may still be starting..."
fi

# Check frontend
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Frontend responding"
else
    echo -e "${YELLOW}⚠${NC} Frontend may still be starting..."
fi

echo ""
echo "=========================================="
echo "✅ Normal Setup Complete!"
echo "=========================================="
echo ""
echo -e "${GREEN}🌐 Frontend:${NC} http://localhost:3000"
echo -e "${GREEN}🔧 Backend API:${NC} http://localhost:8001"
echo -e "${GREEN}📚 API Docs:${NC} http://localhost:8001/docs"
echo ""
echo -e "${BLUE}💡 Useful Commands:${NC}"
echo "  - Check backend logs: tail -f /var/log/supervisor/backend.out.log"
echo "  - Check backend errors: tail -f /var/log/supervisor/backend.err.log"
echo "  - Check frontend logs: tail -f /var/log/supervisor/frontend.out.log"
echo "  - Restart backend: sudo supervisorctl restart backend"
echo "  - Restart frontend: sudo supervisorctl restart frontend"
echo "  - Restart all: sudo supervisorctl restart all"
echo "  - Check status: sudo supervisorctl status"
echo ""
echo -e "${YELLOW}📝 Note:${NC} If services don't respond immediately, wait 10-15 seconds for full startup"
echo ""
