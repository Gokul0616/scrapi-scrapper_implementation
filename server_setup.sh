#!/bin/bash
set -e # Exit on error

# Redirect all output to a log file if not already redirected
# This ensures we capture everything even if run via nohup
# exec > >(tee -a deploy.log) 2>&1

echo "========================================"
echo "🚀 Starting Server-Side Deployment"
echo "Date: $(date)"
echo "========================================"

# 1. Install Docker
if ! command -v docker &> /dev/null; then
    echo "📦 Docker not found. Installing..."
    sudo apt-get update
    sudo apt-get install -y ca-certificates curl gnupg
    sudo install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    sudo chmod a+r /etc/apt/keyrings/docker.gpg
    echo \
      "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | \
      sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    sudo usermod -aG docker $USER
    echo "✅ Docker installed."
else
    echo "✅ Docker is already installed."
fi

# 2. Setup Environment
echo "🔧 Configuring environment..."
if [ ! -f "backend/.env" ] && [ -f "backend/envCopy.txt" ]; then
    echo "backend/.env not found. Creating from envCopy.txt..."
    cp backend/envCopy.txt backend/.env
else
    echo "backend/.env exists. Using deployed version."
fi

# 3. Deploy
echo "🚀 Starting services..."
# We use 'sudo' for docker commands just in case the group membership hasn't refreshed in this session
sudo docker compose down || true
sudo docker compose up --build -d

echo "========================================"
echo "✅ Deployment complete! Services are running."
echo "Frontend: http://localhost:3000"
echo "Backend: http://localhost:8001"
echo "========================================"
