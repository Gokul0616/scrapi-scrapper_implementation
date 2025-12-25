import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { ChevronDown, ChevronUp, Check, Plus, LogOut } from 'lucide-react';
import { getUserInitials, getProfileColor } from '../utils/userUtils';

const UserDropdown = () => {
  const { theme } = useTheme();
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [profilePictureKey, setProfilePictureKey] = useState(0);

  const userInitials = getUserInitials(user);
  const profileColor = getProfileColor(user?.profile_color, theme);

  const handleLogout = () => {
    setIsOpen(false);
    logout();
  };

  // Listen for profile picture updates
  useEffect(() => {
    const handleProfilePictureUpdate = (event) => {
      // Force re-render by updating key
      setProfilePictureKey(prev => prev + 1);
    };

    window.addEventListener('profilePictureUpdated', handleProfilePictureUpdate);
    return () => {
      window.removeEventListener('profilePictureUpdated', handleProfilePictureUpdate);
    };
  }, []);

  // Handle ESC key to close dropdown
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

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
            {user?.profile_picture ? (
              <img 
                key={`dropdown-profile-main-${profilePictureKey}`}
                src={user.profile_picture} 
                alt="Profile" 
                className="w-9 h-9 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div 
                key={`dropdown-profile-main-${profilePictureKey}`}
                className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: profileColor }}
              >
                <span className="text-white text-sm font-semibold">{userInitials}</span>
              </div>
            )}
            <div className="flex-1 min-w-0 text-left">
              <div
                className={`font-semibold text-sm leading-tight ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
                  }`}
              >
                {user?.username || ''}
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
            className={`fixed rounded-lg border z-[9999] px-2 py-3 ${
              theme === 'dark' 
                ? 'bg-[#1A1B1E] border-gray-800' 
                : 'bg-white border-gray-200'
            }`}
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
            <div className={`border-b ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'}`}>
              <div className={`text-xs tracking-wider ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                Personal
              </div>
              <button
                className={`w-full flex items-center space-x-2.5 rounded-md transition-colors m-1 p-1 ${
                  theme === 'dark'
                    ? 'bg-[#2C2D30] hover:bg-gray-700'
                    : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                {user?.profile_picture ? (
                  <img 
                    key={`dropdown-profile-menu-${profilePictureKey}`}
                    src={user.profile_picture} 
                    alt="Profile" 
                    className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div 
                    key={`dropdown-profile-menu-${profilePictureKey}`}
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: profileColor }}
                  >
                    <span className="text-white text-xs font-semibold">{userInitials}</span>
                  </div>
                )}
                <div className="flex-1 min-w-0 text-left">
                  <div className={`font-medium text-xs ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
                    {user?.username || ''}
                  </div>
                  <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    {user?.email || ''}
                  </div>
                </div>
                <Check className={`w-4 h-4 flex-shrink-0 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} />
              </button>
            </div>

            {/* Organizations Section */}
            <div className={`border-b ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'}`}>
              <div className={`text-xs tracking-wider m-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                Organizations
              </div>
              <button 
                style={{fontSize:'13px'}}
                className={`w-full flex items-center space-x-2.5 rounded-md text-xs transition-colors m-1 px-1 py-1.5 ${
                  theme === 'dark'
                    ? 'text-gray-300 hover:bg-gray-800'
                    : 'text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Plus className="w-3 h-3" />
                <span>Add organization</span>
              </button>
            </div>

            {/* Sign Out */}
            <div className={`border-b ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'}`}>
              <button
                onClick={handleLogout}
                className={`w-full flex items-center space-x-2.5 rounded-md text-xs font-medium transition-colors m-1 px-1 py-1.5 ${
                  theme === 'dark'
                    ? 'text-gray-300 hover:bg-gray-800'
                    : 'text-gray-700 hover:bg-gray-200'
                }`}
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
