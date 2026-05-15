import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

const MONTHS_FULL = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS_SU = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const DAYS_MO = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

function daysInMonth(year, month) { return new Date(year, month + 1, 0).getDate(); }
function firstDayOfMonth(year, month) { return new Date(year, month, 1).getDay(); }
function decadeStart(year) { return Math.floor(year / 10) * 10; }

const LEVEL_ORDER = ['month', 'year', 'decade'];

const SIZE_MAP = {
  xs: { cell: 'w-6 h-6 text-[10px]', header: 'text-[10px]', input: 'px-2 py-1 text-xs', monthCell: 'py-1.5 text-[10px]', gap: 'p-2' },
  sm: { cell: 'w-7 h-7 text-[11px]', header: 'text-xs', input: 'px-3 py-1.5 text-sm', monthCell: 'py-2 text-[11px]', gap: 'p-2.5' },
  md: { cell: 'w-8 h-8 text-xs', header: 'text-sm', input: 'px-3 py-2 text-sm', monthCell: 'py-2.5 text-xs', gap: 'p-3' },
  lg: { cell: 'w-9 h-9 text-sm', header: 'text-sm', input: 'px-4 py-2.5 text-base', monthCell: 'py-3 text-sm', gap: 'p-3.5' },
};

const DatePicker = ({
  value,
  onChange,
  minDate,
  maxDate,
  placeholder = 'Pick a date',
  hasError = false,
  defaultLevel = 'month',
  maxLevel = 'decade',
  clearable = true,
  disabled = false,
  label,
  description,
  error,
  size = 'sm',
  firstDayOfWeek = 0,
  allowDeselect = false,
  hideOutsideDates = false,
  getDayProps,
  getMonthControlProps,
  getYearControlProps,         // (date) => props
}) => {
  const today = new Date();
  const parsed = value ? new Date(value + 'T00:00:00') : null;

  const [open, setOpen] = useState(false);
  const [level, setLevel] = useState(defaultLevel);
  const [viewYear, setViewYear] = useState(parsed ? parsed.getFullYear() : today.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed ? parsed.getMonth() : today.getMonth());
  const [coords, setCoords] = useState(null);

  const inputRef = useRef(null);
  const calRef = useRef(null);

  const minD = minDate ? new Date(minDate + 'T00:00:00') : null;
  const maxD = maxDate ? new Date(maxDate + 'T23:59:59') : null;

  const isDateDisabled = (y, m, d) => {
    const dt = new Date(y, m, d);
    if (minD && dt < minD) return true;
    if (maxD && dt > maxD) return true;
    return false;
  };
  const isMonthDisabled = (y, m) => {
    if (maxD && new Date(y, m, 1) > maxD) return true;
    if (minD && new Date(y, m + 1, 0) < minD) return true;
    return false;
  };
  const isYearDisabled = (y) => {
    if (maxD && new Date(y, 0, 1) > maxD) return true;
    if (minD && new Date(y, 11, 31) < minD) return true;
    return false;
  };

  const s = SIZE_MAP[size] || SIZE_MAP.sm;
  const DAYS = firstDayOfWeek === 1 ? DAYS_MO : DAYS_SU;

  /* ── Position calendar ─────────────────────────────────────────────── */
  const calcCoords = useCallback(() => {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    const GAP = 4;

    // Available space below and above the input
    const spaceBelow = window.innerHeight - rect.bottom - GAP;
    const spaceAbove = rect.top - GAP;

    // Strongly prefer below; only flip above if there is genuinely more room above
    let top;
    if (spaceBelow >= 280 || spaceBelow >= spaceAbove) {
      // Open below
      top = rect.bottom + GAP;
    } else {
      // Open above — clamp so it doesn't go off-screen
      top = Math.max(8, rect.top - 340 - GAP);
    }

    setCoords({
      left: Math.min(rect.left, window.innerWidth - 270),
      top,
      width: rect.width,
    });
  }, []);

  /* ── Toggle ────────────────────────────────────────────────────────── */
  const toggle = () => {
    if (disabled) return;
    if (!open) {
      // Reset view to selected date or today (Mantine behaviour)
      const anchor = parsed || today;
      setViewYear(anchor.getFullYear());
      setViewMonth(anchor.getMonth());
      setLevel(defaultLevel);
      calcCoords();
      setOpen(true);
    } else {
      setOpen(false);
    }
  };

  /* ── Lock nearest scrollable parent while open ───────────────────── */
  useEffect(() => {
    if (!open || !inputRef.current) return;
    // Walk up to find the nearest scrollable ancestor (the modal content area)
    let scrollParent = inputRef.current.parentElement;
    while (scrollParent && scrollParent !== document.body) {
      const { overflowY } = window.getComputedStyle(scrollParent);
      if (overflowY === 'auto' || overflowY === 'scroll') break;
      scrollParent = scrollParent.parentElement;
    }
    if (scrollParent && scrollParent !== document.body) {
      const prev = scrollParent.style.overflowY;
      scrollParent.style.overflowY = 'hidden';
      return () => { scrollParent.style.overflowY = prev; };
    }
  }, [open]);

  /* ── Close on outside click ────────────────────────────────────────── */
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
    window.addEventListener('resize', reposition);
    return () => {
      document.removeEventListener('mousedown', handle);
      window.removeEventListener('resize', reposition);
    };
  }, [open, calcCoords]);

  /* ── Level navigation ──────────────────────────────────────────────── */
  const canZoomOut = (currentLevel) => {
    const ci = LEVEL_ORDER.indexOf(currentLevel);
    const mi = LEVEL_ORDER.indexOf(maxLevel);
    return ci < mi;
  };
  const zoomOut = () => {
    if (level === 'month' && canZoomOut('month')) setLevel('year');
    else if (level === 'year' && canZoomOut('year')) setLevel('decade');
  };

  /* ── Month-level nav ───────────────────────────────────────────────── */
  const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); };
  const nextMonth = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); } else setViewMonth(m => m + 1); };

  /* ── Select date ───────────────────────────────────────────────────── */
  const selectDate = d => {
    const mm = String(viewMonth + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    const newVal = `${viewYear}-${mm}-${dd}`;
    if (allowDeselect && value === newVal) { onChange(''); }
    else { onChange(newVal); }
    setOpen(false);
  };
  const selectMonth = m => { setViewMonth(m); setLevel('month'); };
  const selectYear = y => { setViewYear(y); setLevel('year'); };

  /* ── Header label per level ────────────────────────────────────────── */
  const headerLabel = () => {
    if (level === 'month') return `${MONTHS_FULL[viewMonth]} ${viewYear}`;
    if (level === 'year') return `${viewYear}`;
    const ds = decadeStart(viewYear);
    return `${ds} – ${ds + 9}`;
  };
  const headerPrev = () => {
    if (level === 'month') prevMonth();
    else if (level === 'year') setViewYear(y => y - 1);
    else setViewYear(y => y - 10);
  };
  const headerNext = () => {
    if (level === 'month') nextMonth();
    else if (level === 'year') setViewYear(y => y + 1);
    else setViewYear(y => y + 10);
  };

  /* ── Day grid ──────────────────────────────────────────────────────── */
  const buildDayGrid = () => {
    const fd = firstDayOfMonth(viewYear, viewMonth);
    const shift = firstDayOfWeek === 1 ? (fd === 0 ? 6 : fd - 1) : fd;
    const numDays = daysInMonth(viewYear, viewMonth);

    // Previous month fill
    const prevM = viewMonth === 0 ? 11 : viewMonth - 1;
    const prevY = viewMonth === 0 ? viewYear - 1 : viewYear;
    const prevDays = daysInMonth(prevY, prevM);

    const cells = [];
    for (let i = shift - 1; i >= 0; i--) {
      cells.push({ day: prevDays - i, outside: true, year: prevY, month: prevM });
    }
    for (let d = 1; d <= numDays; d++) {
      cells.push({ day: d, outside: false, year: viewYear, month: viewMonth });
    }
    while (cells.length % 7 !== 0) {
      const nm = viewMonth === 11 ? 0 : viewMonth + 1;
      const ny = viewMonth === 11 ? viewYear + 1 : viewYear;
      cells.push({ day: cells.length - shift - numDays + 1, outside: true, year: ny, month: nm });
    }
    return cells;
  };

  const selectedDay = parsed && parsed.getFullYear() === viewYear && parsed.getMonth() === viewMonth ? parsed.getDate() : null;
  const todayDay = today.getFullYear() === viewYear && today.getMonth() === viewMonth ? today.getDate() : null;

  /* ── Render views ──────────────────────────────────────────────────── */
  const renderDayView = () => {
    const cells = buildDayGrid();
    return (
      <>
        <div className="grid grid-cols-7 mb-0.5">
          {DAYS.map(d => (
            <div key={d} className={`text-center font-semibold text-muted-foreground py-0.5 uppercase tracking-wide ${s.cell.split(' ').find(c => c.startsWith('text-'))}`}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((c, i) => {
            if (c.outside && hideOutsideDates) return <div key={i} className={s.cell.replace(/text-\S+/, '')} />;
            const dis = c.outside || isDateDisabled(c.year, c.month, c.day);
            const isSelected = !c.outside && c.day === selectedDay;
            const isToday = !c.outside && c.day === todayDay;

            const extraProps = getDayProps ? getDayProps(new Date(c.year, c.month, c.day)) : {};
            const extraDisabled = extraProps.disabled;
            const finalDisabled = dis || extraDisabled;

            return (
              <button
                key={i}
                type="button"
                disabled={finalDisabled}
                onClick={() => !finalDisabled && !c.outside && selectDate(c.day)}
                className={`${s.cell} mx-auto flex items-center justify-center rounded-md font-medium transition-all duration-150
                  ${c.outside
                    ? 'text-muted-foreground/25 cursor-default'
                    : isSelected
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30 scale-105'
                      : isToday
                        ? 'border border-blue-500 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30'
                        : finalDisabled
                          ? 'text-muted-foreground/30 cursor-not-allowed'
                          : 'text-foreground hover:bg-muted'
                  }`}
              >
                {c.day}
              </button>
            );
          })}
        </div>
      </>
    );
  };

  const renderMonthView = () => (
    <div className="grid grid-cols-3 gap-1.5 px-1">
      {MONTHS_SHORT.map((m, i) => {
        const dis = isMonthDisabled(viewYear, i);
        const isCurrent = parsed && parsed.getFullYear() === viewYear && parsed.getMonth() === i;
        const isThisMonth = today.getFullYear() === viewYear && today.getMonth() === i;
        const extraProps = getMonthControlProps ? getMonthControlProps(new Date(viewYear, i, 1)) : {};
        const finalDisabled = dis || extraProps.disabled;

        return (
          <button
            key={m}
            type="button"
            disabled={finalDisabled}
            onClick={() => !finalDisabled && selectMonth(i)}
            className={`${s.monthCell} rounded-lg font-medium transition-all duration-150
              ${isCurrent
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                : isThisMonth
                  ? 'border border-blue-500 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30'
                  : finalDisabled
                    ? 'text-muted-foreground/30 cursor-not-allowed'
                    : 'text-foreground hover:bg-muted'
              }`}
          >
            {m}
          </button>
        );
      })}
    </div>
  );

  const renderDecadeView = () => {
    const ds = decadeStart(viewYear);
    const years = [];
    for (let y = ds - 1; y <= ds + 10; y++) years.push(y);

    return (
      <div className="grid grid-cols-3 gap-1.5 px-1">
        {years.map(y => {
          const outside = y < ds || y > ds + 9;
          const dis = isYearDisabled(y);
          const isCurrent = parsed && parsed.getFullYear() === y;
          const isThisYear = today.getFullYear() === y;
          const extraProps = getYearControlProps ? getYearControlProps(new Date(y, 0, 1)) : {};
          const finalDisabled = dis || extraProps.disabled;

          return (
            <button
              key={y}
              type="button"
              disabled={finalDisabled || outside}
              onClick={() => !finalDisabled && !outside && selectYear(y)}
              className={`${s.monthCell} rounded-lg font-medium transition-all duration-150
                ${outside
                  ? 'text-muted-foreground/25 cursor-default'
                  : isCurrent
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                    : isThisYear
                      ? 'border border-blue-500 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30'
                      : finalDisabled
                        ? 'text-muted-foreground/30 cursor-not-allowed'
                        : 'text-foreground hover:bg-muted'
                }`}
            >
              {y}
            </button>
          );
        })}
      </div>
    );
  };

  /* ── Calendar portal ───────────────────────────────────────────────── */
  const calendar = coords && open && (
    <div
      ref={calRef}
      style={{
        position: 'fixed',
        top: coords.top,
        left: coords.left,
        width: 260,
        zIndex: 99999,
      }}
      className={`bg-background border border-border rounded-xl shadow-2xl ${s.gap} animate-in fade-in zoom-in-95 duration-150 origin-top`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <button type="button" onClick={headerPrev} className="p-1 rounded-md hover:bg-muted transition-colors">
          <ChevronLeft className="w-4 h-4 text-muted-foreground" />
        </button>

        <button
          type="button"
          onClick={canZoomOut(level) ? zoomOut : undefined}
          className={`${s.header} font-semibold text-foreground px-2 py-0.5 rounded-md transition-colors
            ${canZoomOut(level) ? 'hover:bg-muted cursor-pointer' : 'cursor-default'}`}
        >
          {headerLabel()}
        </button>

        <button type="button" onClick={headerNext} className="p-1 rounded-md hover:bg-muted transition-colors">
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Body */}
      {level === 'month' && renderDayView()}
      {level === 'year' && renderMonthView()}
      {level === 'decade' && renderDecadeView()}

      {/* Footer */}
      {level === 'month' && (
        <div className="mt-2 pt-2 border-t border-border flex justify-end">
          <button
            type="button"
            onClick={() => {
              const mm = String(today.getMonth() + 1).padStart(2, '0');
              const dd = String(today.getDate()).padStart(2, '0');
              onChange(`${today.getFullYear()}-${mm}-${dd}`);
              setOpen(false);
            }}
            className={`px-2.5 py-1 ${s.header} font-medium border border-border rounded-md text-foreground hover:bg-muted transition-colors`}
          >
            Today
          </button>
        </div>
      )}
    </div>
  );

  /* ── Determine error state ─────────────────────────────────────────── */
  const showError = hasError || !!error;

  return (
    <div className="relative">
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium text-foreground mb-1">{label}</label>
      )}
      {/* Description */}
      {description && (
        <p className="text-xs text-muted-foreground mb-1">{description}</p>
      )}

      {/* Trigger input */}
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
        </div>
        <input
          ref={inputRef}
          readOnly
          value={value || ''}
          placeholder={placeholder}
          onClick={toggle}
          disabled={disabled}
          className={`w-full border rounded-lg pl-8 pr-8 ${s.input} cursor-pointer bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-colors
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            ${showError ? 'border-destructive focus:ring-destructive/40' : 'border-border focus:ring-ring'}`}
        />
        {clearable && value && !disabled && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onChange(''); setOpen(false); }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs transition-colors"
          >✕</button>
        )}
      </div>

      {/* Error message */}
      {error && typeof error === 'string' && (
        <p className="text-xs text-destructive mt-1">{error}</p>
      )}

      {/* Portal-rendered calendar */}
      {open && coords && createPortal(calendar, document.body)}
    </div>
  );
};

export default DatePicker;
