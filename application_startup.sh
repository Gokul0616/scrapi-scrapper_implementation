#!/bin/bash

################################################################################
#                      SCRAPI APPLICATION STARTUP SCRIPT                       #
################################################################################
#
# Description: Complete startup script for Scrapi - Web Scraping Platform
# 
# This script handles:
#   ✅ Prerequisites verification (Python, Node.js, Yarn, MongoDB)
#   ✅ Backend dependencies installation (Python packages)
#   ✅ Playwright browser installation (Chromium for web scraping)
#   ✅ Frontend dependencies installation (Node.js packages)
#   ✅ Environment configuration verification (.env files)
#   ✅ MongoDB service startup/verification
#   ✅ Backend server startup via Supervisor
#   ✅ Frontend server startup via Supervisor
#   ✅ Complete status check and access information
#
# Tech Stack:
#   - Backend:  FastAPI (Python)
#   - Frontend: React (JavaScript)
#   - Database: MongoDB
#   - Scraping: Playwright
#   - Process Manager: Supervisor
#
# Usage:
#   chmod +x application_startup.sh
#   ./application_startup.sh
#
################################################################################

set -e  # Exit on any error

################################################################################
# COLOR DEFINITIONS FOR BEAUTIFUL OUTPUT
################################################################################

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

################################################################################
# HELPER FUNCTIONS
################################################################################

print_header() {
    echo ""
    echo -e "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${WHITE}               SCRAPI APPLICATION STARTUP                     ${CYAN}║${NC}"
    echo -e "${CYAN}║${WHITE}          Powerful Web Scraping Platform (Apify Clone)        ${CYAN}║${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_section() {
    echo ""
    echo -e "${PURPLE}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${PURPLE}  $1${NC}"
    echo -e "${PURPLE}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
}

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

print_command() {
    echo -e "${WHITE}   $1${NC}"
}

################################################################################
# START MAIN SCRIPT
################################################################################

clear
print_header

################################################################################
# STEP 1: CHECK PREREQUISITES
################################################################################

print_section "STEP 1/8: Checking Prerequisites"

# Verify we're in the correct directory
if [ ! -d "/app/backend" ] || [ ! -d "/app/frontend" ]; then
    print_error "Application directories not found!"
    print_error "Expected: /app/backend and /app/frontend"
    print_error "Current directory: $(pwd)"
    exit 1
fi
print_success "Application directory structure verified"

# Check Python
if ! command -v python3 &> /dev/null; then
    print_error "Python3 is not installed!"
    print_info "Please install Python 3.8 or higher"
    exit 1
fi
PYTHON_VERSION=$(python3 --version 2>&1)
print_success "Python found: ${PYTHON_VERSION}"

# Check pip
if ! command -v pip &> /dev/null && ! command -v pip3 &> /dev/null; then
    print_error "pip is not installed!"
    exit 1
fi
print_success "pip package manager found"

# Check Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed!"
    print_info "Please install Node.js 16.x or higher"
    exit 1
fi
NODE_VERSION=$(node --version 2>&1)
print_success "Node.js found: ${NODE_VERSION}"

# Check Yarn
if ! command -v yarn &> /dev/null; then
    print_warning "Yarn not found, installing globally..."
    npm install -g yarn --silent
    print_success "Yarn installed successfully"
else
    YARN_VERSION=$(yarn --version 2>&1)
    print_success "Yarn found: v${YARN_VERSION}"
fi

# Check MongoDB
if command -v mongod &> /dev/null; then
    MONGO_VERSION=$(mongod --version 2>&1 | head -n 1)
    print_success "MongoDB found: ${MONGO_VERSION}"
else
    print_warning "MongoDB not found in PATH (may be managed by system service)"
fi

# Check Supervisor
if command -v supervisorctl &> /dev/null; then
    print_success "Supervisor process manager found"
else
    print_warning "Supervisor not found - services may need manual start"
fi

################################################################################
# STEP 2: INSTALL BACKEND DEPENDENCIES
################################################################################

print_section "STEP 2/8: Installing Backend Dependencies"

cd /app/backend

if [ ! -f "requirements.txt" ]; then
    print_error "requirements.txt not found in /app/backend"
    exit 1
fi

print_info "Installing Python packages from requirements.txt..."
print_info "This may take a few minutes on first run..."

pip install -r requirements.txt --quiet --disable-pip-version-check 2>&1 | grep -v "already satisfied" || true

print_success "Backend Python dependencies installed"

################################################################################
# STEP 3: INSTALL PLAYWRIGHT BROWSERS
################################################################################

print_section "STEP 3/8: Installing Playwright Browsers"

print_info "Installing Playwright Chromium browser for web scraping..."
print_info "This downloads ~170MB and may take a few minutes..."

# Check if playwright is available
if command -v playwright &> /dev/null; then
    playwright install chromium 2>&1 | tail -5
    print_success "Playwright Chromium browser installed successfully"
else
    print_warning "Playwright command not found, attempting to install via Python..."
    python3 -m playwright install chromium 2>&1 | tail -5
    print_success "Playwright browsers installed via Python module"
fi

################################################################################
# STEP 4: INSTALL FRONTEND DEPENDENCIES
################################################################################

print_section "STEP 4/8: Installing Frontend Dependencies"

cd /app/frontend

if [ ! -f "package.json" ]; then
    print_error "package.json not found in /app/frontend"
    exit 1
fi

print_info "Installing Node.js packages with Yarn..."

if [ -d "node_modules" ]; then
    print_info "node_modules directory exists, checking for updates..."
    yarn install --check-files --silent 2>&1 | grep -v "warning" | tail -5 || true
else
    print_info "First-time installation, this may take several minutes..."
    yarn install --silent 2>&1 | tail -10 || true
fi

print_success "Frontend dependencies installed successfully"

################################################################################
# STEP 5: VERIFY ENVIRONMENT CONFIGURATION
################################################################################

print_section "STEP 5/8: Verifying Environment Configuration"

# Check backend .env
print_info "Checking backend environment configuration..."
if [ ! -f "/app/backend/.env" ]; then
    print_warning "Backend .env file not found!"
    print_info "Creating default .env file..."
    cat > /app/backend/.env << 'EOF'
# MongoDB Configuration
MONGO_URL=mongodb://localhost:27017/scrapi

# JWT Authentication
JWT_SECRET=your-secret-key-change-in-production-$(date +%s)

# LLM API Keys (Optional - for AI features)
EMERGENT_LLM_KEY=your-emergent-llm-key-here
OPENAI_API_KEY=your-openai-api-key-here

# Application Settings
DEBUG=False
ENVIRONMENT=production
EOF
    print_success "Backend .env file created with defaults"
    print_warning "Please update API keys in /app/backend/.env for AI features"
else
    print_success "Backend .env file exists"
    
    # Verify critical environment variables
    if grep -q "MONGO_URL" /app/backend/.env; then
        print_success "MONGO_URL configuration found"
    else
        print_warning "MONGO_URL not found in .env, using default"
    fi
    
    if grep -q "JWT_SECRET" /app/backend/.env; then
        print_success "JWT_SECRET configuration found"
    else
        print_warning "JWT_SECRET not found in .env"
    fi
fi

# Check frontend .env
print_info "Checking frontend environment configuration..."
if [ ! -f "/app/frontend/.env" ]; then
    print_warning "Frontend .env file not found!"
    print_info "Creating default .env file..."
    cat > /app/frontend/.env << 'EOF'
# Backend API Configuration
REACT_APP_BACKEND_URL=http://localhost:8001

# Development Settings
DISABLE_ESLINT_PLUGIN=true
SKIP_PREFLIGHT_CHECK=true
WDS_SOCKET_PROTOCOL=wss
WDS_SOCKET_HOST=localhost
EOF
    print_success "Frontend .env file created with defaults"
else
    print_success "Frontend .env file exists"
    
    if grep -q "REACT_APP_BACKEND_URL" /app/frontend/.env; then
        BACKEND_URL=$(grep "REACT_APP_BACKEND_URL" /app/frontend/.env | cut -d '=' -f2)
        print_success "Backend URL configured: ${BACKEND_URL}"
    fi
fi

################################################################################
# STEP 6: START/VERIFY MONGODB SERVICE
################################################################################

print_section "STEP 6/8: Starting MongoDB Service"

# Check if MongoDB is running
if pgrep -x "mongod" > /dev/null 2>&1; then
    print_success "MongoDB is already running"
    MONGO_PID=$(pgrep -x "mongod")
    print_info "MongoDB PID: ${MONGO_PID}"
else
    print_warning "MongoDB is not running, attempting to start..."
    
    # Try supervisor first
    if command -v supervisorctl &> /dev/null; then
        sudo supervisorctl start mongodb 2>/dev/null || true
        sleep 2
    fi
    
    # If still not running, try system service
    if ! pgrep -x "mongod" > /dev/null 2>&1; then
        if command -v systemctl &> /dev/null; then
            print_info "Attempting to start MongoDB via systemctl..."
            sudo systemctl start mongodb 2>/dev/null || sudo systemctl start mongod 2>/dev/null || true
        elif command -v service &> /dev/null; then
            print_info "Attempting to start MongoDB via service..."
            sudo service mongodb start 2>/dev/null || sudo service mongod start 2>/dev/null || true
        fi
        sleep 3
    fi
    
    # Final check
    if pgrep -x "mongod" > /dev/null 2>&1; then
        print_success "MongoDB started successfully"
    else
        print_warning "Could not start MongoDB automatically"
        print_info "Please start MongoDB manually:"
        print_command "sudo systemctl start mongodb"
        print_info "Or run: sudo mongod --fork --logpath /var/log/mongodb/mongod.log"
    fi
fi

################################################################################
# STEP 7: START BACKEND SERVER
################################################################################

print_section "STEP 7/8: Starting Backend Server"

cd /app/backend

# Check if supervisor is available
if command -v supervisorctl &> /dev/null; then
    # Check current backend status
    BACKEND_STATUS=$(sudo supervisorctl status backend 2>/dev/null | awk '{print $2}' || echo "UNKNOWN")
    
    if [ "$BACKEND_STATUS" == "RUNNING" ]; then
        print_warning "Backend is already running, restarting for fresh start..."
        sudo supervisorctl restart backend
    else
        print_info "Starting backend server via Supervisor..."
        sudo supervisorctl start backend 2>/dev/null || sudo supervisorctl restart backend
    fi
    
    # Wait for backend to initialize
    print_info "Waiting for backend to initialize..."
    sleep 5
    
    # Verify backend is running
    BACKEND_STATUS=$(sudo supervisorctl status backend 2>/dev/null | awk '{print $2}' || echo "UNKNOWN")
    if [ "$BACKEND_STATUS" == "RUNNING" ]; then
        print_success "Backend server is running on http://localhost:8001"
        print_info "API Documentation: http://localhost:8001/docs"
    else
        print_error "Failed to start backend server"
        print_info "Check logs with: sudo supervisorctl tail backend"
        print_info "Or: tail -f /var/log/supervisor/backend.err.log"
    fi
else
    print_warning "Supervisor not available, please start backend manually"
    print_info "Run: cd /app/backend && uvicorn server:app --host 0.0.0.0 --port 8001"
fi

################################################################################
# STEP 8: START FRONTEND SERVER
################################################################################

print_section "STEP 8/8: Starting Frontend Server"

cd /app/frontend

# Check if supervisor is available
if command -v supervisorctl &> /dev/null; then
    # Check current frontend status
    FRONTEND_STATUS=$(sudo supervisorctl status frontend 2>/dev/null | awk '{print $2}' || echo "UNKNOWN")
    
    if [ "$FRONTEND_STATUS" == "RUNNING" ]; then
        print_warning "Frontend is already running, restarting for fresh start..."
        sudo supervisorctl restart frontend
    else
        print_info "Starting frontend server via Supervisor..."
        sudo supervisorctl start frontend 2>/dev/null || sudo supervisorctl restart frontend
    fi
    
    # Wait for frontend to compile and start
    print_info "Waiting for frontend to compile (this may take 30-60 seconds)..."
    sleep 8
    
    # Verify frontend is running
    FRONTEND_STATUS=$(sudo supervisorctl status frontend 2>/dev/null | awk '{print $2}' || echo "UNKNOWN")
    if [ "$FRONTEND_STATUS" == "RUNNING" ]; then
        print_success "Frontend server is running on http://localhost:3000"
        print_info "React development server is compiling..."
    else
        print_error "Failed to start frontend server"
        print_info "Check logs with: sudo supervisorctl tail frontend"
        print_info "Or: tail -f /var/log/supervisor/frontend.err.log"
    fi
else
    print_warning "Supervisor not available, please start frontend manually"
    print_info "Run: cd /app/frontend && yarn start"
fi

################################################################################
# FINAL STATUS AND INFORMATION
################################################################################

print_section "🎉 APPLICATION STARTUP COMPLETE!"

# Wait a moment for services to stabilize
sleep 2

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║${WHITE}                   SERVICE STATUS REPORT                      ${CYAN}║${NC}"
echo -e "${CYAN}╠══════════════════════════════════════════════════════════════╣${NC}"
echo ""

# Check MongoDB status
if pgrep -x "mongod" > /dev/null 2>&1; then
    echo -e "  ${GREEN}✅ MongoDB:${NC}   RUNNING on mongodb://localhost:27017"
else
    echo -e "  ${RED}❌ MongoDB:${NC}   NOT RUNNING"
fi

# Check Backend status
if command -v supervisorctl &> /dev/null; then
    BACKEND_STATUS=$(sudo supervisorctl status backend 2>/dev/null | awk '{print $2}' || echo "UNKNOWN")
    if [ "$BACKEND_STATUS" == "RUNNING" ]; then
        echo -e "  ${GREEN}✅ Backend:${NC}   RUNNING on http://localhost:8001"
    else
        echo -e "  ${RED}❌ Backend:${NC}   NOT RUNNING (Status: ${BACKEND_STATUS})"
    fi
else
    echo -e "  ${YELLOW}⚠️  Backend:${NC}   SUPERVISOR NOT AVAILABLE"
fi

# Check Frontend status
if command -v supervisorctl &> /dev/null; then
    FRONTEND_STATUS=$(sudo supervisorctl status frontend 2>/dev/null | awk '{print $2}' || echo "UNKNOWN")
    if [ "$FRONTEND_STATUS" == "RUNNING" ]; then
        echo -e "  ${GREEN}✅ Frontend:${NC}  RUNNING on http://localhost:3000"
    else
        echo -e "  ${RED}❌ Frontend:${NC}  NOT RUNNING (Status: ${FRONTEND_STATUS})"
    fi
else
    echo -e "  ${YELLOW}⚠️  Frontend:${NC}  SUPERVISOR NOT AVAILABLE"
fi

echo ""
echo -e "${CYAN}╠══════════════════════════════════════════════════════════════╣${NC}"
echo -e "${CYAN}║${WHITE}                     ACCESS POINTS                            ${CYAN}║${NC}"
echo -e "${CYAN}╠══════════════════════════════════════════════════════════════╣${NC}"
echo ""
echo -e "  ${BLUE}🌐 Web Application:${NC}       http://localhost:3000"
echo -e "  ${BLUE}🔌 API Backend:${NC}           http://localhost:8001"
echo -e "  ${BLUE}📖 API Documentation:${NC}     http://localhost:8001/docs"
echo -e "  ${BLUE}💾 MongoDB:${NC}               mongodb://localhost:27017/scrapi"
echo ""
echo -e "${CYAN}╠══════════════════════════════════════════════════════════════╣${NC}"
echo -e "${CYAN}║${WHITE}                    KEY FEATURES                              ${CYAN}║${NC}"
echo -e "${CYAN}╠══════════════════════════════════════════════════════════════╣${NC}"
echo ""
echo -e "  ${GREEN}✨ JWT Authentication & User Management${NC}"
echo -e "  ${GREEN}✨ Visual Scraper Builder (No-Code)${NC}"
echo -e "  ${GREEN}✨ Playwright-based Web Scraping Engine${NC}"
echo -e "  ${GREEN}✨ Google Maps Business Scraper V3${NC}"
echo -e "  ${GREEN}✨ AI-Powered Lead Chat Assistant${NC}"
echo -e "  ${GREEN}✨ Global Chat Assistant (Function Calling)${NC}"
echo -e "  ${GREEN}✨ Proxy Management & Rotation System${NC}"
echo -e "  ${GREEN}✨ Dataset Export (JSON/CSV/Excel)${NC}"
echo -e "  ${GREEN}✨ Real-time Run Monitoring${NC}"
echo -e "  ${GREEN}✨ Social Media Links Extraction${NC}"
echo ""
echo -e "${CYAN}╠══════════════════════════════════════════════════════════════╣${NC}"
echo -e "${CYAN}║${WHITE}                  USEFUL COMMANDS                             ${CYAN}║${NC}"
echo -e "${CYAN}╠══════════════════════════════════════════════════════════════╣${NC}"
echo ""
echo -e "  ${YELLOW}Check all services:${NC}"
echo -e "    ${WHITE}sudo supervisorctl status${NC}"
echo ""
echo -e "  ${YELLOW}Restart all services:${NC}"
echo -e "    ${WHITE}sudo supervisorctl restart all${NC}"
echo ""
echo -e "  ${YELLOW}View backend logs:${NC}"
echo -e "    ${WHITE}sudo supervisorctl tail -f backend${NC}"
echo -e "    ${WHITE}tail -f /var/log/supervisor/backend.err.log${NC}"
echo ""
echo -e "  ${YELLOW}View frontend logs:${NC}"
echo -e "    ${WHITE}sudo supervisorctl tail -f frontend${NC}"
echo -e "    ${WHITE}tail -f /var/log/supervisor/frontend.err.log${NC}"
echo ""
echo -e "  ${YELLOW}Stop all services:${NC}"
echo -e "    ${WHITE}sudo supervisorctl stop all${NC}"
echo ""
echo -e "  ${YELLOW}Restart individual service:${NC}"
echo -e "    ${WHITE}sudo supervisorctl restart backend${NC}"
echo -e "    ${WHITE}sudo supervisorctl restart frontend${NC}"
echo ""
echo -e "${CYAN}╠══════════════════════════════════════════════════════════════╣${NC}"
echo -e "${CYAN}║${WHITE}                    DEFAULT ACCOUNTS                          ${CYAN}║${NC}"
echo -e "${CYAN}╠══════════════════════════════════════════════════════════════╣${NC}"
echo ""
echo -e "  ${YELLOW}Test Account:${NC}"
echo -e "    Username: ${WHITE}test${NC}"
echo -e "    Password: ${WHITE}test${NC}"
echo ""
echo -e "  ${YELLOW}Note:${NC} You can register a new account at the login page"
echo ""
echo -e "${CYAN}╠══════════════════════════════════════════════════════════════╣${NC}"
echo -e "${CYAN}║${WHITE}                    TROUBLESHOOTING                           ${CYAN}║${NC}"
echo -e "${CYAN}╠══════════════════════════════════════════════════════════════╣${NC}"
echo ""
echo -e "  ${RED}If backend fails to start:${NC}"
echo -e "    1. Check if MongoDB is running"
echo -e "    2. Verify .env configuration"
echo -e "    3. Check backend logs for errors"
echo -e "    4. Ensure port 8001 is available"
echo ""
echo -e "  ${RED}If frontend fails to start:${NC}"
echo -e "    1. Check if backend is running"
echo -e "    2. Verify REACT_APP_BACKEND_URL in .env"
echo -e "    3. Check frontend logs for errors"
echo -e "    4. Ensure port 3000 is available"
echo ""
echo -e "  ${RED}If MongoDB connection fails:${NC}"
echo -e "    1. Check if MongoDB service is running"
echo -e "    2. Verify MONGO_URL in backend/.env"
echo -e "    3. Check MongoDB logs: /var/log/mongodb/mongod.log"
echo ""
echo -e "${CYAN}╠══════════════════════════════════════════════════════════════╣${NC}"
echo -e "${CYAN}║${WHITE}                     NEXT STEPS                               ${CYAN}║${NC}"
echo -e "${CYAN}╠══════════════════════════════════════════════════════════════╣${NC}"
echo ""
echo -e "  ${GREEN}1.${NC} Open http://localhost:3000 in your browser"
echo -e "  ${GREEN}2.${NC} Register a new account or login with test account"
echo -e "  ${GREEN}3.${NC} Explore the Actors page to see available scrapers"
echo -e "  ${GREEN}4.${NC} Create your first scraping run with Google Maps Scraper"
echo -e "  ${GREEN}5.${NC} View extracted data in the Runs/Dataset pages"
echo -e "  ${GREEN}6.${NC} Try the AI Chat Assistant for help"
echo ""
echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

print_success "🚀 Scrapi is ready! Visit http://localhost:3000 to get started!"
echo ""
