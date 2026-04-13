import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import CustomTooltip from './CustomTooltip';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useModal } from '../contexts/ModalContext';
import { useNotifications } from '../contexts/NotificationContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { Progress } from './ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import ShortcutsModal from './ShortcutsModal';
import UserDropdown from './UserDropdown';
import GlobalSearch from './GlobalSearch';
import NotificationDropdown from './NotificationDropdown';
import { getUserInitials, getProfileColor } from '../utils/userUtils';
import {
  Home,
  Store,
  Code2,
  BookmarkCheck,
  PlayCircle,
  Puzzle,
  CalendarClock,
  HardDrive,
  Shield,
  Settings,
  Moon,
  Sun,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  PanelLeft,
  PanelLeftClose,
  Search,
  Bell,
  MessageCircle,
  BarChart3,
  Network,
  CreditCard,
  HelpCircle,
  FileText,
  LogOut,
  Palette,
  Plus,
  ExternalLink,
  Mail,
  Sparkles
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Sidebar = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { openModal, closeModal, isModalOpen, currentModal } = useModal();
  const { unreadCount } = useNotifications();
  const { currentWorkspace, selectWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const location = useLocation();
  const [billingData, setBillingData] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    // Load sidebar state from localStorage
    const savedCollapsed = localStorage.getItem('sidebarCollapsed');
    return savedCollapsed === 'true';
  });
  const [expandedSections, setExpandedSections] = useState({
    development: true
  });
  const [searchFocused, setSearchFocused] = useState(false);
  const [activeSection, setActiveSection] = useState('scrapiStore');
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [profilePictureKey, setProfilePictureKey] = useState(0);
  const notificationButtonRef = useRef(null);

  const userInitials = getUserInitials(user);
  const profileColor = getProfileColor(user?.profile_color, theme);

  // Check if we're on the store page
  const isStorePage = location.pathname === '/store';

  // Detect platform for keyboard shortcut display
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const shortcutKey = isMac ? '⌘K' : 'Ct+K';

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

  // Load sidebar state from backend when user logs in
  useEffect(() => {
    const loadSidebarPreference = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token && user) {
          const response = await axios.get(`${API}/settings/preferences`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (response.data && typeof response.data.sidebar_collapsed === 'boolean') {
            setIsCollapsed(response.data.sidebar_collapsed);
            localStorage.setItem('sidebarCollapsed', response.data.sidebar_collapsed.toString());
          }
        }
      } catch (error) {
        console.error('Failed to load sidebar preference:', error);
      }
    };

    loadSidebarPreference();
  }, [user]);

  // Save sidebar state to localStorage and backend when it changes
  useEffect(() => {
    const saveSidebarState = async () => {
      // Save to localStorage immediately
      localStorage.setItem('sidebarCollapsed', isCollapsed.toString());

      // Save to backend
      try {
        const token = localStorage.getItem('token');
        if (token && user) {
          await axios.put(
            `${API}/settings/preferences`,
            { sidebar_collapsed: isCollapsed },
            { headers: { Authorization: `Bearer ${token}` } }
          );
        }
      } catch (error) {
        console.error('Failed to save sidebar state to backend:', error);
      }
    };

    saveSidebarState();
  }, [isCollapsed, user]);

  // Handle automatic sidebar collapsing when entering the chat screen
  const lastPathname = useRef(location.pathname);

  useEffect(() => {
    // Detect transition from any non-chat route to a chat route
    const wasInChat = lastPathname.current.startsWith('/chat');
    const isInChat = location.pathname.startsWith('/chat');
    
    if (isInChat && !wasInChat) {
      setIsCollapsed(true);
    }
    
    lastPathname.current = location.pathname;
  }, [location.pathname]);



  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Load billing data for usage stats
  useEffect(() => {
    const fetchBillingData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token && currentWorkspace) {
          const response = await axios.get(`${API}/billing/summary`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setBillingData(response.data);
        }
      } catch (error) {
        console.error('Failed to load billing summary:', error);
      }
    };

    fetchBillingData();
  }, [currentWorkspace]);

  // Listen for real-time usage updates from WebSocket (via NotificationContext)
  useEffect(() => {
    const handleUsageUpdate = () => {
      console.log('Sidebar: Received usageUpdated event!');
      console.log('Sidebar: Refreshing usage data due to real-time update');
      const fetchBillingData = async () => {
        try {
          const token = localStorage.getItem('token');
          if (token && currentWorkspace) {
            const response = await axios.get(`${API}/billing/summary`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            setBillingData(response.data);
          }
        } catch (error) {
          console.error('Failed to load billing summary:', error);
        }
      };
      fetchBillingData();
    };

    window.addEventListener('usageUpdated', handleUsageUpdate);
    return () => window.removeEventListener('usageUpdated', handleUsageUpdate);
  }, [currentWorkspace]);

  // Handle keyboard shortcut
  useEffect(() => {
    const handleKeyDown = async (e) => {
      // Don't trigger shortcuts when user is typing in input fields
      const isTypingInInput =
        e.target.tagName === 'INPUT' ||
        e.target.tagName === 'TEXTAREA' ||
        e.target.isContentEditable;

      // Check for Escape key to close any open modal
      if (e.key === 'Escape') {
        if (currentModal === 'global-search') {
          e.preventDefault();
          closeModal();
          return;
        }
      }

      // Check for Cmd+K (Mac) or Ctrl+K (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        openModal('global-search');
      }

      // Check for Cmd+B (Mac) or Ctrl+B (Windows/Linux) to toggle sidebar
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        setIsCollapsed(prev => !prev);
      }

      // Check for Cmd+L (Mac) or Ctrl+L (Windows/Linux) to toggle theme
      if ((e.metaKey || e.ctrlKey) && e.key === 'l') {
        e.preventDefault();
        await toggleTheme();
      }

      // Check for Shift+? to show shortcuts modal
      if (e.shiftKey && e.key === '?') {
        e.preventDefault();
        openModal('shortcuts-modal');
      }

      // Handle S+Key shortcuts - ONLY when NOT typing in input and search modal is closed
      if ((e.key === 's' || e.key === 'S') && !isTypingInInput && currentModal !== 'global-search') {
        const nextKey = new Promise((resolve) => {
          const handler = (nextE) => {
            resolve(nextE.key.toUpperCase());
            window.removeEventListener('keydown', handler);
          };
          window.addEventListener('keydown', handler);
          setTimeout(() => {
            window.removeEventListener('keydown', handler);
            resolve(null);
          }, 1000);
        });

        nextKey.then((key) => {
          const shortcuts = {
            'H': '/home',
            'O': '/store',
            'A': '/actors',
            'R': '/runs',
            'T': '/tasks',
            'I': '/integrations',
            'C': '/schedules',
            'M': '/my-actors',
            'N': '/insights',
            'E': '/messaging',
            'P': '/proxy',
            'D': '/storage',
            'B': '/billing',
            'G': '/settings'
          };
          if (key && shortcuts[key]) {
            navigate(shortcuts[key]);
          }
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, toggleTheme, currentModal, openModal, closeModal]);

  // Determine billing label based on workspace type
  const isOrganization = currentWorkspace?.workspace_type === 'organization';
  const billingLabel = isOrganization ? 'Organization billing' : 'Billing';

  // Menu structure
  const scrapiStoreItems = [
    { icon: Home, label: 'Home', path: '/home', shortcut: 'S H' },
    { icon: Sparkles, label: 'Mira AI', path: '/chat', shortcut: '' },
    { icon: Code2, label: 'Actors', path: '/actors', shortcut: 'S A' },
    { icon: PlayCircle, label: 'Runs', path: '/runs', shortcut: 'S R' },
    { icon: BookmarkCheck, label: 'Saved tasks', path: '/tasks', shortcut: 'S T' },
    { icon: Puzzle, label: 'Integrations', path: '/integrations', shortcut: 'S I' },
    { icon: CalendarClock, label: 'Schedules', path: '/schedules', shortcut: 'S C' }
  ];

  const developmentItems = [
    { icon: Code2, label: 'My Actors', path: '/my-actors', shortcut: 'S M' },
    { icon: BarChart3, label: 'Insights', path: '/insights', shortcut: 'S N' },
    { icon: MessageCircle, label: 'Messaging', path: '/messaging', shortcut: 'S E' }
  ];

  const bottomItems = [
    { icon: Network, label: 'Proxy', path: '/proxy', shortcut: 'S P' },
    { icon: HardDrive, label: 'Storage', path: '/storage', shortcut: 'S D' },
    { icon: CreditCard, label: billingLabel, path: '/billing', shortcut: 'S B' },
    { icon: Settings, label: 'Settings', path: '/settings', shortcut: 'S G' }
  ];

  // Helper component for menu items with tooltip support
  const MenuItem = ({ item, isActive, onClick }) => {
    const content = (
      <NavLink
        to={item.path}
        onClick={onClick}
        className={`flex items-center space-x-2.5 ${isCollapsed ? 'px-0 py-1.5 justify-center' : 'px-2.5 py-1.5'} rounded-md text-xs font-bold transition-colors ${isActive
          ? 'bg-accent text-accent-foreground'
          : 'text-accent-foreground hover:bg-muted hover:text-foreground'
          }`}
      >
        <item.icon className="w-4 h-4 flex-shrink-0" />
        {!isCollapsed && <span>{item.label}</span>}
      </NavLink>
    );

    // Show tooltip in both collapsed and expanded states
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {content}
        </TooltipTrigger>
        <TooltipContent
          side="right"
          className="flex items-center gap-2"
        >
          <span className="font-bold">{item.label}</span>
          {item.shortcut && (
            <div className="flex items-center gap-1 ml-2 pl-2 border-l border-border">
              {item.shortcut.split(' ').map((key, idx) => (
                <h2
                  key={idx}
                  className="px-1.5 py-0.5 rounded text-xs font-bold bg-muted text-muted-foreground"
                >
                  {key}
                </h2>
              ))}
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    <TooltipProvider delayDuration={500} skipDelayDuration={0}>
      <div className="relative h-screen">
        <div
          className="flex flex-col h-full transition-all duration-300 ease-in-out bg-background text-foreground border-r border-border"
          style={{ width: isCollapsed ? '60px' : '220px' }}
        >
          {/* Header with Logo, User Info, and Bell Icon */}
          <div
            className="px-4 py-2.5 border-b border-border"
          >
            {!isCollapsed ? (
              <>
                {/* Top row: Logo, User Dropdown */}
                <div className="flex items-center justify-between mb-2.5">
                  <UserDropdown />
                </div>

                {/* Search Bar with Bell Icon */}
                <div className="flex items-center space-x-2">
                  <div
                    className="relative flex-1 cursor-pointer"
                    onClick={() => openModal('global-search')}
                  >
                    <Search
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
                    />
                    <div
                      className="w-full pl-8 pr-16 py-1.5 rounded-md text-xs font-medium border border-border bg-muted/50 text-muted-foreground transition-colors"
                    >
                      Search...
                    </div>
                    <div className="absolute right-2 bottom-1">
                      <h2
                        className="px-1.5 py-0.5 rounded text-xs font-mono bg-muted text-muted-foreground"
                      >
                        {shortcutKey}
                      </h2>
                    </div>
                  </div>
                  <button
                    ref={notificationButtonRef}
                    onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                    className="p-1.5 rounded-lg transition-colors flex-shrink-0 relative hover:bg-muted text-muted-foreground"
                    data-testid="notification-bell-button"
                  >
                    <Bell className="w-4 h-4" />
                    {unreadCount > 0 && (
                      <span
                        className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center bg-blue-600 text-white"
                      >
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>
                </div>
              </>
            ) : (
              /* Collapsed header - show only logo */
              <div className="flex flex-col items-center">
                <UserDropdown isCollapsed={true} />
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-2.5 py-2 scrollbar-hide">
            {!isCollapsed ? (
              <>
                {/* Scrapi Store Section - Clickable with divider */}
                <div className="mb-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => {
                          setActiveSection('scrapiStore');
                          navigate('/store');
                        }}
                        className={`w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-md text-xs font-bold transition-colors ${isStorePage
                          ? 'bg-accent text-accent-foreground'
                          : 'text-accent-foreground hover:bg-muted hover:text-foreground'
                          }`}
                      >
                        <Store className="w-3.5 h-3.5" />
                        <span>Scrapi Store</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent
                      side="right"
                      className="flex items-center gap-2"
                    >
                      <span className="font-bold">Scrapi Store</span>
                      <div className="flex items-center gap-1 ml-2 pl-2 border-l border-border">
                        <h2 className="px-1.5 py-0.5 rounded text-xs font-bold bg-muted text-muted-foreground">S</h2>
                        <h2 className="px-1.5 py-0.5 rounded text-xs font-bold bg-muted text-muted-foreground">O</h2>
                      </div>
                    </TooltipContent>
                  </Tooltip>

                  {/* Horizontal Divider after Scrapi Store */}
                  <div className="my-2 mx-2.5 border-t border-border" />

                  {/* Store items - always visible */}
                  <div className="mt-0.5 space-y-0.5">
                    {scrapiStoreItems.map((item) => (
                      <MenuItem
                        key={item.path}
                        item={item}
                        isActive={location.pathname === item.path}
                        onClick={() => setActiveSection('scrapiStore')}
                      />
                    ))}
                  </div>
                </div>

                {/* Development Section */}
                <div className="mb-1">
                  <button
                    onClick={() => toggleSection('development')}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-bold transition-colors text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <span>Development</span>
                    {expandedSections.development ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>

                  {expandedSections.development && (
                    <div className="mt-0.5 space-y-0.5">
                      {developmentItems.map((item) => (
                        <MenuItem
                          key={item.path}
                          item={item}
                          isActive={location.pathname === item.path}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Bottom Items */}
                <div className="space-y-0.5 mt-3">
                  {bottomItems.map((item) => (
                    <MenuItem
                      key={item.path}
                      item={item}
                      isActive={location.pathname === item.path}
                    />
                  ))}
                </div>
              </>
            ) : (
              /* Collapsed navigation - show only icons with tooltips */
              <div className="space-y-0.5">
                {/* Store button */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => {
                        setActiveSection('scrapiStore');
                        navigate('/store');
                      }}
                      className={`w-full flex items-center justify-center p-1.5 rounded-md transition-colors ${isStorePage
                        ? 'bg-accent text-accent-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`}
                    >
                      <Store className="w-4 h-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent
                    side="right"
                    className="flex items-center gap-2"
                  >
                    <span className="font-bold">Scrapi Store</span>
                    <div className="flex items-center gap-1 ml-2 pl-2 border-l border-border">
                      <h2 className="px-1.5 py-0.5 rounded text-xs font-bold bg-muted text-muted-foreground">S</h2>
                      <h2 className="px-1.5 py-0.5 rounded text-xs font-bold bg-muted text-muted-foreground">O</h2>
                    </div>
                  </TooltipContent>
                </Tooltip>

                {/* Divider */}
                <div className="my-1.5 mx-2 border-t border-border" />

                {/* Store items */}
                {scrapiStoreItems.map((item) => (
                  <MenuItem
                    key={item.path}
                    item={item}
                    isActive={location.pathname === item.path}
                    onClick={() => setActiveSection('scrapiStore')}
                  />
                ))}

                {/* Divider before development */}
                <div className="my-1.5 mx-2 border-t border-border" />

                {/* Development items */}
                {developmentItems.map((item) => (
                  <MenuItem
                    key={item.path}
                    item={item}
                    isActive={location.pathname === item.path}
                  />
                ))}

                {/* Divider before bottom items */}
                <div className="my-1.5 mx-2 border-t border-border" />

                {/* Bottom items */}
                {bottomItems.map((item) => (
                  <MenuItem
                    key={item.path}
                    item={item}
                    isActive={location.pathname === item.path}
                  />
                ))}
              </div>
            )}
          </nav>

          {/* Bottom Section - RAM Usage & Upgrade */}
          <div
            className="px-3.5 py-2.5 border-t border-border"
          >
            {!isCollapsed ? (
              <>
                {/* RAM Usage */}
                <div className="mb-2.5">
                  <div className="flex justify-between text-xs mb-1">
                    <span
                      className="text-muted-foreground font-semibold"
                    >
                      RAM Usage
                    </span>
                    <span
                      className="font-semibold text-foreground"
                    >
                      {billingData ? (
                        `${billingData.ramUsage?.used_mb >= 1024
                          ? (billingData.ramUsage.used_mb / 1024).toFixed(1) + ' GB'
                          : billingData.ramUsage?.used_mb + ' MB'} / ${billingData.ramUsage?.limit_mb >= 1024
                            ? (billingData.ramUsage.limit_mb / 1024).toFixed(1) + ' GB'
                            : billingData.ramUsage?.limit_mb + ' MB'
                        }`
                      ) : '0 MB / 8 GB'}
                    </span>
                  </div>
                  <Progress
                    value={billingData ? Math.min(100, (billingData.ramUsage?.used_mb / billingData.ramUsage?.limit_mb) * 100) : 0}
                    // value={50}
                    className="h-1 bg-muted"
                  />
                </div>

                {/* Credit Usage */}
                <CustomTooltip
                  className="block w-full"
                  content={
                    <div className="flex flex-col gap-1 text-[11px] text-left">
                      <div className="font-bold text-foreground">Precise usage:</div>
                      <div className="text-foreground ">
                        {billingData ? `$${billingData.planConsumption?.freeUsed.toFixed(5)} / $${billingData.planConsumption?.freeTotal.toFixed(5)}` : '$0.00000 / $5.00000'}
                      </div>
                    </div>
                  }
                >
                  <div className="mb-3.5 cursor-help">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground font-semibold">Credit Usage</span>
                      <span className="font-semibold text-foreground">
                        {billingData ? `$${billingData.planConsumption?.freeUsed.toFixed(2)} / $${billingData.planConsumption?.freeTotal.toFixed(2)}` : '$0.00 / $5.00'}
                      </span>
                    </div>
                    <Progress
                      value={billingData ? Math.min(100, (billingData.planConsumption?.freeUsed / billingData.planConsumption?.freeTotal) * 100) : 0}
                      className="h-1 bg-blue-500/20"
                      indicatorColor="bg-blue-500"
                    />
                  </div>
                </CustomTooltip>

                {/* Upgrade Button */}
                {(() => {
                  const currentPlan = billingData?.plan?.toLowerCase() || 'free';
                  if (currentPlan === 'enterprise') return null;

                  const upgrades = {
                    'free': 'Starter',
                    'starter': 'Growth',
                    'growth': 'Scale',
                    'scale': 'Enterprise'
                  };

                  const targetPlan = upgrades[currentPlan] || 'Starter';

                  return (
                    <button
                      onClick={() => {
                        if (currentWorkspace) {
                          selectWorkspace(currentWorkspace);
                        }
                        navigate('/upgrade-checkout');
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors bg-card text-card-foreground hover:bg-muted border border-border"
                    >
                      <span>Upgrade to {targetPlan}</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  );
                })()}

                {/* Scrapi Logo */}
                <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-border">
                  <div className="flex items-center space-x-2">
                    <img
                      src="/logo.png"
                      alt="Scrapi"
                      className="w-5 h-5 dark:brightness-0 dark:invert"
                    />
                    <span
                      className="text-sm font-semibold text-foreground"
                    >
                      Scrapi
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    {/* Round Question Mark Icon */}
                    <button
                      className="w-6 h-6 rounded-full flex items-center justify-center transition-colors hover:bg-muted text-muted-foreground border border-border"
                      title="Help"
                    >
                      <HelpCircle className="w-4 h-4" />
                    </button>
                    {/* Collapse Button */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => setIsCollapsed(true)}
                          className="p-1.5 rounded transition-colors hover:bg-muted text-muted-foreground"
                        >
                          <PanelLeftClose className="w-4 h-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent
                        side="right"
                        className="flex items-center gap-2"
                      >
                        <span className="font-bold">Collapse Sidebar</span>
                        <div className="flex items-center gap-1 ml-2 pl-2 border-l border-border">
                          <h2 className="px-1.5 py-0.5 rounded text-xs font-bold bg-muted text-muted-foreground">{isMac ? '⌘' : 'Ctrl'}</h2>
                          <h2 className="px-1.5 py-0.5 rounded text-xs font-bold bg-muted text-muted-foreground">B</h2>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </>
            ) : (
              /* Collapsed bottom section */
              <div className="flex flex-col items-center space-y-1.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      className="w-6 h-6 rounded-full flex items-center justify-center transition-colors hover:bg-muted text-muted-foreground border border-border"
                    >
                      <HelpCircle className="w-4 h-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    Help
                  </TooltipContent>
                </Tooltip>

                <Tooltip delayDuration={500}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setIsCollapsed(false)}
                      className="p-1.5 rounded transition-colors hover:bg-muted text-muted-foreground"
                    >
                      <PanelLeft className="w-4 h-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent
                    side="right"
                    className="flex items-center gap-2"
                  >
                    <span className="font-bold">Expand Sidebar</span>
                    <div className="flex items-center gap-1 ml-2 pl-2 border-l border-border">
                      <h2 className="px-1.5 py-0.5 rounded text-xs font-bold bg-muted text-muted-foreground">{isMac ? '⌘' : 'Ctrl'}</h2>
                      <h2 className="px-1.5 py-0.5 rounded text-xs font-bold bg-muted text-muted-foreground">B</h2>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </div>
            )}
          </div>
        </div>

        {/* Global Search Modal */}
        <GlobalSearch />

        {/* Notification Dropdown */}
        <NotificationDropdown
          isOpen={isNotificationOpen}
          onClose={() => setIsNotificationOpen(false)}
          triggerRef={notificationButtonRef}
        />

        {/* Shortcuts Modal */}
        <ShortcutsModal />
      </div>
    </TooltipProvider>
  );
};

export default Sidebar;
