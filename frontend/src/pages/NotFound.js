import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

const NotFound = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className="min-h-screen flex items-center justify-center px-8">
      <div className="max-w-3xl w-full text-center">
        {/* Main Message - Simple and Clean */}
        <h1 className={`text-4xl font-normal mb-6 ${
          isDark ? 'text-white' : 'text-gray-900'
        }`}>
          Captain!, we've encountered an issue...
        </h1>

        {/* Description */}
        <p className={`text-base leading-relaxed ${
          isDark ? 'text-gray-400' : 'text-gray-600'
        }`}>
          The page you're looking for was not found.
        </p>
        
        <p className={`text-base leading-relaxed mt-2 ${
          isDark ? 'text-gray-400' : 'text-gray-600'
        }`}>
          If you got here from an old permalink, it might be that something changed in the meantime...
        </p>
      </div>
    </div>
  );
};

export default NotFound;
