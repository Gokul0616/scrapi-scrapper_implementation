import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Progress } from './ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import ShortcutsModal from './ShortcutsModal';
import UserDropdown from './UserDropdown';
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
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);

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

  // Handle keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Check for Cmd+K (Mac) or Ctrl+K (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchModalOpen(true);
      }

      // Check for Cmd+B (Mac) or Ctrl+B (Windows/Linux) to toggle sidebar
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        setIsCollapsed(prev => !prev);
      }

      // Check for Cmd+L (Mac) or Ctrl+L (Windows/Linux) to toggle theme
      if ((e.metaKey || e.ctrlKey) && e.key === 'l') {
        e.preventDefault();
        toggleTheme();
      }

      // Check for Shift+? to show shortcuts modal
      if (e.shiftKey && e.key === '?') {
        e.preventDefault();
        setIsShortcutsModalOpen(true);
      }

      // Handle S+Key shortcuts (changed from G+Key)
      if (e.key === 's' || e.key === 'S') {
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
  }, [navigate, toggleTheme]);

  // Menu structure
  const scrapiStoreItems = [
    { icon: Home, label: 'Home', path: '/home', shortcut: 'S H' },
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
    { icon: CreditCard, label: 'Billing', path: '/billing', shortcut: 'S B' },
    { icon: Settings, label: 'Settings', path: '/settings', shortcut: 'S G' }
  ];

  // Helper component for menu items with tooltip support
  const MenuItem = ({ item, isActive, onClick }) => {
    const content = (
      <NavLink
        to={item.path}
        onClick={onClick}
        className={`flex items-center space-x-2.5 ${isCollapsed ? 'px-0 py-1.5 justify-center' : 'px-2.5 py-1.5'} rounded-md text-xs font-medium transition-colors ${isActive
          ? theme === 'dark'
            ? 'bg-[#2C2D30] text-white'
            : 'bg-gray-100 text-gray-900'
          : theme === 'dark'
            ? 'text-gray-300 hover:bg-gray-800'
            : 'text-gray-700 hover:bg-gray-50'
          }`}
      >
        <item.icon className="w-4 h-4 flex-shrink-0" />
        {!isCollapsed && <span>{item.label}</span>}
      </NavLink>
    );

    // Show tooltip in both collapsed and expanded states
    return (
      <Tooltip delayDuration={500}>
        <TooltipTrigger asChild>
          {content}
        </TooltipTrigger>
        <TooltipContent 
          side="right" 
          className={`flex items-center gap-2 ${
            theme === 'dark' 
              ? 'bg-gray-800 text-white border-gray-700' 
              : 'bg-gray-900 text-white border-gray-800'
          } border shadow-lg`}
        >
          <span className="font-medium">{item.label}</span>
          {item.shortcut && (
            <div className="flex items-center gap-1 ml-2 pl-2 border-l border-gray-600">
              {item.shortcut.split(' ').map((key, idx) => (
                <kbd
                  key={idx}
                  className={`px-1.5 py-0.5 rounded text-xs font-mono ${
                    theme === 'dark'
                      ? 'bg-gray-700 text-gray-300'
                      : 'bg-gray-800 text-gray-200'
                  }`}
                >
                  {key}
                </kbd>
              ))}
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    <TooltipProvider>
      <div className="relative h-screen">
        <div
          className={`flex flex-col h-full transition-all duration-300 ease-in-out ${theme === 'dark'
            ? 'bg-[#1A1B1E] text-gray-100 border-r border-gray-800'
            : 'bg-white text-gray-800 border-r border-gray-200'
            }`}
          style={{ width: isCollapsed ? '60px' : '220px' }}
        >
          {/* Header with Logo, User Info, and Bell Icon */}
          <div
            className={`px-4 py-2.5 border-b ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'
              }`}
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
                    className={`relative flex-1 cursor-pointer`}
                    onClick={() => setIsSearchModalOpen(true)}
                  >
                    <Search
                      className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                        }`}
                    />
                    <div
                      className={`w-full pl-8 pr-16 py-1.5 rounded-md text-xs font-medium border transition-colors ${theme === 'dark'
                        ? 'bg-[#25262B] border-gray-700 text-gray-400'
                        : 'bg-white border-gray-300 text-gray-500'
                        }`}
                    >
                      Search...
                    </div>
                    <div className="absolute right-2 bottom-1">
                      <kbd
                        className={`px-1.5 py-0.5 rounded text-xs font-mono ${theme === 'dark'
                          ? 'bg-gray-700 text-gray-300'
                          : 'bg-gray-100 text-gray-600 border border-gray-300'
                          }`}
                      >
                        {shortcutKey}
                      </kbd>
                    </div>
                  </div>
                  <button
                    className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${theme === 'dark'
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
                <Tooltip delayDuration={500}>
                  <TooltipTrigger asChild>
                    <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center cursor-pointer">
                      <img 
                        src="/logo.png" 
                        alt="Scrapi Logo" 
                        className={`w-6 h-6 ${theme === 'dark' ? 'brightness-0 invert' : ''}`}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right" className={`${theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-gray-900 text-white'
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
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => {
                          setActiveSection('scrapiStore');
                          navigate('/store');
                        }}
                        className={`w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${isStorePage
                          ? theme === 'dark'
                            ? 'bg-[#2C2D30] text-white'
                            : 'bg-gray-100 text-gray-900'
                          : theme === 'dark'
                            ? 'text-gray-400 hover:bg-gray-800'
                            : 'text-gray-600 hover:bg-gray-100'
                          }`}
                      >
                        <Store className="w-3.5 h-3.5" />
                        <span>Scrapi Store</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent 
                      side="right" 
                      className={`flex items-center gap-2 ${
                        theme === 'dark' 
                          ? 'bg-gray-800 text-white border-gray-700' 
                          : 'bg-gray-900 text-white border-gray-800'
                      } border shadow-lg`}
                    >
                      <span className="font-medium">Scrapi Store</span>
                      <div className="flex items-center gap-1 ml-2 pl-2 border-l border-gray-600">
                        <kbd className={`px-1.5 py-0.5 rounded text-xs font-mono ${
                          theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-800 text-gray-200'
                        }`}>G</kbd>
                        <kbd className={`px-1.5 py-0.5 rounded text-xs font-mono ${
                          theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-800 text-gray-200'
                        }`}>O</kbd>
                      </div>
                    </TooltipContent>
                  </Tooltip>

                  {/* Horizontal Divider after Scrapi Store */}
                  <div className={`my-2 mx-2.5 border-t ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'
                    }`} />

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
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${theme === 'dark'
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
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => {
                        setActiveSection('scrapiStore');
                        navigate('/store');
                      }}
                      className={`w-full flex items-center justify-center p-1.5 rounded-md transition-colors ${isStorePage
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
                  <TooltipContent 
                    side="right" 
                    className={`flex items-center gap-2 ${
                      theme === 'dark' 
                        ? 'bg-gray-800 text-white border-gray-700' 
                        : 'bg-gray-900 text-white border-gray-800'
                    } border shadow-lg`}
                  >
                    <span className="font-medium">Scrapi Store</span>
                    <div className="flex items-center gap-1 ml-2 pl-2 border-l border-gray-600">
                      <kbd className={`px-1.5 py-0.5 rounded text-xs font-mono ${
                        theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-800 text-gray-200'
                      }`}>G</kbd>
                      <kbd className={`px-1.5 py-0.5 rounded text-xs font-mono ${
                        theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-800 text-gray-200'
                      }`}>O</kbd>
                    </div>
                  </TooltipContent>
                </Tooltip>

                {/* Divider */}
                <div className={`my-1.5 mx-2 border-t ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'
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
                <div className={`my-1.5 mx-2 border-t ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'
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
                <div className={`my-1.5 mx-2 border-t ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'
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
            className={`px-3.5 py-2.5 border-t ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'
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
                      className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                        }`}
                    >
                      0 MB / 8 GB
                    </span>
                  </div>
                  <Progress
                    value={0}
                    className={`h-1.5 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'
                      }`}
                  />
                  <div
                    className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                      }`}
                  >
                    $0.00 / $5.00
                  </div>
                </div>

                {/* Upgrade Button */}
                <button
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors ${theme === 'dark'
                    ? 'bg-[#2C2D30] text-gray-200 hover:bg-gray-700 border border-gray-700'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                    }`}
                >
                  <span>Upgrade to Starter</span>
                  <ChevronRight className="w-4 h-4" />
                </button>

                {/* Scrapi Logo */}
                <div className={`flex items-center justify-between mt-2.5 pt-2.5 border-t ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'
                  }`}>
                  <div className="flex items-center space-x-2">
                    <img 
                      src="/logo.png" 
                      alt="Scrapi" 
                      className={`w-5 h-5 ${theme === 'dark' ? 'brightness-0 invert' : ''}`}
                    />
                    <span
                      className={`text-sm font-semibold ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'
                        }`}
                    >
                      scrapi
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    {/* Round Question Mark Icon */}
                    <button
                      className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${theme === 'dark'
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
                          className={`p-1.5 rounded transition-colors ${theme === 'dark'
                            ? 'hover:bg-gray-800 text-gray-400'
                            : 'hover:bg-gray-100 text-gray-500'
                            }`}
                        >
                          <PanelLeftClose className="w-4 h-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent 
                        side="right" 
                        className={`flex items-center gap-2 ${
                          theme === 'dark' 
                            ? 'bg-gray-800 text-white border-gray-700' 
                            : 'bg-gray-900 text-white border-gray-800'
                        } border shadow-lg`}
                      >
                        <span className="font-medium">Collapse Sidebar</span>
                        <div className="flex items-center gap-1 ml-2 pl-2 border-l border-gray-600">
                          <kbd className={`px-1.5 py-0.5 rounded text-xs font-mono ${
                            theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-800 text-gray-200'
                          }`}>{isMac ? '⌘' : 'Ctrl'}</kbd>
                          <kbd className={`px-1.5 py-0.5 rounded text-xs font-mono ${
                            theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-800 text-gray-200'
                          }`}>B</kbd>
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
                      className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${theme === 'dark'
                        ? 'hover:bg-gray-800 text-gray-400 border border-gray-700'
                        : 'hover:bg-gray-100 text-gray-500 border border-gray-300'
                        }`}
                    >
                      <HelpCircle className="w-4 h-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className={`${theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-gray-900 text-white'
                    }`}>
                    Help
                  </TooltipContent>
                </Tooltip>

                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setIsCollapsed(false)}
                      className={`p-1.5 rounded transition-colors ${theme === 'dark'
                        ? 'hover:bg-gray-800 text-gray-400'
                        : 'hover:bg-gray-100 text-gray-500'
                        }`}
                    >
                      <PanelLeft className="w-4 h-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent 
                    side="right" 
                    className={`flex items-center gap-2 ${
                      theme === 'dark' 
                        ? 'bg-gray-800 text-white border-gray-700' 
                        : 'bg-gray-900 text-white border-gray-800'
                    } border shadow-lg`}
                  >
                    <span className="font-medium">Expand Sidebar</span>
                    <div className="flex items-center gap-1 ml-2 pl-2 border-l border-gray-600">
                      <kbd className={`px-1.5 py-0.5 rounded text-xs font-mono ${
                        theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-800 text-gray-200'
                      }`}>{isMac ? '⌘' : 'Ctrl'}</kbd>
                      <kbd className={`px-1.5 py-0.5 rounded text-xs font-mono ${
                        theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-800 text-gray-200'
                      }`}>B</kbd>
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
              className={`w-full max-w-2xl rounded-lg shadow-2xl overflow-hidden ${theme === 'dark' ? 'bg-[#1A1B1E]' : 'bg-white'
                }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Search Input */}
              <div className={`flex items-center px-4 py-3 border-b ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'
                }`}>
                <Search className={`w-5 h-5 mr-3 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                  }`} />
                <input
                  type="text"
                  placeholder="Search by ID or navigate"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                  className={`flex-1 bg-transparent outline-none text-sm ${theme === 'dark' ? 'text-gray-200 placeholder-gray-500' : 'text-gray-800 placeholder-gray-400'
                    }`}
                />
                <button
                  onClick={() => setIsSearchModalOpen(false)}
                  className={`ml-3 p-1 rounded hover:bg-gray-800 transition-colors ${theme === 'dark' ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                  <span className="text-lg font-semibold">×</span>
                </button>
              </div>

              {/* Search Results */}
              <div className={`max-h-96 overflow-y-auto ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                {/* Navigation Section */}
                <div className="px-4 py-2">
                  <h3 className={`text-xs font-semibold uppercase tracking-wider mb-2 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
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
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${theme === 'dark'
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
                              className={`px-2 py-0.5 rounded text-xs font-mono ${theme === 'dark'
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
                  <h3 className={`text-xs font-semibold uppercase tracking-wider mb-2 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
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
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${theme === 'dark'
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
                  <h3 className={`text-xs font-semibold uppercase tracking-wider mb-2 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
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
                        className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-sm transition-colors ${theme === 'dark'
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
