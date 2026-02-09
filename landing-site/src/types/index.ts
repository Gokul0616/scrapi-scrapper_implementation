export interface Actor {
    id: string;
    name: string;
    slug: string;
    description: string;
    icon: string;
    author: string;
    authorAvatar: string;
    users: string;
    rating: number;
    runs_count?: number;
    author_name?: string;
}

export interface Testimonial {
    quote: string;
    author: string;
    role: string;
    company?: string;
    avatar: string;
    link?: string;
}

export interface CompanyLogo {
    name: string;
    logo: string;
}

export interface CodeTemplate {
    name: string;
    icon: string;
}


export interface Integration {
    name: string;
    icon: string;
    description?: string;
}

export interface CookieSettings {
    strictlyNecessary: boolean;
    targeting: boolean;
    performance: boolean;
}

export interface AppFeatures {
    search: boolean;
    analytics: boolean;
    darkMode: boolean;
    notifications: boolean;
    [key: string]: boolean;
}

export interface UserConfig {
    role: string;
    locale: string;
    hasConversations: boolean;
    theme: 'light' | 'dark' | 'system';
}

export interface SearchConfig {
    recentSearches: string[];
    maxRecentSearches: number;
    searchHistory: boolean;
}

export interface UIConfig {
    sidebarCollapsed: boolean;
    compactMode: boolean;
    animationsEnabled: boolean;
}

export interface MetadataConfig {
    lastUpdated: string;
    sessionCount: number;
}

export interface AppConfig {
    app: {
        name: string;
        version: string;
        features: AppFeatures;
        helpCenterUrl: string;
        isDeveloperWorkspace: boolean;
    };
    user: UserConfig;
    search: SearchConfig;
    ui: UIConfig;
    metadata: MetadataConfig;
}

export interface FavoritePage {
    url: string;
    title?: string;
    addedAt: string;
}

export interface ViewedDocument {
    id: string;
    firstViewed: string;
    lastViewed: string;
    viewCount: number;
}

export interface UserPreferences {
    cookieConsent: boolean | null;
    cookieSettings: CookieSettings | null;
    lastVisit: string | null;
    favoritePages: FavoritePage[];
    viewedDocuments: ViewedDocument[];
    [key: string]: any;
}

