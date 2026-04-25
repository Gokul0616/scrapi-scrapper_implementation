/**
 * PermMultiSelect — Portal-based multi-select component styled like CustomDropdown.
 * Each option has a `label` (short) and `desc` (description shown in dropdown).
 * Selected items render as removable tags inside the trigger button.
 */
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, X, Check } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const PermMultiSelect = ({
  value = [],          // array of selected option values
  onChange,            // (newValueArray) => void
  options = [],        // [{ value, label, desc }]
  placeholder = 'Select permissions…',
  className = '',
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [open, setOpen]     = useState(false);
  const [coords, setCoords] = useState(null);
  const triggerRef = useRef(null);
  const menuRef    = useRef(null);

  /* ── Position ──────────────────────────────────────────────────────────── */
  const calcCoords = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const menuH = Math.min(options.length * 64 + 16, 280);
    const spaceBelow = window.innerHeight - rect.bottom;
    const dropUp = spaceBelow < menuH && rect.top > menuH;
    setCoords({
      left: rect.left,
      top:  dropUp ? rect.top - menuH - 4 : rect.bottom + 4,
      width: rect.width,
      dropUp,
    });
  };

  const toggle = () => {
    if (!open) { calcCoords(); setOpen(true); }
    else setOpen(false);
  };

  /* ── Close on outside click + reposition on scroll ─────────────────────── */
  useEffect(() => {
    if (!open) return;
    const outside = e => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target) &&
        menuRef.current    && !menuRef.current.contains(e.target)
      ) setOpen(false);
    };
    const repos = () => { if (open) calcCoords(); };
    document.addEventListener('mousedown', outside);
    window.addEventListener('scroll', repos, true);
    window.addEventListener('resize', repos);
    return () => {
      document.removeEventListener('mousedown', outside);
      window.removeEventListener('scroll', repos, true);
      window.removeEventListener('resize', repos);
    };
  }, [open]);

  /* ── Toggle option ─────────────────────────────────────────────────────── */
  const toggleOption = (optValue) => {
    if (value.includes(optValue)) onChange(value.filter(v => v !== optValue));
    else onChange([...value, optValue]);
  };

  const removeTag = (e, optValue) => {
    e.stopPropagation();
    onChange(value.filter(v => v !== optValue));
  };

  const selected = options.filter(o => value.includes(o.value));

  /* ── Portal menu ───────────────────────────────────────────────────────── */
  const menu = coords && open && (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        top:   coords.top,
        left:  coords.left,
        width: Math.max(coords.width, 220),
        zIndex: 99999,
      }}
      className={`rounded-lg border shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200
        ${isDark ? 'bg-[#121212] border-border' : 'bg-white border-gray-200'}`}
    >
      <div className="py-1 max-h-[280px] overflow-y-auto">
        {options.map(opt => {
          const isSelected = value.includes(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggleOption(opt.value)}
              className={`w-full text-left px-3 py-2 flex items-start gap-3 transition-colors
                ${isSelected
                  ? isDark ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white'
                  : isDark ? 'hover:bg-muted/50 text-foreground' : 'hover:bg-gray-50 text-gray-800'
                }`}
            >
              {/* Checkbox indicator */}
              <div className={`mt-0.5 w-3.5 h-3.5 shrink-0 rounded border flex items-center justify-center
                ${isSelected
                  ? 'bg-white border-white'
                  : isDark ? 'border-muted-foreground' : 'border-gray-300'
                }`}>
                {isSelected && <Check className="w-2.5 h-2.5 text-blue-600" strokeWidth={3} />}
              </div>
              <div className="min-w-0">
                <p className={`text-[12px] font-semibold leading-tight
                  ${isSelected ? 'text-white' : isDark ? 'text-foreground' : 'text-gray-900'}`}>
                  {opt.label}
                </p>
                {opt.desc && (
                  <p className={`text-[11px] mt-0.5 leading-tight
                    ${isSelected ? 'text-blue-100' : isDark ? 'text-muted-foreground' : 'text-gray-500'}`}>
                    {opt.desc}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className={`relative ${className}`}>
      {/* Trigger — shows tags or placeholder */}
      <div
        ref={triggerRef}
        onClick={toggle}
        className={`min-h-[36px] flex flex-wrap items-center gap-1.5 px-2.5 py-1.5 pr-8 border rounded-lg text-sm cursor-pointer transition-all relative
          ${isDark
            ? 'bg-card border-border hover:bg-muted/50'
            : 'bg-white border-gray-300 hover:bg-gray-50'
          }`}
      >
        {selected.length === 0 ? (
          <span className={`text-[13px] ${isDark ? 'text-muted-foreground' : 'text-gray-400'}`}>
            {placeholder}
          </span>
        ) : (
          selected.map(opt => (
            <span
              key={opt.value}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-blue-600 text-white"
            >
              {opt.label}
              <button
                type="button"
                onClick={e => removeTag(e, opt.value)}
                className="hover:bg-blue-700 rounded-sm"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))
        )}
        {/* Chevron */}
        <ChevronDown className={`absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none transition-transform
          ${open ? 'rotate-180' : ''}
          ${isDark ? 'text-muted-foreground' : 'text-gray-400'}`}
        />
      </div>

      {open && coords && createPortal(menu, document.body)}
    </div>
  );
};

export default PermMultiSelect;
