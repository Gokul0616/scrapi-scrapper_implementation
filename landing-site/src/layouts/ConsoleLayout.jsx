import React from 'react';
import { Home, Play, Database, Save, Puzzle, Calendar, Search, CreditCard, ExternalLink, Settings, MessageSquare, Menu } from 'lucide-react';

const SidebarItem = ({ icon: Icon, label, active, hasSubmenu }) => (
  <div className={`flex items-center justify-between px-3 py-2 rounded-md text-sm cursor-pointer mb-1 ${
    active 
      ? 'bg-blue-50 text-blue-600 font-medium' 
      : 'text-gray-600 hover:bg-gray-50'
  }`}>
    <div className="flex items-center gap-2">
      <Icon size={18} />
      <span>{label}</span>
    </div>
    {hasSubmenu && <span className="text-xs">▼</span>}
  </div>
);

const ConsoleLayout = ({ children }) => {
  return (
    <div className="flex h-screen bg-white font-sans">
      {/* Sidebar */}
      <div className="w-64 border-r border-gray-200 flex flex-col bg-gray-50/50">
        {/* User Profile Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white font-medium">
              G
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-900">Gokul</span>
              <span className="text-xs text-gray-500">Personal</span>
            </div>
          </div>
          <Menu size={16} className="text-gray-400" />
        </div>

        {/* Search */}
        <div className="p-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search..." 
              className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-gray-400 border border-gray-200 rounded px-1">⌘ K</span>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
          <SidebarItem icon={ExternalLink} label="Apify Store" />
          
          <div className="mt-4 mb-2 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Menu
          </div>
          
          <SidebarItem icon={Home} label="Home" />
          <SidebarItem icon={Puzzle} label="Actors" active={true} />
          <SidebarItem icon={Play} label="Runs" />
          <SidebarItem icon={Save} label="Saved tasks" />
          <SidebarItem icon={Database} label="Integrations" />
          <SidebarItem icon={Calendar} label="Schedules" />

          <div className="mt-6 mb-2 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Development
          </div>
          
          <SidebarItem icon={Puzzle} label="My Actors" />
          <SidebarItem icon={Settings} label="Insights" />
          <SidebarItem icon={MessageSquare} label="Messaging" />
          
          <div className="mt-4">
            <SidebarItem icon={ExternalLink} label="Proxy" />
            <SidebarItem icon={Database} label="Storage" />
            <SidebarItem icon={CreditCard} label="Billing" />
          </div>
        </div>

        {/* Usage Stats Mock */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
           <div className="flex justify-between items-center text-xs mb-1">
             <span className="text-gray-500">RAM</span>
             <span className="text-gray-700 font-medium">0 MB / 8 GB</span>
           </div>
           <div className="flex justify-between items-center text-xs mb-3">
             <span className="text-gray-500">Usage</span>
             <span className="text-gray-700 font-medium">$0.00 / $5.00</span>
           </div>
           <button className="w-full flex items-center justify-between px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm hover:bg-gray-50 transition-colors">
              <span className="font-medium text-gray-700">Upgrade to Starter</span>
              <span className="text-gray-400">→</span>
           </button>
        </div>

        {/* Bottom Logo */}
        <div className="p-4 border-t border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-gray-700">
                <div className="w-5 h-5 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-sm"></div>
                apify
            </div>
             <div className="flex gap-2">
                 <div className="w-6 h-6 rounded bg-gray-200 flex items-center justify-center text-xs">?</div>
                 <div className="w-6 h-6 rounded bg-gray-200 flex items-center justify-center text-xs">«</div>
             </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        {children}
      </div>
    </div>
  );
};

export default ConsoleLayout;
