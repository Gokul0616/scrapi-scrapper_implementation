#!/bin/bash

# Scrapi - Landing Site Setup Script
# This script installs dependencies and runs the landing site + backend

set -e

echo "=========================================="
echo "🚀 Scrapi Landing Site Setup"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Install Backend Dependencies
echo -e "${BLUE}[1/5]${NC} Installing backend dependencies..."
cd /app/backend
pip install -r requirements.txt --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/ > /dev/null 2>&1
echo -e "${GREEN}✓${NC} Backend dependencies installed"
echo ""

# Step 2: Install Playwright Browsers
echo -e "${BLUE}[2/5]${NC} Installing Playwright browsers (Chromium)..."
playwright install chromium > /dev/null 2>&1
echo -e "${GREEN}✓${NC} Playwright browsers installed"
echo ""

# Step 3: Install Landing Site Dependencies
echo -e "${BLUE}[3/5]${NC} Installing landing site dependencies..."
cd /app/landing-site
if [ ! -d "node_modules" ]; then
    yarn install > /dev/null 2>&1
else
    echo -e "${YELLOW}⚠${NC} node_modules already exists, skipping..."
fi
echo -e "${GREEN}✓${NC} Landing site dependencies ready"
echo ""

# Step 4: Stop regular frontend
echo -e "${BLUE}[4/5]${NC} Stopping regular frontend..."
sudo supervisorctl stop frontend
echo -e "${GREEN}✓${NC} Regular frontend stopped"
echo ""

# Step 5: Start Services
echo -e "${BLUE}[5/5]${NC} Starting services..."
sudo supervisorctl restart backend
echo -e "${GREEN}✓${NC} Backend restarted"

# Kill any existing landing site process
pkill -f "landing-site" || true

# Start landing site in background
echo -e "${YELLOW}⏳${NC} Starting landing site on port 3000..."
cd /app/landing-site
nohup yarn dev > /var/log/landing-site.log 2>&1 &
LANDING_PID=$!
echo -e "${GREEN}✓${NC} Landing site started (PID: $LANDING_PID)"
echo ""

# Wait for services to start
echo -e "${YELLOW}⏳${NC} Waiting for services to be ready..."
sleep 8

# Check service status
echo ""
echo "=========================================="
echo "📊 Service Status"
echo "=========================================="
sudo supervisorctl status backend mongodb
echo ""
echo "Landing Site Process:"
ps aux | grep -E "landing-site|vite" | grep -v grep || echo "  Not found (may still be starting...)"

echo ""
echo "=========================================="
echo "✅ Landing Site Setup Complete!"
echo "=========================================="
echo ""
echo -e "${GREEN}🌐 Landing Site:${NC} http://localhost:3000"
echo -e "${GREEN}🔧 Backend API:${NC} http://localhost:8001"
echo -e "${GREEN}📚 API Docs:${NC} http://localhost:8001/docs"
echo ""
echo -e "${BLUE}💡 Useful Commands:${NC}"
echo "  - Check backend logs: tail -f /var/log/supervisor/backend.out.log"
echo "  - Check landing site logs: tail -f /var/log/landing-site.log"
echo "  - Restart backend: sudo supervisorctl restart backend"
echo "  - Stop landing site: pkill -f 'landing-site'"
echo "  - Check landing site status: ps aux | grep vite"
echo ""
echo -e "${YELLOW}⚠️  Note:${NC} Landing site runs in background. Check logs if issues occur."
echo ""
