import { useState, useEffect } from 'react';
import appConfig from '../utils/appConfig';

/**
 * Hook to use app configuration in React components
 * @param {string} path - Path to config value (e.g., 'app.features.search')
 * @returns {[value, setValue]} - Current value and setter function
 */
export const useAppConfig = (path) => {
    const [value, setValue] = useState(appConfig.get(path));

    useEffect(() => {
        const unsubscribe = appConfig.subscribe(() => {
            setValue(appConfig.get(path));
        });

        return unsubscribe;
    }, [path]);

    const setConfigValue = (newValue) => {
        appConfig.set(path, newValue);
    };

    return [value, setConfigValue];
};

/**
 * Hook to use user preferences
 * @param {string} key - Preference key
 * @returns {[value, setValue]} - Current value and setter function
 */
export const usePreference = (key) => {
    const [value, setValue] = useState(appConfig.getPreference(key));

    useEffect(() => {
        const unsubscribe = appConfig.subscribe(() => {
            setValue(appConfig.getPreference(key));
        });

        return unsubscribe;
    }, [key]);

    const setPreferenceValue = (newValue) => {
        appConfig.setPreference(key, newValue);
    };

    return [value, setPreferenceValue];
};

/**
 * Hook to check if a feature is enabled
 * @param {string} featureName - Name of the feature
 * @returns {boolean} - Whether the feature is enabled
 */
export const useFeature = (featureName) => {
    const [enabled, setEnabled] = useAppConfig(`app.features.${featureName}`);
    return enabled;
};

/**
 * Hook to get recent searches
 * @returns {object} - Recent searches and utility functions
 */
export const useRecentSearches = () => {
    const [searches, setSearches] = useState(appConfig.getRecentSearches());

    useEffect(() => {
        const unsubscribe = appConfig.subscribe(() => {
            setSearches(appConfig.getRecentSearches());
        });

        return unsubscribe;
    }, []);

    return {
        searches,
        addSearch: (query) => appConfig.addRecentSearch(query),
        clearSearches: () => appConfig.clearRecentSearches(),
    };
};

/**
 * Hook to manage favorites
 * @returns {object} - Favorites and utility functions
 */
export const useFavorites = () => {
    const [favorites, setFavorites] = useState(appConfig.getFavorites());

    useEffect(() => {
        const unsubscribe = appConfig.subscribe(() => {
            setFavorites(appConfig.getFavorites());
        });

        return unsubscribe;
    }, []);

    return {
        favorites,
        addFavorite: (page) => appConfig.addFavorite(page),
        removeFavorite: (url) => appConfig.removeFavorite(url),
        isFavorite: (url) => favorites.some(f => f.url === url),
    };
};

export default appConfig;
