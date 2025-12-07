#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# API Base URL
API_URL="http://localhost:8001/api"

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to print section headers
print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

# Function to print test results
print_test() {
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ PASS:${NC} $2"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}✗ FAIL:${NC} $2"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

# Function to print response
print_response() {
    echo -e "${YELLOW}Response:${NC}"
    echo "$1" | jq '.' 2>/dev/null || echo "$1"
    echo ""
}

# ============= 1. AUTHENTICATION =============
print_header "TEST 1: AUTHENTICATION SETUP"

# Generate unique username
TIMESTAMP=$(date +%s)
USERNAME="testuser_${TIMESTAMP}"
EMAIL="test_${TIMESTAMP}@example.com"
PASSWORD="testpass123"

echo "Registering new user: $USERNAME"
REGISTER_RESPONSE=$(curl -s -X POST "${API_URL}/auth/register" \
    -H "Content-Type: application/json" \
    -d "{
        \"username\": \"${USERNAME}\",
        \"email\": \"${EMAIL}\",
        \"password\": \"${PASSWORD}\",
        \"organization_name\": \"Test Org\"
    }")

# Extract token
TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.access_token')
USER_ID=$(echo "$REGISTER_RESPONSE" | jq -r '.user.id')

if [ "$TOKEN" != "null" ] && [ -n "$TOKEN" ]; then
    print_test 0 "User registration successful"
    echo "Token: ${TOKEN:0:20}..."
    echo "User ID: $USER_ID"
else
    print_test 1 "User registration failed"
    print_response "$REGISTER_RESPONSE"
    exit 1
fi

# ============= 2. TEST WITHOUT AUTH (Should Fail) =============
print_header "TEST 2: AUTHENTICATION REQUIREMENT"

echo "Attempting to list schedules without authentication..."
UNAUTH_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X GET "${API_URL}/schedules")

HTTP_CODE=$(echo "$UNAUTH_RESPONSE" | grep "HTTP_CODE:" | cut -d':' -f2)

if [ "$HTTP_CODE" -eq "403" ] || [ "$HTTP_CODE" -eq "401" ]; then
    print_test 0 "Correctly rejected unauthenticated request (HTTP $HTTP_CODE)"
else
    print_test 1 "Did not reject unauthenticated request (HTTP $HTTP_CODE)"
fi

# ============= 3. CREATE ACTOR FOR TESTING =============
print_header "TEST 3: CREATE TEST ACTOR"

echo "Creating a test actor..."
ACTOR_RESPONSE=$(curl -s -X POST "${API_URL}/actors" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{
        "name": "Test Scheduler Actor",
        "description": "Actor for testing scheduler",
        "source_code": "print(\"Hello from scheduled actor\")"
    }')

ACTOR_ID=$(echo "$ACTOR_RESPONSE" | jq -r '.id')

if [ "$ACTOR_ID" != "null" ] && [ -n "$ACTOR_ID" ]; then
    print_test 0 "Test actor created successfully"
    echo "Actor ID: $ACTOR_ID"
else
    print_test 1 "Failed to create test actor"
    print_response "$ACTOR_RESPONSE"
fi

# ============= 4. CREATE SCHEDULE =============
print_header "TEST 4: CREATE SCHEDULE API"

echo "Creating a schedule with cron expression (every 5 minutes)..."
CREATE_SCHEDULE_RESPONSE=$(curl -s -X POST "${API_URL}/schedules" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{
        \"actor_id\": \"${ACTOR_ID}\",
        \"name\": \"Test Schedule\",
        \"description\": \"Test schedule for automated testing\",
        \"cron_expression\": \"*/5 * * * *\",
        \"input_data\": {\"test_key\": \"test_value\"},
        \"enabled\": true
    }")

SCHEDULE_ID=$(echo "$CREATE_SCHEDULE_RESPONSE" | jq -r '.id')

if [ "$SCHEDULE_ID" != "null" ] && [ -n "$SCHEDULE_ID" ]; then
    print_test 0 "Schedule created successfully"
    echo "Schedule ID: $SCHEDULE_ID"
else
    print_test 1 "Failed to create schedule"
    print_response "$CREATE_SCHEDULE_RESPONSE"
fi

# ============= 5. TEST INVALID CRON EXPRESSION =============
print_header "TEST 5: CRON VALIDATION"

echo "Attempting to create schedule with invalid cron expression..."
INVALID_CRON_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "${API_URL}/schedules" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{
        \"actor_id\": \"${ACTOR_ID}\",
        \"name\": \"Invalid Schedule\",
        \"cron_expression\": \"invalid cron\",
        \"enabled\": true
    }")

HTTP_CODE=$(echo "$INVALID_CRON_RESPONSE" | grep "HTTP_CODE:" | cut -d':' -f2)

if [ "$HTTP_CODE" -eq "422" ] || [ "$HTTP_CODE" -eq "400" ]; then
    print_test 0 "Correctly rejected invalid cron expression (HTTP $HTTP_CODE)"
else
    print_test 1 "Did not reject invalid cron expression (HTTP $HTTP_CODE)"
fi

# ============= 6. LIST SCHEDULES =============
print_header "TEST 6: LIST SCHEDULES API"

echo "Fetching all schedules..."
LIST_SCHEDULES_RESPONSE=$(curl -s -X GET "${API_URL}/schedules" \
    -H "Authorization: Bearer $TOKEN")

SCHEDULE_COUNT=$(echo "$LIST_SCHEDULES_RESPONSE" | jq -r '.schedules | length')
TOTAL_COUNT=$(echo "$LIST_SCHEDULES_RESPONSE" | jq -r '.total')

if [ "$SCHEDULE_COUNT" -ge "1" ]; then
    print_test 0 "Successfully retrieved schedules (Count: $SCHEDULE_COUNT, Total: $TOTAL_COUNT)"
else
    print_test 1 "Failed to retrieve schedules"
    print_response "$LIST_SCHEDULES_RESPONSE"
fi

# ============= 7. LIST SCHEDULES WITH PAGINATION =============
print_header "TEST 7: PAGINATION"

echo "Testing pagination (limit=1, page=1)..."
PAGINATED_RESPONSE=$(curl -s -X GET "${API_URL}/schedules?limit=1&page=1" \
    -H "Authorization: Bearer $TOKEN")

PAGE=$(echo "$PAGINATED_RESPONSE" | jq -r '.page')
LIMIT=$(echo "$PAGINATED_RESPONSE" | jq -r '.limit')

if [ "$PAGE" -eq "1" ] && [ "$LIMIT" -eq "1" ]; then
    print_test 0 "Pagination working correctly"
else
    print_test 1 "Pagination not working as expected"
fi

# ============= 8. GET SCHEDULE BY ID =============
print_header "TEST 8: GET SCHEDULE BY ID API"

echo "Fetching schedule by ID: $SCHEDULE_ID"
GET_SCHEDULE_RESPONSE=$(curl -s -X GET "${API_URL}/schedules/${SCHEDULE_ID}" \
    -H "Authorization: Bearer $TOKEN")

FETCHED_ID=$(echo "$GET_SCHEDULE_RESPONSE" | jq -r '.id')

if [ "$FETCHED_ID" == "$SCHEDULE_ID" ]; then
    print_test 0 "Successfully retrieved schedule by ID"
else
    print_test 1 "Failed to retrieve schedule by ID"
    print_response "$GET_SCHEDULE_RESPONSE"
fi

# ============= 9. UPDATE SCHEDULE =============
print_header "TEST 9: UPDATE SCHEDULE API"

echo "Updating schedule name and description..."
UPDATE_SCHEDULE_RESPONSE=$(curl -s -X PATCH "${API_URL}/schedules/${SCHEDULE_ID}" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{
        "name": "Updated Test Schedule",
        "description": "Updated description for testing"
    }')

UPDATED_NAME=$(echo "$UPDATE_SCHEDULE_RESPONSE" | jq -r '.name')

if [ "$UPDATED_NAME" == "Updated Test Schedule" ]; then
    print_test 0 "Successfully updated schedule"
else
    print_test 1 "Failed to update schedule"
    print_response "$UPDATE_SCHEDULE_RESPONSE"
fi

# ============= 10. UPDATE SCHEDULE CRON EXPRESSION =============
print_header "TEST 10: UPDATE CRON EXPRESSION"

echo "Updating schedule cron expression to run every minute..."
UPDATE_CRON_RESPONSE=$(curl -s -X PATCH "${API_URL}/schedules/${SCHEDULE_ID}" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{
        "cron_expression": "* * * * *"
    }')

UPDATED_CRON=$(echo "$UPDATE_CRON_RESPONSE" | jq -r '.cron_expression')

if [ "$UPDATED_CRON" == "* * * * *" ]; then
    print_test 0 "Successfully updated cron expression"
else
    print_test 1 "Failed to update cron expression"
    print_response "$UPDATE_CRON_RESPONSE"
fi

# ============= 11. DISABLE SCHEDULE =============
print_header "TEST 11: DISABLE SCHEDULE API"

echo "Disabling schedule..."
DISABLE_RESPONSE=$(curl -s -X POST "${API_URL}/schedules/${SCHEDULE_ID}/disable" \
    -H "Authorization: Bearer $TOKEN")

ENABLED_STATUS=$(echo "$DISABLE_RESPONSE" | jq -r '.enabled')

if [ "$ENABLED_STATUS" == "false" ]; then
    print_test 0 "Successfully disabled schedule"
else
    print_test 1 "Failed to disable schedule"
    print_response "$DISABLE_RESPONSE"
fi

# ============= 12. ENABLE SCHEDULE =============
print_header "TEST 12: ENABLE SCHEDULE API"

echo "Enabling schedule..."
ENABLE_RESPONSE=$(curl -s -X POST "${API_URL}/schedules/${SCHEDULE_ID}/enable" \
    -H "Authorization: Bearer $TOKEN")

ENABLED_STATUS=$(echo "$ENABLE_RESPONSE" | jq -r '.enabled')

if [ "$ENABLED_STATUS" == "true" ]; then
    print_test 0 "Successfully enabled schedule"
else
    print_test 1 "Failed to enable schedule"
    print_response "$ENABLE_RESPONSE"
fi

# ============= 13. RUN SCHEDULE NOW =============
print_header "TEST 13: RUN SCHEDULE NOW API"

echo "Triggering manual run of schedule..."
RUN_NOW_RESPONSE=$(curl -s -X POST "${API_URL}/schedules/${SCHEDULE_ID}/run-now" \
    -H "Authorization: Bearer $TOKEN")

RUN_ID=$(echo "$RUN_NOW_RESPONSE" | jq -r '.run_id')
RUN_COUNT=$(echo "$RUN_NOW_RESPONSE" | jq -r '.run_count')

if [ "$RUN_ID" != "null" ] && [ -n "$RUN_ID" ]; then
    print_test 0 "Successfully triggered manual run (Run ID: $RUN_ID)"
else
    print_test 1 "Failed to trigger manual run"
    print_response "$RUN_NOW_RESPONSE"
fi

# ============= 14. VERIFY RUN WAS CREATED =============
print_header "TEST 14: VERIFY RUN CREATION"

echo "Fetching schedule to verify run statistics..."
VERIFY_SCHEDULE_RESPONSE=$(curl -s -X GET "${API_URL}/schedules/${SCHEDULE_ID}" \
    -H "Authorization: Bearer $TOKEN")

LAST_RUN=$(echo "$VERIFY_SCHEDULE_RESPONSE" | jq -r '.last_run')
RUN_COUNT=$(echo "$VERIFY_SCHEDULE_RESPONSE" | jq -r '.run_count')

if [ "$LAST_RUN" != "null" ] && [ "$RUN_COUNT" -ge "1" ]; then
    print_test 0 "Run statistics updated correctly (Run Count: $RUN_COUNT)"
else
    print_test 1 "Run statistics not updated"
    print_response "$VERIFY_SCHEDULE_RESPONSE"
fi

# ============= 15. TEST SCHEDULER EXECUTION (WAIT FOR AUTOMATIC RUN) =============
print_header "TEST 15: AUTOMATIC SCHEDULER EXECUTION"

echo "Waiting 70 seconds for automatic scheduler execution (cron: every minute)..."
echo "Current time: $(date)"

# Get current run count
BEFORE_RUN_COUNT=$RUN_COUNT
echo "Current run count: $BEFORE_RUN_COUNT"

echo "Waiting for scheduler to execute..."
sleep 70

# Check if run count increased
echo "Checking if scheduler executed automatically..."
AFTER_SCHEDULE_RESPONSE=$(curl -s -X GET "${API_URL}/schedules/${SCHEDULE_ID}" \
    -H "Authorization: Bearer $TOKEN")

AFTER_RUN_COUNT=$(echo "$AFTER_SCHEDULE_RESPONSE" | jq -r '.run_count')
LAST_RUN=$(echo "$AFTER_SCHEDULE_RESPONSE" | jq -r '.last_run')

echo "Previous run count: $BEFORE_RUN_COUNT"
echo "Current run count: $AFTER_RUN_COUNT"
echo "Last run: $LAST_RUN"

if [ "$AFTER_RUN_COUNT" -gt "$BEFORE_RUN_COUNT" ]; then
    print_test 0 "Scheduler executed automatically (Run count: $BEFORE_RUN_COUNT → $AFTER_RUN_COUNT)"
else
    print_test 1 "Scheduler did not execute automatically"
fi

# ============= 16. TEST GET NON-EXISTENT SCHEDULE =============
print_header "TEST 16: 404 FOR NON-EXISTENT SCHEDULE"

echo "Attempting to fetch non-existent schedule..."
NOT_FOUND_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X GET "${API_URL}/schedules/nonexistent-id-12345" \
    -H "Authorization: Bearer $TOKEN")

HTTP_CODE=$(echo "$NOT_FOUND_RESPONSE" | grep "HTTP_CODE:" | cut -d':' -f2)

if [ "$HTTP_CODE" -eq "404" ]; then
    print_test 0 "Correctly returned 404 for non-existent schedule"
else
    print_test 1 "Did not return 404 for non-existent schedule (HTTP $HTTP_CODE)"
fi

# ============= 17. DELETE SCHEDULE =============
print_header "TEST 17: DELETE SCHEDULE API"

echo "Deleting schedule..."
DELETE_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X DELETE "${API_URL}/schedules/${SCHEDULE_ID}" \
    -H "Authorization: Bearer $TOKEN")

HTTP_CODE=$(echo "$DELETE_RESPONSE" | grep "HTTP_CODE:" | cut -d':' -f2)

if [ "$HTTP_CODE" -eq "200" ]; then
    print_test 0 "Successfully deleted schedule"
else
    print_test 1 "Failed to delete schedule (HTTP $HTTP_CODE)"
fi

# ============= 18. VERIFY SCHEDULE DELETION =============
print_header "TEST 18: VERIFY SCHEDULE DELETION"

echo "Attempting to fetch deleted schedule..."
DELETED_CHECK_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X GET "${API_URL}/schedules/${SCHEDULE_ID}" \
    -H "Authorization: Bearer $TOKEN")

HTTP_CODE=$(echo "$DELETED_CHECK_RESPONSE" | grep "HTTP_CODE:" | cut -d':' -f2)

if [ "$HTTP_CODE" -eq "404" ]; then
    print_test 0 "Confirmed schedule was deleted (404 response)"
else
    print_test 1 "Schedule still accessible after deletion (HTTP $HTTP_CODE)"
fi

# ============= FINAL SUMMARY =============
print_header "TEST SUMMARY"

echo -e "Total Tests: ${BLUE}${TOTAL_TESTS}${NC}"
echo -e "Passed: ${GREEN}${PASSED_TESTS}${NC}"
echo -e "Failed: ${RED}${FAILED_TESTS}${NC}"

SUCCESS_RATE=$(echo "scale=2; $PASSED_TESTS * 100 / $TOTAL_TESTS" | bc)
echo -e "Success Rate: ${BLUE}${SUCCESS_RATE}%${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "\n${GREEN}════════════════════════════════════════${NC}"
    echo -e "${GREEN}✓ ALL TESTS PASSED SUCCESSFULLY!${NC}"
    echo -e "${GREEN}════════════════════════════════════════${NC}\n"
    exit 0
else
    echo -e "\n${RED}════════════════════════════════════════${NC}"
    echo -e "${RED}✗ SOME TESTS FAILED${NC}"
    echo -e "${RED}════════════════════════════════════════${NC}\n"
    exit 1
fi
