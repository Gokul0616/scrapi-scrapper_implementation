import React, { useState } from 'react';
import { Search, ChevronDown, Menu, X, ArrowLeft, ChevronRight } from 'lucide-react';
import DocsSearchModal from './DocsSearchModal';

const MobileMenuItem = ({ title, href = "#", onClick, hasSubmenu }) => (
    <a
        href={href}
        onClick={onClick}
        className="flex items-center justify-between px-6 py-3.5 hover:bg-gray-50 transition-colors text-left border-b border-gray-100"
    >
        <span className="text-base font-medium text-gray-900">{title}</span>
        {hasSubmenu && <ChevronRight className="w-5 h-5 text-gray-400" />}
    </a>
);

const NAV_LINKS = [
    { title: 'Academy', href: '/academy' },
    { title: 'Platform', href: '/platform' },
    { title: 'API', href: '#' },
    { title: 'SDK', href: '#' },
    { title: 'CLI', href: '/cli' },
    { title: 'Open source', href: '#' },
];

const DocsNavbar = () => {
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    React.useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsSearchOpen(true);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Prevent body scroll when mobile menu is open
    React.useEffect(() => {
        if (isMobileMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isMobileMenuOpen]);

    return (
        <>
            <nav className="fixed w-full top-0 z-50 bg-white border-b border-gray-200 h-16">
                <div className="max-w-[1400px] mx-auto px-4 h-full flex items-center justify-between">
                    {/* Left Side: Logo & Nav Links */}
                    <div className="flex items-center gap-8">
                        <a href="/" className="flex items-center gap-2">
                            <img src="/logo.png" alt="Scrapi" className="w-8 h-8 font-bold" />
                            <span className="text-xl font-bold text-gray-900">
                                Scrapi
                                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-full ml-1">Docs</span>
                            </span>
                        </a>

                        <div className="hidden lg:flex items-center gap-6 text-sm font-medium text-gray-600">
                            {NAV_LINKS.map((link) => (
                                <a
                                    key={link.title}
                                    href={link.href}
                                    className="hover:text-gray-900"
                                >
                                    {link.title}
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Right Side: Search & Menu */}
                    <div className="flex items-center gap-4">
                        {/* Search Bar (Desktop) */}
                        <div className="hidden sm:block">
                            <button
                                onClick={() => setIsSearchOpen(true)}
                                className="flex items-center gap-3 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-500 hover:border-blue-400 hover:ring-1 hover:ring-blue-100 transition-all w-48 md:w-64 group"
                            >
                                <Search className="w-4 h-4 group-hover:text-blue-500" />
                                <span>Search</span>
                                <span className="ml-auto text-xs bg-white border border-gray-200 px-1.5 rounded text-gray-400 font-mono group-hover:text-gray-600">
                                    ⌘ K
                                </span>
                            </button>
                        </div>

                        {/* Search Icon (Mobile) */}
                        <button
                            onClick={() => setIsSearchOpen(true)}
                            className="sm:hidden p-2 text-gray-600"
                        >
                            <Search className="w-5 h-5" />
                        </button>

                        {/* Mobile Menu Button */}
                        <div className="lg:hidden flex items-center gap-4">
                            <a href="#" className="text-gray-900 font-medium text-sm">Sign in</a>
                            <button
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                className="p-2 text-gray-900 hover:bg-gray-100 rounded-md"
                            >
                                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                            </button>
                        </div>

                        {/* Mobile Menu Button */}
                        {/* <div className="lg:hidden flex items-center gap-4">
                            <a href="#" className="text-gray-900 font-medium text-sm">Sign in</a>
                            <button
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                className="p-2 text-gray-900 hover:bg-gray-100 rounded-md"
                            >
                                <Menu className="w-6 h-6" />
                            </button>
                        </div> */}
                    </div>
                </div>
            </nav>

            {/* Full Screen Mobile Menu Overlay */}
            <div
                className={`fixed inset-0 z-[60] bg-white transition-opacity duration-300 lg:hidden ${isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                    }`}
                style={{ top: '64px', height: 'calc(100vh - 64px)' }}
            >
                <div className="flex flex-col h-full bg-white">
                    {/* Header with Search */}
                    <div className="px-6 py-4 border-b border-gray-100">
                        <button
                            onClick={() => {
                                setIsMobileMenuOpen(false);
                                setIsSearchOpen(true);
                            }}
                            className="flex items-center gap-3 w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-left text-gray-500 hover:border-blue-400 hover:bg-white transition-all group"
                        >
                            <Search className="w-5 h-5 text-gray-400 group-hover:text-blue-500" />
                            <span className="text-base">Search documentation...</span>
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {/* CTA Buttons - Matching Navbar placement */}
                        <div className="px-6 py-4 space-y-2.5 border-b border-gray-100">
                            <a
                                href="#"
                                className="block w-full px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 transition-colors text-center"
                            >
                                Sign up
                            </a>
                            <a
                                href="#"
                                className="block w-full px-4 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors text-center"
                            >
                                Log in
                            </a>
                        </div>

                        {/* Links */}
                        <div className="py-2">
                            {NAV_LINKS.map((link) => (
                                <MobileMenuItem
                                    key={link.title}
                                    title={link.title}
                                    href={link.href}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* spacer */}
            <div className="h-16" />

            {/* Global Search Modal */}
            <DocsSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
        </>
    );
};

export default DocsNavbar;
