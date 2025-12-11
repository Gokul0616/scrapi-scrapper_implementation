# Quick Start Guide - Enhanced Email Validator

## 🚀 Quick Start

### Start the Application
```bash
# Run in background with nohup
nohup /app/start-normal.sh > /tmp/start-normal.log 2>&1 &

# Or without nohup
/app/start-normal.sh
```

### Check Service Status
```bash
sudo supervisorctl status
```

Expected output:
```
backend      RUNNING   pid 743, uptime 0:01:41
frontend     RUNNING   pid 378, uptime 0:05:38
mongodb      RUNNING   pid 37, uptime 0:06:54
```

## 📧 Email Validation Endpoints

### Base URL
```
http://localhost:8001/api/email-validation
```

### 1. Validate Email
```bash
curl -X POST http://localhost:8001/api/email-validation/validate \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

### 2. Get Statistics
```bash
curl http://localhost:8001/api/email-validation/blocklist/stats
```

### 3. Check Domain
```bash
curl http://localhost:8001/api/email-validation/check-domain/tempmail.com
```

### 4. Refresh Blocklist
```bash
curl -X POST http://localhost:8001/api/email-validation/blocklist/refresh
```

## 🧪 Quick Tests

### Test Valid Email
```bash
curl -X POST http://localhost:8001/api/email-validation/validate \
  -H "Content-Type: application/json" \
  -d '{"email": "user@gmail.com"}' | python3 -m json.tool
```

Expected: `"is_valid": true`

### Test Disposable Email
```bash
curl -X POST http://localhost:8001/api/email-validation/validate \
  -H "Content-Type: application/json" \
  -d '{"email": "test@tempmail.com"}' | python3 -m json.tool
```

Expected: `"is_valid": false`

## 📊 System Features

- **147,460+ blocked disposable domains**
- **4 blocklist sources**
- **5 detection layers**
- **23+ trusted providers**
- **Auto-refresh every 24 hours**

## 🔍 Detection Methods

1. **Trusted Provider Whitelist** - Instant approval for Gmail, Outlook, etc.
2. **Multi-Source Blocklist** - 147,460 known disposable domains
3. **Pattern Matching** - 20+ disposable keywords
4. **Suspicious TLD** - Blocks .tk, .ml, .ga, etc.
5. **Structure Analysis** - Detects suspicious domain patterns

## 🛠️ Useful Commands

### Restart Services
```bash
sudo supervisorctl restart backend
sudo supervisorctl restart frontend
sudo supervisorctl restart all
```

### View Logs
```bash
# Backend logs
tail -f /var/log/supervisor/backend.out.log

# Backend errors
tail -f /var/log/supervisor/backend.err.log

# Frontend logs
tail -f /var/log/supervisor/frontend.out.log
```

### Check API Health
```bash
curl http://localhost:8001/health
```

## 📚 API Documentation

Interactive API docs available at:
```
http://localhost:8001/docs
```

## 🎯 Test Coverage

All tests passing:
- ✅ Valid emails (trusted providers)
- ✅ Disposable emails (blocklist)
- ✅ Pattern-based detection
- ✅ Suspicious TLD detection
- ✅ Domain structure analysis

## 📝 Files Created/Modified

### Modified Files:
- `/app/backend/services/email_validator.py` - Enhanced validation logic
- `/app/backend/routes/email_validation_routes.py` - Improved endpoints

### Documentation:
- `/app/EMAIL_VALIDATOR_IMPROVEMENTS.md` - Detailed improvements
- `/app/QUICK_START_GUIDE.md` - This guide

## 🚨 Troubleshooting

### Services not running
```bash
sudo supervisorctl restart all
```

### Check for errors
```bash
tail -100 /var/log/supervisor/backend.err.log
```

### Refresh blocklist manually
```bash
curl -X POST http://localhost:8001/api/email-validation/blocklist/refresh
```

## ✅ Verification

Run comprehensive test:
```bash
/tmp/comprehensive_test.sh
```

Expected output: `🎉 ALL TESTS PASSED!`
