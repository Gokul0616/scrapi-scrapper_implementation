import React, { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    LayoutDashboard,
    Users,
    Bot,
    PlaySquare,
    Settings,
    LogOut,
    Menu,
    Bell,
    Search,
    ChevronDown,
    X,
    Shield,
    Terminal as TerminalIcon,
    FileText,
    ScrollText,
    BookOpen
} from 'lucide-react';
import { clsx } from 'clsx';

const SidebarItem = ({ icon: Icon, label, to, active, collapsed }: { icon: any, label: string, to: string, active: boolean, collapsed: boolean }) => (
    <Link
        to={to}
        className={clsx(
            "flex items-center px-3 py-2 text-sm font-medium transition-colors mb-1 mx-2 rounded-sm",
            active
                ? "bg-aws-hover text-white font-bold"
                : "text-gray-300 hover:bg-aws-hover hover:text-white"
        )}
        title={collapsed ? label : undefined}
    >
        <Icon size={20} className={clsx("flex-shrink-0", !collapsed && "mr-3")} />
        {!collapsed && <span>{label}</span>}
    </Link>
);

export const Layout: React.FC = () => {
    const { user, logout } = useAuth();
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Sidebar items configuration
    const items = [
        { icon: LayoutDashboard, label: 'Dashboard', to: '/dashboard' },
        { label: 'Management', type: 'header' },
        { icon: Users, label: 'Users', to: '/users' },
        { icon: Bot, label: 'Actors', to: '/actors' },
        { icon: PlaySquare, label: 'Runs', to: '/runs' },
        { icon: FileText, label: 'Audit Logs', to: '/audit-logs' },
    ];

    // Add restricted items
    if (user?.role === 'owner') {
        items.push({ icon: Shield, label: 'Team', to: '/team' });
    }

    if (user?.role === 'owner' || (user?.permissions || []).includes('terminal_access')) {
        items.push({ icon: TerminalIcon, label: 'Terminal', to: '/terminal' });
    }

    // Continue with other items
    items.push(
        { label: 'Content', type: 'header' },
        { icon: ScrollText, label: 'Policies', to: '/policies' },
        { label: 'Configuration', type: 'header' },
        { icon: BookOpen, label: 'API Docs', to: '/documentation' },
        { icon: Settings, label: 'Settings', to: '/settings' }
    );

    const renderSidebarContent = (collapsed: boolean) => (
        <nav className="flex-1 py-4 overflow-y-auto">
            {items.map((item, index) => {
                if (item.type === 'header') {
                    return (
                        <div key={index} className={clsx("px-4 py-2 text-xs font-bold text-gray-500 uppercase mt-4 mb-1", collapsed && "hidden")}>
                            {item.label}
                        </div>
                    );
                }
                return (
                    <SidebarItem
                        key={item.to}
                        icon={item.icon}
                        label={item.label!}
                        to={item.to!}
                        active={location.pathname.startsWith(item.to!)}
                        collapsed={collapsed}
                    />
                );
            })}
        </nav>
    );

    return (
        <div className="flex flex-col h-screen bg-aws-light">
            {/* Top Navigation Bar */}
            <header className="bg-aws-nav text-white h-14 flex items-center justify-between px-4 shadow-md z-50 flex-shrink-0">
                <div className="flex items-center">
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="p-1 mr-4 hover:bg-aws-hover rounded hidden lg:block"
                    >
                        <Menu size={24} />
                    </button>
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="p-1 mr-4 hover:bg-aws-hover rounded lg:hidden"
                    >
                        <Menu size={24} />
                    </button>

                    <Link to="/" className="flex items-center space-x-2 mr-8">
                        <img src="/logo.png" alt="Scrapi Logo" className="h-8 w-auto" style={{ filter: 'brightness(0) invert(1)' }} />
                        <span className="font-bold text-lg tracking-tight">Console</span>
                    </Link>

                    <div className="hidden md:flex items-center relative">
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search size={14} className="text-gray-400" />
                            </div>
                            <input
                                type="text"
                                placeholder="Search for services, features, etc."
                                className="bg-aws-dark text-white text-sm rounded-md pl-9 pr-4 py-1.5 w-96 border border-gray-600 focus:border-aws-blue focus:ring-1 focus:ring-aws-blue focus:outline-none placeholder-gray-400"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex items-center space-x-4">
                    <button className="p-1 hover:bg-aws-hover rounded relative">
                        <Bell size={20} />
                        <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-aws-nav transform translate-x-1/4 -translate-y-1/4"></span>
                    </button>

                    <div className="relative group flex items-center space-x-2 cursor-pointer hover:bg-aws-hover px-2 py-1 rounded">
                        <div className="text-right hidden sm:block">
                            <p className="text-sm font-bold leading-none">{user?.username}</p>
                            <p className="text-xs text-gray-400 leading-none mt-1">{user?.organization_name || 'Account ID: 1234-5678'}</p>
                        </div>
                        <ChevronDown size={16} className="text-gray-400" />

                        <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 hidden group-hover:block">
                            <button
                                onClick={logout}
                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                                Sign Out
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                {/* Desktop Sidebar */}
                <aside
                    className={clsx(
                        "bg-aws-nav text-white flex-shrink-0 transition-all duration-300 ease-in-out flex flex-col",
                        sidebarOpen ? "w-64" : "w-16",
                        "hidden lg:flex"
                    )}
                >
                    {renderSidebarContent(!sidebarOpen)}

                    <div className="p-4 border-t border-gray-700">
                        <button
                            onClick={logout}
                            className={clsx(
                                "flex items-center text-gray-300 hover:text-white transition-colors w-full",
                                !sidebarOpen && "justify-center"
                            )}
                            title="Sign Out"
                        >
                            <LogOut size={20} className={clsx(!sidebarOpen ? "" : "mr-3")} />
                            {sidebarOpen && <span>Sign Out</span>}
                        </button>
                    </div>
                </aside>

                {/* Mobile Sidebar Overlay */}
                {mobileMenuOpen && (
                    <div className="fixed inset-0 z-40 lg:hidden">
                        <div className="fixed inset-0 bg-gray-900 bg-opacity-75" onClick={() => setMobileMenuOpen(false)}></div>
                        <div className="fixed inset-y-0 left-0 flex flex-col w-64 bg-aws-nav text-white shadow-xl z-50">
                            <div className="h-14 flex items-center justify-between px-4 border-b border-gray-700">
                                <span className="font-bold text-lg">Menu</span>
                                <button onClick={() => setMobileMenuOpen(false)}>
                                    <X size={24} />
                                </button>
                            </div>

                            {renderSidebarContent(false)}

                            <div className="p-4 border-t border-gray-700">
                                <button onClick={logout} className="flex items-center text-gray-300 hover:text-white w-full">
                                    <LogOut size={20} className="mr-3" />
                                    <span>Sign Out</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Main Content */}
                <main className="flex-1 overflow-auto bg-aws-light p-6">
                    <div className="max-w-7xl mx-auto">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};
