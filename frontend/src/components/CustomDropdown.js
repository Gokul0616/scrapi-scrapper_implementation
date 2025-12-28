import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const CustomDropdown = ({ value, onChange, options, placeholder = 'Select...', testId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState('');
  const dropdownRef = useRef(null);
  const { theme } = useTheme();

  useEffect(() => {
    const selected = options.find(opt => opt.value === value);
    setSelectedLabel(selected ? selected.label : placeholder);
  }, [value, options, placeholder]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (optionValue) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        data-testid={testId}
        className={`appearance-none h-9 pl-3 pr-8 border rounded-lg text-[12px] font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition-all min-w-[160px] text-left ${
          theme === 'dark'
            ? 'bg-card border-border text-foreground hover:bg-muted/50'
            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
        }`}
      >
        {selectedLabel}
        <ChevronDown className={`absolute right-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 pointer-events-none transition-transform ${
          isOpen ? 'rotate-180' : ''
        } ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-400'}`} />
      </button>

      {isOpen && (
        <div 
          className={`absolute z-50 mt-1 w-full min-w-[180px] rounded-lg border shadow-lg overflow-hidden ${
            theme === 'dark'
              ? 'bg-card border-border'
              : 'bg-white border-gray-200'
          }`}
        >
          <div className="max-h-[280px] overflow-y-auto py-1">
            {options.map((option) => (
              <button
                key={option.value}
                onClick={() => handleSelect(option.value)}
                className={`w-full text-left px-3 py-2 text-[12px] transition-colors ${
                  value === option.value
                    ? theme === 'dark'
                      ? 'bg-blue-600/20 text-blue-400 font-medium'
                      : 'bg-blue-50 text-blue-600 font-medium'
                    : theme === 'dark'
                      ? 'text-foreground hover:bg-muted/50'
                      : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomDropdown;
