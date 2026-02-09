import { AppConfig, UserPreferences, FavoritePage } from '../types';

/**
 * Scrapi App Configuration Manager
 * Handles app settings, user preferences, and feature flags stored in localStorage
 */

const APP_CONFIG_KEY = 'scrapi_app_config';
const USER_PREFERENCES_KEY = 'scrapi_user_preferences';

// Default configuration
const defaultConfig: AppConfig = {
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
const defaultPreferences: UserPreferences = {
    cookieConsent: null,
    cookieSettings: null,
    lastVisit: null,
    favoritePages: [],
    viewedDocuments: [],
};

type ListenerCallback = (config: AppConfig, preferences: UserPreferences) => void;

class AppConfigManager {
    private config: AppConfig;
    private preferences: UserPreferences;
    private listeners: ListenerCallback[];

    constructor() {
        this.config = this.loadConfig();
        this.preferences = this.loadPreferences();
        this.listeners = [];
    }

    // Load configuration from localStorage
    private loadConfig(): AppConfig {
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
    private saveConfig(): void {
        try {
            this.config.metadata.lastUpdated = new Date().toISOString();
            localStorage.setItem(APP_CONFIG_KEY, JSON.stringify(this.config));
            this.notifyListeners();
        } catch (error) {
            console.error('Error saving app config:', error);
        }
    }

    // Load user preferences from localStorage
    private loadPreferences(): UserPreferences {
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
    private savePreferences(): void {
        try {
            localStorage.setItem(USER_PREFERENCES_KEY, JSON.stringify(this.preferences));
            this.notifyListeners();
        } catch (error) {
            console.error('Error saving preferences:', error);
        }
    }

    // Get entire config
    public getConfig(): AppConfig {
        return this.config;
    }

    // Get specific config value
    public get(path: string): any {
        return path.split('.').reduce((obj: any, key: string) => obj?.[key], this.config);
    }

    // Set specific config value
    public set(path: string, value: any): void {
        const keys = path.split('.');
        const lastKey = keys.pop();
        if (!lastKey) return;

        const target = keys.reduce((obj: any, key: string) => {
            if (!obj[key]) obj[key] = {};
            return obj[key];
        }, this.config);

        target[lastKey] = value;
        this.saveConfig();
    }

    // Get user preference
    public getPreference(key: keyof UserPreferences): any {
        return this.preferences[key];
    }

    // Set user preference
    public setPreference(key: keyof UserPreferences, value: any): void {
        this.preferences[key] = value;
        this.savePreferences();
    }

    // Track recent search
    public addRecentSearch(query: string): void {
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
    public getRecentSearches(): string[] {
        return this.config.search.recentSearches || [];
    }

    // Clear recent searches
    public clearRecentSearches(): void {
        this.config.search.recentSearches = [];
        this.saveConfig();
    }

    // Add favorite page
    public addFavorite(page: Omit<FavoritePage, 'addedAt'>): void {
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
    public removeFavorite(url: string): void {
        const favorites = this.preferences.favoritePages || [];
        this.preferences.favoritePages = favorites.filter(f => f.url !== url);
        this.savePreferences();
    }

    // Get favorites
    public getFavorites(): FavoritePage[] {
        return this.preferences.favoritePages || [];
    }

    // Track viewed document
    public trackViewedDocument(docId: string): void {
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
    public incrementSession(): void {
        this.config.metadata.sessionCount = (this.config.metadata.sessionCount || 0) + 1;
        this.preferences.lastVisit = new Date().toISOString();
        this.saveConfig();
        this.savePreferences();
    }

    // Enable/disable feature
    public toggleFeature(featureName: string, enabled: boolean): void {
        if (this.config.app.features[featureName] !== undefined) {
            this.config.app.features[featureName] = enabled;
            this.saveConfig();
        }
    }

    // Check if feature is enabled
    public isFeatureEnabled(featureName: string): boolean {
        return this.config.app.features[featureName] === true;
    }

    // Set theme
    public setTheme(theme: 'light' | 'dark' | 'system'): void {
        this.config.user.theme = theme;
        this.saveConfig();
        this.applyTheme(theme);
    }

    // Apply theme to document
    public applyTheme(theme: string): void {
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
    public subscribe(callback: ListenerCallback): () => void {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter(l => l !== callback);
        };
    }

    // Notify all listeners of changes
    private notifyListeners(): void {
        this.listeners.forEach(callback => callback(this.config, this.preferences));
    }

    // Reset to defaults
    public reset(): void {
        localStorage.removeItem(APP_CONFIG_KEY);
        localStorage.removeItem(USER_PREFERENCES_KEY);
        this.config = defaultConfig;
        this.preferences = defaultPreferences;
        this.notifyListeners();
    }

    // Export configuration
    public export(): object {
        return {
            config: this.config,
            preferences: this.preferences,
            exportedAt: new Date().toISOString(),
        };
    }

    // Import configuration
    public import(data: any): boolean {
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
