# API Key Timer Visibility Fix

## Problem
1. **Timer not visible** - Timer badge wasn't showing prominently in the API & Integrations tab
2. **Timer lost on refresh** - When user refreshed the page within 30 seconds, the key and timer would disappear instead of persisting

## Root Cause
1. **State Loss**: On page refresh, React's in-memory state (`fullKeyStore`) was cleared
2. **Missing Key Storage**: WebSocket received the key from backend but didn't store it in `fullKeyStore`
3. **Conditional Display**: Key was only shown when manually toggled, not automatically during timer

## Solution Implemented

### 1. WebSocket Key Storage on Reconnect
**File**: `/app/frontend/src/components/ApiIntegrations.js`

```javascript
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.remaining > 0) {
    setTimerData(data);
    // FIXED: Store the full key when received from WebSocket
    if (data.key && activeKeyId) {
      setFullKeyStore(prev => ({
        ...prev,
        [activeKeyId]: data.key
      }));
      // Automatically show the key
      setShowKeyIds(prev => ({
        ...prev,
        [activeKeyId]: true
      }));
    }
  }
};
```

### 2. Prominent Timer Display

#### A. Timer Alert Banner
Added a prominent alert at the top of the token list:
```jsx
{timerData && timerData.remaining > 0 && (
  <div className="p-3 rounded-lg border border-green-200 bg-green-50">
    <Clock /> Your API key is visible for {timerData.remaining} more seconds. Copy it now!
  </div>
)}
```

#### B. Timer Badge on Token Card
```jsx
<span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded font-semibold bg-green-100">
  <Clock className="w-3 h-3" />
  {timerData.remaining}s
</span>
```

#### C. Progress Bar at Bottom
```jsx
<div
  className="absolute bottom-0 left-0 h-1 bg-green-500 transition-all"
  style={{ width: `${(timerData.remaining / 30) * 100}%` }}
/>
```

### 3. Automatic Key Display
The key now shows automatically when active timer exists:
```jsx
{showKeyIds[key.id] || fullKeyStore[key.id] ? (
  <span className="font-semibold">
    {fullKeyStore[key.id] || key.prefix}
  </span>
) : (
  <span>{getDisplayKey(key)}</span>
)}
```

## User Flow After Fix

### Creating a New Key
1. User clicks "Create a new token"
2. Enters name and clicks "Create"
3. **Immediately sees**:
   - ✅ Green alert banner: "Your API key is visible for 30 more seconds"
   - ✅ Timer badge on token: "⏰ 30s"
   - ✅ Full API key displayed (bolded)
   - ✅ Progress bar showing time remaining
   - ✅ Copy button

### Refreshing Page (Within 30 Seconds)
**Before Fix**: Key disappeared, timer reset
**After Fix**:
1. User refreshes at 15 seconds remaining
2. Page loads
3. Frontend automatically:
   - Connects to WebSocket
   - Receives key and remaining time (15s)
   - Stores key in `fullKeyStore`
   - Displays key automatically
4. User sees:
   - ✅ Alert: "Your API key is visible for 15 more seconds"
   - ✅ Timer badge: "⏰ 15s"
   - ✅ Full key still visible
   - ✅ Progress bar at 50%
   - ✅ Timer continues counting down

### After 30 Seconds
1. Timer reaches 0
2. Progress bar disappears
3. Alert disappears
4. Key becomes masked: "scrapi_api_..."
5. Timer badge disappears
6. Key is permanently hidden

## Visual Indicators

### 1. Alert Banner (Top of token list)
```
┌─────────────────────────────────────────────────────┐
│ 🕐 Your API key is visible for 15 more seconds.    │
│    Copy it now!                                     │
└─────────────────────────────────────────────────────┘
```

### 2. Token Card with Timer
```
┌─────────────────────────────────────────────────────┐
│ My new token                          🕐 15s        │
│ scrapi_api_xyz123abc456def789...                    │
│ [Copy] [Delete]                                     │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░                │ ← Progress bar
└─────────────────────────────────────────────────────┘
```

### 3. Masked Key (After 30s)
```
┌─────────────────────────────────────────────────────┐
│ My new token                                        │
│ scrapi_api_...                                      │
│ [👁] [Copy] [Delete]                                │
└─────────────────────────────────────────────────────┘
```

## Testing Instructions

### Test Timer Visibility
1. Go to Settings > API & Integrations
2. Delete any existing token (if present)
3. Click "Create a new token"
4. Enter name and click "Create"
5. **Verify**:
   - ✅ Green alert appears at top
   - ✅ Timer badge shows on token (e.g., "⏰ 30s")
   - ✅ Full key is visible (bold text)
   - ✅ Progress bar animates at bottom
   - ✅ All updates happen every second

### Test Refresh Persistence
1. Create a new token (timer starts at 30s)
2. Wait 10 seconds (timer should show "⏰ 20s")
3. **Refresh the page** (F5 or Ctrl+R)
4. **Verify**:
   - ✅ Alert reappears with correct time (e.g., "18 more seconds")
   - ✅ Timer badge continues from where it left off
   - ✅ Full key is still visible
   - ✅ Progress bar continues
   - ✅ No interruption in countdown

### Test Timer Expiration
1. Create a new token
2. Wait full 30 seconds (or refresh and wait)
3. **Verify**:
   - ✅ Alert disappears
   - ✅ Timer badge disappears
   - ✅ Key becomes masked ("scrapi_api_...")
   - ✅ Progress bar disappears
   - ✅ Eye icon (👁) appears to toggle visibility

## Technical Details

### WebSocket Flow
```
User refreshes page
  ↓
Frontend: Fetch keys from /api/auth/api-keys
  ↓
Key has "has_active_timer: true"?
  ↓ YES
Frontend: Set activeKeyId
  ↓
Frontend: Connect to WS /api/ws/api-keys/{id}/timer
  ↓
Backend: Send {"key": "scrapi_api_...", "remaining": 20}
  ↓
Frontend: Store in fullKeyStore[keyId] = key
  ↓
Frontend: Show key automatically
  ↓
Frontend: Display timer badge, progress bar, alert
  ↓
Every 1 second: Update display
  ↓
At 0 seconds: Clean up and mask key
```

### State Management
```javascript
// States that persist across WebSocket reconnection:
const [activeKeyId, setActiveKeyId] = useState(null);      // Restored from keys.has_active_timer
const [timerData, setTimerData] = useState(null);          // Received from WebSocket
const [fullKeyStore, setFullKeyStore] = useState({});      // Populated by WebSocket
const [showKeyIds, setShowKeyIds] = useState({});          // Auto-set when key received
```

## Files Modified
1. `/app/frontend/src/components/ApiIntegrations.js` - Complete timer visibility fix

## Key Changes Summary
✅ **WebSocket stores key in fullKeyStore on reconnect**
✅ **Timer badge prominently displayed with clock icon**
✅ **Alert banner at top of token list**
✅ **Progress bar showing countdown visually**
✅ **Key automatically shown when timer active**
✅ **Bold text for active key**
✅ **All timer indicators update every second**
✅ **Timer persists through page refresh**

## Result
Users can now:
- ✅ See their API key clearly with multiple visual indicators
- ✅ Know exactly how much time is remaining
- ✅ Refresh the page without losing the timer
- ✅ Copy the key at any time during the 30-second window
- ✅ Understand when the key will become hidden

The timer is now **impossible to miss** with:
- Green alert banner
- Timer badge with clock icon
- Progress bar animation
- Bold key display
- All synchronized via WebSocket
