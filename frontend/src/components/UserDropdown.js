import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useModal } from '../contexts/ModalContext';
import { ChevronDown, ChevronUp, Check, Plus, LogOut, User, Building2, Pencil } from 'lucide-react';
import { getUserInitials, getProfileColor, getUserDisplayName } from '../utils/userUtils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

const UserDropdown = ({ isCollapsed = false }) => {
  const { theme } = useTheme();
  const { user, logout } = useAuth();
  const { workspaces, currentWorkspace, switchWorkspace, refreshWorkspaces, loading: workspaceLoading } = useWorkspace();
  const { openModal } = useModal();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [profilePictureKey, setProfilePictureKey] = useState(0);

  const userInitials = getUserInitials(user);
  const profileColor = getProfileColor(user?.profile_color, theme);

  // Get current workspace info - with loading state handling
  const currentWorkspaceType = currentWorkspace?.workspace_type || 'personal';
  const currentWorkspaceName = currentWorkspace?.workspace_name || (user?.username || 'Personal');
  const currentWorkspaceRole = currentWorkspace?.role;

  const accountTypeLabel = currentWorkspaceType === 'organization' ? 'Organization' : 'Personal';
  const AccountTypeIcon = currentWorkspaceType === 'organization' ? Building2 : User;

  // Separate workspaces into personal and organizations
  const personalWorkspace = workspaces.find(w => w.workspace_type === 'personal');
  const organizationWorkspaces = workspaces.filter(w => w.workspace_type === 'organization');
  const hasOrganizations = organizationWorkspaces.length > 0;

  const handleLogout = () => {
    setIsOpen(false);
    logout();
  };

  const handleWorkspaceSwitch = (workspace) => {
    switchWorkspace(workspace);
    setIsOpen(false);
  };

  const handleCreateOrganization = () => {
    setIsOpen(false);
    openModal('create-organization', {
      onSuccess: handleOrganizationCreated
    });
  };

  const handleOrganizationCreated = async (newOrg) => {
    // Refresh workspaces after creating new organization
    await refreshWorkspaces();

    // Automatically switch to the newly created organization
    if (newOrg && newOrg.id) {
      const newWorkspace = {
        workspace_type: 'organization',
        workspace_id: newOrg.id,
        workspace_name: newOrg.display_name,
        role: 'owner'
      };
      switchWorkspace(newWorkspace);
    }
  };

  const handleManageOrganizations = (e) => {
    e.stopPropagation();
    setIsOpen(false);
    navigate('/settings?tab=organizations');
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
                    <div className="text-xs tracking-wider text-muted-foreground flex items-center gap-1">
                      {accountTypeLabel}
                      {currentWorkspaceType === 'organization' && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${theme === 'dark' ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700'
                          }`}>
                          Free plan
                        </span>
                      )}
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
                        {currentWorkspaceName}
                      </div>
                      <div className="text-xs truncate text-muted-foreground">
                        {currentWorkspaceRole ? `${currentWorkspaceRole.charAt(0).toUpperCase() + currentWorkspaceRole.slice(1)}` : user?.email || ''}
                      </div>
                    </div>
                    <Check className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                  </button>
                </div>

                {/* Workspaces List */}
                {currentWorkspaceType === 'personal' ? (
                  // When in Personal Account - Show Organizations section
                  (personalWorkspace || organizationWorkspaces.length > 0) && (
                    <div className="border-b border-border py-1">
                      <div className="flex items-center justify-between space-x-1.5 mb-1 mt-2 px-1">
                        <div className="flex items-center space-x-1.5">
                          <Building2 className="w-3 h-3 text-muted-foreground" />
                          <div className="text-xs tracking-wider text-muted-foreground">
                            Organizations
                          </div>
                        </div>
                        {hasOrganizations && (
                          <button
                            onClick={handleManageOrganizations}
                            className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded hover:bg-muted"
                            title="Manage Organizations"
                            data-testid="manage-organizations-btn"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      {/* Organization Workspaces */}
                      {organizationWorkspaces.map((workspace) => (
                        <button
                          key={workspace.workspace_id}
                          onClick={() => handleWorkspaceSwitch(workspace)}
                          style={{ fontSize: '13px' }}
                          className="w-full flex items-center space-x-2.5 rounded-md text-xs transition-colors m-1 px-1 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          <Building2 className="w-3 h-3" />
                          <div className="flex-1 text-left min-w-0">
                            <div className="truncate">{workspace.workspace_name}</div>
                            {workspace.role && (
                              <div className="text-xs text-muted-foreground">
                                {workspace.role.charAt(0).toUpperCase() + workspace.role.slice(1)}
                              </div>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )
                ) : (
                  // When in Organization Account - Show two separate sections
                  <>
                    {/* Switch Account Section - Personal Account */}
                    {personalWorkspace && (
                      <div className="border-b border-border py-1">
                        <div className="flex items-center space-x-1.5 mb-1 mt-2 px-1">
                          <User className="w-3 h-3 text-muted-foreground" />
                          <div className="text-xs tracking-wider text-muted-foreground">
                            Switch Account
                          </div>
                        </div>
                        <button
                          onClick={() => handleWorkspaceSwitch(personalWorkspace)}
                          style={{ fontSize: '13px' }}
                          className="w-full flex items-center space-x-2.5 rounded-md text-xs transition-colors m-1 px-1 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          <User className="w-3 h-3" />
                          <span className="flex-1 text-left">{personalWorkspace.workspace_name}</span>
                        </button>
                      </div>
                    )}

                    {/* Organizations Section - Other Organizations */}
                    {organizationWorkspaces.filter(w => w.workspace_id !== currentWorkspace?.workspace_id).length > 0 && (
                      <div className="border-b border-border py-1">
                        <div className="flex items-center justify-between space-x-1.5 mb-1 mt-2 px-1">
                          <div className="flex items-center space-x-1.5">
                            <Building2 className="w-3 h-3 text-muted-foreground" />
                            <div className="text-xs tracking-wider text-muted-foreground">
                              Organizations
                            </div>
                          </div>
                          <button
                            onClick={handleManageOrganizations}
                            className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded hover:bg-muted"
                            title="Manage Organizations"
                            data-testid="manage-organizations-btn"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Other Organization Workspaces */}
                        {organizationWorkspaces.map((workspace) => {
                          const isActive = currentWorkspace?.workspace_id === workspace.workspace_id;
                          if (isActive) return null; // Don't show active workspace

                          return (
                            <button
                              key={workspace.workspace_id}
                              onClick={() => handleWorkspaceSwitch(workspace)}
                              style={{ fontSize: '13px' }}
                              className="w-full flex items-center space-x-2.5 rounded-md text-xs transition-colors m-1 px-1 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                            >
                              <Building2 className="w-3 h-3" />
                              <div className="flex-1 text-left min-w-0">
                                <div className="truncate">{workspace.workspace_name}</div>
                                {workspace.role && (
                                  <div className="text-xs text-muted-foreground">
                                    {workspace.role.charAt(0).toUpperCase() + workspace.role.slice(1)}
                                  </div>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}

                {/* Create Organization - Only show if no organizations created yet */}
                {!hasOrganizations && (
                  <div className="border-b border-border">
                    <button
                      onClick={handleCreateOrganization}
                      style={{ fontSize: '13px' }}
                      className="w-full flex items-center space-x-2.5 rounded-md text-xs transition-colors m-1 px-1 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Create organization</span>
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
                {currentWorkspaceName}
              </div>
              <div className="flex items-center space-x-1">
                <AccountTypeIcon className="w-3 h-3 text-muted-foreground" />
                <span
                  className="text-xs text-muted-foreground"
                >
                  {currentWorkspaceRole ? `${currentWorkspaceRole.charAt(0).toUpperCase() + currentWorkspaceRole.slice(1)}` : accountTypeLabel}
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
                <div className="text-xs tracking-wider text-muted-foreground flex items-center gap-1">
                  {accountTypeLabel}
                  {currentWorkspaceType === 'organization' && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${theme === 'dark' ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700'
                      }`}>
                      Free plan
                    </span>
                  )}
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
                    {currentWorkspaceName}
                  </div>
                  <div className="text-xs truncate text-muted-foreground">
                    {currentWorkspaceRole ? `${currentWorkspaceRole.charAt(0).toUpperCase() + currentWorkspaceRole.slice(1)}` : user?.email || ''}
                  </div>
                </div>
                <Check className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
              </button>
            </div>

            {/* Workspaces List */}
            {currentWorkspaceType === 'personal' ? (
              // When in Personal Account - Show Organizations section
              (personalWorkspace || organizationWorkspaces.length > 0) && (
                <div className="border-b border-border py-1">
                  <div className="flex items-center justify-between space-x-1.5 mb-1 mt-2 px-1">
                    <div className="flex items-center space-x-1.5">
                      <Building2 className="w-3 h-3 text-muted-foreground" />
                      <div className="text-xs tracking-wider text-muted-foreground">
                        Organizations
                      </div>
                    </div>
                    {hasOrganizations && (
                      <button
                        onClick={handleManageOrganizations}
                        className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded hover:bg-muted"
                        title="Manage Organizations"
                        data-testid="manage-organizations-btn"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {/* Organization Workspaces */}
                  {organizationWorkspaces.map((workspace) => (
                    <button
                      key={workspace.workspace_id}
                      onClick={() => handleWorkspaceSwitch(workspace)}
                      style={{ fontSize: '13px' }}
                      className="w-full flex items-center space-x-2.5 rounded-md text-xs transition-colors m-1 px-1 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <Building2 className="w-3 h-3" />
                      <div className="flex-1 text-left min-w-0">
                        <div className="truncate">{workspace.workspace_name}</div>
                        {workspace.role && (
                          <div className="text-xs text-muted-foreground">
                            {workspace.role.charAt(0).toUpperCase() + workspace.role.slice(1)}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )
            ) : (
              // When in Organization Account - Show two separate sections
              <>
                {/* Switch Account Section - Personal Account */}
                {personalWorkspace && (
                  <div className="border-b border-border py-1">
                    <div className="flex items-center space-x-1.5 mb-1 mt-2 px-1">
                      <User className="w-3 h-3 text-muted-foreground" />
                      <div className="text-xs tracking-wider text-muted-foreground">
                        Switch Account
                      </div>
                    </div>
                    <button
                      onClick={() => handleWorkspaceSwitch(personalWorkspace)}
                      style={{ fontSize: '13px' }}
                      className="w-full flex items-center space-x-2.5 rounded-md text-xs transition-colors m-1 px-1 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <User className="w-3 h-3" />
                      <span className="flex-1 text-left">{personalWorkspace.workspace_name}</span>
                    </button>
                  </div>
                )}

                {/* Organizations Section - Other Organizations */}
                {organizationWorkspaces.filter(w => w.workspace_id !== currentWorkspace?.workspace_id).length > 0 && (
                  <div className="border-b border-border py-1">
                    <div className="flex items-center justify-between space-x-1.5 mb-1 mt-2 px-1">
                      <div className="flex items-center space-x-1.5">
                        <Building2 className="w-3 h-3 text-muted-foreground" />
                        <div className="text-xs tracking-wider text-muted-foreground">
                          Organizations
                        </div>
                      </div>
                      <button
                        onClick={handleManageOrganizations}
                        className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded hover:bg-muted"
                        title="Manage Organizations"
                        data-testid="manage-organizations-btn"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Other Organization Workspaces */}
                    {organizationWorkspaces.map((workspace) => {
                      const isActive = currentWorkspace?.workspace_id === workspace.workspace_id;
                      if (isActive) return null; // Don't show active workspace

                      return (
                        <button
                          key={workspace.workspace_id}
                          onClick={() => handleWorkspaceSwitch(workspace)}
                          style={{ fontSize: '13px' }}
                          className="w-full flex items-center space-x-2.5 rounded-md text-xs transition-colors m-1 px-1 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          <Building2 className="w-3 h-3" />
                          <div className="flex-1 text-left min-w-0">
                            <div className="truncate">{workspace.workspace_name}</div>
                            {workspace.role && (
                              <div className="text-xs text-muted-foreground">
                                {workspace.role.charAt(0).toUpperCase() + workspace.role.slice(1)}
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* Create Organization - Only show if no organizations created yet */}
            {!hasOrganizations && (
              <div className="border-b border-border">
                <button
                  onClick={handleCreateOrganization}
                  style={{ fontSize: '13px' }}
                  className="w-full flex items-center space-x-2.5 rounded-md text-xs transition-colors m-1 px-1 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <Plus className="w-3 h-3" />
                  <span>Create organization</span>
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
