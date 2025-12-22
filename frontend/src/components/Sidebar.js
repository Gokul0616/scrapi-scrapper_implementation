import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Progress } from './ui/progress';
import {
  Home,
  Store,
  Code,
  BookOpen,
  Play,
  Link2,
  Calendar,
  Database,
  Shield,
  Settings,
  Moon,
  Sun,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Search,
  Bell,
  MessageSquare,
  TrendingUp,
  Server,
  Wallet
} from 'lucide-react';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [expandedSections, setExpandedSections] = useState({
    scrapiStore: true,
    development: true
  });
  const [searchFocused, setSearchFocused] = useState(false);

  // Detect platform for keyboard shortcut display
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const shortcutKey = isMac ? '⌘K' : 'Ctrl+K';

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
        setSearchFocused(true);
        // You can implement search modal opening here
        console.log('Search activated via keyboard shortcut');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Menu structure
  const scrapiStoreItems = [
    { icon: Home, label: 'Home', path: '/home' },
    { icon: Code, label: 'Actors', path: '/actors' },
    { icon: Play, label: 'Runs', path: '/runs' },
    { icon: BookOpen, label: 'Saved tasks', path: '/tasks' },
    { icon: Link2, label: 'Integrations', path: '/integrations' },
    { icon: Calendar, label: 'Schedules', path: '/schedules' }
  ];

  const developmentItems = [
    { icon: Code, label: 'My Actors', path: '/actors' },
    { icon: TrendingUp, label: 'Insights', path: '/insights' },
    { icon: MessageSquare, label: 'Messaging', path: '/messaging' }
  ];

  const bottomItems = [
    { icon: Server, label: 'Proxy', path: '/proxy' },
    { icon: Database, label: 'Storage', path: '/storage' },
    { icon: Wallet, label: 'Billing', path: '/billing' },
    { icon: Settings, label: 'Settings', path: '/settings' }
  ];

  return (
    <div className="relative h-screen">
      <div
        className={`flex flex-col h-full transition-colors duration-200 ${
          theme === 'dark'
            ? 'bg-[#1A1B1E] text-gray-100 border-r border-gray-800'
            : 'bg-white text-gray-800 border-r border-gray-200'
        }`}
        style={{ width: '220px' }}
      >
        {/* Header with Logo, User Info, and Bell Icon */}
        <div
          className={`px-4 py-2.5 border-b ${
            theme === 'dark' ? 'border-gray-800' : 'border-gray-200'
          }`}
        >
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
            </div>
          </div>

          {/* Search Bar with Bell Icon */}
          <div className="flex items-center space-x-2">
            <div 
              className={`relative flex-1 cursor-pointer`}
              onClick={() => {
                // Will open search modal later
                console.log('Search clicked - modal will be implemented');
              }}
            >
              <Search
                className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 ${
                  theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                }`}
              />
              <div
                className={`w-full pl-8 pr-16 py-1.5 rounded-md text-sm border transition-colors ${
                  theme === 'dark'
                    ? 'bg-[#25262B] border-gray-700 text-gray-500'
                    : 'bg-white border-gray-300 text-gray-400'
                }`}
              >
                Search...
              </div>
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <kbd
                  className={`px-1.5 py-0.5 rounded text-xs font-mono ${
                    theme === 'dark'
                      ? 'bg-gray-700 text-gray-300'
                      : 'bg-gray-100 text-gray-600 border border-gray-300'
                  }`}
                >
                  ⌘K
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
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-2 scrollbar-hide">
          {/* Scrapi Store Section */}
          <div className="mb-1">
            <button
              onClick={() => toggleSection('scrapiStore')}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                theme === 'dark'
                  ? 'text-gray-400 hover:bg-gray-800'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Store className="w-3.5 h-3.5" />
                <span>Scrapi Store</span>
              </div>
              {expandedSections.scrapiStore ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>

            {expandedSections.scrapiStore && (
              <div className="mt-0.5 space-y-0.5">
                {scrapiStoreItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center space-x-2.5 px-2.5 py-1.5 rounded-md text-sm transition-colors ${
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
                    <item.icon className="w-4 h-4 flex-shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </div>
            )}
          </div>

          {/* Development Section */}
          <div className="mb-1">
            <button
              onClick={() => toggleSection('development')}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
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
                      `flex items-center space-x-2.5 px-2.5 py-1.5 rounded-md text-sm transition-colors ${
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
                    <item.icon className="w-4 h-4 flex-shrink-0" />
                    <span>{item.label}</span>
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
                  `flex items-center space-x-2.5 px-2.5 py-1.5 rounded-md text-sm transition-colors ${
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
                <item.icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        </nav>

        {/* Bottom Section - RAM Usage & Upgrade */}
        <div
          className={`px-3.5 py-2.5 border-t ${
            theme === 'dark' ? 'border-gray-800' : 'border-gray-200'
          }`}
        >
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
              <button
                className={`p-1 rounded transition-colors ${
                  theme === 'dark'
                    ? 'hover:bg-gray-800 text-gray-400'
                    : 'hover:bg-gray-100 text-gray-500'
                }`}
              >
                <span className="text-base">?</span>
              </button>
              <button
                className={`p-1 rounded transition-colors ${
                  theme === 'dark'
                    ? 'hover:bg-gray-800 text-gray-400'
                    : 'hover:bg-gray-100 text-gray-500'
                }`}
              >
                <ChevronRight className="w-3.5 h-3.5 rotate-180" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
