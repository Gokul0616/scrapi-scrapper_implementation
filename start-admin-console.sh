#!/bin/bash

# Scrapi - Admin Console Setup Script
# This script installs dependencies and runs the admin console + backend

set -e

echo "=========================================="
echo "🛠️  Scrapi Admin Console Setup"
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

# Step 3: Install Admin Console Dependencies
echo -e "${BLUE}[3/5]${NC} Installing admin console dependencies..."
cd /app/scrapi-admin-console
if [ ! -d "node_modules" ]; then
    yarn install > /dev/null 2>&1
else
    echo -e "${YELLOW}⚠${NC} node_modules already exists, skipping..."
fi
echo -e "${GREEN}✓${NC} Admin console dependencies ready"
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

# Kill any existing admin console process
pkill -f "scrapi-admin-console" || true

# Start admin console in background
echo -e "${YELLOW}⏳${NC} Starting admin console on port 3000..."
cd /app/scrapi-admin-console
nohup yarn dev > /var/log/admin-console.log 2>&1 &
ADMIN_PID=$!
echo -e "${GREEN}✓${NC} Admin console started (PID: $ADMIN_PID)"
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
echo "Admin Console Process:"
ps aux | grep -E "scrapi-admin-console|vite" | grep -v grep || echo "  Not found (may still be starting...)"

echo ""
echo "=========================================="
echo "✅ Admin Console Setup Complete!"
echo "=========================================="
echo ""
echo -e "${GREEN}🛠️  Admin Console:${NC} http://localhost:3000"
echo -e "${GREEN}🔧 Backend API:${NC} http://localhost:8001"
echo -e "${GREEN}📚 API Docs:${NC} http://localhost:8001/docs"
echo ""
echo -e "${BLUE}💡 Useful Commands:${NC}"
echo "  - Check backend logs: tail -f /var/log/supervisor/backend.out.log"
echo "  - Check admin console logs: tail -f /var/log/admin-console.log"
echo "  - Restart backend: sudo supervisorctl restart backend"
echo "  - Stop admin console: pkill -f 'scrapi-admin-console'"
echo "  - Check admin console status: ps aux | grep vite"
echo ""
echo -e "${YELLOW}⚠️  Note:${NC} Admin console runs in background. Check logs if issues occur."
echo ""
