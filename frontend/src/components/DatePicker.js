import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function daysInMonth(year, month) { return new Date(year, month + 1, 0).getDate(); }
function firstDayOfMonth(year, month) { return new Date(year, month, 1).getDay(); }

const DatePicker = ({ value, onChange, minDate, placeholder = 'YYYY-MM-DD', hasError = false }) => {
  const today = new Date();
  const parsed = value ? new Date(value + 'T00:00:00') : null;

  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(parsed ? parsed.getFullYear() : today.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed ? parsed.getMonth() : today.getMonth());
  const [coords, setCoords] = useState(null);

  const inputRef = useRef(null);
  const calRef = useRef(null);

  const minD = minDate ? new Date(minDate + 'T00:00:00') : null;
  const isDisabled = (y, m, d) => minD && new Date(y, m, d) < minD;

  /* ── Position calendar via getBoundingClientRect ───────────────────────── */
  const calcCoords = () => {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    const calH = 295;
    const MARGIN = 8;
    // Prefer opening below; fall back to above if it overflows the bottom
    let top = rect.bottom + 4;
    if (top + calH > window.innerHeight - MARGIN) {
      const topUp = rect.top - calH - 4;
      // Only go above if there's actually room; otherwise just clamp at top
      top = topUp > MARGIN ? topUp : MARGIN;
    }
    setCoords({
      left: Math.min(rect.left, window.innerWidth - 244), // keep within right edge
      top,
      width: rect.width,
    });
  };

  /* ── Toggle open ────────────────────────────────────────────────────────── */
  const toggle = () => {
    if (!open) { calcCoords(); setOpen(true); }
    else setOpen(false);
  };

  /* ── Close on outside click ─────────────────────────────────────────────── */
  useEffect(() => {
    if (!open) return;
    const handle = e => {
      if (
        inputRef.current && !inputRef.current.contains(e.target) &&
        calRef.current && !calRef.current.contains(e.target)
      ) setOpen(false);
    };
    const reposition = () => { if (open) calcCoords(); };
    document.addEventListener('mousedown', handle);
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      document.removeEventListener('mousedown', handle);
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [open]);

  /* ── Navigation ─────────────────────────────────────────────────────────── */
  const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); };
  const nextMonth = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); } else setViewMonth(m => m + 1); };

  /* ── Select date ─────────────────────────────────────────────────────────── */
  const selectDate = d => {
    const mm = String(viewMonth + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    onChange(`${viewYear}-${mm}-${dd}`);
    setOpen(false);
  };

  /* ── Build cell grid ─────────────────────────────────────────────────────── */
  const firstDay = firstDayOfMonth(viewYear, viewMonth);
  const numDays = daysInMonth(viewYear, viewMonth);
  const cells = Array(firstDay).fill(null).concat(Array.from({ length: numDays }, (_, i) => i + 1));
  while (cells.length % 7 !== 0) cells.push(null);

  const selectedDay = parsed && parsed.getFullYear() === viewYear && parsed.getMonth() === viewMonth ? parsed.getDate() : null;
  const todayDay = today.getFullYear() === viewYear && today.getMonth() === viewMonth ? today.getDate() : null;

  /* ── Calendar portal ─────────────────────────────────────────────────────── */
  const calendar = coords && open && (
    <div
      ref={calRef}
      style={{
        position: 'fixed',
        top: coords.top,
        left: coords.left,
        width: 240,
        zIndex: 99999,
      }}
      className="bg-background border border-border rounded-xl shadow-2xl p-2.5 animate-in fade-in zoom-in-95 duration-150 origin-top"
    >
      {/* Month / Year header */}
      <div className="flex items-center justify-between mb-1.5">
        {/* Prev year */}
        <button type="button" onClick={() => setViewYear(y => y - 1)} className="p-1 rounded hover:bg-muted">
          <span className="text-xs text-muted-foreground font-bold leading-none">«</span>
        </button>
        {/* Prev month */}
        <button type="button" onClick={prevMonth} className="p-1 rounded hover:bg-muted">
          <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground" />
        </button>

        <span className="text-xs font-semibold text-foreground">
          {MONTHS[viewMonth]} {viewYear}
        </span>

        {/* Next month */}
        <button type="button" onClick={nextMonth} className="p-1 rounded hover:bg-muted">
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
        {/* Next year */}
        <button type="button" onClick={() => setViewYear(y => y + 1)} className="p-1 rounded hover:bg-muted">
          <span className="text-xs text-muted-foreground font-bold leading-none">»</span>
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-0.5">
        {DAYS.map(d => (
          <div key={d} className="text-center text-[9px] font-semibold text-muted-foreground py-0.5 uppercase tracking-wide">{d}</div>
        ))}
      </div>

      {/* Date cells */}
      <div className="grid grid-cols-7">
        {cells.map((d, i) => {
          if (!d) return <div key={i} className="w-7 h-7" />;
          const disabled = isDisabled(viewYear, viewMonth, d);
          const isSelected = d === selectedDay;
          const isToday = d === todayDay;
          return (
            <button
              key={i}
              type="button"
              disabled={disabled}
              onClick={() => !disabled && selectDate(d)}
              className={`w-7 h-7 mx-auto flex items-center justify-center rounded-md text-[11px] font-medium transition-colors
                ${isSelected
                  ? 'bg-blue-600 text-white'
                  : isToday
                    ? 'border border-blue-500 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30'
                    : disabled
                      ? 'text-muted-foreground/30 cursor-not-allowed'
                      : 'text-foreground hover:bg-muted'
                }`}
            >
              {d}
            </button>
          );
        })}
      </div>

      {/* Footer: Today button */}
      <div className="mt-1.5 pt-1.5 border-t border-border flex justify-end">
        <button
          type="button"
          onClick={() => {
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            const dd = String(today.getDate()).padStart(2, '0');
            onChange(`${today.getFullYear()}-${mm}-${dd}`);
            setOpen(false);
          }}
          className="px-2.5 py-1 text-[11px] font-medium border border-border rounded-md text-foreground hover:bg-muted transition-colors"
        >
          Today
        </button>
      </div>
    </div>
  );

  return (
    <div className="relative">
      {/* Trigger input */}
      <div className="relative">
        <input
          ref={inputRef}
          readOnly
          value={value || ''}
          placeholder={placeholder}
          onClick={toggle}
          className={`w-full border rounded-lg px-3 py-2 text-sm cursor-pointer bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2
            ${hasError ? 'border-destructive focus:ring-destructive/40' : 'border-border focus:ring-ring'}`}
        />
        {value && (
          <button
            type="button"
            onClick={() => { onChange(''); setOpen(false); }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
          >✕</button>
        )}
      </div>

      {/* Portal-rendered calendar — unaffected by modal overflow */}
      {open && coords && createPortal(calendar, document.body)}
    </div>
  );
};

export default DatePicker;
