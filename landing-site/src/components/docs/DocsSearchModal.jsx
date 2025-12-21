import React, { useState, useEffect, useRef } from 'react';
import { Search, FileText, Scale, Loader2, Command, Hash, Book, Clock, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useRecentSearches } from '../../hooks/useAppConfig';

const DocsSearchModal = ({ isOpen, onClose }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef(null);
    const modalRef = useRef(null);
    const resultRefs = useRef([]);
    const navigate = useNavigate();

    // Focus input on open and reset state
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => {
                inputRef.current?.focus();
            }, 50);
            document.body.style.overflow = 'hidden';
            setSelectedIndex(0);
        } else {
            document.body.style.overflow = 'unset';
            setQuery('');
            setResults([]);
        }
    }, [isOpen]);

    // Group results by category
    const groupedResults = results.reduce((acc, result) => {
        const category = result.category || 'Other';
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(result);
        return acc;
    }, {});

    // Flatten results for keyboard navigation
    const flatResults = results;

    // Handle keyboard navigation
    useEffect(() => {
        const handleKeyDown = (event) => {
            if (!isOpen) return;

            if (event.key === 'Escape') {
                onClose();
                return;
            }

            if (flatResults.length === 0) return;

            if (event.key === 'ArrowDown') {
                event.preventDefault();
                // Don't loop - stop at the last item
                setSelectedIndex((prev) => Math.min(prev + 1, flatResults.length - 1));
            } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                // Don't loop - stop at the first item
                setSelectedIndex((prev) => Math.max(prev - 1, 0));
            } else if (event.key === 'Enter') {
                event.preventDefault();
                if (flatResults[selectedIndex]) {
                    handleSelect(flatResults[selectedIndex].url);
                }
            }
        };

        const handleClickOutside = (event) => {
            if (modalRef.current && !modalRef.current.contains(event.target)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose, flatResults, selectedIndex]);

    // Scroll selected item into view with better positioning
    useEffect(() => {
        if (resultRefs.current[selectedIndex]) {
            resultRefs.current[selectedIndex].scrollIntoView({
                behavior: 'smooth',
                block: 'center',
                inline: 'nearest',
            });
        }
    }, [selectedIndex]);

    // Debounced Search
    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (query.trim().length >= 2) {
                setLoading(true);
                setSelectedIndex(0);
                try {
                    const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
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

    const highlightText = (text, query) => {
        if (!query) return text;
        const parts = text.split(new RegExp(`(${query})`, 'gi'));
        return parts.map((part, index) =>
            part.toLowerCase() === query.toLowerCase() ? (
                <span key={index} className="text-blue-600 font-semibold bg-blue-100">{part}</span>
            ) : (
                part
            )
        );
    };

    const getResultIcon = (type) => {
        switch (type) {
            case 'legal':
                return <Scale className="w-4 h-4" />;
            case 'api':
                return <Hash className="w-4 h-4" />;
            case 'guide':
                return <Book className="w-4 h-4" />;
            default:
                return <FileText className="w-4 h-4" />;
        }
    };

    if (!isOpen) return null;

    const selectedResult = flatResults[selectedIndex];

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] px-4 backdrop-blur-sm bg-gray-900/30">
            <div
                ref={modalRef}
                className="w-full max-w-5xl bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[75vh] animate-in fade-in zoom-in-95 duration-200"
            >
                {/* Search Header */}
                <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-200 bg-white">
                    <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    <input
                        ref={inputRef}
                        type="search"
                        placeholder="Search Scrapi Docs..."
                        className="flex-1 text-base bg-transparent border-none outline-none placeholder:text-gray-400 text-gray-900"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    <button
                        onClick={onClose}
                        className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-500 bg-gray-50 border border-gray-200 rounded hover:bg-gray-100 transition-colors"
                    >
                        ESC
                    </button>
                </div>

                {/* Results Container */}
                <div className="flex-1 overflow-hidden flex">
                    {/* Left Side - Results List */}
                    <div className="flex-1 overflow-y-auto border-r border-gray-200">
                        {loading ? (
                            <div className="flex items-center justify-center py-16 text-gray-400 gap-2">
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span className="text-sm">Searching...</span>
                            </div>
                        ) : query.length < 2 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                                <Command className="w-12 h-12 mb-4 opacity-20" />
                                <p className="text-sm">Type at least 2 characters to search</p>
                            </div>
                        ) : results.length > 0 ? (
                            <div>
                                {Object.entries(groupedResults).map(([category, categoryResults]) => (
                                    <div key={category}>
                                        {/* Category Header */}
                                        <div className="sticky top-0 bg-blue-500 text-white px-4 py-2 text-xs font-semibold uppercase tracking-wide z-10">
                                            {category}
                                        </div>
                                        {/* Category Results */}
                                        <div>
                                            {categoryResults.map((result) => {
                                                const globalIndex = flatResults.indexOf(result);
                                                const isSelected = globalIndex === selectedIndex;
                                                return (
                                                    <button
                                                        key={globalIndex}
                                                        ref={(el) => (resultRefs.current[globalIndex] = el)}
                                                        onClick={() => handleSelect(result.url)}
                                                        onMouseEnter={() => setSelectedIndex(globalIndex)}
                                                        className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-all border-b border-gray-100 ${
                                                            isSelected 
                                                                ? 'bg-blue-50 border-l-4 border-l-blue-600' 
                                                                : 'hover:bg-gray-50 border-l-4 border-l-transparent'
                                                        }`}
                                                    >
                                                        <div className={`mt-0.5 p-1.5 rounded transition-colors ${
                                                            isSelected ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                                                        }`}>
                                                            {getResultIcon(result.type)}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className={`text-sm mb-1 ${
                                                                isSelected ? 'font-semibold text-gray-900' : 'font-medium text-gray-800'
                                                            }`}>
                                                                {highlightText(result.title, query)}
                                                            </div>
                                                            {result.breadcrumb && (
                                                                <div className="text-xs text-gray-500 flex items-center gap-1 flex-wrap">
                                                                    {result.breadcrumb.map((crumb, i) => (
                                                                        <React.Fragment key={i}>
                                                                            <span className={i === result.breadcrumb.length - 1 ? 'text-blue-600 font-medium' : ''}>
                                                                                {crumb}
                                                                            </span>
                                                                            {i < result.breadcrumb.length - 1 && (
                                                                                <span className="text-gray-400">›</span>
                                                                            )}
                                                                        </React.Fragment>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                        {isSelected && (
                                                            <div className="mt-1 text-blue-600">
                                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                                </svg>
                                                            </div>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                                <p className="text-sm mb-2">No results found for "{query}"</p>
                                <button
                                    onClick={() => setQuery('')}
                                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                                >
                                    Clear search
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Right Side - Preview Pane */}
                    <div className="hidden lg:block w-[400px] bg-gray-50 overflow-y-auto">
                        {selectedResult ? (
                            <div className="p-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                    {selectedResult.title}
                                </h3>
                                <div className="text-xs text-gray-500 mb-4">
                                    {selectedResult.breadcrumb && selectedResult.breadcrumb.join(' › ')}
                                </div>
                                {selectedResult.description && (
                                    <div className="text-sm text-gray-700 leading-relaxed mb-4">
                                        {selectedResult.description}
                                    </div>
                                )}
                                {selectedResult.subtitle && (
                                    <p className="text-sm text-gray-600 mb-4">{selectedResult.subtitle}</p>
                                )}
                                {selectedResult.content && (
                                    <div className="text-sm text-gray-700 leading-relaxed space-y-2">
                                        {selectedResult.content.split('\n').slice(0, 5).map((line, i) => (
                                            <p key={i}>{line}</p>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-400 text-sm p-6 text-center">
                                Select a result to see preview
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-50 px-4 py-2.5 text-xs text-gray-500 border-t border-gray-200 flex items-center justify-center gap-6">
                    <span className="flex items-center gap-1.5">
                        <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-xs font-mono shadow-sm">↵</kbd>
                        <span>to select</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                        <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-xs font-mono shadow-sm">↑</kbd>
                        <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-xs font-mono shadow-sm">↓</kbd>
                        <span>to navigate</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                        <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-xs font-mono shadow-sm">esc</kbd>
                        <span>to close</span>
                    </span>
                </div>
            </div>
        </div>
    );
};

export default DocsSearchModal;
