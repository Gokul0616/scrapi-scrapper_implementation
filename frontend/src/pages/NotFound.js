import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { Home, ArrowLeft, Search, AlertCircle } from 'lucide-react';

const NotFound = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className={`min-h-screen flex items-center justify-center px-4 ${
      isDark ? 'bg-[#0F1014]' : 'bg-gray-50'
    }`}>
      <div className="max-w-2xl w-full text-center">
        {/* Icon */}
        <div className="mb-8 flex justify-center">
          <div className={`relative ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
            <AlertCircle className="w-24 h-24 animate-pulse" strokeWidth={1.5} />
            <div className={`absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${
              isDark ? 'bg-red-500 text-white' : 'bg-red-500 text-white'
            }`}>
              !
            </div>
          </div>
        </div>

        {/* Error Code */}
        <h1 className={`text-8xl font-bold mb-4 ${
          isDark 
            ? 'text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500' 
            : 'text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600'
        }`}>
          404
        </h1>

        {/* Main Message */}
        <h2 className={`text-3xl font-bold mb-4 ${
          isDark ? 'text-white' : 'text-gray-900'
        }`}>
          Captain!, we've encountered an issue...
        </h2>

        {/* Description */}
        <p className={`text-lg mb-2 ${
          isDark ? 'text-gray-400' : 'text-gray-600'
        }`}>
          The page you're looking for was not found.
        </p>
        
        <p className={`text-sm mb-8 ${
          isDark ? 'text-gray-500' : 'text-gray-500'
        }`}>
          If you got here from an old permalink, it might be that something changed in the meantime...
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <button
            onClick={() => navigate(-1)}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
              isDark
                ? 'bg-gray-800 hover:bg-gray-700 text-white border border-gray-700'
                : 'bg-white hover:bg-gray-50 text-gray-900 border border-gray-200 shadow-sm'
            }`}
            data-testid="go-back-button"
          >
            <ArrowLeft className="w-5 h-5" />
            Go Back
          </button>

          <button
            onClick={() => navigate('/')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
              isDark
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
            }`}
            data-testid="go-home-button"
          >
            <Home className="w-5 h-5" />
            Go to Home
          </button>
        </div>

        {/* Additional Help */}
        <div className={`mt-12 pt-8 border-t ${
          isDark ? 'border-gray-800' : 'border-gray-200'
        }`}>
          <p className={`text-sm mb-4 ${
            isDark ? 'text-gray-500' : 'text-gray-600'
          }`}>
            Try using the search to find what you need
          </p>
          
          <div className="flex justify-center gap-2">
            <kbd className={`px-3 py-2 rounded-md text-sm font-mono ${
              isDark
                ? 'bg-gray-800 text-gray-300 border border-gray-700'
                : 'bg-gray-100 text-gray-700 border border-gray-200'
            }`}>
              ⌘ K
            </kbd>
            <span className={`flex items-center gap-2 ${
              isDark ? 'text-gray-500' : 'text-gray-600'
            }`}>
              or
            </span>
            <kbd className={`px-3 py-2 rounded-md text-sm font-mono ${
              isDark
                ? 'bg-gray-800 text-gray-300 border border-gray-700'
                : 'bg-gray-100 text-gray-700 border border-gray-200'
            }`}>
              Ctrl K
            </kbd>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
