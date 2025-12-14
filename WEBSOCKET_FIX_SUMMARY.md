# WebSocket Configuration Fix

## Problem Identified

The application had a WebSocket connection error showing "network lost for web socket" in the frontend console. This was caused by a **hostname mismatch** in the WebSocket configuration.

### Root Cause

The frontend `.env` file had mismatched hostnames:
- **Backend URL**: `https://link-diagnostic.preview.emergentagent.com` ✅
- **WebSocket Host**: `visual-crawler-2.preview.emergentagent.com` ❌ (WRONG)

This caused the webpack dev server WebSocket (used for hot module replacement) to try connecting to the wrong host, resulting in connection failures.

## Solution Implemented

### 1. Updated `/app/frontend/.env`

Changed the `WDS_SOCKET_HOST` to match the backend URL:

```env
# Before
WDS_SOCKET_HOST=visual-crawler-2.preview.emergentagent.com

# After
WDS_SOCKET_HOST=link-diagnostic.preview.emergentagent.com
```

### 2. Enhanced `/app/frontend/craco.config.js`

Made the WebSocket configuration **dynamic and intelligent**:

- Now automatically extracts hostname from `REACT_APP_BACKEND_URL`
- Falls back to localhost if backend URL is not set
- Allows manual override via environment variables
- Adds detailed console logging for debugging

**Key changes:**
```javascript
// Dynamically determine WebSocket configuration from REACT_APP_BACKEND_URL
let wsHostname = 'localhost';
let wsProtocol = 'ws';
let wsPort = 3000;

if (process.env.REACT_APP_BACKEND_URL) {
  const backendUrl = new URL(process.env.REACT_APP_BACKEND_URL);
  wsHostname = backendUrl.hostname;
  wsProtocol = backendUrl.protocol === 'https:' ? 'wss' : 'ws';
  wsPort = backendUrl.protocol === 'https:' ? 443 : 80;
}

// Allow manual override via environment variables
if (process.env.WDS_SOCKET_HOST) wsHostname = process.env.WDS_SOCKET_HOST;
if (process.env.WDS_SOCKET_PORT) wsPort = process.env.WDS_SOCKET_PORT;
if (process.env.WDS_SOCKET_PROTOCOL) wsProtocol = process.env.WDS_SOCKET_PROTOCOL;
```

### 3. Improved `/app/frontend/src/pages/ApiAccess.js`

Enhanced the WebSocket URL construction for API connections:

- Uses proper URL parsing for reliability
- Includes error handling and fallback
- Adds detailed console logging for debugging

**Key changes:**
```javascript
const getWsUrl = (path) => {
    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
    try {
        const url = new URL(backendUrl);
        const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = url.host;
        return `${protocol}//${host}${path}`;
    } catch (e) {
        // Fallback for invalid URL
        console.error('Invalid REACT_APP_BACKEND_URL:', backendUrl);
        const protocol = backendUrl.startsWith('https') ? 'wss://' : 'ws://';
        const host = backendUrl.replace(/^https?:\/\//, '');
        return `${protocol}${host}${path}`;
    }
};
```

## Current Configuration

After the fix, the WebSocket is now properly configured:

```
Protocol: wss
Hostname: link-diagnostic.preview.emergentagent.com
Port: 443
Path: /ws
Full URL: wss://link-diagnostic.preview.emergentagent.com:443/ws
```

## Benefits

✅ **Automatic Configuration**: WebSocket URLs are now dynamically derived from `REACT_APP_BACKEND_URL`
✅ **Environment Flexibility**: Works in development, staging, and production without manual changes
✅ **Easy Debugging**: Console logs show exact WebSocket configuration being used
✅ **Fallback Support**: Graceful fallback to localhost if environment variables are missing
✅ **Manual Override**: Can still manually override via environment variables if needed

## Testing the Fix

### 1. Check Console Logs

When the frontend starts, you should see:
```
🔌 WebSocket Configuration: {
  protocol: 'wss',
  hostname: 'link-diagnostic.preview.emergentagent.com',
  port: '443',
  pathname: '/ws',
  fullUrl: 'wss://link-diagnostic.preview.emergentagent.com:443/ws'
}
```

### 2. Test API Key Timer (WebSocket Feature)

1. Navigate to the "API Access" page
2. Create a new API key
3. Watch the console for WebSocket connection logs:
   - `🔌 Connecting to WebSocket: wss://link-diagnostic.preview.emergentagent.com/api/ws/api-keys/{id}/timer`
   - `✅ Connected to timer WebSocket`
4. The 30-second countdown should work without "network lost" errors

### 3. Verify Hot Reload (Development)

1. Make a small change to any React component
2. Save the file
3. The page should update without full refresh (no "network lost" error)

## Future Considerations

- The configuration is now dynamic and should work in any environment
- To change the WebSocket host, simply update `REACT_APP_BACKEND_URL` in `.env`
- For special cases, you can override with `WDS_SOCKET_HOST`, `WDS_SOCKET_PORT`, or `WDS_SOCKET_PROTOCOL`

## Files Modified

1. `/app/frontend/.env` - Fixed WDS_SOCKET_HOST
2. `/app/frontend/craco.config.js` - Made WebSocket config dynamic
3. `/app/frontend/src/pages/ApiAccess.js` - Improved URL construction and logging
