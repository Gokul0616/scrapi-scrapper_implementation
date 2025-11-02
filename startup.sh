#!/bin/bash

################################################################################
# SCRAPI - INSTANT STARTUP SCRIPT
################################################################################
# 
# This script handles complete installation and startup of the Scrapi application
# - A powerful web scraping platform (Apify clone)
# - Built with FastAPI (Backend) + React (Frontend) + MongoDB (Database)
#
# FEATURES:
# - JWT Authentication System
# - Playwright-based Scraping Engine
# - Google Maps Scraper with AI capabilities
# - AI-powered Lead Chat Assistant
# - Global Chat Assistant for app help
# - Proxy Management System
# - Dataset Export (JSON/CSV)
#
################################################################################

set -e  # Exit on any error

# Colors for better readability
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to print colored messages
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_section() {
    echo ""
    echo -e "${PURPLE}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${PURPLE}  $1${NC}"
    echo -e "${PURPLE}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
}

################################################################################
# STEP 1: CHECK PREREQUISITES
################################################################################

print_section "STEP 1: Checking Prerequisites"

# Check if we're in the correct directory
if [ ! -d "/app/backend" ] || [ ! -d "/app/frontend" ]; then
    print_error "Error: /app/backend or /app/frontend directory not found!"
    print_error "Please run this script from the /app directory"
    exit 1
fi

print_success "Application directories found"

# Check Python
if ! command -v python3 &> /dev/null; then
    print_error "Python3 is not installed!"
    exit 1
fi
PYTHON_VERSION=$(python3 --version)
print_success "Python found: $PYTHON_VERSION"

# Check Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed!"
    exit 1
fi
NODE_VERSION=$(node --version)
print_success "Node.js found: $NODE_VERSION"

# Check Yarn
if ! command -v yarn &> /dev/null; then
    print_warning "Yarn not found, installing..."
    npm install -g yarn
    print_success "Yarn installed"
else
    YARN_VERSION=$(yarn --version)
    print_success "Yarn found: v$YARN_VERSION"
fi

# Check MongoDB
if ! command -v mongod &> /dev/null; then
    print_warning "MongoDB not found in PATH (may be running as service)"
else
    print_success "MongoDB found"
fi

################################################################################
# STEP 2: INSTALL BACKEND DEPENDENCIES
################################################################################

print_section "STEP 2: Installing Backend Dependencies"

cd /app/backend

print_info "Installing Python packages from requirements.txt..."
pip install -r requirements.txt --quiet

print_success "Backend dependencies installed"

# Install Playwright browsers (including Chromium)
print_info "Installing Playwright browsers (Chromium for web scraping)..."
playwright install chromium

print_success "Playwright browsers installed successfully"

################################################################################
# STEP 3: INSTALL FRONTEND DEPENDENCIES
################################################################################

print_section "STEP 3: Installing Frontend Dependencies"

cd /app/frontend

print_info "Installing Node.js packages with Yarn..."
yarn install --silent

print_success "Frontend dependencies installed"

################################################################################
# STEP 4: VERIFY ENVIRONMENT VARIABLES
################################################################################

print_section "STEP 4: Verifying Environment Configuration"

# Check backend .env
if [ ! -f "/app/backend/.env" ]; then
    print_warning "Backend .env file not found!"
    print_info "Creating default .env file..."
    cat > /app/backend/.env << 'EOF'
MONGO_URL=mongodb://localhost:27017/scrapi
JWT_SECRET=your-secret-key-change-in-production
EMERGENT_LLM_KEY=your-emergent-llm-key
OPENAI_API_KEY=your-openai-key
EOF
    print_success "Backend .env file created (please update with your keys)"
else
    print_success "Backend .env file exists"
fi

# Check frontend .env
if [ ! -f "/app/frontend/.env" ]; then
    print_warning "Frontend .env file not found!"
    print_info "Creating default .env file..."
    cat > /app/frontend/.env << 'EOF'
REACT_APP_BACKEND_URL=http://localhost:8001
EOF
    print_success "Frontend .env file created"
else
    print_success "Frontend .env file exists"
fi

################################################################################
# STEP 5: START MONGODB (IF NOT RUNNING)
################################################################################

print_section "STEP 5: Checking MongoDB Service"

# Check if MongoDB is already running
if pgrep -x "mongod" > /dev/null; then
    print_success "MongoDB is already running"
else
    print_warning "MongoDB is not running"
    print_info "Attempting to start MongoDB..."
    
    # Try to start MongoDB as a service
    if command -v systemctl &> /dev/null; then
        sudo systemctl start mongodb || sudo systemctl start mongod || print_warning "Could not start MongoDB via systemctl"
    elif command -v service &> /dev/null; then
        sudo service mongodb start || sudo service mongod start || print_warning "Could not start MongoDB via service"
    else
        print_warning "MongoDB service management not available"
        print_info "Please start MongoDB manually: sudo mongod --fork --logpath /var/log/mongodb.log"
    fi
    
    sleep 2
    
    if pgrep -x "mongod" > /dev/null; then
        print_success "MongoDB started successfully"
    else
        print_warning "MongoDB may not be running. Please check manually."
    fi
fi

################################################################################
# STEP 6: START BACKEND SERVER
################################################################################

print_section "STEP 6: Starting Backend Server"

cd /app/backend

# Check if backend is already running
if sudo supervisorctl status backend | grep -q "RUNNING"; then
    print_warning "Backend is already running, restarting..."
    sudo supervisorctl restart backend
else
    print_info "Starting backend server via supervisor..."
    sudo supervisorctl start backend
fi

sleep 3

# Verify backend is running
if sudo supervisorctl status backend | grep -q "RUNNING"; then
    print_success "Backend server is running on http://localhost:8001"
else
    print_error "Failed to start backend server"
    print_info "Check logs: sudo supervisorctl tail -f backend"
    exit 1
fi

################################################################################
# STEP 7: START FRONTEND SERVER
################################################################################

print_section "STEP 7: Starting Frontend Server"

cd /app/frontend

# Check if frontend is already running
if sudo supervisorctl status frontend | grep -q "RUNNING"; then
    print_warning "Frontend is already running, restarting..."
    sudo supervisorctl restart frontend
else
    print_info "Starting frontend server via supervisor..."
    sudo supervisorctl start frontend
fi

sleep 3

# Verify frontend is running
if sudo supervisorctl status frontend | grep -q "RUNNING"; then
    print_success "Frontend server is running on http://localhost:3000"
else
    print_error "Failed to start frontend server"
    print_info "Check logs: sudo supervisorctl tail -f frontend"
    exit 1
fi

################################################################################
# STEP 8: FINAL STATUS CHECK
################################################################################

print_section "STEP 8: Application Status"

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                   SCRAPI APPLICATION STATUS                  ║${NC}"
echo -e "${CYAN}╠══════════════════════════════════════════════════════════════╣${NC}"
echo ""

# Backend status
BACKEND_STATUS=$(sudo supervisorctl status backend)
if echo "$BACKEND_STATUS" | grep -q "RUNNING"; then
    echo -e "  ${GREEN}✅ Backend:${NC}  RUNNING on http://localhost:8001"
    echo -e "              API Docs: http://localhost:8001/docs"
else
    echo -e "  ${RED}❌ Backend:${NC}  NOT RUNNING"
fi

# Frontend status
FRONTEND_STATUS=$(sudo supervisorctl status frontend)
if echo "$FRONTEND_STATUS" | grep -q "RUNNING"; then
    echo -e "  ${GREEN}✅ Frontend:${NC} RUNNING on http://localhost:3000"
else
    echo -e "  ${RED}❌ Frontend:${NC} NOT RUNNING"
fi

# MongoDB status
if pgrep -x "mongod" > /dev/null; then
    echo -e "  ${GREEN}✅ MongoDB:${NC}  RUNNING on mongodb://localhost:27017"
else
    echo -e "  ${YELLOW}⚠️  MongoDB:${NC}  STATUS UNKNOWN"
fi

echo ""
echo -e "${CYAN}╠══════════════════════════════════════════════════════════════╣${NC}"
echo -e "${CYAN}║                     QUICK ACCESS LINKS                       ║${NC}"
echo -e "${CYAN}╠══════════════════════════════════════════════════════════════╣${NC}"
echo ""
echo -e "  ${BLUE}🌐 Web Application:${NC}    http://localhost:3000"
echo -e "  ${BLUE}🔌 API Backend:${NC}        http://localhost:8001"
echo -e "  ${BLUE}📖 API Documentation:${NC}  http://localhost:8001/docs"
echo -e "  ${BLUE}💾 MongoDB:${NC}            mongodb://localhost:27017"
echo ""
echo -e "${CYAN}╠══════════════════════════════════════════════════════════════╣${NC}"
echo -e "${CYAN}║                      USEFUL COMMANDS                         ║${NC}"
echo -e "${CYAN}╠══════════════════════════════════════════════════════════════╣${NC}"
echo ""
echo -e "  ${YELLOW}View Backend Logs:${NC}"
echo -e "    sudo supervisorctl tail -f backend"
echo ""
echo -e "  ${YELLOW}View Frontend Logs:${NC}"
echo -e "    sudo supervisorctl tail -f frontend"
echo ""
echo -e "  ${YELLOW}Restart Backend:${NC}"
echo -e "    sudo supervisorctl restart backend"
echo ""
echo -e "  ${YELLOW}Restart Frontend:${NC}"
echo -e "    sudo supervisorctl restart frontend"
echo ""
echo -e "  ${YELLOW}Restart All Services:${NC}"
echo -e "    sudo supervisorctl restart all"
echo ""
echo -e "  ${YELLOW}Stop All Services:${NC}"
echo -e "    sudo supervisorctl stop all"
echo ""
echo -e "  ${YELLOW}Check All Services Status:${NC}"
echo -e "    sudo supervisorctl status"
echo ""
echo -e "${CYAN}╠══════════════════════════════════════════════════════════════╣${NC}"
echo -e "${CYAN}║                   APPLICATION FEATURES                       ║${NC}"
echo -e "${CYAN}╠══════════════════════════════════════════════════════════════╣${NC}"
echo ""
echo -e "  ${GREEN}✨ JWT Authentication System${NC}"
echo -e "  ${GREEN}✨ Playwright-based Web Scraping Engine${NC}"
echo -e "  ${GREEN}✨ Google Maps Business Scraper (V3)${NC}"
echo -e "  ${GREEN}✨ AI-Powered Lead Chat Assistant${NC}"
echo -e "  ${GREEN}✨ Global Chat Assistant with Function Calling${NC}"
echo -e "  ${GREEN}✨ Proxy Management & Rotation${NC}"
echo -e "  ${GREEN}✨ Dataset Management & Export (JSON/CSV)${NC}"
echo -e "  ${GREEN}✨ Real-time Run Monitoring${NC}"
echo -e "  ${GREEN}✨ Social Media Links Extraction${NC}"
echo ""
echo -e "${CYAN}╠══════════════════════════════════════════════════════════════╣${NC}"
echo -e "${CYAN}║                    DEFAULT CREDENTIALS                       ║${NC}"
echo -e "${CYAN}╠══════════════════════════════════════════════════════════════╣${NC}"
echo ""
echo -e "  ${YELLOW}Note:${NC} You can register a new account or use existing ones"
echo -e "  ${YELLOW}Test Account:${NC} Username: test | Password: test"
echo ""
echo -e "${CYAN}╠══════════════════════════════════════════════════════════════╣${NC}"
echo -e "${CYAN}║                    TROUBLESHOOTING                           ║${NC}"
echo -e "${CYAN}╠══════════════════════════════════════════════════════════════╣${NC}"
echo ""
echo -e "  ${RED}If services fail to start:${NC}"
echo -e "    1. Check supervisor logs"
echo -e "    2. Ensure MongoDB is running"
echo -e "    3. Verify .env files are configured"
echo -e "    4. Check if ports 3000 and 8001 are available"
echo ""
echo -e "  ${RED}Backend not responding:${NC}"
echo -e "    tail -n 100 /var/log/supervisor/backend.err.log"
echo ""
echo -e "  ${RED}Frontend not loading:${NC}"
echo -e "    tail -n 100 /var/log/supervisor/frontend.err.log"
echo ""
echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

print_section "🎉 Application Startup Complete!"

print_success "All services are running. Visit http://localhost:3000 to access Scrapi!"
echo ""
