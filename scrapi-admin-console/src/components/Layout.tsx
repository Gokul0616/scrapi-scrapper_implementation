import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
    LayoutDashboard,
    Users,
    Bot,
    PlaySquare,
    Settings,
    LogOut,
    Search,
    Shield,
    Terminal as TerminalIcon,
    FileText,
    ScrollText,
    BookOpen,
    PanelLeft,
    PanelLeftClose,
    ChevronDown,
    Menu,
    X
} from 'lucide-react';
import { clsx } from 'clsx';

import CustomTooltip from './CustomTooltip';

export const Layout: React.FC = () => {
    const { user, logout } = useAuth();
    const { toggleTheme } = useTheme();
    const location = useLocation();
    const navigate = useNavigate();

    // Check local storage for initial state, default to false
    const [isCollapsed, setIsCollapsed] = useState(() => {
        return localStorage.getItem('adminSidebarCollapsed') === 'true';
    });

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        localStorage.setItem('adminSidebarCollapsed', isCollapsed.toString());
    }, [isCollapsed]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsUserDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Handle keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't trigger shortcuts when user is typing in input fields
            const target = e.target as HTMLElement;
            const isTypingInInput =
                target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.isContentEditable;

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

            // Handle S+Key shortcuts - ONLY when NOT typing in input
            if ((e.key === 's' || e.key === 'S') && !isTypingInInput) {
                const nextKey = new Promise<string | null>((resolve) => {
                    const handler = (nextE: KeyboardEvent) => {
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
                    const shortcuts: Record<string, string> = {
                        'D': '/dashboard',
                        'U': '/users',
                        'A': '/actors',
                        'R': '/runs',
                        'L': '/audit-logs',
                        'G': '/settings',
                        'E': '/team',
                        'T': '/terminal',
                        'P': '/policies',
                        'C': '/documentation'
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

    // Detect platform for keyboard shortcut display
    const isMac = navigator.platform?.toUpperCase().indexOf('MAC') >= 0;
    const shortcutKey = isMac ? '⌘K' : 'Ctrl+K';

    // Type for sidebar items
    type SidebarItem = {
        icon?: any;
        label: string;
        path?: string;
        shortcut?: string;
        type?: 'header';
    };

    // Sidebar items configuration
    const items: SidebarItem[] = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', shortcut: 'S D' },
        { label: 'Management', type: 'header' },
        { icon: Users, label: 'Users', path: '/users', shortcut: 'S U' },
        { icon: Bot, label: 'Actors', path: '/actors', shortcut: 'S A' },
        { icon: PlaySquare, label: 'Runs', path: '/runs', shortcut: 'S R' },
        { icon: FileText, label: 'Audit Logs', path: '/audit-logs', shortcut: 'S L' },
    ];

    if (user?.role === 'owner') {
        items.push({ icon: Shield, label: 'Team', path: '/team', shortcut: 'S E' });
    }

    if (user?.role === 'owner' || (user?.permissions || []).includes('terminal_access')) {
        items.push({ icon: TerminalIcon, label: 'Terminal', path: '/terminal', shortcut: 'S T' });
    }

    items.push(
        { label: 'Content', type: 'header' },
        { icon: ScrollText, label: 'Policies', path: '/policies', shortcut: 'S P' },
        { label: 'Configuration', type: 'header' },
        { icon: BookOpen, label: 'API Docs', path: '/documentation', shortcut: 'S C' },
        { icon: Settings, label: 'Settings', path: '/settings', shortcut: 'S G' }
    );

    const MenuItem = ({ item, isActive, onClick }: { item: SidebarItem, isActive: boolean, onClick: () => void }) => {
        const content = (
            <NavLink
                to={item.path || '#'}
                onClick={onClick}
                className={clsx(
                    "flex items-center space-x-2.5 rounded-md text-xs font-medium transition-colors cursor-pointer w-full",
                    isCollapsed ? "px-0 py-1.5 justify-center" : "px-2.5 py-1.5",
                    isActive
                        ? "bg-accent text-accent-foreground"
                        : "text-accent-foreground hover:bg-muted hover:text-foreground"
                )}
            >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {!isCollapsed && <span>{item.label}</span>}
            </NavLink>
        );

        const tooltipContent = (
            <div className="flex items-center gap-2">
                {isCollapsed && <span>{item.label}</span>}
                {item.shortcut && (
                    <div className={clsx("flex items-center gap-1", isCollapsed ? "ml-2 pl-2 border-l border-border" : "")}>
                        {item.shortcut.split(' ').map((key, idx) => (
                            <kbd key={idx} className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-muted text-muted-foreground">{key}</kbd>
                        ))}
                    </div>
                )}
            </div>
        );

        return (
            <div className="w-full">
                <CustomTooltip content={tooltipContent} isDisabled={!isCollapsed && !item.shortcut}>
                    <div className="w-full">{content}</div>
                </CustomTooltip>
            </div>
        );
    };

    const renderSidebarContent = (mobile = false) => {
        const collapsedState = mobile ? false : isCollapsed;
        return (
            <nav className="flex-1 overflow-y-auto px-2.5 py-2 scrollbar-hide">
                <div className="space-y-0.5">
                    {items.map((item, index) => {
                        if (item.type === 'header') {
                            if (collapsedState) {
                                return <div key={index} className="my-1.5 mx-2 border-t border-border" />;
                            }
                            return (
                                <div key={index} className="px-2.5 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-2 mb-0.5 pointer-events-none select-none">
                                    {item.label}
                                </div>
                            );
                        }
                        return (
                            <MenuItem
                                key={item.path || index}
                                item={item}
                                isActive={location.pathname.startsWith(item.path || '#')}
                                onClick={() => {
                                    if (mobile) setIsMobileMenuOpen(false);
                                }}
                            />
                        );
                    })}
                </div>
            </nav>
        );
    };

    const userInitials = user?.username?.substring(0, 2).toUpperCase() || 'AD';

    return (
        <div className="flex h-screen bg-background text-foreground overflow-hidden">
            {/* Desktop Sidebar */}
            <div
                className={clsx(
                    "hidden lg:flex flex-col h-full transition-all duration-300 ease-in-out border-r border-border bg-background",
                    isCollapsed ? "w-[60px]" : "w-[220px]"
                )}
            >
                {/* Header with User Info and Search */}
                <div className="px-4 py-2.5 border-b border-border">
                    {!isCollapsed ? (
                        <>
                            {/* User Dropdown Profile equivalent */}
                            <div className="flex items-center justify-between mb-2.5 w-full">
                                <div className="relative w-full" ref={dropdownRef}>
                                    <div
                                        onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                                        className="flex items-center justify-between w-full px-2 py-1.5 hover:bg-muted rounded-md cursor-pointer border border-transparent hover:border-border transition-all"
                                    >
                                        <div className="flex items-center space-x-2 w-full overflow-hidden">
                                            <div className="w-6 h-6 rounded-md bg-blue-600 flex-shrink-0 flex items-center justify-center text-white text-xs font-bold ring-1 ring-border shadow-sm">
                                                {userInitials}
                                            </div>
                                            <div className="flex flex-col overflow-hidden text-left min-w-0 flex-1">
                                                <span className="text-sm font-semibold text-foreground truncate block w-full pr-2">
                                                    {user?.username}
                                                </span>
                                            </div>
                                        </div>
                                        <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                    </div>

                                    {/* Dropdown Menu */}
                                    {isUserDropdownOpen && (
                                        <div className="absolute top-full left-0 mt-1 w-full min-w-[200px] bg-popover border border-border rounded-md shadow-md z-50">
                                            <div className="py-1">
                                                <div className="px-3 py-2 text-xs text-muted-foreground border-b border-border truncate">
                                                    {user?.email || 'Admin User'}
                                                </div>
                                                <button
                                                    onClick={logout}
                                                    className="w-full flex items-center px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors cursor-pointer"
                                                >
                                                    <LogOut className="w-4 h-4 mr-2" />
                                                    Sign Out
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Search Box */}
                            <div className="flex items-center space-x-2">
                                <div className="relative flex-1 cursor-not-allowed opacity-70">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <div className="w-full pl-8 pr-16 py-1.5 rounded-md text-xs font-medium border border-border bg-muted/50 text-muted-foreground transition-colors">
                                        Search...
                                    </div>
                                    <div className="absolute right-2 bottom-1.5 pointer-events-none">
                                        <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-muted text-muted-foreground">
                                            {shortcutKey}
                                        </kbd>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center">
                            <div className="relative" ref={isCollapsed ? dropdownRef : undefined}>
                                <div
                                    onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                                    className="w-8 h-8 mt-1 rounded-md bg-blue-600 flex items-center justify-center text-white text-xs font-bold ring-1 ring-border cursor-pointer shadow-sm"
                                >
                                    {userInitials}
                                </div>
                                {/* Dropdown Menu */}
                                {isUserDropdownOpen && (
                                    <div className="absolute top-0 left-full ml-3 w-48 bg-popover border border-border rounded-md shadow-md z-50">
                                        <div className="py-1">
                                            <div className="px-3 py-2 text-xs text-muted-foreground border-b border-border truncate">
                                                {user?.username} ({user?.role || 'admin'})
                                            </div>
                                            <button onClick={logout} className="w-full flex items-center px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors cursor-pointer">
                                                <LogOut className="w-4 h-4 mr-2" />
                                                Sign Out
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {renderSidebarContent(false)}

                {/* Bottom Section */}
                <div className="px-3.5 py-2.5 border-t border-border mt-auto">
                    {!isCollapsed ? (
                        <>
                            <div className="flex justify-between items-center text-xs text-muted-foreground mb-3 px-1">
                                <span>Role</span>
                                <span className="font-medium px-2 py-0.5 bg-muted rounded-full text-foreground uppercase text-[10px] border border-border">
                                    {user?.role || 'admin'}
                                </span>
                            </div>

                            {/* Scrapi Logo */}
                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
                                <div className="flex items-center space-x-2">
                                    <div className="w-5 h-5 flex items-center justify-center">
                                        <img src="/logo.png" alt="Scrapi" className="max-w-full max-h-full dark:brightness-0 dark:invert" />
                                    </div>
                                    <span className="text-sm font-semibold text-foreground tracking-tight">
                                        Scrapi Admin
                                    </span>
                                </div>
                                <div className="flex items-center space-x-1">
                                    <CustomTooltip content={
                                        <div className="flex items-center gap-2">
                                            {isCollapsed && <span>Collapse Sidebar</span>}
                                            <div className={clsx("flex items-center gap-1", isCollapsed ? "ml-2 pl-2 border-l border-border" : "")}>
                                                {(isMac ? "⌘ B" : "Ctrl B").split(' ').map((key, idx) => (
                                                    <kbd key={idx} className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-muted text-muted-foreground">{key}</kbd>
                                                ))}
                                            </div>
                                        </div>
                                    } isDisabled={!isCollapsed}>
                                        <button
                                            onClick={() => setIsCollapsed(true)}
                                            className="p-1.5 rounded transition-colors hover:bg-muted text-muted-foreground cursor-pointer"
                                        >
                                            <PanelLeftClose className="w-4 h-4" />
                                        </button>
                                    </CustomTooltip>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center space-y-2 mb-1 mt-1">
                            <CustomTooltip content={
                                <div className="flex items-center gap-2">
                                    <span>Expand Sidebar</span>
                                    <div className="flex items-center gap-1 ml-2 pl-2 border-l border-border">
                                        {(isMac ? "⌘ B" : "Ctrl B").split(' ').map((key, idx) => (
                                            <kbd key={idx} className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-muted text-muted-foreground">{key}</kbd>
                                        ))}
                                    </div>
                                </div>
                            }>
                                <button
                                    onClick={() => setIsCollapsed(false)}
                                    className="p-1.5 rounded transition-colors hover:bg-muted text-muted-foreground cursor-pointer"
                                >
                                    <PanelLeft className="w-4 h-4" />
                                </button>
                            </CustomTooltip>
                        </div>
                    )}
                </div>
            </div>

            {/* Mobile Header & Sidebar overlay */}
            <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-background border-b border-border flex items-center justify-between px-4 z-40">
                <div className="flex items-center space-x-2">
                    <button onClick={() => setIsMobileMenuOpen(true)} className="p-1.5 -ml-1.5 rounded-md hover:bg-muted text-muted-foreground cursor-pointer">
                        <Menu className="w-5 h-5" />
                    </button>
                    <img src="/logo.png" alt="Scrapi" className="h-6 w-auto dark:brightness-0 dark:invert" />
                </div>
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold ring-1 ring-border">
                    {userInitials}
                </div>
            </div>

            {isMobileMenuOpen && (
                <div className="fixed inset-0 z-50 lg:hidden">
                    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
                    <div className="fixed inset-y-0 left-0 flex flex-col w-[280px] bg-background border-r border-border shadow-xl">
                        <div className="h-14 flex items-center justify-between px-4 border-b border-border">
                            <span className="font-bold text-lg">Menu</span>
                            <button onClick={() => setIsMobileMenuOpen(false)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground cursor-pointer">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        {renderSidebarContent(true)}
                        <div className="p-4 border-t border-border">
                            <button onClick={logout} className="flex items-center text-muted-foreground hover:text-foreground w-full py-2 cursor-pointer transition-colors">
                                <LogOut className="w-5 h-5 mr-3" />
                                <span className="font-medium">Sign Out</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto bg-background p-6 lg:p-8 pt-20 lg:pt-6 transition-colors">
                <div className="max-w-7xl mx-auto w-full">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

