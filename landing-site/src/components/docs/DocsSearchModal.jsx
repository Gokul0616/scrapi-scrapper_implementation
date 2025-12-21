import React, { useState, useEffect, useRef } from 'react';
import { Search, FileText, Scale, ArrowRight, Loader2, Command } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const DocsSearchModal = ({ isOpen, onClose }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const inputRef = useRef(null);
    const modalRef = useRef(null);
    const navigate = useNavigate();

    // Focus input on open
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => {
                inputRef.current?.focus();
            }, 50);
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
    }, [isOpen]);

    // Handle outside click and Escape key
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (modalRef.current && !modalRef.current.contains(event.target)) {
                onClose();
            }
        };

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleKeyDown);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);

    // Debounced Search
    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (query.trim().length >= 2) {
                setLoading(true);
                try {
                    // In development, this URL should be to your backend port (e.g., 8000)
                    // Adjust if you have a proxy set up in Vite
                    const response = await fetch(`http://localhost:8000/api/search?q=${encodeURIComponent(query)}`);
                    if (response.ok) {
                        const data = await response.json();
                        setResults(data.results || []);
                    } else {
                        console.error('Search failed');
                        setResults([]);
                    }
                } catch (error) {
                    console.error('Search error:', error);
                    setResults([]);
                } finally {
                    setLoading(false);
                }
            } else {
                setResults([]);
            }
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [query]);

    const handleSelect = (url) => {
        onClose();
        if (url.startsWith('http')) {
            window.location.href = url;
        } else {
            navigate(url);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4 backdrop-blur-sm bg-gray-900/20">
            <div
                ref={modalRef}
                className="w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[70vh] animate-in fade-in zoom-in-95 duration-200"
            >
                {/* Search Header */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
                    <Search className="w-5 h-5 text-gray-400" />
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Search docs, APIs, and policies..."
                        className="flex-1 text-lg bg-transparent border-none outline-none placeholder:text-gray-400 text-gray-900"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    <kbd className="hidden sm:inline-block px-2 py-0.5 text-xs font-semibold text-gray-400 bg-gray-50 border border-gray-200 rounded-md">
                        ESC
                    </kbd>
                </div>

                {/* Results Area */}
                <div className="flex-1 overflow-y-auto min-h-[100px] p-2">
                    {loading ? (
                        <div className="flex items-center justify-center py-12 text-gray-400 gap-2">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>Searching...</span>
                        </div>
                    ) : query.length < 2 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                            <Command className="w-10 h-10 mb-4 opacity-20" />
                            <p>Type at least 2 characters to search</p>
                        </div>
                    ) : results.length > 0 ? (
                        <div className="space-y-1">
                            {results.map((result, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleSelect(result.url)}
                                    className="w-full flex items-start gap-3 p-3 rounded-lg hover:bg-blue-50 group text-left transition-colors"
                                >
                                    <div className={`p-2 rounded-md ${result.type === 'legal' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                                        {result.type === 'legal' ? <Scale className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span className="font-medium text-gray-900 group-hover:text-blue-700">
                                                {result.title}
                                            </span>
                                            <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded-full border border-gray-200">
                                                {result.category}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-500 line-clamp-1 group-hover:text-blue-600/80">
                                            {result.subtitle}
                                        </p>
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity mt-2" />
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                            <p>No results found for "{query}"</p>
                            <button
                                onClick={() => setQuery('')}
                                className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                            >
                                Clear search
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="bg-gray-50 px-4 py-2 text-xs text-gray-400 border-t border-gray-100 flex items-center justify-between">
                    <span>Search by Scrapi</span>
                    <div className="flex gap-4">
                        <span><span className="font-semibold">↑↓</span> to navigate</span>
                        <span><span className="font-semibold">↵</span> to select</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DocsSearchModal;
