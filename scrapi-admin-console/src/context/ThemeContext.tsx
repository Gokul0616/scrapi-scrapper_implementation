import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    toggleTheme: () => void;
    themePreference: string;
    setThemePreference: (pref: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within ThemeProvider');
    }
    return context;
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [theme, setThemeState] = useState<Theme>(() => {
        const savedTheme = localStorage.getItem('theme') as Theme | null;
        const savedPreference = localStorage.getItem('themePreference') as Theme | null;

        if (savedPreference === 'system' || savedTheme === 'system') {
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        return savedTheme || 'light';
    });

    const [themePreference, setThemePreferenceState] = useState<Theme>(() => {
        return (localStorage.getItem('themePreference') as Theme | null) || 'light';
    });

    useEffect(() => {
        const root = document.documentElement;

        if (theme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
    }, [theme]);

    useEffect(() => {
        if (themePreference === 'system') {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            const handler = (e: MediaQueryListEvent) => setThemeState(e.matches ? 'dark' : 'light');
            mediaQuery.addEventListener('change', handler);
            return () => mediaQuery.removeEventListener('change', handler);
        }
    }, [themePreference]);

    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme);
        localStorage.setItem('theme', newTheme);
    };

    const setThemePreference = (newPreference: Theme) => {
        setThemePreferenceState(newPreference);
        localStorage.setItem('themePreference', newPreference);

        let actualTheme: Theme;
        if (newPreference === 'system') {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            actualTheme = mediaQuery.matches ? 'dark' : 'light';
            setThemeState(actualTheme);
        } else {
            actualTheme = newPreference;
            setThemeState(newPreference);
        }

        localStorage.setItem('theme', actualTheme);
    };

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setThemePreference(newTheme);
    };

    return (
        <ThemeContext.Provider value={{
            theme,
            setTheme,
            toggleTheme,
            themePreference,
            setThemePreference
        }}>
            {children}
        </ThemeContext.Provider>
    );
};
