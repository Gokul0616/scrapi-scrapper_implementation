import React, { useState } from 'react';
import { Search, ChevronDown, MessageSquare } from 'lucide-react';
import DocsSearchModal from './DocsSearchModal';

const DocsNavbar = () => {
    const [isSearchOpen, setIsSearchOpen] = useState(false);

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

    return (
        <>
            <nav className="fixed w-full top-0 z-50 bg-white border-b border-gray-200 h-16">
                <div className="max-w-[1400px] mx-auto px-4 h-full flex items-center justify-between">
                    {/* Left Side: Logo & Nav Links */}
                    <div className="flex items-center gap-8">
                        <a href="/" className="flex items-center gap-2">
                            <img src="/logo.png" alt="Scrapi" className="w-8 h-8 font-bold" />
                            <span className="text-xl font-bold text-gray-900">
                                scrapi<span className="font-light">docs</span>
                            </span>
                        </a>

                        <div className="hidden lg:flex items-center gap-6 text-sm font-medium text-gray-600">
                            <a href="/academy" className="hover:text-gray-900">Academy</a>
                            <a href="/platform" className="hover:text-gray-900">Platform</a>

                            <div className="relative group cursor-pointer py-5">
                                <span className="flex items-center gap-1 hover:text-gray-900">
                                    API <ChevronDown className="w-3 h-3 opacity-50" />
                                </span>
                            </div>

                            <div className="relative group cursor-pointer py-5">
                                <span className="flex items-center gap-1 hover:text-gray-900">
                                    SDK <ChevronDown className="w-3 h-3 opacity-50" />
                                </span>
                            </div>

                            <a href="/cli" className="hover:text-gray-900">CLI</a>

                            <div className="relative group cursor-pointer py-5">
                                <span className="flex items-center gap-1 hover:text-gray-900">
                                    Open source <ChevronDown className="w-3 h-3 opacity-50" />
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Right Side: Tools & Actions */}
                    <div className="flex items-center gap-4">
                        {/* Discord Icon */}
                        <a href="#" className="hidden sm:block text-gray-500 hover:text-[#5865F2] transition-colors">
                            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037 13.568 13.568 0 0 0-1.487 3.05.076.076 0 0 1 .15-.027c.438.452 1.353 1.458 1.438 1.547 2.126 2.193 2.126 5.753 0 7.946-.201.206-.412.399-.63.578a.071.071 0 0 0-.012.115c.6.49 2.227 1.706 2.227 1.706a.073.073 0 0 0 .1.006c2.448-1.54 3.447-3.923 3.447-3.923a.073.073 0 0 0-.03-.092 14.851 14.851 0 0 0-3.32-1.742l-.027-.01zM8.336 15.655c-1.332 0-2.427-1.225-2.427-2.73 0-1.504 1.073-2.73 2.405-2.73 1.354 0 2.449 1.226 2.427 2.73 0 1.505-1.073 2.73-2.405 2.73zm7.323 0c-1.332 0-2.427-1.225-2.427-2.73 0-1.504 1.073-2.73 2.405-2.73 1.354 0 2.449 1.226 2.427 2.73 0 1.505-1.073 2.73-2.405 2.73z" />
                                <path d="M19.165 4.908c-1.67-1.464-3.667-2.128-5.366-2.28 0 0-.106-.01-.15.068-.266.49-.575 1.109-.785 1.603-1.85-.276-3.702-.276-5.508 0-.233-.526-.552-1.156-.838-1.635-.043-.075-.15-.067-.15-.067-1.699.152-3.696.816-5.366 2.28-.022.02-.034.048-.034.078 0 0-2.831 5.176-1.505 10.556 0 .01.01.02.02.03 2.016 1.48 3.969 2.38 5.862 2.97.042.014.076-.017.098-.052a11.583 11.583 0 0 0 .97-1.583.076.076 0 0 0-.041-.103 7.846 7.846 0 0 1-2.613-1.25.074.074 0 0 1 .006-.124c.18-.135.358-.278.53-.428a.072.072 0 0 1 .077-.01c3.966 1.838 8.28 1.838 12.19 0a.074.074 0 0 1 .078.01c.172.15.35.293.53.428.06.046.07.128.006.124a7.92 7.92 0 0 1-2.64 1.25.074.074 0 0 0-.042.103c.277.534.586 1.053.864 1.583.021.035.056.066.098.052 1.894-.59 3.847-1.49 5.863-2.97.011-.009.022-.019.022-.03 1.326-5.38-1.505-10.556-1.505-10.556a.076.076 0 0 0-.034-.078z" />
                            </svg>
                        </a>

                        {/* Search Bar */}
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

                        {/* Actions */}
                        <a href="#" className="hidden sm:inline-flex px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors">
                            Ask AI
                        </a>
                        <a href="#" className="hidden sm:inline-flex px-4 py-1.5 bg-gray-800 text-white text-sm font-medium rounded-md hover:bg-gray-900 transition-colors">
                            Go to Console
                        </a>
                    </div>
                </div>
            </nav>

            {/* spacer */}
            <div className="h-16" />

            {/* Global Search Modal */}
            <DocsSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
        </>
    );
};

export default DocsNavbar;
