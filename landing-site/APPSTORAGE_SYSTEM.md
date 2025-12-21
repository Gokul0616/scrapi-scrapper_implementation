# Scrapi App Configuration System

## Overview

Similar to Apify's approach, we've implemented a localStorage-based configuration system for Scrapi that manages app settings, user preferences, and feature flags.

## What's Stored in localStorage

### 1. App Configuration (`scrapi_app_config`)
```javascript
{
  app: {
    name: 'Scrapi',
    version: '1.0.0',
    features: {
      search: true,
      analytics: false,
      darkMode: true,
      notifications: true,
    },
    helpCenterUrl: 'https://docs.scrapi.com',
    isDeveloperWorkspace: false,
  },
  user: {
    role: 'visitor',
    locale: 'en',
    hasConversations: false,
    theme: 'system',
  },
  search: {
    recentSearches: [],
    maxRecentSearches: 10,
    searchHistory: true,
  },
  ui: {
    sidebarCollapsed: false,
    compactMode: false,
    animationsEnabled: true,
  },
  metadata: {
    lastUpdated: '2025-12-21T...',
    sessionCount: 5,
  }
}
```

### 2. User Preferences (`scrapi_user_preferences`)
```javascript
{
  cookieConsent: true,
  cookieSettings: { ... },
  lastVisit: '2025-12-21T...',
  favoritePages: [
    {
      title: 'Getting Started',
      url: '/docs/getting-started',
      addedAt: '2025-12-21T...'
    }
  ],
  viewedDocuments: [
    {
      id: 'terms-of-service',
      firstViewed: '2025-12-20T...',
      lastViewed: '2025-12-21T...',
      viewCount: 3
    }
  ]
}
```

## Benefits of This System

### 1. **Persistent User Experience**
- Settings survive page refreshes
- User preferences remembered across sessions
- Seamless experience across visits

### 2. **Performance Optimization**
- Reduces server calls for user preferences
- Instant access to configuration
- No backend dependency for UI settings

### 3. **Feature Flags**
- Easy A/B testing
- Gradual feature rollout
- Quick feature toggles without deployments

### 4. **Analytics & Tracking**
- Session counting
- Document view tracking
- User behavior insights

### 5. **Personalization**
- Recent searches
- Favorite pages
- Custom themes
- UI preferences

## Usage in Components

### Using the Hook
```javascript
import { useAppConfig, usePreference, useRecentSearches } from '../hooks/useAppConfig';

function MyComponent() {
  // Get and set config values
  const [darkMode, setDarkMode] = useAppConfig('app.features.darkMode');
  
  // Get and set preferences
  const [favorites, setFavorites] = usePreference('favoritePages');
  
  // Use recent searches
  const { searches, addSearch, clearSearches } = useRecentSearches();
  
  return (
    <div>
      <button onClick={() => setDarkMode(!darkMode)}>
        Toggle Dark Mode
      </button>
    </div>
  );
}
```

### Direct API Usage
```javascript
import appConfig from '../utils/appConfig';

// Get config value
const theme = appConfig.get('user.theme');

// Set config value
appConfig.set('user.theme', 'dark');

// Add recent search
appConfig.addRecentSearch('web scraping');

// Track document view
appConfig.trackViewedDocument('privacy-policy');

// Check feature flag
if (appConfig.isFeatureEnabled('notifications')) {
  // Show notifications
}
```

## Key Features Implemented

### 1. **Recent Searches**
- Automatically saves search queries
- Limits to last 10 searches
- Can be cleared by user
- Displayed in empty search state

### 2. **Favorites System**
- Add/remove favorite pages
- Track when added
- Quick access to important docs

### 3. **View Tracking**
- Count document views
- Track first and last view times
- Useful for recommendations

### 4. **Theme Management**
- Light/Dark/System themes
- Persists across sessions
- Applies on page load

### 5. **Session Tracking**
- Count total sessions
- Track last visit
- User engagement metrics

## Privacy & Data Management

### Export Configuration
```javascript
const data = appConfig.export();
// Downloads user data for GDPR compliance
```

### Import Configuration
```javascript
appConfig.import(savedData);
// Restore from backup
```

### Reset to Defaults
```javascript
appConfig.reset();
// Clear all local data
```

## Real-World Applications

### 1. **Search Modal** (Implemented)
- Shows recent searches
- Saves search history
- Clears on demand

### 2. **Documentation Pages** (Ready to implement)
- Track viewed documents
- Show "Continue reading" suggestions
- Mark as favorites

### 3. **User Dashboard** (Future)
- Show session statistics
- Display favorite pages
- Personalized recommendations

### 4. **Settings Page** (Future)
- Toggle features
- Manage preferences
- Export/import data

## Comparison with Apify

| Feature | Apify | Scrapi | Status |
|---------|-------|--------|--------|
| App Config | ✅ | ✅ | Implemented |
| User Preferences | ✅ | ✅ | Implemented |
| Feature Flags | ✅ | ✅ | Implemented |
| Recent Searches | ❌ | ✅ | Enhanced |
| Favorites | ❌ | ✅ | Enhanced |
| View Tracking | ❌ | ✅ | Enhanced |
| Export/Import | ❌ | ✅ | Enhanced |

## Security Considerations

1. **No Sensitive Data**: Never store passwords or API keys
2. **Size Limits**: localStorage has 5-10MB limit
3. **Public Data**: All stored data is client-side accessible
4. **Validation**: Always validate data when reading from storage
5. **GDPR Compliance**: Provide export/delete functionality

## Performance Impact

- **Minimal**: localStorage operations are synchronous but very fast
- **Optimized**: Only saves on changes, not every render
- **Efficient**: Uses React hooks to prevent unnecessary re-renders
- **Cached**: Configuration loaded once at startup

## Future Enhancements

1. **IndexedDB Migration**: For larger data storage
2. **Cloud Sync**: Sync settings across devices
3. **Analytics Integration**: Send anonymized usage data
4. **Smart Recommendations**: ML-based suggestions
5. **Offline Mode**: Full offline functionality
