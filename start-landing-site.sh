#!/bin/bash

# Scrapi - Landing Site Mode Setup Script
# Runs: Landing Site + Backend + MongoDB

echo "=========================================="
echo "🌐 Starting Scrapi - Landing Site Mode"
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

echo -e "${BLUE}[3/4]${NC} Installing landing site dependencies..."
cd /app/landing-site
if [ ! -d "node_modules" ]; then
    yarn install > /tmp/landing_install.log 2>&1
fi
rm -f package-lock.json 2>/dev/null || true
echo -e "${GREEN}✓${NC} Landing site dependencies ready"

echo -e "${BLUE}[4/4]${NC} Starting services..."
# Stop conflicting services quickly
sudo supervisorctl stop frontend 2>/dev/null || true
sudo supervisorctl stop scrapi_admin_console 2>/dev/null || true
pkill -9 -f "scrapi-admin-console" 2>/dev/null || true
pkill -9 -f "vite.*landing-site" 2>/dev/null || true

# Start services
sudo supervisorctl start mongodb 2>/dev/null || true
sudo supervisorctl restart backend 2>/dev/null || true

# Start landing site
cd /app/landing-site
nohup yarn dev > /var/log/landing-site.log 2>&1 &
echo -e "${GREEN}✓${NC} All services started"

echo ""
echo "Waiting for services (landing site needs ~10 seconds)..."
sleep 5

echo ""
echo "=========================================="
echo "Service Status"
echo "=========================================="
sudo supervisorctl status backend mongodb 2>/dev/null | grep -E "backend|mongodb"
echo ""
if pgrep -f "vite.*landing-site" > /dev/null; then
    echo -e "Landing Site: ${GREEN}Running${NC} (PID: $(pgrep -f 'vite.*landing-site' | head -1))"
else
    echo -e "Landing Site: ${YELLOW}Starting...${NC}"
fi

echo ""
echo "=========================================="
echo "✅ Landing Site Started!"
echo "=========================================="
echo ""
echo -e "${GREEN}🌐 Landing Site:${NC}  http://localhost:3000"
echo -e "${GREEN}🔧 Backend API:${NC}   http://localhost:8001"
echo -e "${GREEN}📚 API Docs:${NC}      http://localhost:8001/docs"
echo ""
echo "Commands:"
echo "  pkill -f 'landing-site'  # Stop landing site"
echo "  tail -f /var/log/landing-site.log  # Check logs"
echo "  bash /app/start-normal.sh  # Back to normal mode"
echo ""
echo -e "${YELLOW}Note:${NC} Landing site via Vite takes 10-15 seconds to fully start."
echo ""
