#!/bin/bash

# Scrapi - Landing Site Startup Script
# Installs dependencies and runs Backend + Landing Site

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

CURRENT_DIR=$(pwd)

cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down services...${NC}"
    kill $(jobs -p) 2>/dev/null || true
    echo -e "${GREEN}Shutdown complete.${NC}"
}

trap cleanup EXIT INT TERM

echo ""
echo "=========================================="
echo "🚀 Scrapi Landing Site Setup"
echo "=========================================="
echo ""

# 1. Backend Setup
echo -e "${BLUE}[1/2]${NC} Setting up Backend..."
cd "$CURRENT_DIR/backend"
if [ ! -d "venv" ]; then
    echo "Creating python virtual environment..."
    python3 -m venv venv
fi
source venv/bin/activate
echo "Installing backend requirements..."
pip install -r requirements.txt > /dev/null 2>&1 || echo -e "${YELLOW}Warning: pip install had issues, continuing...${NC}"

# Start Backend in background
echo "Starting Backend on port 8001..."
python3 -m uvicorn main:app --host 0.0.0.0 --port 8001 &
BACKEND_PID=$!
echo -e "${GREEN}✓${NC} Backend started (PID: $BACKEND_PID)"
echo ""

# 2. Landing Site Setup
echo -e "${BLUE}[2/2]${NC} Setting up Landing Site..."
cd "$CURRENT_DIR/landing-site"

# Try install if node_modules missing
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install || echo -e "${RED}npm install failed. Please check errors above.${NC}"
else
    echo -e "${YELLOW}node_modules exists, skipping install...${NC}"
fi

# Start Landing Site
echo "Starting Landing Site on port 3000..."
npm run dev &
FRONTEND_PID=$!
echo -e "${GREEN}✓${NC} Landing Site started (PID: $FRONTEND_PID)"
echo ""

echo "=========================================="
echo "✅ Setup Complete! Services are running."
echo "=========================================="
echo ""
echo -e "${GREEN}🌐 Landing Site:${NC} http://localhost:3000"
echo -e "${GREEN}🔧 Backend API:${NC} http://localhost:8001"
echo ""
echo "Press Ctrl+C to stop all services."

# Wait for processes
wait
