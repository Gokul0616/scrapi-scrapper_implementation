# Preventive Measures for DateTime Issues

## Best Practices Implemented

### 1. Centralized DateTime Parsing
- Created `parse_datetime_safe()` utility function in `/app/backend/routes/routes.py`
- This function should be used for ALL datetime parsing from database or external sources
- Ensures timezone-awareness automatically

### 2. Usage Guidelines

#### ✅ DO:
```python
# Always use parse_datetime_safe for database values
date = parse_datetime_safe(user_doc['created_at'])

# Always use timezone.utc for current time
now = datetime.now(timezone.utc)

# Store dates as ISO strings with timezone
{"created_at": datetime.now(timezone.utc).isoformat()}

# Compare dates in MongoDB using ISO strings
{"created_at": {"$gte": now.isoformat()}}
```

#### ❌ DON'T:
```python
# DON'T use naive datetime.now()
now = datetime.now()  # ❌

# DON'T use fromisoformat without timezone check
date = datetime.fromisoformat(date_str)  # ❌

# DON'T compare timezone-aware with timezone-naive
if datetime.now() > some_aware_datetime:  # ❌
```

### 3. Code Review Checklist

Before merging datetime-related code, check:
- [ ] All `datetime.now()` calls use `datetime.now(timezone.utc)`
- [ ] All datetime parsing uses `parse_datetime_safe()`
- [ ] All datetime subtractions involve two timezone-aware datetimes
- [ ] All datetime comparisons use same timezone
- [ ] MongoDB date queries use ISO string format
- [ ] Stored dates include timezone information

### 4. Common Patterns

#### Pattern 1: Calculating Time Remaining
```python
# ✅ Correct
future_date = parse_datetime_safe(doc['future_date'])
now = datetime.now(timezone.utc)
days_remaining = (future_date - now).days

# ❌ Wrong
future_date = datetime.fromisoformat(doc['future_date'])
now = datetime.now()
days_remaining = (future_date - now).days  # May fail!
```

#### Pattern 2: Checking Expiry
```python
# ✅ Correct
expires_at = parse_datetime_safe(doc['expires_at'])
if datetime.now(timezone.utc) > expires_at:
    # Expired

# ❌ Wrong
expires_at = datetime.fromisoformat(doc['expires_at'])
if datetime.now() > expires_at:  # May fail!
```

#### Pattern 3: MongoDB Date Queries
```python
# ✅ Correct
seven_days_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
users = await db.users.find({"created_at": {"$gte": seven_days_ago}})

# ❌ Wrong
seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
users = await db.users.find({"created_at": {"$gte": seven_days_ago}})
```

### 5. Testing Strategy

Always test datetime operations with:
1. Timezone-aware strings (ISO format with +00:00)
2. Timezone-naive strings (ISO format without timezone)
3. DateTime objects (both aware and naive)
4. Edge cases (None values, malformed strings)

### 6. Frontend Best Practices

#### Preventing Data Leakage in Confirmation Dialogs
When asking users to type sensitive information for confirmation:
```jsx
// ✅ Correct - Prevents copy-paste
<span 
  className="font-bold select-none" 
  style={{ 
    userSelect: 'none', 
    WebkitUserSelect: 'none', 
    MozUserSelect: 'none', 
    msUserSelect: 'none' 
  }}
>
  {sensitiveData}
</span>

// ❌ Wrong - Allows copy-paste
<span className="font-bold">{sensitiveData}</span>
```

### 7. Monitoring

Watch for these errors in logs:
- `TypeError: can't subtract offset-naive and offset-aware datetimes`
- `AttributeError: 'str' object has no attribute 'tzinfo'`
- Any datetime comparison failures

### 8. Documentation

When adding new datetime fields:
1. Document the expected format (ISO 8601 with timezone)
2. Specify which utility functions to use for parsing
3. Include example values in API documentation
4. Add validation for datetime format

### 9. Migration Strategy

For existing code:
1. Identify all datetime parsing locations: `grep -r "datetime.fromisoformat"`
2. Identify all datetime operations: `grep -r "datetime.now()"`
3. Priority: Fix critical paths first (auth, payments, scheduling)
4. Add tests for each fix
5. Monitor logs after deployment

### 10. Tools and Scripts

Use these commands to find potential issues:
```bash
# Find all datetime.now() without timezone
grep -rn "datetime.now()" --include="*.py" | grep -v "timezone.utc"

# Find all fromisoformat usage
grep -rn "fromisoformat" --include="*.py"

# Find all datetime comparisons
grep -rn "datetime.*[<>].*datetime" --include="*.py"
```

## Summary

The key to preventing datetime issues:
1. **Always be timezone-aware**: Use `datetime.now(timezone.utc)`
2. **Parse safely**: Use `parse_datetime_safe()` for all external dates
3. **Store correctly**: Always store dates as ISO strings with timezone
4. **Compare consistently**: Ensure both sides of comparison have same awareness
5. **Test thoroughly**: Include timezone edge cases in tests

## References

- Python datetime documentation: https://docs.python.org/3/library/datetime.html
- ISO 8601 format: https://en.wikipedia.org/wiki/ISO_8601
- MongoDB date queries: https://www.mongodb.com/docs/manual/reference/method/Date/
