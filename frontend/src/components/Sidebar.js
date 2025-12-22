import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Progress } from './ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
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
  ChevronLeft,
  PanelLeftClose,
  PanelLeft,
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
  Mail
} from 'lucide-react';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    development: true
  });
  const [searchFocused, setSearchFocused] = useState(false);
  const [activeSection, setActiveSection] = useState('scrapiStore');
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Check if we're on the store page
  const isStorePage = location.pathname === '/store';

  // Detect platform for keyboard shortcut display
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const shortcutKey = isMac ? '⌘K' : 'Ct+K';

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    let gKeyPressed = false;
    let gKeyTimeout = null;

    const handleKeyDown = (e) => {
      // Toggle sidebar with Ctrl+B or Cmd+B
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        setIsCollapsed(prev => !prev);
        return;
      }

      // Check for Cmd+K (Mac) or Ctrl+K (Windows/Linux) for search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchModalOpen(true);
        return;
      }
      
      // Handle G+Key shortcuts for navigation
      if (e.key === 'g' || e.key === 'G') {
        if (!gKeyPressed) {
          gKeyPressed = true;
          // Clear any existing timeout
          if (gKeyTimeout) clearTimeout(gKeyTimeout);
          // Reset after 1 second
          gKeyTimeout = setTimeout(() => {
            gKeyPressed = false;
          }, 1000);
        }
        return;
      }

      // If G was just pressed, handle the second key
      if (gKeyPressed) {
        const key = e.key.toUpperCase();
        const shortcuts = {
          'H': '/home',
          'A': '/actors',
          'R': '/runs',
          'T': '/tasks',
          'I': '/integrations',
          'C': '/schedules',
          'M': '/my-actors',
          'N': '/insights',
          'E': '/messaging',
          'B': '/billing',
          'S': '/settings',
          'O': '/store',
          'P': '/proxy',
          'D': '/storage'
        };
        
        if (shortcuts[key]) {
          e.preventDefault();
          navigate(shortcuts[key]);
          gKeyPressed = false;
          if (gKeyTimeout) clearTimeout(gKeyTimeout);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (gKeyTimeout) clearTimeout(gKeyTimeout);
    };
  }, [navigate]);

  // Menu structure
  const scrapiStoreItems = [
    { icon: Home, label: 'Home', path: '/home', shortcut: 'G H' },
    { icon: Code2, label: 'Actors', path: '/actors', shortcut: 'G A' },
    { icon: PlayCircle, label: 'Runs', path: '/runs', shortcut: 'G R' },
    { icon: BookmarkCheck, label: 'Saved tasks', path: '/tasks', shortcut: 'G T' },
    { icon: Puzzle, label: 'Integrations', path: '/integrations', shortcut: 'G I' },
    { icon: CalendarClock, label: 'Schedules', path: '/schedules', shortcut: 'G C' }
  ];

  const developmentItems = [
    { icon: Code2, label: 'My Actors', path: '/my-actors', shortcut: 'G M' },
    { icon: BarChart3, label: 'Insights', path: '/insights', shortcut: 'G N' },
    { icon: MessageCircle, label: 'Messaging', path: '/messaging', shortcut: 'G E' }
  ];

  const bottomItems = [
    { icon: Network, label: 'Proxy', path: '/proxy', shortcut: 'G P' },
    { icon: HardDrive, label: 'Storage', path: '/storage', shortcut: 'G D' },
    { icon: CreditCard, label: 'Billing', path: '/billing', shortcut: 'G B' },
    { icon: Settings, label: 'Settings', path: '/settings', shortcut: 'G S' }
  ];

  // Helper component for menu items with tooltip support
  const MenuItem = ({ item, isActive, onClick }) => {
    const content = (
      <NavLink
        to={item.path}
        onClick={onClick}
        className={`flex items-center ${isCollapsed ? 'justify-center px-0 py-2' : 'justify-between px-2.5 py-1.5'} rounded-md text-xs font-medium transition-colors ${
          isActive
            ? theme === 'dark'
              ? 'bg-[#2C2D30] text-white'
              : 'bg-gray-100 text-gray-900'
            : theme === 'dark'
            ? 'text-gray-300 hover:bg-gray-800'
            : 'text-gray-700 hover:bg-gray-50'
        }`}
      >
        <div className="flex items-center space-x-2.5">
          <item.icon className="w-4 h-4 flex-shrink-0" />
          {!isCollapsed && <span>{item.label}</span>}
        </div>
        {!isCollapsed && item.shortcut && (
          <div className="flex items-center space-x-0.5">
            {item.shortcut.split(' ').map((key, idx) => (
              <kbd
                key={idx}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono leading-none ${
                  theme === 'dark'
                    ? 'bg-gray-700 text-gray-400 border border-gray-600'
                    : 'bg-gray-100 text-gray-500 border border-gray-300'
                }`}
              >
                {key}
              </kbd>
            ))}
          </div>
        )}
      </NavLink>
    );

    if (isCollapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            {content}
          </TooltipTrigger>
          <TooltipContent side="right" className={`flex items-center justify-between gap-3 ${
            theme === 'dark' ? 'bg-gray-800 text-white border-gray-700' : 'bg-gray-900 text-white'
          }`}>
            <span>{item.label}</span>
            {item.shortcut && (
              <div className="flex items-center space-x-0.5">
                {item.shortcut.split(' ').map((key, idx) => (
                  <kbd
                    key={idx}
                    className="px-1.5 py-0.5 rounded text-[10px] font-mono leading-none bg-gray-700 text-gray-300 border border-gray-600"
                  >
                    {key}
                  </kbd>
                ))}
              </div>
            )}
          </TooltipContent>
        </Tooltip>
      );
    }

    return content;
  };

  return (
    <TooltipProvider>
      <div className="relative h-screen">
      <div
        className={`flex flex-col h-full transition-all duration-300 ease-in-out ${
          theme === 'dark'
            ? 'bg-[#1A1B1E] text-gray-100 border-r border-gray-800'
            : 'bg-white text-gray-800 border-r border-gray-200'
        }`}
        style={{ width: isCollapsed ? '60px' : '220px' }}
      >
        {/* Header with Logo, User Info, and Bell Icon */}
        <div
          className={`px-4 py-2.5 border-b ${
            theme === 'dark' ? 'border-gray-800' : 'border-gray-200'
          }`}
        >
          {!isCollapsed ? (
            <>
              {/* Top row: Logo, User Info, Theme Toggle */}
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center space-x-2 flex-1 min-w-0">
                  <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <img src="/logo.png" alt="Scrapi Logo" className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`font-semibold text-sm leading-tight ${
                      theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
                    }`}>{user?.organization_name || 'Gokul'}</div>
                    <div className={`text-xs ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                    }`}>Personal</div>
                  </div>
                </div>
                <div className="flex items-center">
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={toggleTheme}
                        className={`p-1.5 rounded-lg transition-colors ${
                          theme === 'dark'
                            ? 'hover:bg-gray-800 text-gray-400'
                            : 'hover:bg-gray-100 text-gray-600'
                        }`}
                      >
                        {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className={`${
                      theme === 'dark' ? 'bg-gray-800 text-white border-gray-700' : 'bg-gray-900 text-white'
                    }`}>
                      <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>

              {/* Search Bar with Bell Icon */}
              <div className="flex items-center space-x-2">
                <div 
                  className={`relative flex-1 cursor-pointer`}
                  onClick={() => setIsSearchModalOpen(true)}
                >
                  <Search
                    className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 ${
                      theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                    }`}
                  />
                  <div
                    className={`w-full pl-8 pr-16 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                      theme === 'dark'
                        ? 'bg-[#25262B] border-gray-700 text-gray-400'
                        : 'bg-white border-gray-300 text-gray-500'
                    }`}
                  >
                    Search...
                  </div>
                  <div className="absolute right-2 bottom-1">
                    <kbd
                      className={`px-1.5 py-0.5 rounded text-xs font-mono ${
                        theme === 'dark'
                          ? 'bg-gray-700 text-gray-300'
                          : 'bg-gray-100 text-gray-600 border border-gray-300'
                      }`}
                    >
                      {shortcutKey}
                    </kbd>
                  </div>
                </div>
                <button
                  className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${
                    theme === 'dark'
                      ? 'hover:bg-gray-800 text-gray-400'
                      : 'hover:bg-gray-100 text-gray-600'
                  }`}
                >
                  <Bell className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            /* Collapsed header - show only logo */
            <div className="flex flex-col items-center">
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center cursor-pointer">
                    <img src="/logo.png" alt="Scrapi Logo" className="w-6 h-6" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" className={`${
                  theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-gray-900 text-white'
                }`}>
                  {user?.organization_name || 'Gokul'}
                </TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-2 scrollbar-hide">
          {!isCollapsed ? (
            <>
              {/* Scrapi Store Section - Clickable with divider */}
              <div className="mb-1">
                <button
                  onClick={() => {
                    setActiveSection('scrapiStore');
                    navigate('/store');
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                    isStorePage
                      ? theme === 'dark'
                        ? 'bg-[#2C2D30] text-white'
                        : 'bg-gray-100 text-gray-900'
                      : theme === 'dark'
                      ? 'text-gray-400 hover:bg-gray-800'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Store className="w-3.5 h-3.5" />
                    <span>Scrapi Store</span>
                  </div>
                  <div className="flex items-center space-x-0.5">
                    {['G', 'O'].map((key, idx) => (
                      <kbd
                        key={idx}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono leading-none ${
                          theme === 'dark'
                            ? 'bg-gray-700 text-gray-400 border border-gray-600'
                            : 'bg-gray-100 text-gray-500 border border-gray-300'
                        }`}
                      >
                        {key}
                      </kbd>
                    ))}
                  </div>
                </button>

                {/* Horizontal Divider after Scrapi Store */}
                <div className={`my-2 mx-2.5 border-t ${
                  theme === 'dark' ? 'border-gray-800' : 'border-gray-200'
                }`} />

                {/* Store items - always visible */}
                <div className="mt-0.5 space-y-0.5">
                  {scrapiStoreItems.map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => setActiveSection('scrapiStore')}
                      className={({ isActive }) =>
                        `flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                          isActive
                            ? theme === 'dark'
                              ? 'bg-[#2C2D30] text-white'
                              : 'bg-gray-100 text-gray-900'
                            : theme === 'dark'
                            ? 'text-gray-300 hover:bg-gray-800'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`
                      }
                    >
                      <div className="flex items-center space-x-2.5">
                        <item.icon className="w-4 h-4 flex-shrink-0" />
                        <span>{item.label}</span>
                      </div>
                      {item.shortcut && (
                        <div className="flex items-center space-x-0.5">
                          {item.shortcut.split(' ').map((key, idx) => (
                            <kbd
                              key={idx}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-mono leading-none ${
                                theme === 'dark'
                                  ? 'bg-gray-700 text-gray-400 border border-gray-600'
                                  : 'bg-gray-100 text-gray-500 border border-gray-300'
                              }`}
                            >
                              {key}
                            </kbd>
                          ))}
                        </div>
                      )}
                    </NavLink>
                  ))}
                </div>
              </div>

              {/* Development Section */}
              <div className="mb-1">
                <button
                  onClick={() => toggleSection('development')}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                    theme === 'dark'
                      ? 'text-gray-400 hover:bg-gray-800'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
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
                      <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                          `flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                            isActive
                              ? theme === 'dark'
                                ? 'bg-[#2C2D30] text-white'
                                : 'bg-gray-100 text-gray-900'
                              : theme === 'dark'
                              ? 'text-gray-300 hover:bg-gray-800'
                              : 'text-gray-700 hover:bg-gray-50'
                          }`
                        }
                      >
                        <div className="flex items-center space-x-2.5">
                          <item.icon className="w-4 h-4 flex-shrink-0" />
                          <span>{item.label}</span>
                        </div>
                        {item.shortcut && (
                          <div className="flex items-center space-x-0.5">
                            {item.shortcut.split(' ').map((key, idx) => (
                              <kbd
                                key={idx}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-mono leading-none ${
                                  theme === 'dark'
                                    ? 'bg-gray-700 text-gray-400 border border-gray-600'
                                    : 'bg-gray-100 text-gray-500 border border-gray-300'
                                }`}
                              >
                                {key}
                              </kbd>
                            ))}
                          </div>
                        )}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>

              {/* Bottom Items */}
              <div className="space-y-0.5 mt-3">
                {bottomItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        isActive
                          ? theme === 'dark'
                            ? 'bg-[#2C2D30] text-white'
                            : 'bg-gray-100 text-gray-900'
                          : theme === 'dark'
                          ? 'text-gray-300 hover:bg-gray-800'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`
                    }
                  >
                    <div className="flex items-center space-x-2.5">
                      <item.icon className="w-4 h-4 flex-shrink-0" />
                      <span>{item.label}</span>
                    </div>
                    {item.shortcut && (
                      <div className="flex items-center space-x-0.5">
                        {item.shortcut.split(' ').map((key, idx) => (
                          <kbd
                            key={idx}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono leading-none ${
                              theme === 'dark'
                                ? 'bg-gray-700 text-gray-400 border border-gray-600'
                                : 'bg-gray-100 text-gray-500 border border-gray-300'
                            }`}
                          >
                            {key}
                          </kbd>
                        ))}
                      </div>
                    )}
                  </NavLink>
                ))}
              </div>
            </>
          ) : (
            /* Collapsed navigation - show only icons with tooltips */
            <div className="space-y-0.5">
              {/* Store button */}
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => {
                      setActiveSection('scrapiStore');
                      navigate('/store');
                    }}
                    className={`w-full flex items-center justify-center p-1.5 rounded-md transition-colors ${
                      isStorePage
                        ? theme === 'dark'
                          ? 'bg-[#2C2D30] text-white'
                          : 'bg-gray-100 text-gray-900'
                        : theme === 'dark'
                        ? 'text-gray-400 hover:bg-gray-800'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Store className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className={`flex items-center justify-between gap-3 ${
                  theme === 'dark' ? 'bg-gray-800 text-white border-gray-700' : 'bg-gray-900 text-white'
                }`}>
                  <span>Scrapi Store</span>
                  <div className="flex items-center space-x-0.5">
                    {['G', 'O'].map((key, idx) => (
                      <kbd
                        key={idx}
                        className="px-1.5 py-0.5 rounded text-[10px] font-mono leading-none bg-gray-700 text-gray-300 border border-gray-600"
                      >
                        {key}
                      </kbd>
                    ))}
                  </div>
                </TooltipContent>
              </Tooltip>

              {/* Divider */}
              <div className={`my-1.5 mx-2 border-t ${
                theme === 'dark' ? 'border-gray-800' : 'border-gray-200'
              }`} />

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
              <div className={`my-1.5 mx-2 border-t ${
                theme === 'dark' ? 'border-gray-800' : 'border-gray-200'
              }`} />

              {/* Development items */}
              {developmentItems.map((item) => (
                <MenuItem
                  key={item.path}
                  item={item}
                  isActive={location.pathname === item.path}
                />
              ))}

              {/* Divider before bottom items */}
              <div className={`my-1.5 mx-2 border-t ${
                theme === 'dark' ? 'border-gray-800' : 'border-gray-200'
              }`} />

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
          className={`px-3.5 py-2.5 border-t ${
            theme === 'dark' ? 'border-gray-800' : 'border-gray-200'
          }`}
        >
          {!isCollapsed ? (
            <>
              {/* RAM Usage */}
              <div className="mb-2.5">
                <div className="flex justify-between text-xs mb-1">
                  <span
                    className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}
                  >
                    RAM Usage
                  </span>
                  <span
                    className={`font-medium ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}
                  >
                    0 MB / 8 GB
                  </span>
                </div>
                <Progress
                  value={0}
                  className={`h-1.5 ${
                    theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'
                  }`}
                />
                <div
                  className={`text-xs mt-1 ${
                    theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                  }`}
                >
                  $0.00 / $5.00
                </div>
              </div>

              {/* Upgrade Button */}
              <button
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  theme === 'dark'
                    ? 'bg-[#2C2D30] text-gray-200 hover:bg-gray-700 border border-gray-700'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                }`}
              >
                <span>Upgrade to Starter</span>
                <ChevronRight className="w-4 h-4" />
              </button>

              {/* Scrapi Logo */}
              <div className={`flex items-center justify-between mt-2.5 pt-2.5 border-t ${
                theme === 'dark' ? 'border-gray-800' : 'border-gray-200'
              }`}>
                <div className="flex items-center space-x-2">
                  <img src="/logo.png" alt="Scrapi" className="w-5 h-5" />
                  <span
                    className={`text-sm font-semibold ${
                      theme === 'dark' ? 'text-gray-200' : 'text-gray-800'
                    }`}
                  >
                    scrapi
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  {/* Round Question Mark Icon */}
                  <button
                    className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                      theme === 'dark'
                        ? 'hover:bg-gray-800 text-gray-400 border border-gray-700'
                        : 'hover:bg-gray-100 text-gray-500 border border-gray-300'
                    }`}
                    title="Help"
                  >
                    <HelpCircle className="w-4 h-4" />
                  </button>
                  {/* Collapse Button */}
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setIsCollapsed(true)}
                        className={`p-1.5 rounded transition-colors ${
                          theme === 'dark'
                            ? 'hover:bg-gray-800 text-gray-400'
                            : 'hover:bg-gray-100 text-gray-500'
                        }`}
                      >
                        <PanelLeftClose className="w-4 h-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className={`flex items-center justify-between gap-3 ${
                      theme === 'dark' ? 'bg-gray-800 text-white border-gray-700' : 'bg-gray-900 text-white'
                    }`}>
                      <span>Collapse Sidebar</span>
                      <div className="flex items-center space-x-0.5">
                        <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono leading-none bg-gray-700 text-gray-300 border border-gray-600">
                          {isMac ? '⌘' : 'Ctrl'}
                        </kbd>
                        <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono leading-none bg-gray-700 text-gray-300 border border-gray-600">
                          B
                        </kbd>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </>
          ) : (
            /* Collapsed bottom section */
            <div className="flex flex-col items-center space-y-1.5">
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <button
                    className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                      theme === 'dark'
                        ? 'hover:bg-gray-800 text-gray-400 border border-gray-700'
                        : 'hover:bg-gray-100 text-gray-500 border border-gray-300'
                    }`}
                  >
                    <HelpCircle className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className={`${
                  theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-gray-900 text-white'
                }`}>
                  Help
                </TooltipContent>
              </Tooltip>

              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setIsCollapsed(false)}
                    className={`p-1.5 rounded transition-colors ${
                      theme === 'dark'
                        ? 'hover:bg-gray-800 text-gray-400'
                        : 'hover:bg-gray-100 text-gray-500'
                    }`}
                  >
                    <PanelLeft className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className={`flex items-center justify-between gap-3 ${
                  theme === 'dark' ? 'bg-gray-800 text-white border-gray-700' : 'bg-gray-900 text-white'
                }`}>
                  <span>Expand Sidebar</span>
                  <div className="flex items-center space-x-0.5">
                    <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono leading-none bg-gray-700 text-gray-300 border border-gray-600">
                      {isMac ? '⌘' : 'Ctrl'}
                    </kbd>
                    <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono leading-none bg-gray-700 text-gray-300 border border-gray-600">
                      B
                    </kbd>
                  </div>
                </TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>
      </div>

      {/* Search Modal */}
      {isSearchModalOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-20 z-50"
          onClick={() => setIsSearchModalOpen(false)}
        >
          <div 
            className={`w-full max-w-2xl rounded-lg shadow-2xl overflow-hidden ${
              theme === 'dark' ? 'bg-[#1A1B1E]' : 'bg-white'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search Input */}
            <div className={`flex items-center px-4 py-3 border-b ${
              theme === 'dark' ? 'border-gray-800' : 'border-gray-200'
            }`}>
              <Search className={`w-5 h-5 mr-3 ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
              }`} />
              <input
                type="text"
                placeholder="Search by ID or navigate"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                className={`flex-1 bg-transparent outline-none text-sm ${
                  theme === 'dark' ? 'text-gray-200 placeholder-gray-500' : 'text-gray-800 placeholder-gray-400'
                }`}
              />
              <button
                onClick={() => setIsSearchModalOpen(false)}
                className={`ml-3 p-1 rounded hover:bg-gray-800 transition-colors ${
                  theme === 'dark' ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <span className="text-lg font-semibold">×</span>
              </button>
            </div>

            {/* Search Results */}
            <div className={`max-h-96 overflow-y-auto ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
              {/* Navigation Section */}
              <div className="px-4 py-2">
                <h3 className={`text-xs font-semibold uppercase tracking-wider mb-2 ${
                  theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                }`}>
                  Navigation
                </h3>
                <div className="space-y-1">
                  {[
                    { icon: Settings, label: 'Settings', path: '/settings', shortcut: 'G S' },
                    { icon: Code2, label: 'Actors', path: '/actors', shortcut: 'G A' },
                    { icon: CreditCard, label: 'Billing', path: '/billing', shortcut: 'G B' },
                    { icon: Home, label: 'Home', path: '/home', shortcut: 'G H' },
                    { icon: PlayCircle, label: 'Runs', path: '/runs', shortcut: 'G R' },
                    { icon: BookmarkCheck, label: 'Saved tasks', path: '/tasks', shortcut: 'G T' },
                  ].map((item) => (
                    <button
                      key={item.path}
                      onClick={() => {
                        navigate(item.path);
                        setIsSearchModalOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${
                        theme === 'dark'
                          ? 'hover:bg-[#2C2D30] text-gray-300'
                          : 'hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <item.icon className="w-4 h-4" />
                        <span>Go to {item.label}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        {item.shortcut.split(' ').map((key, idx) => (
                          <kbd
                            key={idx}
                            className={`px-2 py-0.5 rounded text-xs font-mono ${
                              theme === 'dark'
                                ? 'bg-gray-700 text-gray-300 border border-gray-600'
                                : 'bg-gray-100 text-gray-600 border border-gray-300'
                            }`}
                          >
                            {key}
                          </kbd>
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Help Section */}
              <div className="px-4 py-2 border-t border-gray-800">
                <h3 className={`text-xs font-semibold uppercase tracking-wider mb-2 ${
                  theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                }`}>
                  Help
                </h3>
                <div className="space-y-1">
                  {[
                    { icon: FileText, label: 'Open docs', external: true },
                    { icon: Mail, label: 'Contact support' },
                    { icon: HelpCircle, label: 'Open Help center', external: true },
                  ].map((item, idx) => (
                    <button
                      key={idx}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${
                        theme === 'dark'
                          ? 'hover:bg-[#2C2D30] text-gray-300'
                          : 'hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <item.icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </div>
                      {item.external && (
                        <ExternalLink className="w-3.5 h-3.5 text-gray-500" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Actions Section */}
              <div className="px-4 py-2 border-t border-gray-800">
                <h3 className={`text-xs font-semibold uppercase tracking-wider mb-2 ${
                  theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                }`}>
                  Quick actions
                </h3>
                <div className="space-y-1">
                  {[
                    { icon: Plus, label: 'Create Actor' },
                    { icon: Palette, label: 'Switch theme', action: toggleTheme },
                    { icon: LogOut, label: 'Log out', action: logout },
                    { icon: ChevronRight, label: 'Upgrade' },
                  ].map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        if (item.action) {
                          item.action();
                          setIsSearchModalOpen(false);
                        }
                      }}
                      className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-sm transition-colors ${
                        theme === 'dark'
                          ? 'hover:bg-[#2C2D30] text-gray-300'
                          : 'hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      <item.icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </TooltipProvider>
  );
};

export default Sidebar;
