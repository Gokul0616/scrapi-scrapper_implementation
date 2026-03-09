import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search,
  FileText,
  Scale,
  ArrowRight,
  Loader2,
  Command,
  Play,
  Database,
  Clock,
  Zap,
  ChevronRight,
  Hash,
  AtSign,
  Slash,
  ArrowUp,
  ArrowDown,
  CornerDownLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useModal } from '../contexts/ModalContext';
import GlobalModal from './GlobalModal';

const GlobalSearch = () => {
  const { isModalOpen, closeModal } = useModal();
  const isOpen = isModalOpen('global-search');
  const onClose = closeModal;
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [quickActions, setQuickActions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mode, setMode] = useState('search'); // 'search', 'actions', 'recent'

  const inputRef = useRef(null);
  const modalRef = useRef(null);
  const resultsRef = useRef(null);
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
      setQuery('');
      setSelectedIndex(0);
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
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        const maxIndex = Math.max(results.length, recentSearches.length, quickActions.length) - 1;
        setSelectedIndex(prev => Math.min(prev + 1, maxIndex));
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (event.key === 'Enter') {
        event.preventDefault();
        handleSelectByIndex(selectedIndex);
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
  }, [isOpen, onClose, selectedIndex, results, recentSearches, quickActions]);

  // Scroll selected item into view
  useEffect(() => {
    if (resultsRef.current) {
      const selectedElement = resultsRef.current.children[selectedIndex];
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex]);

  // Debounced Search
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (isOpen && query.trim()) {
        await performSearch(query);
      } else if (isOpen && !query.trim()) {
        // Clear results when query is empty
        setResults([]);
        setRecentSearches([]);
        setQuickActions([]);
        setMode('search');
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query, isOpen]);

  const performSearch = async (searchQuery) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${backendUrl}/api/scrapi-global-search?q=${encodeURIComponent(searchQuery)}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setResults(data.results || []);
        setRecentSearches(data.recent || []);
        setQuickActions(data.quick_actions || []);
        setMode(data.mode || 'search');
        setSelectedIndex(0);
      } else {
        console.error('Search failed');
        setResults([]);
        setRecentSearches([]);
        setQuickActions([]);
      }
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
      setRecentSearches([]);
      setQuickActions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectByIndex = (index) => {
    const allItems = [...(mode === 'actions' ? [] : recentSearches), ...results, ...quickActions];
    const item = allItems[index];
    if (item) {
      handleSelect(item);
    }
  };

  const handleSelect = useCallback(async (item) => {
    // Save to recent searches if it's not already a recent search
    if (item.type !== 'recent' && query.trim()) {
      try {
        const token = localStorage.getItem('token');
        await fetch(`${backendUrl}/api/scrapi-global-search/recent`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            query: query,
            result_type: item.type,
            result_id: item.metadata?.actor_id || item.metadata?.run_id || item.url
          })
        });
      } catch (error) {
        console.error('Failed to save recent search:', error);
      }
    }

    onClose();

    // Navigate to the URL
    if (item.url) {
      if (item.url.startsWith('http')) {
        window.location.href = item.url;
      } else {
        navigate(item.url);
      }
    } else if (item.query) {
      // Handle recent search by re-searching
      setQuery(item.query);
      await performSearch(item.query);
    }
  }, [query, backendUrl, navigate, onClose]);

  const getIcon = (type) => {
    const iconMap = {
      actor: Play,
      run: Play,
      dataset: Database,
      doc: FileText,
      legal: Scale,
      action: Zap,
      recent: Clock
    };

    const IconComponent = iconMap[type] || FileText;
    return <IconComponent className="w-5 h-5" />;
  };

  const getTypeColor = (type) => {
    const colors = {
      actor: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
      run: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
      dataset: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
      doc: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400',
      legal: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
      action: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400',
      recent: 'bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400'
    };

    return colors[type] || 'bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400';
  };

  const renderEmptyState = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Searching...</span>
        </div>
      );
    }

    if (!query) {
      return (
        <div className="px-4 py-8 text-muted-foreground">
          <div className="flex flex-col items-center mb-6">
            <Command className="w-12 h-12 mb-4 opacity-20" />
            <p className="text-base font-medium mb-2">Search Scrapi</p>
            <p className="text-sm text-center">Find actors, runs, schedules, and more</p>
          </div>

          <div className="space-y-3 text-sm">
            <div>
              <p className="font-semibold mb-2 text-foreground">
                Search prefixes:
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <kbd className="px-2 py-1 rounded font-mono bg-muted text-muted-foreground">&gt;</kbd>
                  <span>Quick actions (e.g., &gt;create, &gt;view)</span>
                </div>
                <div className="flex items-center gap-3">
                  <kbd className="px-2 py-1 rounded font-mono bg-muted text-muted-foreground">@</kbd>
                  <span>Search actors (e.g., @google, @amazon)</span>
                </div>
                <div className="flex items-center gap-3">
                  <kbd className="px-2 py-1 rounded font-mono bg-muted text-muted-foreground">#</kbd>
                  <span>Search runs (e.g., #succeeded, #failed)</span>
                </div>
                <div className="flex items-center gap-3">
                  <kbd className="px-2 py-1 rounded font-mono bg-muted text-muted-foreground">/</kbd>
                  <span>Search docs (e.g., /api, /guide)</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-border">
              <p className="font-semibold mb-2 text-foreground">
                Or just type to search everything
              </p>
              <p className="text-xs">Try searching for actor names, run statuses, or documentation topics</p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <p>No results found for "{query}"</p>
        <button
          onClick={() => setQuery('')}
          className="mt-2 text-sm font-medium text-primary hover:text-primary/80"
        >
          Clear search
        </button>
      </div>
    );
  };

  const renderResult = (result, index) => {
    const isSelected = index === selectedIndex;


    return (
      <button
        key={`${result.type}-${index}`}
        onClick={() => handleSelect(result)}
        className={`w-full flex items-start gap-3 p-3 rounded-lg group text-left transition-all ${isSelected
          ? 'bg-blue-50 border border-blue-200 dark:bg-blue-900/30 dark:border-blue-700/50'
          : 'hover:bg-gray-50 border border-transparent dark:hover:bg-gray-800/50'
          }`}
        data-testid={`search-result-${index}`}
      >
        <div className={`p-2 rounded-md ${getTypeColor(result.type)}`}>
          {getIcon(result.type)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`font-medium truncate ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-foreground'
              }`}>
              {result.title}
            </span>
            {result.category && (
              <span className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 bg-muted text-muted-foreground border border-border">
                {result.category}
              </span>
            )}
          </div>
          {result.subtitle && (
            <p className={`text-sm line-clamp-1 ${isSelected ? 'text-blue-600/80 dark:text-gray-300' : 'text-muted-foreground'
              }`}>
              {result.subtitle}
            </p>
          )}
        </div>

        {isSelected ? (
          <CornerDownLeft className="w-4 h-4 mt-2 flex-shrink-0 text-blue-600 dark:text-blue-400" />
        ) : (
          <ChevronRight className="w-4 h-4 mt-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 text-muted-foreground" />
        )}
      </button>
    );
  };

  if (!isOpen) return null;

  const allItems = [...(mode === 'actions' ? [] : recentSearches), ...results, ...quickActions];
  const hasRecentSearches = recentSearches.length > 0 && !query;
  const hasResults = results.length > 0;
  const hasQuickActions = quickActions.length > 0;

  return (
    <GlobalModal
      modalId="global-search"
      size="md"
      className="max-w-2xl bg-background"
      showCloseButton={false}
      customHeader={
        <div className="flex items-center gap-3 w-full">
          <Search className="w-5 h-5 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search actors, runs, schedules... or type > @ # / for filters"
            className="flex-1 text-lg bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <kbd className="hidden sm:inline-block px-2 py-0.5 text-xs font-semibold rounded-md text-muted-foreground bg-muted border border-border">
            ESC
          </kbd>
        </div>
      }
      customFooter={
        <div className="flex items-center justify-between text-muted-foreground w-full">
          <div className="flex gap-4">
            <span className="flex items-center gap-1">
              <ArrowUp className="w-3 h-3" />
              <ArrowDown className="w-3 h-3" />
              <span className="ml-1">navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <CornerDownLeft className="w-3 h-3" />
              <span className="ml-1">select</span>
            </span>
          </div>
          <span>Scrapi Search</span>
        </div>
      }
    >
      {/* Results Area */}
      <div className="flex-1 overflow-y-auto min-h-[200px] max-h-[calc(70vh-120px)]" ref={resultsRef}>
        {(!hasResults && !hasRecentSearches && !hasQuickActions) ? (
          renderEmptyState()
        ) : (
          <div className="p-2">
            {/* Recent Searches */}
            {hasRecentSearches && (
              <div className="mb-3">
                <div className="px-3 py-1 text-xs font-semibold uppercase tracking-wide flex items-center justify-between text-muted-foreground">
                  <span>Recent Searches</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {recentSearches.length} {recentSearches.length === 1 ? 'item' : 'items'}
                  </span>
                </div>
                <div className="space-y-1 mt-1">
                  {recentSearches.map((item, idx) => renderResult(item, idx))}
                </div>
              </div>
            )}

            {/* Results */}
            {hasResults && (
              <div className="mb-3">
                {hasRecentSearches && (
                  <div className="px-3 py-1 text-xs font-semibold uppercase tracking-wide flex items-center justify-between text-muted-foreground">
                    <span>{mode === 'actions' ? 'Quick Actions' : 'Search Results'}</span>
                    <span className="text-xs font-normal text-muted-foreground">
                      {results.length} {results.length === 1 ? 'result' : 'results'}
                    </span>
                  </div>
                )}
                <div className="space-y-1 mt-1">
                  {results.map((item, idx) => renderResult(item, idx + recentSearches.length))}
                </div>
              </div>
            )}

            {/* Quick Actions */}
            {hasQuickActions && (
              <div>
                <div className="px-3 py-1 text-xs font-semibold uppercase tracking-wide flex items-center justify-between text-muted-foreground">
                  <span>Quick Actions</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {quickActions.length} available
                  </span>
                </div>
                <div className="space-y-1 mt-1">
                  {quickActions.map((item, idx) => renderResult(item, idx + recentSearches.length + results.length))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </GlobalModal>
  );
};

export default GlobalSearch;
