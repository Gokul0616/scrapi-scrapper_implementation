#!/bin/bash

# Scrapi - Installation Verification & Test Script
# This script verifies the installation and tests all components

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

PASSED=0
FAILED=0
WARNINGS=0

echo "==========================================="
echo -e "${CYAN}🧪 Scrapi Installation Verification${NC}"
echo "==========================================="
echo ""

# Function to test endpoint
test_endpoint() {
    local name=$1
    local url=$2
    local timeout=${3:-5}
    
    if curl -s --max-time $timeout "$url" > /dev/null 2>&1; then
        echo -e "  ${GREEN}✓${NC} $name is responding"
        ((PASSED++))
        return 0
    else
        echo -e "  ${RED}✗${NC} $name is not responding"
        ((FAILED++))
        return 1
    fi
}

# Test 1: Check if scripts exist
echo -e "${BLUE}[1/8]${NC} Checking startup scripts..."
scripts=("start-scrapi.sh" "start-normal.sh" "start-admin-console.sh" "start-landing-site.sh" "check-dependencies.sh")
for script in "${scripts[@]}"; do
    if [ -f "/app/$script" ] && [ -x "/app/$script" ]; then
        echo -e "  ${GREEN}✓${NC} /app/$script exists and is executable"
        ((PASSED++))
    else
        echo -e "  ${RED}✗${NC} /app/$script missing or not executable"
        ((FAILED++))
    fi
done
echo ""

# Test 2: Check Python environment
echo -e "${BLUE}[2/8]${NC} Checking Python environment..."
if python3 --version > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓${NC} Python is installed"
    ((PASSED++))
else
    echo -e "  ${RED}✗${NC} Python is not installed"
    ((FAILED++))
fi

if pip --version > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓${NC} Pip is installed"
    ((PASSED++))
else
    echo -e "  ${RED}✗${NC} Pip is not installed"
    ((FAILED++))
fi
echo ""

# Test 3: Check Node environment
echo -e "${BLUE}[3/8]${NC} Checking Node.js environment..."
if node --version > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓${NC} Node.js is installed"
    ((PASSED++))
else
    echo -e "  ${RED}✗${NC} Node.js is not installed"
    ((FAILED++))
fi

if yarn --version > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓${NC} Yarn is installed"
    ((PASSED++))
else
    echo -e "  ${RED}✗${NC} Yarn is not installed"
    ((FAILED++))
fi
echo ""

# Test 4: Check critical Python packages
echo -e "${BLUE}[4/8]${NC} Checking critical Python packages..."
packages=("fastapi" "uvicorn" "motor" "pymongo" "playwright")
for pkg in "${packages[@]}"; do
    if pip show "$pkg" > /dev/null 2>&1; then
        echo -e "  ${GREEN}✓${NC} $pkg is installed"
        ((PASSED++))
    else
        echo -e "  ${RED}✗${NC} $pkg is not installed"
        ((FAILED++))
    fi
done
echo ""

# Test 5: Check frontend dependencies
echo -e "${BLUE}[5/8]${NC} Checking frontend dependencies..."
if [ -d "/app/frontend/node_modules" ]; then
    echo -e "  ${GREEN}✓${NC} Frontend node_modules exists"
    ((PASSED++))
else
    echo -e "  ${RED}✗${NC} Frontend node_modules missing"
    ((FAILED++))
fi

if [ -d "/app/scrapi-admin-console/node_modules" ]; then
    echo -e "  ${GREEN}✓${NC} Admin console node_modules exists"
    ((PASSED++))
else
    echo -e "  ${YELLOW}⚠${NC} Admin console node_modules missing"
    ((WARNINGS++))
fi

if [ -d "/app/landing-site/node_modules" ]; then
    echo -e "  ${GREEN}✓${NC} Landing site node_modules exists"
    ((PASSED++))
else
    echo -e "  ${YELLOW}⚠${NC} Landing site node_modules missing"
    ((WARNINGS++))
fi
echo ""

# Test 6: Check Playwright browsers
echo -e "${BLUE}[6/8]${NC} Checking Playwright browsers..."
if [ -d "/pw-browsers/chromium-1124" ]; then
    echo -e "  ${GREEN}✓${NC} Chromium browser is installed"
    ((PASSED++))
else
    echo -e "  ${YELLOW}⚠${NC} Chromium browser may not be installed"
    ((WARNINGS++))
fi
echo ""

# Test 7: Check services status
echo -e "${BLUE}[7/8]${NC} Checking services status..."
services=("backend" "frontend" "mongodb")
for service in "${services[@]}"; do
    if sudo supervisorctl status "$service" 2>/dev/null | grep -q "RUNNING"; then
        echo -e "  ${GREEN}✓${NC} $service is running"
        ((PASSED++))
    else
        status=$(sudo supervisorctl status "$service" 2>/dev/null | awk '{print $2}')
        echo -e "  ${YELLOW}⚠${NC} $service is $status"
        ((WARNINGS++))
    fi
done
echo ""

# Test 8: Check if endpoints are responding
echo -e "${BLUE}[8/8]${NC} Testing endpoints..."
echo -e "  ${YELLOW}Testing backend...${NC}"
test_endpoint "Backend API" "http://localhost:8001/docs"

echo -e "  ${YELLOW}Testing frontend...${NC}"
test_endpoint "Frontend" "http://localhost:3000"
echo ""

# Final Summary
echo "==========================================="
echo -e "${CYAN}📊 Verification Summary${NC}"
echo "==========================================="
echo -e "Tests Passed:  ${GREEN}$PASSED${NC}"
echo -e "Tests Failed:  ${RED}$FAILED${NC}"
echo -e "Warnings:      ${YELLOW}$WARNINGS${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ Installation verification successful!${NC}"
    echo ""
    echo "Your Scrapi installation is ready to use."
    echo ""
    echo "Quick Start:"
    echo -e "  ${CYAN}→${NC} Run: ${GREEN}bash /app/start-scrapi.sh${NC} for interactive launcher"
    echo -e "  ${CYAN}→${NC} Run: ${GREEN}bash /app/quick-ref.sh${NC} for quick reference"
    echo -e "  ${CYAN}→${NC} Read: ${GREEN}cat /app/STARTUP_GUIDE.md${NC} for full documentation"
    echo ""
    exit 0
else
    echo -e "${RED}❌ Installation has issues that need to be fixed${NC}"
    echo ""
    echo "Recommended actions:"
    echo "  1. Run: bash /app/check-dependencies.sh"
    echo "  2. Install missing dependencies"
    echo "  3. Run this verification again"
    echo ""
    exit 1
fi
