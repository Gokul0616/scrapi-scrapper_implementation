import React from 'react';
import { Github, Twitter, Linkedin, Youtube, ExternalLink } from 'lucide-react';

const DocsFooter = () => {
    return (
        <footer className="bg-white border-t border-gray-200 pt-16 pb-12">
            <div className="max-w-[1400px] mx-auto px-4">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 mb-12">
                    {/* Learn */}
                    <div>
                        <h4 className="font-semibold text-gray-900 mb-4">Learn</h4>
                        <ul className="space-y-3 text-sm text-gray-600">
                            <li><a href="#" className="hover:text-blue-600">Academy</a></li>
                            <li><a href="#" className="hover:text-blue-600">Platform</a></li>
                            <li><a href="#" className="hover:text-blue-600">Anti-scraping protections</a></li>
                            <li><a href="#" className="hover:text-blue-600">Web scraping for beginners</a></li>
                        </ul>
                    </div>

                    {/* API */}
                    <div>
                        <h4 className="font-semibold text-gray-900 mb-4">API</h4>
                        <ul className="space-y-3 text-sm text-gray-600">
                            <li><a href="#" className="hover:text-blue-600">Reference</a></li>
                            <li><a href="#" className="hover:text-blue-600">Client for JavaScript</a></li>
                            <li><a href="#" className="hover:text-blue-600">Client for Python</a></li>
                        </ul>
                    </div>

                    {/* SDK */}
                    <div>
                        <h4 className="font-semibold text-gray-900 mb-4">SDK</h4>
                        <ul className="space-y-3 text-sm text-gray-600">
                            <li><a href="#" className="hover:text-blue-600">SDK for JavaScript</a></li>
                            <li><a href="#" className="hover:text-blue-600">SDK for Python</a></li>
                        </ul>
                    </div>

                    {/* Other */}
                    <div>
                        <h4 className="font-semibold text-gray-900 mb-4">Other</h4>
                        <ul className="space-y-3 text-sm text-gray-600">
                            <li><a href="#" className="hover:text-blue-600">CLI</a></li>
                            <li><a href="#" className="hover:text-blue-600">Open source</a></li>
                        </ul>
                    </div>

                    {/* More */}
                    <div>
                        <h4 className="font-semibold text-gray-900 mb-4">More</h4>
                        <ul className="space-y-3 text-sm text-gray-600">
                            <li><a href="#" className="hover:text-blue-600 flex items-center gap-1">Crawlee <ExternalLink className="w-3 h-3" /></a></li>
                            <li><a href="#" className="hover:text-blue-600 flex items-center gap-1">GitHub <ExternalLink className="w-3 h-3" /></a></li>
                            <li><a href="#" className="hover:text-blue-600 flex items-center gap-1">Discord <ExternalLink className="w-3 h-3" /></a></li>
                            <li><a href="#" className="hover:text-blue-600 flex items-center gap-1">Trust Center <ExternalLink className="w-3 h-3" /></a></li>
                        </ul>
                    </div>

                    {/* Logo & Socials */}
                    <div className="lg:col-span-1 flex flex-col items-start gap-4">
                        <a href="/" className="flex items-center gap-2 mb-4">
                            <img src="/logo.png" alt="Scrapi" className="w-8 h-8 opacity-80" />
                            <span className="font-bold text-xl text-gray-900">scrapi</span>
                        </a>
                        <div className="flex items-center gap-4">
                            <a href="#" className="text-gray-400 hover:text-gray-900"><Github className="w-5 h-5" /></a>
                            <a href="#" className="text-gray-400 hover:text-blue-400"><Twitter className="w-5 h-5" /></a>
                            <a href="#" className="text-gray-400 hover:text-blue-700"><Linkedin className="w-5 h-5" /></a>
                            <a href="#" className="text-gray-400 hover:text-red-600"><Youtube className="w-5 h-5" /></a>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default DocsFooter;
