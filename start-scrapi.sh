#!/bin/bash

# Scrapi - Master Setup Script
# This script helps you choose which mode to run

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

clear
echo "==========================================="
echo -e "${CYAN}🚀 Scrapi Application Launcher${NC}"
echo "==========================================="
echo ""
echo "Choose which mode you want to run:"
echo ""
echo -e "  ${GREEN}1)${NC} Normal Mode       - Main application (Frontend + Backend)"
echo -e "  ${BLUE}2)${NC} Admin Console     - Admin interface + Backend"
echo -e "  ${YELLOW}3)${NC} Landing Site      - Marketing site + Backend"
echo -e "  ${CYAN}4)${NC} Check Dependencies - Verify all dependencies are installed"
echo -e "  ${RED}5)${NC} Exit"
echo ""
echo -n "Enter your choice [1-5]: "

read choice

echo ""

case $choice in
    1)
        echo -e "${GREEN}Starting Normal Mode...${NC}"
        echo ""
        bash /app/start-normal.sh
        ;;
    2)
        echo -e "${BLUE}Starting Admin Console...${NC}"
        echo ""
        bash /app/start-admin-console.sh
        ;;
    3)
        echo -e "${YELLOW}Starting Landing Site...${NC}"
        echo ""
        bash /app/start-landing-site.sh
        ;;
    4)
        echo -e "${CYAN}Checking Dependencies...${NC}"
        echo ""
        bash /app/check-dependencies.sh
        ;;
    5)
        echo -e "${RED}Exiting...${NC}"
        exit 0
        ;;
    *)
        echo -e "${RED}Invalid choice. Please run the script again.${NC}"
        exit 1
        ;;
esac
