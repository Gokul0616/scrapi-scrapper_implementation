/**
 * Scrapi App Configuration Manager
 * Handles app settings, user preferences, and feature flags stored in localStorage
 */

const APP_CONFIG_KEY = 'scrapi_app_config';
const USER_PREFERENCES_KEY = 'scrapi_user_preferences';

// Default configuration
const defaultConfig = {
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
        theme: 'system', // 'light', 'dark', 'system'
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
        lastUpdated: new Date().toISOString(),
        sessionCount: 0,
    }
};

// Default user preferences
const defaultPreferences = {
    cookieConsent: null,
    cookieSettings: null,
    lastVisit: null,
    favoritePages: [],
    viewedDocuments: [],
};

class AppConfigManager {
    constructor() {
        this.config = this.loadConfig();
        this.preferences = this.loadPreferences();
        this.listeners = [];
    }

    // Load configuration from localStorage
    loadConfig() {
        try {
            const stored = localStorage.getItem(APP_CONFIG_KEY);
            if (stored) {
                return { ...defaultConfig, ...JSON.parse(stored) };
            }
        } catch (error) {
            console.error('Error loading app config:', error);
        }
        return defaultConfig;
    }

    // Save configuration to localStorage
    saveConfig() {
        try {
            this.config.metadata.lastUpdated = new Date().toISOString();
            localStorage.setItem(APP_CONFIG_KEY, JSON.stringify(this.config));
            this.notifyListeners();
        } catch (error) {
            console.error('Error saving app config:', error);
        }
    }

    // Load user preferences from localStorage
    loadPreferences() {
        try {
            const stored = localStorage.getItem(USER_PREFERENCES_KEY);
            if (stored) {
                return { ...defaultPreferences, ...JSON.parse(stored) };
            }
        } catch (error) {
            console.error('Error loading preferences:', error);
        }
        return defaultPreferences;
    }

    // Save user preferences to localStorage
    savePreferences() {
        try {
            localStorage.setItem(USER_PREFERENCES_KEY, JSON.stringify(this.preferences));
            this.notifyListeners();
        } catch (error) {
            console.error('Error saving preferences:', error);
        }
    }

    // Get entire config
    getConfig() {
        return this.config;
    }

    // Get specific config value
    get(path) {
        return path.split('.').reduce((obj, key) => obj?.[key], this.config);
    }

    // Set specific config value
    set(path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        const target = keys.reduce((obj, key) => {
            if (!obj[key]) obj[key] = {};
            return obj[key];
        }, this.config);
        target[lastKey] = value;
        this.saveConfig();
    }

    // Get user preference
    getPreference(key) {
        return this.preferences[key];
    }

    // Set user preference
    setPreference(key, value) {
        this.preferences[key] = value;
        this.savePreferences();
    }

    // Track recent search
    addRecentSearch(query) {
        if (!this.config.search.searchHistory) return;
        
        const searches = this.config.search.recentSearches || [];
        // Remove if already exists
        const filtered = searches.filter(s => s !== query);
        // Add to beginning
        filtered.unshift(query);
        // Keep only max items
        this.config.search.recentSearches = filtered.slice(0, this.config.search.maxRecentSearches);
        this.saveConfig();
    }

    // Get recent searches
    getRecentSearches() {
        return this.config.search.recentSearches || [];
    }

    // Clear recent searches
    clearRecentSearches() {
        this.config.search.recentSearches = [];
        this.saveConfig();
    }

    // Add favorite page
    addFavorite(page) {
        const favorites = this.preferences.favoritePages || [];
        if (!favorites.find(f => f.url === page.url)) {
            favorites.push({
                ...page,
                addedAt: new Date().toISOString(),
            });
            this.preferences.favoritePages = favorites;
            this.savePreferences();
        }
    }

    // Remove favorite page
    removeFavorite(url) {
        const favorites = this.preferences.favoritePages || [];
        this.preferences.favoritePages = favorites.filter(f => f.url !== url);
        this.savePreferences();
    }

    // Get favorites
    getFavorites() {
        return this.preferences.favoritePages || [];
    }

    // Track viewed document
    trackViewedDocument(docId) {
        const viewed = this.preferences.viewedDocuments || [];
        const existing = viewed.findIndex(v => v.id === docId);
        
        if (existing >= 0) {
            viewed[existing].lastViewed = new Date().toISOString();
            viewed[existing].viewCount = (viewed[existing].viewCount || 0) + 1;
        } else {
            viewed.push({
                id: docId,
                firstViewed: new Date().toISOString(),
                lastViewed: new Date().toISOString(),
                viewCount: 1,
            });
        }
        
        this.preferences.viewedDocuments = viewed;
        this.savePreferences();
    }

    // Increment session count
    incrementSession() {
        this.config.metadata.sessionCount = (this.config.metadata.sessionCount || 0) + 1;
        this.preferences.lastVisit = new Date().toISOString();
        this.saveConfig();
        this.savePreferences();
    }

    // Enable/disable feature
    toggleFeature(featureName, enabled) {
        if (this.config.app.features[featureName] !== undefined) {
            this.config.app.features[featureName] = enabled;
            this.saveConfig();
        }
    }

    // Check if feature is enabled
    isFeatureEnabled(featureName) {
        return this.config.app.features[featureName] === true;
    }

    // Set theme
    setTheme(theme) {
        this.config.user.theme = theme;
        this.saveConfig();
        this.applyTheme(theme);
    }

    // Apply theme to document
    applyTheme(theme) {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else if (theme === 'light') {
            document.documentElement.classList.remove('dark');
        } else {
            // System theme
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (prefersDark) {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
        }
    }

    // Subscribe to config changes
    subscribe(callback) {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter(l => l !== callback);
        };
    }

    // Notify all listeners of changes
    notifyListeners() {
        this.listeners.forEach(callback => callback(this.config, this.preferences));
    }

    // Reset to defaults
    reset() {
        localStorage.removeItem(APP_CONFIG_KEY);
        localStorage.removeItem(USER_PREFERENCES_KEY);
        this.config = defaultConfig;
        this.preferences = defaultPreferences;
        this.notifyListeners();
    }

    // Export configuration
    export() {
        return {
            config: this.config,
            preferences: this.preferences,
            exportedAt: new Date().toISOString(),
        };
    }

    // Import configuration
    import(data) {
        try {
            if (data.config) {
                this.config = { ...defaultConfig, ...data.config };
                this.saveConfig();
            }
            if (data.preferences) {
                this.preferences = { ...defaultPreferences, ...data.preferences };
                this.savePreferences();
            }
            return true;
        } catch (error) {
            console.error('Error importing config:', error);
            return false;
        }
    }
}

// Create singleton instance
const appConfig = new AppConfigManager();

// Initialize on load
appConfig.incrementSession();
appConfig.applyTheme(appConfig.get('user.theme'));

export default appConfig;
