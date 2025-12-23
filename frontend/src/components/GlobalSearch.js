import React, { useState, useEffect, useRef } from 'react';
import { Search, FileText, Scale, ArrowRight, Loader2, Command } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';

const GlobalSearch = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const modalRef = useRef(null);
  const navigate = useNavigate();
  const { theme } = useTheme();

  // Get backend URL from environment
  const backendUrl = process.env.REACT_APP_BACKEND_URL || '';

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
          const response = await fetch(`${backendUrl}/api/search?q=${encodeURIComponent(query)}`);
          
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
  }, [query, backendUrl]);

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
    <div 
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4 backdrop-blur-sm"
      style={{ 
        backgroundColor: theme === 'dark' ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.2)'
      }}
    >
      <div
        ref={modalRef}
        className={`w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[70vh] animate-in fade-in zoom-in-95 duration-200 ${
          theme === 'dark' 
            ? 'bg-[#1A1B1E] border border-gray-800' 
            : 'bg-white border border-gray-200'
        }`}
      >
        {/* Search Header */}
        <div className={`flex items-center gap-3 px-4 py-3 border-b ${
          theme === 'dark' ? 'border-gray-800' : 'border-gray-100'
        }`}>
          <Search className={`w-5 h-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-400'}`} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search docs, APIs, and policies..."
            className={`flex-1 text-lg bg-transparent border-none outline-none ${
              theme === 'dark' 
                ? 'text-white placeholder:text-gray-500' 
                : 'text-gray-900 placeholder:text-gray-400'
            }`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <kbd className={`hidden sm:inline-block px-2 py-0.5 text-xs font-semibold rounded-md ${
            theme === 'dark'
              ? 'text-gray-400 bg-gray-800 border border-gray-700'
              : 'text-gray-400 bg-gray-50 border border-gray-200'
          }`}>
            ESC
          </kbd>
        </div>

        {/* Results Area */}
        <div className="flex-1 overflow-y-auto min-h-[100px] p-2">
          {loading ? (
            <div className={`flex items-center justify-center py-12 gap-2 ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-400'
            }`}>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Searching...</span>
            </div>
          ) : query.length < 2 ? (
            <div className={`flex flex-col items-center justify-center py-12 ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-400'
            }`}>
              <Command className="w-10 h-10 mb-4 opacity-20" />
              <p>Type at least 2 characters to search</p>
            </div>
          ) : results.length > 0 ? (
            <div className="space-y-1">
              {results.map((result, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelect(result.url)}
                  className={`w-full flex items-start gap-3 p-3 rounded-lg group text-left transition-colors ${
                    theme === 'dark'
                      ? 'hover:bg-gray-800/50'
                      : 'hover:bg-blue-50'
                  }`}
                  data-testid={`search-result-${idx}`}
                >
                  <div className={`p-2 rounded-md ${
                    result.type === 'legal'
                      ? theme === 'dark'
                        ? 'bg-purple-900/30 text-purple-400'
                        : 'bg-purple-100 text-purple-600'
                      : theme === 'dark'
                        ? 'bg-blue-900/30 text-blue-400'
                        : 'bg-blue-100 text-blue-600'
                  }`}>
                    {result.type === 'legal' ? (
                      <Scale className="w-5 h-5" />
                    ) : (
                      <FileText className="w-5 h-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`font-medium ${
                        theme === 'dark'
                          ? 'text-white group-hover:text-blue-400'
                          : 'text-gray-900 group-hover:text-blue-700'
                      }`}>
                        {result.title}
                      </span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                        theme === 'dark'
                          ? 'bg-gray-800 text-gray-400 border border-gray-700'
                          : 'bg-gray-100 text-gray-500 border border-gray-200'
                      }`}>
                        {result.category}
                      </span>
                    </div>
                    <p className={`text-sm line-clamp-1 ${
                      theme === 'dark'
                        ? 'text-gray-400 group-hover:text-gray-300'
                        : 'text-gray-500 group-hover:text-blue-600/80'
                    }`}>
                      {result.subtitle}
                    </p>
                  </div>
                  <ArrowRight className={`w-4 h-4 mt-2 opacity-0 group-hover:opacity-100 transition-opacity ${
                    theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                  }`} />
                </button>
              ))}
            </div>
          ) : (
            <div className={`flex flex-col items-center justify-center py-12 ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
            }`}>
              <p>No results found for "{query}"</p>
              <button
                onClick={() => setQuery('')}
                className={`mt-2 text-sm font-medium ${
                  theme === 'dark'
                    ? 'text-blue-400 hover:text-blue-300'
                    : 'text-blue-600 hover:text-blue-700'
                }`}
              >
                Clear search
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`px-4 py-2 text-xs border-t flex items-center justify-between ${
          theme === 'dark'
            ? 'bg-gray-900/50 text-gray-500 border-gray-800'
            : 'bg-gray-50 text-gray-400 border-gray-100'
        }`}>
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

export default GlobalSearch;
