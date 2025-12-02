#!/bin/bash

# Configuration
KEY_PATH="/Users/gokul/Downloads/test-server-key.pem"
SERVER_USER="ubuntu"
SERVER_HOST="ec2-13-53-42-149.eu-north-1.compute.amazonaws.com"
REMOTE_DIR="/home/ubuntu/scrapi"

# Ensure key permissions
chmod 400 "$KEY_PATH"

echo "🚀 Starting OPTIMIZED deployment to $SERVER_HOST..."

# 1. Install Docker if not exists
echo "📦 Checking/Installing Docker on server..."
ssh -o StrictHostKeyChecking=no -i "$KEY_PATH" $SERVER_USER@$SERVER_HOST << 'EOF'
if ! command -v docker &> /dev/null; then
    echo "Docker not found. Installing..."
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
    echo "Docker installed. Please re-login for group changes to take effect."
else
    echo "Docker is already installed."
fi
EOF

# 2. Copy files
echo "📂 Copying files to server..."
# Create directory
ssh -i "$KEY_PATH" $SERVER_USER@$SERVER_HOST "mkdir -p $REMOTE_DIR"

# Copy project files (excluding node_modules, venv, etc.)
echo "Compression project..."
# Remove any existing tar to avoid "Can't add archive to itself" if it exists
rm -f project.tar.gz
# Create tar, excluding the tar itself and other heavy/unnecessary folders
tar --exclude='node_modules' --exclude='__pycache__' --exclude='.git' --exclude='venv' --exclude='project.tar.gz' -czf project.tar.gz .

echo "Uploading..."
scp -i "$KEY_PATH" project.tar.gz $SERVER_USER@$SERVER_HOST:$REMOTE_DIR/

# 3. Deploy
# 3. Deploy
echo "🚀 Triggering remote deployment..."
ssh -i "$KEY_PATH" $SERVER_USER@$SERVER_HOST << EOF
    cd $REMOTE_DIR
    tar -xzf project.tar.gz
    rm project.tar.gz
    
    chmod +x server_setup.sh
    
    echo "----------------------------------------------------------------"
    echo "🔥 Starting Background Deployment..."
    echo "You can safely close this terminal now."
    echo "To view progress, run: ssh -i $KEY_PATH $SERVER_USER@$SERVER_HOST 'tail -f $REMOTE_DIR/deploy.log'"
    echo "----------------------------------------------------------------"
    
    # Run in background with nohup, redirecting output to deploy.log
    nohup ./server_setup.sh > deploy.log 2>&1 &
EOF

echo "✅ Upload complete. Deployment is running on the server."


# Cleanup local tar
rm project.tar.gz
