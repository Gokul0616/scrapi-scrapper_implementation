import React, { useState } from 'react';
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
  CreditCard,
  Moon,
  Sun,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  Search,
  Bell,
  MessageSquare,
  FolderKanban,
  TrendingUp,
  Server,
  Wallet
} from 'lucide-react';

const ApifySidebar = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [expandedSections, setExpandedSections] = useState({
    apifyStore: true,
    development: true
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Menu structure matching Apify
  const apifyStoreItems = [
    { icon: Home, label: 'Home', path: '/home' },
    { icon: Code, label: 'Actors', path: '/actors' },
    { icon: Play, label: 'Runs', path: '/runs' },
    { icon: BookOpen, label: 'Saved tasks', path: '/tasks' },
    { icon: Link2, label: 'Integrations', path: '/integrations' },
    { icon: Calendar, label: 'Schedules', path: '/schedules' }
  ];

  const developmentItems = [
    { icon: Code, label: 'My Actors', path: '/development' },
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
        style={{ width: '280px' }}
      >
        {/* Header with Logo and User Info */}
        <div
          className={`px-4 py-3 border-b ${
            theme === 'dark' ? 'border-gray-800' : 'border-gray-200'
          }`}
        >
          {/* Logo Section */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                G
              </div>
              <div>
                <div className={`font-semibold text-base ${
                  theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
                }`}>Gokul</div>
                <div className={`text-xs ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                }`}>Personal</div>
              </div>
            </div>
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-lg transition-colors ${
                theme === 'dark'
                  ? 'hover:bg-gray-800 text-gray-300'
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search
              className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
                theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
              }`}
            />
            <input
              type="text"
              placeholder="Search..."
              className={`w-full pl-9 pr-20 py-2 rounded-lg text-sm border transition-colors ${
                theme === 'dark'
                  ? 'bg-[#25262B] border-gray-700 text-gray-200 placeholder-gray-500 focus:border-gray-600'
                  : 'bg-white border-gray-300 text-gray-700 placeholder-gray-400 focus:border-gray-400'
              } focus:outline-none`}
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1">
              <kbd
                className={`px-2 py-0.5 rounded text-xs font-mono ${
                  theme === 'dark'
                    ? 'bg-gray-700 text-gray-300'
                    : 'bg-gray-100 text-gray-600 border border-gray-300'
                }`}
              >
                ⌘ K
              </kbd>
            </div>
          </div>

          {/* Bell Icon */}
          <div className="flex justify-end mt-2">
            <button
              className={`p-2 rounded-lg transition-colors ${
                theme === 'dark'
                  ? 'hover:bg-gray-800 text-gray-300'
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
            >
              <Bell className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-3">
          {/* Apify Store Section */}
          <div className="mb-2">
            <button
              onClick={() => toggleSection('apifyStore')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                theme === 'dark'
                  ? 'text-gray-300 hover:bg-gray-800'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Store className="w-4 h-4" />
                <span>Apify Store</span>
              </div>
              {expandedSections.apifyStore ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            {expandedSections.apifyStore && (
              <div className="mt-1 space-y-0.5">
                {apifyStoreItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center space-x-3 px-3 py-2 rounded-lg text-sm transition-colors ${
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
          <div className="mb-2">
            <button
              onClick={() => toggleSection('development')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                theme === 'dark'
                  ? 'text-gray-300 hover:bg-gray-800'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center space-x-2">
                <span>Development</span>
              </div>
              {expandedSections.development ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            {expandedSections.development && (
              <div className="mt-1 space-y-0.5">
                {developmentItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center space-x-3 px-3 py-2 rounded-lg text-sm transition-colors ${
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
          <div className="space-y-0.5 mt-4">
            {bottomItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-3 py-2 rounded-lg text-sm transition-colors ${
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
          className={`px-4 py-3 border-t ${
            theme === 'dark' ? 'border-gray-800' : 'border-gray-200'
          }`}
        >
          {/* RAM Usage */}
          <div className="mb-3">
            <div className="flex justify-between text-xs mb-1.5">
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
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              theme === 'dark'
                ? 'bg-[#2C2D30] text-gray-200 hover:bg-gray-700 border border-gray-700'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
            }`}
          >
            <span>Upgrade to Starter</span>
            <ChevronLeft className="w-4 h-4 rotate-180" />
          </button>

          {/* Apify Logo */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-700">
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1">
                <div className="w-6 h-6 bg-gradient-to-br from-red-500 via-blue-500 to-purple-500 rounded flex items-center justify-center">
                  <span className="text-white text-xs font-bold">A</span>
                </div>
                <span
                  className={`text-sm font-semibold ${
                    theme === 'dark' ? 'text-gray-200' : 'text-gray-800'
                  }`}
                >
                  apify
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                className={`p-1.5 rounded transition-colors ${
                  theme === 'dark'
                    ? 'hover:bg-gray-800 text-gray-400'
                    : 'hover:bg-gray-100 text-gray-500'
                }`}
              >
                <span className="text-lg">?</span>
              </button>
              <button
                className={`p-1.5 rounded transition-colors ${
                  theme === 'dark'
                    ? 'hover:bg-gray-800 text-gray-400'
                    : 'hover:bg-gray-100 text-gray-500'
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApifySidebar;
