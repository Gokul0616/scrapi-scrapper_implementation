# Scheduler System - curl Command Examples

This document provides individual curl commands for testing each scheduler endpoint.

## Setup

Replace these variables with your actual values:
```bash
API_URL="http://localhost:8001/api"
TOKEN="your-jwt-token-here"
ACTOR_ID="your-actor-id"
SCHEDULE_ID="your-schedule-id"
```

---

## Authentication

### Register a New User
```bash
curl -X POST "${API_URL}/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "testpass123",
    "organization_name": "Test Org"
  }'
```

### Login
```bash
curl -X POST "${API_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "testpass123"
  }'
```

---

## Actor Management

### Create an Actor
```bash
curl -X POST "${API_URL}/actors" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "name": "Test Actor",
    "description": "Actor for testing",
    "source_code": "print(\"Hello from actor\")"
  }'
```

---

## Schedule Management

### 1. Create a Schedule
```bash
curl -X POST "${API_URL}/schedules" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "actor_id": "'${ACTOR_ID}'",
    "name": "My Schedule",
    "description": "Runs every 5 minutes",
    "cron_expression": "*/5 * * * *",
    "input_data": {"key": "value"},
    "enabled": true
  }'
```

**Common Cron Expressions:**
- `* * * * *` - Every minute
- `*/5 * * * *` - Every 5 minutes
- `0 * * * *` - Every hour
- `0 0 * * *` - Every day at midnight
- `0 9 * * 1` - Every Monday at 9 AM

### 2. List All Schedules
```bash
curl -X GET "${API_URL}/schedules" \
  -H "Authorization: Bearer ${TOKEN}"
```

### 3. List Schedules with Pagination
```bash
curl -X GET "${API_URL}/schedules?page=1&limit=10" \
  -H "Authorization: Bearer ${TOKEN}"
```

### 4. Get Schedule by ID
```bash
curl -X GET "${API_URL}/schedules/${SCHEDULE_ID}" \
  -H "Authorization: Bearer ${TOKEN}"
```

### 5. Update Schedule Name and Description
```bash
curl -X PATCH "${API_URL}/schedules/${SCHEDULE_ID}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "name": "Updated Schedule Name",
    "description": "Updated description"
  }'
```

### 6. Update Schedule Cron Expression
```bash
curl -X PATCH "${API_URL}/schedules/${SCHEDULE_ID}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "cron_expression": "0 */2 * * *"
  }'
```

### 7. Update Schedule Input Data
```bash
curl -X PATCH "${API_URL}/schedules/${SCHEDULE_ID}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "input_data": {
      "new_key": "new_value",
      "another_key": 123
    }
  }'
```

### 8. Enable a Schedule
```bash
curl -X POST "${API_URL}/schedules/${SCHEDULE_ID}/enable" \
  -H "Authorization: Bearer ${TOKEN}"
```

### 9. Disable a Schedule
```bash
curl -X POST "${API_URL}/schedules/${SCHEDULE_ID}/disable" \
  -H "Authorization: Bearer ${TOKEN}"
```

### 10. Run Schedule Now (Manual Execution)
```bash
curl -X POST "${API_URL}/schedules/${SCHEDULE_ID}/run-now" \
  -H "Authorization: Bearer ${TOKEN}"
```

### 11. Delete a Schedule
```bash
curl -X DELETE "${API_URL}/schedules/${SCHEDULE_ID}" \
  -H "Authorization: Bearer ${TOKEN}"
```

---

## Testing Error Cases

### Test Without Authentication (Should Return 403)
```bash
curl -X GET "${API_URL}/schedules"
```

### Test Invalid Cron Expression (Should Return 422)
```bash
curl -X POST "${API_URL}/schedules" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "actor_id": "'${ACTOR_ID}'",
    "name": "Invalid Schedule",
    "cron_expression": "invalid cron",
    "enabled": true
  }'
```

### Test Non-existent Schedule (Should Return 404)
```bash
curl -X GET "${API_URL}/schedules/non-existent-id" \
  -H "Authorization: Bearer ${TOKEN}"
```

---

## Response Examples

### Successful Schedule Creation
```json
{
  "id": "a82383f5-8c15-4638-a611-99443dbf5c2c",
  "user_id": "b26df2c2-014c-48c2-b9e0-d540d85b2418",
  "actor_id": "80a259a3-f127-4858-bcda-bc0ad43fffdd",
  "name": "My Schedule",
  "description": "Runs every 5 minutes",
  "cron_expression": "*/5 * * * *",
  "cron_description": "At every 5 minutes",
  "timezone": "UTC",
  "is_enabled": true,
  "input_data": {"key": "value"},
  "run_count": 0,
  "last_run": null,
  "last_status": null,
  "next_run": "2025-12-07T13:50:00",
  "created_at": "2025-12-07T13:45:12.345Z",
  "updated_at": "2025-12-07T13:45:12.345Z"
}
```

### List Schedules Response
```json
{
  "schedules": [
    {
      "id": "...",
      "name": "My Schedule",
      "cron_expression": "*/5 * * * *",
      ...
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10,
  "pages": 1
}
```

### Enable/Disable Response
```json
{
  "message": "Schedule enabled successfully"
}
```

### Run Now Response
```json
{
  "message": "Schedule run initiated",
  "run_id": "7aca3fcb-0089-4d38-a419-7fb371f8b7c0",
  "run_count": 1
}
```

---

## Complete Test Flow Example

Here's a complete flow to test the scheduler system:

```bash
#!/bin/bash

# 1. Register and get token
RESPONSE=$(curl -s -X POST "http://localhost:8001/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser_'$(date +%s)'",
    "email": "test_'$(date +%s)'@example.com",
    "password": "testpass123",
    "organization_name": "Test Org"
  }')

TOKEN=$(echo $RESPONSE | jq -r '.access_token')
echo "Token: $TOKEN"

# 2. Create an actor
ACTOR_RESPONSE=$(curl -s -X POST "http://localhost:8001/api/actors" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Test Actor",
    "description": "Test",
    "source_code": "print(\"Hello\")"
  }')

ACTOR_ID=$(echo $ACTOR_RESPONSE | jq -r '.id')
echo "Actor ID: $ACTOR_ID"

# 3. Create a schedule
SCHEDULE_RESPONSE=$(curl -s -X POST "http://localhost:8001/api/schedules" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "actor_id": "'$ACTOR_ID'",
    "name": "Test Schedule",
    "cron_expression": "*/5 * * * *",
    "enabled": true
  }')

SCHEDULE_ID=$(echo $SCHEDULE_RESPONSE | jq -r '.id')
echo "Schedule ID: $SCHEDULE_ID"
echo $SCHEDULE_RESPONSE | jq '.'

# 4. List schedules
echo "Listing schedules..."
curl -s -X GET "http://localhost:8001/api/schedules" \
  -H "Authorization: Bearer $TOKEN" | jq '.'

# 5. Run schedule now
echo "Running schedule manually..."
curl -s -X POST "http://localhost:8001/api/schedules/$SCHEDULE_ID/run-now" \
  -H "Authorization: Bearer $TOKEN" | jq '.'

# 6. Get schedule details
echo "Getting schedule details..."
curl -s -X GET "http://localhost:8001/api/schedules/$SCHEDULE_ID" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
```

---

## Tips for Testing

1. **Use jq for JSON formatting:**
   ```bash
   curl ... | jq '.'
   ```

2. **Save token to file:**
   ```bash
   echo $TOKEN > token.txt
   TOKEN=$(cat token.txt)
   ```

3. **Check HTTP status codes:**
   ```bash
   curl -w "\nHTTP Status: %{http_code}\n" ...
   ```

4. **Pretty print with colors:**
   ```bash
   curl ... | jq -C '.' | less -R
   ```

5. **Save response to file:**
   ```bash
   curl ... > response.json
   ```

---

## Monitoring Schedule Execution

To monitor if schedules are executing:

```bash
# Check schedule run count
watch -n 10 "curl -s -X GET 'http://localhost:8001/api/schedules/${SCHEDULE_ID}' \
  -H 'Authorization: Bearer ${TOKEN}' | jq '.run_count, .last_run'"
```

This will refresh every 10 seconds and show the run count and last run time.

---

## Troubleshooting

### Issue: 403 Forbidden
- **Cause:** Invalid or missing authentication token
- **Solution:** Make sure you're including the Bearer token in Authorization header

### Issue: 422 Validation Error
- **Cause:** Invalid cron expression or missing required fields
- **Solution:** Verify cron expression format and all required fields are provided

### Issue: 404 Not Found
- **Cause:** Schedule/Actor doesn't exist or belongs to different user
- **Solution:** Verify the ID is correct and belongs to the authenticated user

### Issue: Schedule Not Executing
- **Cause:** Schedule might be disabled or scheduler service not running
- **Solution:** 
  1. Check if schedule is enabled: `is_enabled: true`
  2. Check backend logs: `tail -f /var/log/supervisor/backend.out.log`
  3. Verify cron expression is valid

---

## Additional Resources

- **Test Scripts:** See `/app/test_scheduler_curl_auto.sh` for automated testing
- **Test Report:** See `/app/SCHEDULER_TEST_REPORT.md` for detailed test results
- **Cron Expression Help:** https://crontab.guru/
