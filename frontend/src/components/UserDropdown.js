import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { ChevronDown, ChevronUp, Check, Plus, LogOut, User, Building2 } from 'lucide-react';
import { getUserInitials, getProfileColor, getUserDisplayName } from '../utils/userUtils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

const UserDropdown = ({ isCollapsed = false }) => {
  const { theme } = useTheme();
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [profilePictureKey, setProfilePictureKey] = useState(0);

  const userInitials = getUserInitials(user);
  const profileColor = getProfileColor(user?.profile_color, theme);


  const accountType = user?.account_type || 'personal';
  const accountTypeLabel = accountType === 'organization' ? 'Organization' : 'Personal';
  const AccountTypeIcon = accountType === 'organization' ? Building2 : User;

  const handleLogout = () => {
    setIsOpen(false);
    logout();
  };


  useEffect(() => {
    const handleProfilePictureUpdate = (event) => {

      setProfilePictureKey(prev => prev + 1);
    };

    window.addEventListener('profilePictureUpdated', handleProfilePictureUpdate);
    return () => {
      window.removeEventListener('profilePictureUpdated', handleProfilePictureUpdate);
    };
  }, []);


  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen]);


  if (isCollapsed) {
    return (
      <TooltipProvider delayDuration={500}>
        <div className="relative" ref={dropdownRef}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="cursor-pointer"
                data-testid="user-dropdown-trigger-collapsed"
              >
                {user?.profile_picture ? (
                  <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0">
                    <img
                      key={`sidebar-profile-${profilePictureKey}`}
                      src={user.profile_picture}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div
                    key={`sidebar-profile-${profilePictureKey}`}
                    className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: profileColor }}
                  >
                    <span className="text-white text-sm font-semibold">{userInitials}</span>
                  </div>
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent
              side="right"
              className="bg-popover text-popover-foreground border border-border"
            >
              {getUserDisplayName(user)}
            </TooltipContent>
          </Tooltip>


          {isOpen && (
            <>

              <div
                className="fixed inset-0 z-[9998]"
                onClick={() => setIsOpen(false)}
                data-testid="dropdown-backdrop"
              />


              <div
                className="fixed rounded-lg border z-[9999] px-2 py-3 bg-popover border-border"
                style={{
                  width: '225px',
                  left: '76px',
                  top: dropdownRef.current
                    ? `${dropdownRef.current.getBoundingClientRect().top}px`
                    : '16px'
                }}
                data-testid="user-dropdown-menu"
              >

                <div className="border-b border-border">
                  <div className="flex items-center space-x-1.5 mb-1">
                    <AccountTypeIcon className="w-3 h-3 text-muted-foreground" />
                    <div className="text-xs tracking-wider text-muted-foreground">
                      {accountTypeLabel}
                    </div>
                  </div>
                  <button
                    className="w-full flex items-center space-x-2.5 rounded-md transition-colors m-1 p-1 bg-muted hover:bg-muted/80 text-foreground"
                  >
                    {user?.profile_picture ? (
                      <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
                        <img
                          key={`dropdown-profile-menu-${profilePictureKey}`}
                          src={user.profile_picture}
                          alt="Profile"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div
                        key={`dropdown-profile-menu-${profilePictureKey}`}
                        className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: profileColor }}
                      >
                        <span className="text-white text-xs font-semibold">{userInitials}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0 text-left">
                      <div className="font-medium text-xs text-foreground">
                        {getUserDisplayName(user)}
                      </div>
                      <div className="text-xs truncate text-muted-foreground">
                        {user?.email || ''}
                      </div>
                    </div>
                    <Check className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                  </button>
                </div>


                {accountType === 'personal' && (
                  <div className="border-b border-border">
                    <div className="flex items-center space-x-1.5 mb-1 mt-2">
                      <Building2 className="w-3 h-3 text-muted-foreground" />
                      <div className="text-xs tracking-wider text-muted-foreground">
                        Organizations
                      </div>
                    </div>
                    <button
                      style={{ fontSize: '13px' }}
                      className="w-full flex items-center space-x-2.5 rounded-md text-xs transition-colors m-1 px-1 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add organization</span>
                    </button>
                  </div>
                )}


                <div className="border-b border-border">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center space-x-2.5 rounded-md text-xs font-medium transition-colors m-1 px-1 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                    data-testid="sign-out-button"
                  >
                    <LogOut className="w-3 h-3" />
                    <span>Sign out</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </TooltipProvider>
    );
  }


  return (
    <>
      <div className="relative w-full" ref={dropdownRef}>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg transition-colors hover:bg-accent hover:text-accent-foreground text-foreground"
          data-testid="user-dropdown-trigger"
        >
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            {user?.profile_picture ? (
              <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0">
                <img
                  key={`dropdown-profile-main-${profilePictureKey}`}
                  src={user.profile_picture}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div
                key={`dropdown-profile-main-${profilePictureKey}`}
                className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: profileColor }}
              >
                <span className="text-white text-sm font-semibold">{userInitials}</span>
              </div>
            )}
            <div className="flex-1 min-w-0 text-left">
              <div
                className="font-semibold text-sm leading-tight text-foreground"
              >
                {getUserDisplayName(user)}
              </div>
              <div className="flex items-center space-x-1">
                <AccountTypeIcon className="w-3 h-3 text-muted-foreground" />
                <span
                  className="text-xs text-muted-foreground"
                >
                  {accountTypeLabel}
                </span>
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


      {isOpen && (
        <>

          <div
            className="fixed inset-0 z-[9998]"
            onClick={() => setIsOpen(false)}
            data-testid="dropdown-backdrop"
          />


          <div
            className="fixed rounded-lg border z-[9999] px-2 py-3 bg-popover border-border"
            style={{
              width: '225px',
              left: '16px',
              top: dropdownRef.current
                ? `${dropdownRef.current.getBoundingClientRect().bottom + 8}px`
                : '80px'
            }}
            data-testid="user-dropdown-menu"
          >

            <div className="border-b border-border">
              <div className="flex items-center space-x-1.5 mb-1">
                <AccountTypeIcon className="w-3 h-3 text-muted-foreground" />
                <div className="text-xs tracking-wider text-muted-foreground">
                  {accountTypeLabel}
                </div>
              </div>
              <button
                className="w-full flex items-center space-x-2.5 rounded-md transition-colors m-1 p-1 bg-muted hover:bg-muted/80"
              >
                {user?.profile_picture ? (
                  <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
                    <img
                      key={`dropdown-profile-menu-${profilePictureKey}`}
                      src={user.profile_picture}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div
                    key={`dropdown-profile-menu-${profilePictureKey}`}
                    className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: profileColor }}
                  >
                    <span className="text-white text-xs font-semibold">{userInitials}</span>
                  </div>
                )}
                <div className="flex-1 min-w-0 text-left">
                  <div className="font-medium text-xs text-foreground">
                    {getUserDisplayName(user)}
                  </div>
                  <div className="text-xs truncate text-muted-foreground">
                    {user?.email || ''}
                  </div>
                </div>
                <Check className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
              </button>
            </div>


            {accountType === 'personal' && (
              <div className="border-b border-border">
                <div className="flex items-center space-x-1.5 mb-1 mt-2">
                  <Building2 className="w-3 h-3 text-muted-foreground" />
                  <div className="text-xs tracking-wider text-muted-foreground">
                    Organizations
                  </div>
                </div>
                <button
                  style={{ fontSize: '13px' }}
                  className="w-full flex items-center space-x-2.5 rounded-md text-xs transition-colors m-1 px-1 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add organization</span>
                </button>
              </div>
            )}


            <div className="border-b border-border">
              <button
                onClick={handleLogout}
                className="w-full flex items-center space-x-2.5 rounded-md text-xs font-medium transition-colors m-1 px-1 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
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
