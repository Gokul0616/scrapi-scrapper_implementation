# 🚀 Scrapi - Quick Commands Reference

## Instant Startup

```bash
cd /app && ./startup.sh
```

## Service Control

```bash
# Check status of all services
sudo supervisorctl status

# Restart all services
sudo supervisorctl restart all

# Restart individual services
sudo supervisorctl restart backend
sudo supervisorctl restart frontend

# Stop all services
sudo supervisorctl stop all

# Start all services
sudo supervisorctl start all
```

## View Logs

```bash
# Follow backend logs (real-time)
sudo supervisorctl tail -f backend

# Follow frontend logs (real-time)
sudo supervisorctl tail -f frontend

# View last 100 lines of backend errors
tail -n 100 /var/log/supervisor/backend.err.log

# View last 100 lines of frontend errors
tail -n 100 /var/log/supervisor/frontend.err.log

# View MongoDB logs
tail -n 100 /var/log/mongodb/mongod.log
```

## Quick Health Checks

```bash
# Check if all services are running
sudo supervisorctl status

# Test backend API
curl http://localhost:8001/api/health

# Test frontend
curl http://localhost:3000

# Check MongoDB
mongosh --eval "db.serverStatus()"

# Check ports in use
sudo netstat -tulpn | grep -E '3000|8001|27017'
```

## Database Operations

```bash
# Connect to MongoDB
mongosh

# Connect to Scrapi database
mongosh scrapi

# Check collections
mongosh --eval "use scrapi; show collections"

# Count users
mongosh --eval "use scrapi; db.users.countDocuments()"

# Count runs
mongosh --eval "use scrapi; db.runs.countDocuments()"
```

## Installation Commands

```bash
# Install backend dependencies
cd /app/backend && pip install -r requirements.txt

# Install Chromium for Playwright
playwright install chromium
playwright install-deps chromium

# Install frontend dependencies (use Yarn, NOT npm)
cd /app/frontend && yarn install
```

## Troubleshooting

```bash
# Kill processes on port 3000 (frontend)
sudo kill -9 $(sudo lsof -t -i:3000)

# Kill processes on port 8001 (backend)
sudo kill -9 $(sudo lsof -t -i:8001)

# Clear frontend cache and reinstall
cd /app/frontend
rm -rf node_modules yarn.lock
yarn install
sudo supervisorctl restart frontend

# Check Python packages
pip list | grep -E 'fastapi|playwright|pymongo'

# Check environment variables
cat /app/backend/.env
cat /app/frontend/.env

# Check MongoDB status
sudo systemctl status mongodb

# Start MongoDB
sudo systemctl start mongodb
```

## Development Commands

```bash
# Run backend manually (development mode)
cd /app/backend
uvicorn server:app --host 0.0.0.0 --port 8001 --reload

# Run frontend manually (development mode)
cd /app/frontend
yarn start

# Run tests
cd /app/backend
pytest tests/

# Format Python code
cd /app/backend
black .

# Lint Python code
cd /app/backend
flake8 .
```

## Access URLs

| Service | URL |
|---------|-----|
| **Frontend** | http://localhost:3000 |
| **Backend API** | http://localhost:8001 |
| **API Docs (Swagger)** | http://localhost:8001/docs |
| **API Docs (ReDoc)** | http://localhost:8001/redoc |
| **MongoDB** | mongodb://localhost:27017 |

## Default Test Credentials

```
Username: test
Password: test
```

## Environment Variables

### Backend (.env)
```env
MONGO_URL=mongodb://localhost:27017/scrapi
JWT_SECRET=your-secret-key
EMERGENT_LLM_KEY=your-emergent-key
OPENAI_API_KEY=your-openai-key
```

### Frontend (.env)
```env
REACT_APP_BACKEND_URL=http://localhost:8001
```

## System Resource Monitoring

```bash
# Check memory usage
free -h

# Check disk space
df -h

# Check CPU and process usage
top

# Check running processes
ps aux | grep -E 'node|python|mongod'

# Check system load
uptime
```

## Emergency Recovery

```bash
# Full restart of all services
sudo supervisorctl restart all

# If that doesn't work, stop and start
sudo supervisorctl stop all
sleep 5
sudo supervisorctl start all

# If MongoDB is having issues
sudo systemctl restart mongodb
sleep 5
sudo supervisorctl restart backend

# Nuclear option - restart everything
sudo systemctl restart supervisor
sudo systemctl restart mongodb
```

## Useful Aliases (Add to ~/.bashrc)

```bash
# Add these to your ~/.bashrc for convenience
alias scrapi-status='sudo supervisorctl status'
alias scrapi-restart='sudo supervisorctl restart all'
alias scrapi-logs-backend='sudo supervisorctl tail -f backend'
alias scrapi-logs-frontend='sudo supervisorctl tail -f frontend'
alias scrapi-start='cd /app && ./startup.sh'
```

Then run:
```bash
source ~/.bashrc
```

Now you can use:
```bash
scrapi-status
scrapi-restart
scrapi-logs-backend
scrapi-logs-frontend
scrapi-start
```

## Performance Optimization

```bash
# Clear Playwright cache
rm -rf ~/.cache/ms-playwright

# Clear pip cache
pip cache purge

# Clear yarn cache
yarn cache clean

# Optimize MongoDB (run in mongosh)
mongosh --eval "use scrapi; db.runCommand({ compact: 'runs' })"
```

## Backup & Restore

```bash
# Backup MongoDB database
mongodump --db scrapi --out /tmp/scrapi_backup

# Restore MongoDB database
mongorestore --db scrapi /tmp/scrapi_backup/scrapi

# Backup environment files
cp /app/backend/.env /tmp/backend.env.backup
cp /app/frontend/.env /tmp/frontend.env.backup
```

---

**Pro Tip**: Bookmark this file for quick access to all essential commands!

**File Location**: `/app/QUICK_COMMANDS.md`
