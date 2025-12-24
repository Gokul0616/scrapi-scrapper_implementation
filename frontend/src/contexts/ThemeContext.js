import React, { createContext, useContext, useState, useEffect } from 'react';

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
    if (savedTheme === 'system') {
      // Check system preference
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return savedTheme || 'light';
  });

  const [themePreference, setThemePreference] = useState(() => {
    return localStorage.getItem('themePreference') || 'light';
  });

  useEffect(() => {
    // Update document class for CSS
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const setTheme = (newTheme) => {
    setThemeState(newTheme);
    // Don't save 'system' as actual theme, keep actual value
    if (newTheme !== 'system') {
      localStorage.setItem('theme', newTheme);
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    setThemePreference(newTheme);
    localStorage.setItem('themePreference', newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, themePreference, setThemePreference }}>
      {children}
    </ThemeContext.Provider>
  );
};
