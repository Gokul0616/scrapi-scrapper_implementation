import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { ChevronDown, ChevronUp, Check, Plus, LogOut } from 'lucide-react';

const UserDropdown = () => {
  const { theme } = useTheme();
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleLogout = () => {
    setIsOpen(false);
    logout();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Dropdown Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center space-x-2 flex-1 min-w-0 px-2 py-1.5 rounded-lg transition-colors ${
          theme === 'dark'
            ? 'hover:bg-gray-800 text-gray-200'
            : 'hover:bg-gray-100 text-gray-700'
        }`}
        data-testid="user-dropdown-trigger"
      >
        <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
          <img
            src="/logo.png"
            alt="User Avatar"
            className={`w-6 h-6 ${theme === 'dark' ? 'brightness-0 invert' : ''}`}
          />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <div
            className={`font-semibold text-sm leading-tight ${
              theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
            }`}
          >
            {user?.organization_name || 'Gokul'}
          </div>
          <div
            className={`text-xs ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
            }`}
          >
            Personal
          </div>
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 flex-shrink-0" />
        )}
      </button>

      {/* Dropdown Menu - Floating Popup Style */}
      {isOpen && (
        <div
          className={`fixed rounded-lg shadow-2xl border z-[9999] ${
            theme === 'dark'
              ? 'bg-[#1A1B1E] border-gray-700'
              : 'bg-white border-gray-200'
          }`}
          style={{
            minWidth: '280px',
            maxWidth: '320px',
            left: '16px',
            top: dropdownRef.current 
              ? `${dropdownRef.current.getBoundingClientRect().bottom + 8}px`
              : '80px',
            boxShadow: theme === 'dark' 
              ? '0 10px 40px rgba(0, 0, 0, 0.5), 0 2px 8px rgba(0, 0, 0, 0.3)'
              : '0 10px 40px rgba(0, 0, 0, 0.15), 0 2px 8px rgba(0, 0, 0, 0.08)'
          }}
          data-testid="user-dropdown-menu"
        >
          {/* Personal Section */}
          <div
            className={`px-3 py-2 border-b ${
              theme === 'dark' ? 'border-gray-800' : 'border-gray-200'
            }`}
          >
            <div
              className={`text-xs font-semibold uppercase tracking-wide mb-2 ${
                theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
              }`}
            >
              Personal
            </div>
            <div
              className={`flex items-center space-x-2 px-2 py-2 rounded-md ${
                theme === 'dark' ? 'bg-[#25262B]' : 'bg-gray-50'
              }`}
            >
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-sm font-semibold">G</span>
              </div>
              <div className="flex-1 min-w-0">
                <div
                  className={`font-semibold text-sm ${
                    theme === 'dark' ? 'text-gray-200' : 'text-gray-800'
                  }`}
                >
                  {user?.organization_name || 'Gokul Alpha'}
                </div>
                <div
                  className={`text-xs ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                  }`}
                >
                  righteous_planet
                </div>
              </div>
              <Check
                className={`w-4 h-4 ${
                  theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                }`}
              />
            </div>
          </div>

          {/* Organizations Section */}
          <div
            className={`px-3 py-2 border-b ${
              theme === 'dark' ? 'border-gray-800' : 'border-gray-200'
            }`}
          >
            <div
              className={`text-xs font-semibold uppercase tracking-wide mb-2 ${
                theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
              }`}
            >
              Organizations
            </div>
            <button
              className={`w-full flex items-center space-x-2 px-2 py-2 rounded-md text-sm transition-colors ${
                theme === 'dark'
                  ? 'text-gray-300 hover:bg-[#25262B]'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>Add organization</span>
            </button>
          </div>

          {/* Sign Out */}
          <div className="px-3 py-2">
            <button
              onClick={handleLogout}
              className={`w-full flex items-center space-x-2 px-2 py-2 rounded-md text-sm transition-colors ${
                theme === 'dark'
                  ? 'text-gray-300 hover:bg-[#25262B]'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
              data-testid="sign-out-button"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDropdown;
