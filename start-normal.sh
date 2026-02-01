#!/bin/bash

# Scrapi - Normal Mode Setup Script
# Runs: Frontend + Backend + MongoDB

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

echo -e "${BLUE}[1/4]${NC} Installing backend dependencies..."
cd /app/backend
pip install -r requirements.txt --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/ > /tmp/pip_install.log 2>&1 || true
echo -e "${GREEN}✓${NC} Backend dependencies ready"

echo -e "${BLUE}[2/4]${NC} Installing Playwright browsers..."
export PLAYWRIGHT_BROWSERS_PATH=/pw-browsers
playwright install chromium > /tmp/playwright_install.log 2>&1 || true
echo -e "${GREEN}✓${NC} Playwright ready"

echo -e "${BLUE}[3/4]${NC} Installing frontend dependencies..."
cd /app/frontend
if [ ! -d "node_modules" ]; then
    yarn install > /tmp/frontend_install.log 2>&1
fi
echo -e "${GREEN}✓${NC} Frontend dependencies ready"

echo -e "${BLUE}[4/4]${NC} Starting services..."
# Stop conflicting services quickly
sudo supervisorctl stop scrapi_admin_console 2>/dev/null || true
sudo supervisorctl stop landing_site 2>/dev/null || true
pkill -9 -f "scrapi-admin-console" 2>/dev/null || true
pkill -9 -f "landing-site" 2>/dev/null || true

# Start services
sudo supervisorctl start mongodb 2>/dev/null || true
sudo supervisorctl restart backend 2>/dev/null || true
sudo supervisorctl restart frontend 2>/dev/null || true
echo -e "${GREEN}✓${NC} All services started"

echo ""
echo "Waiting for services..."
sleep 3

echo ""
echo "=========================================="
echo "Service Status"
echo "=========================================="
sudo supervisorctl status backend frontend mongodb 2>/dev/null | grep -E "backend|frontend|mongodb"

echo ""
echo "=========================================="
echo "✅ Normal Mode Started!"
echo "=========================================="
echo ""
echo -e "${GREEN}🌐 Frontend:${NC}     http://localhost:3000"
echo -e "${GREEN}🔧 Backend API:${NC}  http://localhost:8001"
echo -e "${GREEN}📚 API Docs:${NC}     http://localhost:8001/docs"
echo ""
echo "Commands:"
echo "  sudo supervisorctl restart backend   # Restart backend"
echo "  sudo supervisorctl restart frontend  # Restart frontend"
echo "  tail -f /var/log/supervisor/backend.err.log  # Check logs"
echo ""
