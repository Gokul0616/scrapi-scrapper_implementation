#!/bin/bash

################################################################################
# SCRAPI - QUICK STARTER SCRIPT
################################################################################
# 
# This is a simplified startup script that:
# 1. Installs all dependencies (Python, Node.js packages)
# 2. Installs Playwright browsers for web scraping
# 3. Starts all services (Backend, Frontend, MongoDB)
#
# Usage: 
#   chmod +x starter.sh
#   ./starter.sh
#
################################################################################

set -e  # Exit on any error

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo ""
echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║              SCRAPI - APPLICATION STARTER                 ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

################################################################################
# STEP 1: INSTALL BACKEND DEPENDENCIES
################################################################################

echo -e "${BLUE}📦 Step 1: Installing Backend Dependencies...${NC}"
cd /app/backend
pip install -r requirements.txt -q
echo -e "${GREEN}✅ Backend dependencies installed${NC}"

################################################################################
# STEP 2: INSTALL PLAYWRIGHT BROWSERS
################################################################################

echo ""
echo -e "${BLUE}🎭 Step 2: Installing Playwright Browsers...${NC}"
playwright install chromium
echo -e "${GREEN}✅ Playwright Chromium browser installed${NC}"

################################################################################
# STEP 3: INSTALL FRONTEND DEPENDENCIES
################################################################################

echo ""
echo -e "${BLUE}📦 Step 3: Installing Frontend Dependencies...${NC}"
cd /app/frontend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}⚠️  node_modules not found, running yarn install...${NC}"
    yarn install --silent
    echo -e "${GREEN}✅ Frontend dependencies installed${NC}"
else
    echo -e "${GREEN}✅ Frontend dependencies already installed${NC}"
fi

################################################################################
# STEP 4: RESTART ALL SERVICES
################################################################################

echo ""
echo -e "${BLUE}🚀 Step 4: Restarting All Services...${NC}"
sudo supervisorctl restart all

# Wait for services to start
echo -e "${YELLOW}⏳ Waiting for services to start...${NC}"
sleep 5

################################################################################
# STEP 5: CHECK STATUS
################################################################################

echo ""
echo -e "${BLUE}🔍 Step 5: Checking Service Status...${NC}"
sudo supervisorctl status

################################################################################
# DONE
################################################################################

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                  ✅ STARTUP COMPLETE!                      ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}🌐 Frontend:${NC} http://localhost:3000"
echo -e "${BLUE}🔌 Backend:${NC}  http://localhost:8001"
echo -e "${BLUE}📖 API Docs:${NC} http://localhost:8001/docs"
echo ""
echo -e "${YELLOW}📝 Useful Commands:${NC}"
echo -e "   View backend logs:  ${BLUE}sudo supervisorctl tail -f backend${NC}"
echo -e "   View frontend logs: ${BLUE}sudo supervisorctl tail -f frontend${NC}"
echo -e "   Restart all:        ${BLUE}sudo supervisorctl restart all${NC}"
echo -e "   Check status:       ${BLUE}sudo supervisorctl status${NC}"
echo ""
