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

# Step 3: Install Frontend Dependencies
echo -e "${BLUE}[3/5]${NC} Installing frontend dependencies..."
cd /app/frontend
if [ ! -d "node_modules" ]; then
    yarn install > /dev/null 2>&1
else
    echo -e "${YELLOW}⚠${NC} node_modules already exists, skipping..."
fi
echo -e "${GREEN}✓${NC} Frontend dependencies ready"
echo ""

# Step 4: Stop admin console if running
echo -e "${BLUE}[4/5]${NC} Stopping any running admin console..."
pkill -f "scrapi-admin-console" || true
echo -e "${GREEN}✓${NC} Admin console stopped"
echo ""

# Step 5: Start Services
echo -e "${BLUE}[5/5]${NC} Starting services..."
sudo supervisorctl restart backend
sudo supervisorctl start frontend
echo -e "${GREEN}✓${NC} Services started"
echo ""

# Wait for services to start
echo -e "${YELLOW}⏳${NC} Waiting for services to be ready..."
sleep 5

# Check service status
echo ""
echo "=========================================="
echo "📊 Service Status"
echo "=========================================="
sudo supervisorctl status backend frontend mongodb

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
echo "  - Check logs: tail -f /var/log/supervisor/backend.out.log"
echo "  - Restart backend: sudo supervisorctl restart backend"
echo "  - Restart frontend: sudo supervisorctl restart frontend"
echo "  - Check status: sudo supervisorctl status"
echo ""
