import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(() => {
    // Check localStorage for saved theme
    const savedTheme = localStorage.getItem('theme');
    const savedPreference = localStorage.getItem('themePreference');
    
    if (savedPreference === 'system' || savedTheme === 'system') {
      // Check system preference
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return savedTheme || 'light';
  });

  const [themePreference, setThemePreferenceState] = useState(() => {
    return localStorage.getItem('themePreference') || 'light';
  });

  const [backendThemeLoaded, setBackendThemeLoaded] = useState(false);

  // Listen for backend theme loaded event
  useEffect(() => {
    const handleBackendTheme = (event) => {
      if (event.detail && event.detail.theme && !backendThemeLoaded) {
        loadThemeFromBackend(event.detail.theme);
      }
    };
    
    window.addEventListener('backendThemeLoaded', handleBackendTheme);
    return () => window.removeEventListener('backendThemeLoaded', handleBackendTheme);
  }, [backendThemeLoaded]);

  useEffect(() => {
    // Update document class for CSS
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Handle system preference changes when preference is 'system'
  useEffect(() => {
    if (themePreference === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = (e) => setThemeState(e.matches ? 'dark' : 'light');
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
  }, [themePreference]);

  const setTheme = (newTheme) => {
    setThemeState(newTheme);
    // Save to localStorage
    localStorage.setItem('theme', newTheme);
  };

  const setThemePreference = async (newPreference) => {
    setThemePreferenceState(newPreference);
    localStorage.setItem('themePreference', newPreference);
    
    // Apply theme based on preference
    let actualTheme;
    if (newPreference === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      actualTheme = mediaQuery.matches ? 'dark' : 'light';
      setThemeState(actualTheme);
    } else {
      actualTheme = newPreference;
      setThemeState(newPreference);
    }
    
    // Save the actual theme to localStorage as well
    localStorage.setItem('theme', actualTheme);
    
    // Save to backend API
    try {
      const token = localStorage.getItem('token');
      if (token) {
        await axios.put(
          `${API}/settings/preferences`,
          { theme_preference: newPreference },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
    } catch (error) {
      console.error('Failed to save theme preference to backend:', error);
      // Even if backend fails, we still have it in localStorage
    }
  };

  const loadThemeFromBackend = (backendTheme) => {
    if (!backendTheme || backendThemeLoaded) return;
    
    const localPreference = localStorage.getItem('themePreference');
    
    // If backend theme differs from local, use backend theme
    if (backendTheme !== localPreference) {
      setThemePreference(backendTheme);
    }
    
    setBackendThemeLoaded(true);
  };

  const toggleTheme = async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    await setThemePreference(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ 
      theme, 
      setTheme, 
      toggleTheme, 
      themePreference, 
      setThemePreference,
      loadThemeFromBackend 
    }}>
      {children}
    </ThemeContext.Provider>
  );
};
