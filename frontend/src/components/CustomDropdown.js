import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search, X } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const CustomDropdown = ({ value, onChange, options, placeholder = 'Select...', searchable = false, className = "", testId, disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLabel, setSelectedLabel] = useState('');
  const [coords, setCoords] = useState(null);
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);
  const { theme } = useTheme();

  useEffect(() => {
    const selected = options.find(opt => opt.value === value);
    setSelectedLabel(selected ? selected.label : (value || placeholder));
  }, [value, options, placeholder]);

  const updatePosition = () => {
    if (dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const menuHeight = Math.min(options.length * 36 + (searchable ? 50 : 0) + 10, 240); // Estimate
      const dropUp = spaceBelow < menuHeight && rect.top > menuHeight;

      setCoords({
        top: dropUp ? rect.top + window.scrollY : rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
        dropUp
      });
    }
  };

  const toggleDropdown = () => {
    if (!isOpen) {
      updatePosition();
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        const menu = document.getElementById('custom-dropdown-portal-root');
        if (menu && !menu.contains(event.target)) {
          setIsOpen(false);
        }
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);

      if (searchable) {
        setTimeout(() => searchInputRef.current?.focus(), 10);
      }
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen, searchable, options.length]);

  const filteredOptions = useMemo(() => {
    if (!searchable || !searchQuery) return options;
    const query = searchQuery.toLowerCase();
    return options.filter(opt =>
      opt.label.toLowerCase().includes(query) ||
      opt.value.toString().toLowerCase().includes(query)
    );
  }, [options, searchable, searchQuery]);

  const handleSelect = (optionValue) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchQuery('');
  };

  const isDark = theme === 'dark';

  const menuContent = coords && (
    <div
      id="custom-dropdown-portal-root"
      style={{
        position: 'absolute',
        top: coords.dropUp ? 'auto' : `${coords.top + 4}px`,
        bottom: coords.dropUp ? `${window.innerHeight - coords.top + 4}px` : 'auto',
        left: `${Math.min(coords.left, window.innerWidth - Math.max(200, coords.width) - 16)}px`,
        width: `${Math.max(coords.width, 200)}px`,
        zIndex: 99999,
      }}
      className={`rounded-lg border shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top ${coords.dropUp ? 'origin-bottom' : 'origin-top'
        } ${isDark ? 'bg-[#121212] border-border' : 'bg-white border-gray-200'}`}
    >
      {searchable && (
        <div className={`p-2 border-b ${isDark ? 'border-border' : 'border-gray-100'}`}>
          <div className="relative">
            <Search className={`absolute left-2 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 ${isDark ? 'text-muted-foreground' : 'text-gray-400'}`} />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-7 pr-7 py-1.5 text-[12px] rounded-md border focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${isDark
                ? 'bg-muted/50 border-border text-foreground placeholder:text-muted-foreground'
                : 'bg-gray-50 border-gray-200 text-gray-700 placeholder:text-gray-400'
                }`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 transform -translate-y-1/2"
              >
                <X className={`w-3 h-3 ${isDark ? 'text-muted-foreground' : 'text-gray-400'}`} />
              </button>
            )}
          </div>
        </div>
      )}

      <div className="max-h-[240px] overflow-y-auto py-1 custom-scrollbar">
        {filteredOptions.length > 0 ? (
          filteredOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleSelect(option.value)}
              className={`w-full text-left px-3 py-2 text-[12px] transition-colors flex items-center justify-between group ${value === option.value
                ? isDark
                  ? 'bg-blue-600/20 text-blue-400 font-medium'
                  : 'bg-blue-50 text-blue-600 font-medium'
                : isDark
                  ? 'text-foreground hover:bg-muted/50'
                  : 'text-gray-700 hover:bg-gray-100'
                }`}
            >
              <span className="truncate">{option.label}</span>
              {value === option.value && (
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
              )}
            </button>
          ))
        ) : (
          <div className="px-3 py-4 text-[12px] text-muted-foreground text-center">
            No results found
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={toggleDropdown}
        data-testid={testId}
        className={`appearance-none h-9 pl-3 pr-8 border rounded-lg text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all w-full text-left truncate ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
          } ${isDark
            ? 'bg-card border-border text-foreground hover:bg-muted/50'
            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
      >
        <span className="truncate block">{selectedLabel}</span>
        <ChevronDown className={`absolute right-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 pointer-events-none transition-transform ${isOpen ? 'rotate-180' : ''
          } ${isDark ? 'text-muted-foreground' : 'text-gray-400'}`} />
      </button>

      {isOpen && coords && createPortal(menuContent, document.body)}
    </div>
  );
};

export default CustomDropdown;
