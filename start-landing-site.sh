#!/bin/bash

# Scrapi - Landing Site Mode Setup Script
# Runs: Landing Site + Backend + MongoDB

set -e

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

# Error handler
handle_error() {
    echo -e "${RED}❌ Error: $1${NC}"
    echo "Check logs: tail -f /var/log/landing-site.log"
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

echo -e "${BLUE}[3/4]${NC} Installing landing site dependencies..."
cd /app/landing-site
if [ ! -d "node_modules" ]; then
    echo "Installing packages..."
    yarn install > /tmp/landing_install.log 2>&1 || handle_error "Landing site install failed"
    echo -e "${GREEN}✓${NC} Landing site dependencies installed"
else
    echo -e "${GREEN}✓${NC} Landing site dependencies already installed"
fi

# Remove npm lock file if exists (we use yarn)
rm -f package-lock.json 2>/dev/null || true
echo ""

echo -e "${BLUE}[4/4]${NC} Starting services..."
# Stop conflicting services
echo "  Stopping conflicting services..."
sudo supervisorctl stop frontend 2>/dev/null || true
sudo supervisorctl stop scrapi_admin_console 2>/dev/null || true
sudo supervisorctl stop landing_site 2>/dev/null || true
pkill -f "scrapi-admin-console" 2>/dev/null || true
pkill -f "landing-site" 2>/dev/null || true
pkill -f "vite.*landing-site" 2>/dev/null || true

# Start required services
echo "  Starting MongoDB..."
sudo supervisorctl start mongodb 2>/dev/null || true

echo "  Starting backend..."
sudo supervisorctl restart backend || handle_error "Backend failed to start"

echo "  Starting landing site..."
cd /app/landing-site

# Try supervisor first, if not available use nohup
if [ -f "/etc/supervisor/conf.d/landing_site.conf" ]; then
    sudo supervisorctl reread > /dev/null 2>&1
    sudo supervisorctl update > /dev/null 2>&1
    if sudo supervisorctl start landing_site 2>&1 | grep -q "ERROR"; then
        # Fallback to manual start
        nohup yarn dev > /var/log/landing-site.log 2>&1 &
        echo -e "  ${GREEN}✓${NC} Landing site started (manual mode)"
    else
        echo -e "  ${GREEN}✓${NC} Landing site started (supervisor)"
    fi
else
    # Manual start
    nohup yarn dev > /var/log/landing-site.log 2>&1 &
    echo -e "  ${GREEN}✓${NC} Landing site started (manual mode)"
fi

echo -e "${GREEN}✓${NC} All services started"
echo ""

echo "Waiting for services to initialize (Vite needs ~10 seconds)..."
sleep 8

echo ""
echo "=========================================="
echo "📊 Service Status"
echo "=========================================="
sudo supervisorctl status backend mongodb 2>/dev/null
echo ""
echo "Landing Site:"
if ps aux | grep -E "vite.*landing-site" | grep -v grep > /dev/null; then
    echo -e "  ${GREEN}✓${NC} Running (PID: $(pgrep -f 'vite.*landing-site' | head -1))"
else
    echo -e "  ${YELLOW}⚠${NC} Still starting..."
fi

echo ""
echo "=========================================="
echo "✅ Landing Site Started Successfully!"
echo "=========================================="
echo ""
echo -e "${GREEN}🌐 Landing Site:${NC}  http://localhost:3000"
echo -e "${GREEN}🔧 Backend API:${NC}   http://localhost:8001"
echo -e "${GREEN}📚 API Docs:${NC}      http://localhost:8001/docs"
echo ""
echo "Useful commands:"
echo "  • Restart backend:     sudo supervisorctl restart backend"
echo "  • Stop landing site:   pkill -f 'landing-site'"
echo "  • Check logs:          tail -f /var/log/landing-site.log"
echo "  • Back to normal mode: bash /app/start-normal.sh"
echo ""
echo -e "${YELLOW}Note:${NC} Landing site runs via Vite. First load may take 10-15 seconds."
echo ""
