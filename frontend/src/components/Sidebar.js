import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import SimpleTooltip from './SimpleTooltip';
import {
  Home,
  Store,
  Sparkles,
  Code,
  BookOpen,
  Play,
  Link2,
  Calendar,
  Database,
  Shield,
  Settings,
  CreditCard,
  FileText,
  HelpCircle,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  FolderOpen,
  PlusCircle,
  Key
} from 'lucide-react';

const Sidebar = ({ isCollapsed, setIsCollapsed }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const menuItems = [
    { icon: Home, label: 'Home', path: '/home' },
    { icon: Store, label: 'Store', path: '/store' },
    { icon: Sparkles, label: 'Actors', path: '/actors', active: true },
    { icon: ShoppingBag, label: 'Marketplace', path: '/marketplace' },
    { icon: Code, label: 'Development', path: '/development' },
    { icon: BookOpen, label: 'Saved tasks', path: '/tasks' },
    { icon: Play, label: 'Runs', path: '/runs' },
    { icon: Link2, label: 'Integrations', path: '/integrations' },
    { icon: Calendar, label: 'Schedules', path: '/schedules' },
    { icon: Database, label: 'Storage', path: '/storage' },
    { icon: Shield, label: 'Proxy', path: '/proxy' },
    { icon: Key, label: 'API Access', path: '/keys' },
    { icon: Settings, label: 'Settings', path: '/settings' }
  ];

  const bottomItems = [
    { icon: CreditCard, label: 'Organization billing', path: '/billing' },
    { icon: FileText, label: 'Documentation', path: '/docs' },
    { icon: HelpCircle, label: 'Help & resources', path: '/help' }
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="relative group">
      <style>
        {`
          /* Custom Scrollbar Styling */
          .sidebar-scroll::-webkit-scrollbar {
            width: 6px;
          }
          
          .sidebar-scroll::-webkit-scrollbar-track {
            background: transparent;
          }
          
          .sidebar-scroll::-webkit-scrollbar-thumb {
            background: transparent;
            border-radius: 3px;
            transition: background 0.3s ease;
          }
          
          .sidebar-scroll:hover::-webkit-scrollbar-thumb {
            background: #9CA3AF;
          }
          
          .sidebar-scroll::-webkit-scrollbar-thumb:hover {
            background: #6B7280;
          }
          
          /* Firefox scrollbar */
          .sidebar-scroll {
            scrollbar-width: thin;
            scrollbar-color: transparent transparent;
          }
          
          .sidebar-scroll:hover {
            scrollbar-color: #9CA3AF transparent;
          }
        `}
      </style>
      <div
        className={`sidebar-scroll bg-white border-r flex flex-col transition-all duration-300 overflow-y-auto ${isCollapsed ? 'w-16' : 'w-64'
          }`}
        style={{ height: '100vh' }}
      >
        {/* Logo */}
        <div className="h-16 border-b flex items-center justify-between px-4">
          {!isCollapsed && (
            <div className="flex items-center space-x-2">
              <img src="/logo.png" alt="Scrapi Logo" className="w-8 h-8" />
              <span className="font-bold text-xl text-gray-900">SCRAPI</span>
            </div>
          )}
          {isCollapsed && <img src="/logo.png" alt="Scrapi Logo" className="w-8 h-8 mx-auto" />}
        </div>

        {/* User Info */}
        {!isCollapsed && user && (
          <div className="p-4 border-b">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-gray-700 to-gray-900 rounded-full flex items-center justify-center text-white font-semibold">
                {user.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">
                  {user.organization_name || 'User'}
                </div>
                <div className="text-xs text-gray-500 truncate">{user.email}</div>
              </div>
            </div>
          </div>
        )}

        {/* Menu Items */}
        <nav className="flex-1 overflow-x-hidden overflow-y-auto py-4">
          <div className="space-y-1 px-2">
            {menuItems.map((item) => (
              <SimpleTooltip key={item.path} content={item.label} show={isCollapsed}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${isActive
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                    } ${isCollapsed ? 'justify-center' : ''}`
                  }
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {!isCollapsed && <span className="text-sm">{item.label}</span>}
                </NavLink>
              </SimpleTooltip>
            ))}
          </div>

          {/* Bottom Menu */}
          <div className="mt-8 space-y-1 px-2 pt-4 border-t">
            {bottomItems.map((item) => (
              <SimpleTooltip key={item.path} content={item.label} show={isCollapsed}>
                <NavLink
                  to={item.path}
                  className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors ${isCollapsed ? 'justify-center' : ''
                    }`}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {!isCollapsed && <span className="text-sm">{item.label}</span>}
                </NavLink>
              </SimpleTooltip>
            ))}
          </div>
        </nav>

        {/* Usage Stats */}
        {!isCollapsed && user && (
          <div className="p-4 border-t space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-600">Memory</span>
                <span className="font-medium">
                  {user.usage?.memory || 0} MB / {user.usage?.totalMemory || 32} GB
                </span>
              </div>
              <Progress value={(user.usage?.memory || 0) / ((user.usage?.totalMemory || 32) * 10)} className="h-2" />
            </div>
            <div className="text-xs text-gray-500">
              <span className="font-medium">Usage</span> resets on Oct 23
            </div>
            <Button className="w-full bg-gray-900 hover:bg-gray-800 text-white" size="sm">
              Upgrade
            </Button>
          </div>
        )}

        {/* Logout Button */}
        <div className="p-4 border-t">
          <SimpleTooltip content="Logout" show={isCollapsed}>
            <Button
              variant="ghost"
              className={`w-full justify-start text-gray-700 hover:bg-gray-100 ${isCollapsed ? 'justify-center px-0' : ''
                }`}
              onClick={handleLogout}
            >
              <LogOut className="w-5 h-5" />
              {!isCollapsed && <span className="ml-3">Logout</span>}
            </Button>
          </SimpleTooltip>
        </div>
      </div>

      {/* Collapse Toggle - Centered on sidebar border, always visible */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={`absolute top-1/2 -translate-y-1/2 w-7 h-7 bg-gradient-to-br from-gray-800 to-gray-900 border-2 border-gray-700 rounded-full flex items-center justify-center shadow-lg hover:from-gray-700 hover:to-gray-800 transition-all z-40 ${isCollapsed ? 'left-[50px]' : 'left-[242px]'
          }`}
        title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {isCollapsed ? (
          <ChevronRight className="w-4 h-4 text-white" />
        ) : (
          <ChevronLeft className="w-4 h-4 text-white" />
        )}
      </button>
    </div>
  );
};

export default Sidebar;
