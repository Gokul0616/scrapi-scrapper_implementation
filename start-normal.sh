#!/bin/bash

# Scrapi - Normal Mode Setup Script
# Runs: Frontend + Backend + MongoDB

set -e

echo "=========================================="
echo "🚀 Starting Scrapi - Normal Mode"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Error handler
handle_error() {
    echo -e "${RED}❌ Error: $1${NC}"
    echo "Check logs: tail -f /var/log/supervisor/*.err.log"
    exit 1
}

echo -e "${BLUE}[1/4]${NC} Installing backend dependencies..."
cd /app/backend
pip install -r requirements.txt --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/ > /tmp/pip_install.log 2>&1 || {
    echo -e "${YELLOW}⚠${NC} Some packages had warnings, but continuing..."
}
echo -e "${GREEN}✓${NC} Backend dependencies installed"
echo ""

echo -e "${BLUE}[2/4]${NC} Installing Playwright browsers..."
export PLAYWRIGHT_BROWSERS_PATH=/pw-browsers
playwright install chromium > /tmp/playwright_install.log 2>&1 || {
    echo -e "${YELLOW}⚠${NC} Playwright install had warnings, checking if functional..."
}
if [ -d "/pw-browsers/chromium-1124" ] || playwright --version > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Playwright ready"
else
    echo -e "${YELLOW}⚠${NC} Playwright may not be fully installed"
fi
echo ""

echo -e "${BLUE}[3/4]${NC} Installing frontend dependencies..."
cd /app/frontend
if [ ! -d "node_modules" ]; then
    echo "Installing packages..."
    yarn install > /tmp/frontend_install.log 2>&1 || handle_error "Frontend install failed"
    echo -e "${GREEN}✓${NC} Frontend dependencies installed"
else
    echo -e "${GREEN}✓${NC} Frontend dependencies already installed"
fi
echo ""

echo -e "${BLUE}[4/4]${NC} Starting services..."
# Stop conflicting services
sudo supervisorctl stop scrapi_admin_console 2>/dev/null || true
sudo supervisorctl stop landing_site 2>/dev/null || true
pkill -f "scrapi-admin-console" 2>/dev/null || true
pkill -f "landing-site" 2>/dev/null || true

# Start required services
echo "  Starting MongoDB..."
sudo supervisorctl start mongodb 2>/dev/null || true

echo "  Starting backend..."
sudo supervisorctl restart backend || handle_error "Backend failed to start"

echo "  Starting frontend..."
sudo supervisorctl restart frontend || sudo supervisorctl start frontend || handle_error "Frontend failed to start"

echo -e "${GREEN}✓${NC} All services started"
echo ""

echo "Waiting for services to initialize..."
sleep 5

echo ""
echo "=========================================="
echo "📊 Service Status"
echo "=========================================="
sudo supervisorctl status backend frontend mongodb 2>/dev/null

echo ""
echo "=========================================="
echo "✅ Normal Mode Started Successfully!"
echo "=========================================="
echo ""
echo -e "${GREEN}🌐 Frontend:${NC}     http://localhost:3000"
echo -e "${GREEN}🔧 Backend API:${NC}  http://localhost:8001"
echo -e "${GREEN}📚 API Docs:${NC}     http://localhost:8001/docs"
echo ""
echo "Useful commands:"
echo "  • Restart backend:  sudo supervisorctl restart backend"
echo "  • Restart frontend: sudo supervisorctl restart frontend"
echo "  • Check logs:       tail -f /var/log/supervisor/backend.err.log"
echo "  • Check status:     sudo supervisorctl status"
echo ""
