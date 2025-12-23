import React, { useState, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { ChevronDown, ChevronUp, Check, Plus, LogOut } from 'lucide-react';

const UserDropdown = () => {
  const { theme } = useTheme();
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const handleLogout = () => {
    setIsOpen(false);
    logout();
  };

  return (
    <>
      <div className="relative w-full" ref={dropdownRef}>
        {/* Dropdown Trigger */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg transition-colors ${theme === 'dark'
              ? 'hover:bg-gray-800 text-gray-200'
              : 'hover:bg-gray-100 text-gray-700'
            }`}
          data-testid="user-dropdown-trigger"
        >
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
              <img
                src="/logo.png"
                alt="User Avatar"
                className={`w-6 h-6 ${theme === 'dark' ? 'brightness-0 invert' : ''}`}
              />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <div
                className={`font-semibold text-sm leading-tight ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
                  }`}
              >
                {user?.organization_name || ''}
              </div>
              <div
                className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                  }`}
              >
                Personal
              </div>
            </div>
          </div>
          {isOpen ? (
            <ChevronUp className="w-4 h-4 flex-shrink-0" />
          ) : (
            <ChevronDown className="w-4 h-4 flex-shrink-0" />
          )}
        </button>
      </div>

      {/* Floating Popup Menu with Backdrop */}
      {isOpen && (
        <>
          {/* Transparent backdrop */}
          <div
            className="fixed inset-0 z-[9998]"
            onClick={() => setIsOpen(false)}
            data-testid="dropdown-backdrop"
          />

          {/* Floating Popup */}
          <div
            className="fixed rounded-lg border z-[9999] bg-white border-gray-200 px-2 py-3"
            style={{
              width: '225px',
              left: '16px',
              top: dropdownRef.current
                ? `${dropdownRef.current.getBoundingClientRect().bottom + 8}px`
                : '80px'
            }}
            data-testid="user-dropdown-menu"
          >
            {/* Personal Section */}
            <div className="border-b border-gray-200">
              <div className="text-xs  tracking-wider text-gray-500">
                Personal
              </div>
              <button
                className="w-full flex items-center space-x-2.5 rounded-md bg-gray-200 hover:bg-gray-300 transition-colors m-1 p-1"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs font-medium">G</span>
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="font-medium text-xs text-gray-800">
                    {user?.organization_name || ''}
                  </div>
                  <div className="text-xs text-gray-500">
                    righteous_planet
                  </div>
                </div>
                <Check className="w-4 h-4 text-gray-600 flex-shrink-0" />
              </button>
            </div>

            {/* Organizations Section */}
            <div className="border-b border-gray-200">
              <div className="text-xs   tracking-wider text-gray-500 m-1">
                Organizations
              </div>
              <button style={{fontSize:'13px'}}
                className="w-full flex items-center space-x-2.5 rounded-md text-xs text-gray-700 hover:bg-gray-200 transition-colors m-1 px-1 py-1.5"
              >
                <Plus className="w-3 h-3" />
                <span>Add organization</span>
              </button>
            </div>

            {/* Sign Out */}
            <div className="border-b border-gray-200">
              <button
                onClick={handleLogout}
                className="w-full flex items-center space-x-2.5 rounded-md text-xs font-medium text-gray-700 hover:bg-gray-200 transition-colors m-1 px-1 py-1.5"
                data-testid="sign-out-button"
              >
                <LogOut className="w-3 h-3" />
                <span>Sign out</span>
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default UserDropdown;
