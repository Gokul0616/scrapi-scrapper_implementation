#!/bin/bash

# Scrapi - Dependency Checker Script
# This script checks if all dependencies are properly installed

echo "==========================================="
echo "🔍 Scrapi Dependency Checker"
echo "==========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

echo -e "${BLUE}[1/6]${NC} Checking Python environment..."
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version)
    echo -e "  ${GREEN}✓${NC} Python found: $PYTHON_VERSION"
else
    echo -e "  ${RED}✗${NC} Python not found"
    ((ERRORS++))
fi

if command -v pip &> /dev/null; then
    PIP_VERSION=$(pip --version | head -1)
    echo -e "  ${GREEN}✓${NC} Pip found: $PIP_VERSION"
else
    echo -e "  ${RED}✗${NC} Pip not found"
    ((ERRORS++))
fi
echo ""

echo -e "${BLUE}[2/6]${NC} Checking Node.js environment..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "  ${GREEN}✓${NC} Node.js found: $NODE_VERSION"
else
    echo -e "  ${RED}✗${NC} Node.js not found"
    ((ERRORS++))
fi

if command -v yarn &> /dev/null; then
    YARN_VERSION=$(yarn --version)
    echo -e "  ${GREEN}✓${NC} Yarn found: v$YARN_VERSION"
else
    echo -e "  ${RED}✗${NC} Yarn not found"
    ((ERRORS++))
fi
echo ""

echo -e "${BLUE}[3/6]${NC} Checking backend dependencies..."
if [ -f "/app/backend/requirements.txt" ]; then
    echo -e "  ${GREEN}✓${NC} requirements.txt exists"
    TOTAL_DEPS=$(wc -l < /app/backend/requirements.txt | tr -d ' ')
    echo -e "  ${BLUE}ℹ${NC}  Total dependencies: $TOTAL_DEPS"
    
    # Check critical dependencies
    CRITICAL_DEPS=("fastapi" "uvicorn" "motor" "pymongo" "playwright" "bcrypt")
    for dep in "${CRITICAL_DEPS[@]}"; do
        if pip show "$dep" &> /dev/null; then
            echo -e "  ${GREEN}✓${NC} $dep installed"
        else
            echo -e "  ${RED}✗${NC} $dep missing"
            ((ERRORS++))
        fi
    done
else
    echo -e "  ${RED}✗${NC} requirements.txt not found"
    ((ERRORS++))
fi
echo ""

echo -e "${BLUE}[4/6]${NC} Checking frontend dependencies..."
if [ -d "/app/frontend/node_modules" ]; then
    echo -e "  ${GREEN}✓${NC} Frontend node_modules exists"
    MODULE_COUNT=$(find /app/frontend/node_modules -maxdepth 1 -type d | wc -l)
    echo -e "  ${BLUE}ℹ${NC}  Installed modules: $MODULE_COUNT"
else
    echo -e "  ${RED}✗${NC} Frontend node_modules missing"
    ((ERRORS++))
fi

if [ -f "/app/frontend/package.json" ]; then
    echo -e "  ${GREEN}✓${NC} Frontend package.json exists"
else
    echo -e "  ${RED}✗${NC} Frontend package.json missing"
    ((ERRORS++))
fi
echo ""

echo -e "${BLUE}[5/6]${NC} Checking admin console dependencies..."
if [ -d "/app/scrapi-admin-console/node_modules" ]; then
    echo -e "  ${GREEN}✓${NC} Admin console node_modules exists"
    MODULE_COUNT=$(find /app/scrapi-admin-console/node_modules -maxdepth 1 -type d | wc -l)
    echo -e "  ${BLUE}ℹ${NC}  Installed modules: $MODULE_COUNT"
else
    echo -e "  ${YELLOW}⚠${NC} Admin console node_modules missing (will install on first run)"
    ((WARNINGS++))
fi

if [ -f "/app/scrapi-admin-console/package.json" ]; then
    echo -e "  ${GREEN}✓${NC} Admin console package.json exists"
else
    echo -e "  ${RED}✗${NC} Admin console package.json missing"
    ((ERRORS++))
fi
echo ""

echo -e "${BLUE}[6/6]${NC} Checking landing site dependencies..."
if [ -d "/app/landing-site/node_modules" ]; then
    echo -e "  ${GREEN}✓${NC} Landing site node_modules exists"
    MODULE_COUNT=$(find /app/landing-site/node_modules -maxdepth 1 -type d | wc -l)
    echo -e "  ${BLUE}ℹ${NC}  Installed modules: $MODULE_COUNT"
else
    echo -e "  ${YELLOW}⚠${NC} Landing site node_modules missing (will install on first run)"
    ((WARNINGS++))
fi

if [ -f "/app/landing-site/package.json" ]; then
    echo -e "  ${GREEN}✓${NC} Landing site package.json exists"
else
    echo -e "  ${RED}✗${NC} Landing site package.json missing"
    ((ERRORS++))
fi
echo ""

echo -e "${BLUE}[Bonus]${NC} Checking Playwright browsers..."
if [ -d "/pw-browsers" ]; then
    echo -e "  ${GREEN}✓${NC} Playwright browsers directory exists"
    if [ -d "/pw-browsers/chromium-1124" ]; then
        echo -e "  ${GREEN}✓${NC} Chromium browser installed"
    else
        echo -e "  ${YELLOW}⚠${NC} Chromium browser may need installation"
        ((WARNINGS++))
    fi
else
    echo -e "  ${YELLOW}⚠${NC} Playwright browsers directory not found"
    ((WARNINGS++))
fi
echo ""

echo "==========================================="
echo "📊 Dependency Check Summary"
echo "==========================================="
if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ All dependencies are properly installed!${NC}"
    echo ""
    echo "You can now run:"
    echo "  - bash /app/start-normal.sh          (for regular app)"
    echo "  - bash /app/start-admin-console.sh   (for admin console)"
    echo "  - bash /app/start-landing-site.sh    (for landing site)"
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠ Dependencies check passed with $WARNINGS warning(s)${NC}"
    echo "The application should work, but some optional features may be unavailable."
else
    echo -e "${RED}✗ Found $ERRORS error(s) and $WARNINGS warning(s)${NC}"
    echo ""
    echo "Recommended actions:"
    [ $ERRORS -gt 0 ] && echo "  1. Run: cd /app/backend && pip install -r requirements.txt"
    [ $ERRORS -gt 0 ] && echo "  2. Run: cd /app/frontend && yarn install"
    echo "  3. Run one of the start scripts to complete setup"
fi
echo ""
