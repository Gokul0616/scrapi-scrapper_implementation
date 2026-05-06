import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import {
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  Home,
  Search,
  Moon,
  Sun,
  Settings,
  LogOut,
  Sparkles,
  Store,
  Copy,
  ExternalLink,
  HelpCircle,
  BadgeDollarSign,
  ChevronRight as ChevronRightIcon,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useModal } from '../contexts/ModalContext';
import { toast } from '../hooks/use-toast';

// ─── Platform detection ───────────────────────────────────────────────────────
const IS_MAC = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

// ─── OS-specific design tokens ────────────────────────────────────────────────
const MAC_STYLE = {
  menuWidth: 220,
  itemHeight: 22,
  itemFontSize: '13px',
  itemFontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
  itemBorderRadius: '4px',
  itemPaddingX: '10px',
  itemGap: '7px',
  iconSize: 13,
  shortcutFontSize: '12px',
  menuBorderRadius: '10px',
  menuPadding: '5px',
  menuMinWidth: 220,
  sepHeight: '1px',
  sepMargin: '4px 0',
  labelPadding: '5px 10px 2px',
  labelFontSize: '11px',
  labelFontWeight: 500,
  labelLetterSpacing: '0.03em',
  labelTextTransform: 'none',
  menuShadow: (isDark) =>
    isDark
      ? '0 0 0 0.5px rgba(255,255,255,0.12), 0 8px 32px rgba(0,0,0,0.8), 0 2px 8px rgba(0,0,0,0.6)'
      : '0 0 0 0.5px rgba(0,0,0,0.12), 0 8px 32px rgba(0,0,0,0.22), 0 2px 6px rgba(0,0,0,0.12)',
  menuBorder: (isDark) => (isDark ? '1px solid rgba(255,255,255,0.08)' : 'none'),
  menuBg: (isDark) =>
    isDark ? 'rgba(40,40,40,0.92)' : 'rgba(248,248,248,0.92)',
  menuBlur: 'blur(30px) saturate(2)',
  focusBg: (isDark) => (isDark ? 'rgba(40,100,255,0.85)' : '#3478F6'),
  focusColor: '#ffffff',
  focusIconColor: 'rgba(255,255,255,0.85)',    // icon turns white on blue highlight
  focusShortcutColor: 'rgba(255,255,255,0.55)', // shortcut turns white-muted
  dangerFocusBg: 'rgba(255,59,48,0.85)',
  dangerFocusColor: '#ffffff',              // white text+icon on red bg (real macOS behavior)
  dangerColor: '#ff3b30',
  textColor: (isDark) => (isDark ? 'rgba(255,255,255,0.93)' : 'rgba(0,0,0,0.87)'),
  mutedColor: (isDark) => (isDark ? 'rgba(255,255,255,0.40)' : 'rgba(0,0,0,0.38)'),
  shortcutColor: (isDark) => (isDark ? 'rgba(255,255,255,0.40)' : 'rgba(0,0,0,0.38)'),
  sepColor: (isDark) => (isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)'),
  animation: 'ctx-mac-in 110ms cubic-bezier(0.2, 0, 0, 1) forwards',
  animationKeyframes: `
    @keyframes ctx-mac-in {
      from { opacity: 0; transform: scale(0.92); }
      to   { opacity: 1; transform: scale(1); }
    }
  `,
  showSectionLabels: false,
};

const WIN_STYLE = {
  menuWidth: 200,
  itemHeight: 30,
  itemFontSize: '12px',
  itemFontFamily: '"Segoe UI Variable Text", "Segoe UI", system-ui, sans-serif',
  itemBorderRadius: '4px',
  itemPaddingX: '8px',
  itemGap: '8px',
  iconSize: 14,
  shortcutFontSize: '11px',
  menuBorderRadius: '8px',
  menuPadding: '3px',
  menuMinWidth: 200,
  sepHeight: '1px',
  sepMargin: '3px 0',
  // Section labels: subtle caption style, NOT uppercase screaming
  labelPadding: '7px 10px 1px',
  labelFontSize: '11px',
  labelFontWeight: 400,
  labelLetterSpacing: '0',
  labelTextTransform: 'none',
  menuShadow: (isDark) =>
    isDark
      ? '0 4px 24px rgba(0,0,0,0.7), 0 1px 4px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)'
      : '0 4px 20px rgba(0,0,0,0.14), 0 1px 4px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.06)',
  menuBorder: () => 'none',
  menuBg: (isDark) =>
    isDark
      ? 'rgba(32,32,32,0.96)'   // Windows 11 dark Mica-like
      : 'rgba(243,243,243,0.98)', // Windows 11 light
  menuBlur: 'blur(20px) saturate(1.5)',
  // Windows 11 accent blue hover — the real Windows experience
  focusBg: (isDark) => (isDark ? '#0067c0' : '#0067c0'),
  focusColor: '#ffffff',                        // white text on accent blue
  focusIconColor: 'rgba(255,255,255,0.9)',      // white icon on blue
  focusShortcutColor: 'rgba(255,255,255,0.65)', // white-muted shortcut on blue
  dangerFocusBg: '#c42b1c',
  dangerFocusColor: '#ffffff',                  // white text on red when hovered
  dangerColor: (isDark) => (isDark ? '#ff7070' : '#c42b1c'),
  textColor: (isDark) => (isDark ? 'rgba(255,255,255,0.90)' : 'rgba(0,0,0,0.83)'),
  mutedColor: (isDark) => (isDark ? 'rgba(255,255,255,0.42)' : 'rgba(0,0,0,0.40)'),
  shortcutColor: (isDark) => (isDark ? 'rgba(255,255,255,0.42)' : 'rgba(0,0,0,0.40)'),
  sepColor: (isDark) => (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'),
  animation: 'ctx-win-in 130ms cubic-bezier(0, 0, 0.2, 1) forwards',
  animationKeyframes: `
    @keyframes ctx-win-in {
      from { opacity: 0; transform: translateY(6px) scale(0.97); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
  `,
  showSectionLabels: false, // cleaner without labels — just separators like macOS
};


// ─── Helper: clamp menu inside viewport ──────────────────────────────────────
function clampPosition(x, y, menuW, menuH) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const MARGIN = 8;
  let left = x;
  let top = y;
  if (left + menuW + MARGIN > vw) left = x - menuW;
  if (top + menuH + MARGIN > vh) top = y - menuH;
  if (left < MARGIN) left = MARGIN;
  if (top < MARGIN) top = MARGIN;
  return { left, top };
}

// ─── Item heights for height estimation ──────────────────────────────────────
function estimateMenuHeight(items, s) {
  let h = parseInt(s.menuPadding) * 2;
  for (const item of items) {
    if (item.type === 'sep') h += parseInt(s.sepHeight) + parseInt(s.sepMargin) * 2 + 2;
    else if (item.type === 'label') h += 22;
    else h += s.itemHeight;
  }
  return h;
}

// ─── Separator ────────────────────────────────────────────────────────────────
const Separator = ({ s, isDark }) => (
  <div
    style={{
      height: s.sepHeight,
      margin: s.sepMargin,
      backgroundColor: s.sepColor(isDark),
    }}
  />
);

// ─── Section label ────────────────────────────────────────────────────────────
const SectionLabel = ({ s, isDark, children }) => (
  <div
    style={{
      padding: s.labelPadding,
      fontSize: s.labelFontSize,
      fontWeight: s.labelFontWeight,
      letterSpacing: s.labelLetterSpacing,
      textTransform: s.labelTextTransform,
      color: s.mutedColor(isDark),
      fontFamily: s.itemFontFamily,
      userSelect: 'none',
    }}
  >
    {children}
  </div>
);

// ─── Menu Item ────────────────────────────────────────────────────────────────
const Item = React.forwardRef(
  ({ icon: Icon, label, shortcut, danger, externalLink, onClick, onMouseEnter, onMouseLeave, focused, s, isDark }, ref) => {
    // All color logic driven by style tokens — no IS_MAC checks here
    const resolveDangerColor = typeof s.dangerColor === 'function' ? s.dangerColor(isDark) : s.dangerColor;

    const bgColor = focused
      ? danger
        ? s.dangerFocusBg
        : typeof s.focusBg === 'function' ? s.focusBg(isDark) : s.focusBg
      : 'transparent';

    const textColor = focused
      ? danger
        ? s.dangerFocusColor
        : typeof s.focusColor === 'function' ? s.focusColor(isDark) : s.focusColor
      : danger
        ? resolveDangerColor
        : s.textColor(isDark);

    // focusIconColor: null means inherit. For danger+focused, use dangerFocusColor so icon matches text.
    const iconColor = focused
      ? danger
        ? s.dangerFocusColor
        : s.focusIconColor || undefined
      : danger
        ? resolveDangerColor
        : undefined;
    const shortcutTextColor = focused && s.focusShortcutColor
      ? s.focusShortcutColor
      : s.shortcutColor(isDark);

    return (
      <div
        ref={ref}
        role="menuitem"
        tabIndex={-1}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onClick={onClick}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: s.itemGap,
          padding: `0 ${s.itemPaddingX}`,
          height: `${s.itemHeight}px`,
          borderRadius: s.itemBorderRadius,
          cursor: 'default',
          userSelect: 'none',
          fontSize: s.itemFontSize,
          fontFamily: s.itemFontFamily,
          fontWeight: 400,
          color: textColor,
          backgroundColor: bgColor,
          transition: 'background-color 60ms ease, color 60ms ease',
          outline: 'none',
          WebkitFontSmoothing: 'antialiased',
        }}
      >
        {Icon && (
          <Icon
            size={s.iconSize}
            style={{
              flexShrink: 0,
              opacity: danger ? 1 : focused && s.focusIconColor ? 1 : 0.75,
              color: iconColor,
            }}
          />
        )}
        <span
          style={{
            flex: 1,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {label}
        </span>
        {externalLink && (
          <ExternalLink
            size={10}
            style={{ opacity: 0.4, flexShrink: 0, color: shortcutTextColor }}
          />
        )}
        {shortcut && !externalLink && (
          <span
            style={{
              fontSize: s.shortcutFontSize,
              color: shortcutTextColor,
              flexShrink: 0,
              fontFamily: s.itemFontFamily,
              opacity: focused && IS_MAC ? 0.7 : 1,
            }}
          >
            {shortcut}
          </span>
        )}
      </div>
    );
  }
);
Item.displayName = 'MenuItem';

// ─── Submenu Item (macOS-style flyout) ────────────────────────────────────────
const SubMenuItem = ({ icon: Icon, label, submenu, focused, onMouseEnter, onMouseLeave, s, isDark, onSubClick }) => {
  const itemRef = useRef(null);
  const subRef = useRef(null);
  const [showSub, setShowSub] = useState(false);
  const [subFocused, setSubFocused] = useState(-1);
  const timerRef = useRef(null);

  const handleEnter = () => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setShowSub(true), 120);
    onMouseEnter?.();
  };
  const handleLeave = () => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { setShowSub(false); setSubFocused(-1); }, 180);
    onMouseLeave?.();
  };
  const cancelClose = () => clearTimeout(timerRef.current);

  // Compute flyout position relative to the item
  const getSubPos = () => {
    if (!itemRef.current) return { top: 0, left: 0 };
    const r = itemRef.current.getBoundingClientRect();
    const subW = s.menuWidth - 10;
    const subH = submenu.length * s.itemHeight + parseInt(s.menuPadding) * 2 + 8;
    let left = r.right + 2;
    let top = r.top - 4;
    // Flip left if overflows right
    if (left + subW + 8 > window.innerWidth) left = r.left - subW - 2;
    // Clamp bottom
    if (top + subH + 8 > window.innerHeight) top = window.innerHeight - subH - 8;
    if (top < 8) top = 8;
    return { top, left };
  };

  const bgColor = focused
    ? typeof s.focusBg === 'function' ? s.focusBg(isDark) : s.focusBg
    : 'transparent';
  const textColor = focused
    ? typeof s.focusColor === 'function' ? s.focusColor(isDark) : s.focusColor
    : s.textColor(isDark);
  const iconColor = focused ? (s.focusIconColor || undefined) : undefined;
  const chevronColor = focused ? (s.focusShortcutColor || 'rgba(255,255,255,0.55)') : s.shortcutColor(isDark);

  const subPos = showSub ? getSubPos() : { top: 0, left: 0 };

  return (
    <>
      <div
        ref={itemRef}
        role="menuitem"
        tabIndex={-1}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        style={{
          display: 'flex', alignItems: 'center', gap: s.itemGap,
          padding: `0 ${s.itemPaddingX}`, height: `${s.itemHeight}px`,
          borderRadius: s.itemBorderRadius, cursor: 'default', userSelect: 'none',
          fontSize: s.itemFontSize, fontFamily: s.itemFontFamily, fontWeight: 400,
          color: textColor, backgroundColor: bgColor,
          transition: 'background-color 60ms ease, color 60ms ease',
          outline: 'none', WebkitFontSmoothing: 'antialiased',
        }}
      >
        {Icon && <Icon size={s.iconSize} style={{ flexShrink: 0, opacity: focused && s.focusIconColor ? 1 : 0.75, color: iconColor }} />}
        <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
        <ChevronRightIcon size={14} style={{ flexShrink: 0, opacity: 1, color: chevronColor }} />
      </div>
      {showSub && ReactDOM.createPortal(
        <div
          ref={subRef}
          data-ctx-submenu="true"
          onMouseEnter={cancelClose}
          onMouseLeave={handleLeave}
          style={{
            position: 'fixed', top: subPos.top, left: subPos.left,
            width: `${s.menuWidth - 10}px`, minWidth: `${s.menuWidth - 10}px`,
            zIndex: 100000,
            backgroundColor: s.menuBg(isDark),
            border: s.menuBorder(isDark),
            borderRadius: s.menuBorderRadius,
            boxShadow: s.menuShadow(isDark),
            padding: s.menuPadding,
            backdropFilter: s.menuBlur,
            WebkitBackdropFilter: s.menuBlur,
            animation: 'ctx-sub-in 90ms cubic-bezier(0.2,0,0,1) forwards',
          }}
        >
          <style>{`
            @keyframes ctx-sub-in {
              from { opacity: 0; transform: translateX(-4px) scale(0.96); }
              to   { opacity: 1; transform: translateX(0) scale(1); }
            }
          `}</style>
          {submenu.map((sub, si) => {
            const subBg = subFocused === si
              ? typeof s.focusBg === 'function' ? s.focusBg(isDark) : s.focusBg
              : 'transparent';
            const subTxt = subFocused === si
              ? typeof s.focusColor === 'function' ? s.focusColor(isDark) : s.focusColor
              : s.textColor(isDark);
            return (
              <div
                key={si}
                role="menuitem"
                onMouseEnter={() => setSubFocused(si)}
                onMouseLeave={() => setSubFocused(-1)}
                onClick={() => { onSubClick?.(sub); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: s.itemGap,
                  padding: `0 ${s.itemPaddingX}`, height: `${s.itemHeight}px`,
                  borderRadius: s.itemBorderRadius, cursor: 'default', userSelect: 'none',
                  fontSize: s.itemFontSize, fontFamily: s.itemFontFamily, fontWeight: 400,
                  color: subTxt, backgroundColor: subBg,
                  transition: 'background-color 60ms ease, color 60ms ease',
                  WebkitFontSmoothing: 'antialiased',
                }}
              >
                <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub.label}</span>
              </div>
            );
          })}
        </div>,
        document.body
      )}
    </>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────
const GlobalContextMenu = ({ children }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { openModal } = useModal();

  const isDark = theme === 'dark';
  // const s = MAC_STYLE;
  // const s = WIN_STYLE;
  const s = IS_MAC ? MAC_STYLE : WIN_STYLE;

  const [menuState, setMenuState] = useState({ visible: false, x: 0, y: 0 });
  const [focusedIdx, setFocusedIdx] = useState(-1);
  const [selectedText, setSelectedText] = useState('');
  const menuRef = useRef(null);
  const itemRefs = useRef([]);

  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href);
    toast({ title: 'Link Copied', description: 'Page URL copied to clipboard.' });
  }, []);

  const buildItems = useCallback(() => [
    // ── Copy selection — only shown when text is highlighted ──────────────────
    ...(selectedText ? [
      { icon: Copy, label: `Copy "${selectedText.length > 28 ? selectedText.slice(0, 28) + '…' : selectedText}"`, shortcut: IS_MAC ? '⌘C' : 'Ctrl+C', action: () => navigator.clipboard.writeText(selectedText) },
      { type: 'sep' },
    ] : []),
    ...(s.showSectionLabels ? [{ type: 'label', label: 'Navigation' }] : []),
    { icon: ArrowLeft, label: 'Back', shortcut: IS_MAC ? '⌘[' : 'Alt+←', action: () => window.history.back() },
    { icon: ArrowRight, label: 'Forward', shortcut: IS_MAC ? '⌘]' : 'Alt+→', action: () => window.history.forward() },
    { icon: RefreshCw, label: 'Reload', shortcut: IS_MAC ? '⌘R' : 'Ctrl+R', action: () => window.location.reload() },
    { type: 'sep' },
    ...(s.showSectionLabels ? [{ type: 'label', label: 'Tools' }] : []),
    { icon: Copy, label: 'Copy Page Link', action: handleCopyLink },
    { icon: Search, label: 'Search', shortcut: IS_MAC ? '⌘K' : 'Ctrl+K', action: () => openModal('global-search') },
    { icon: isDark ? Sun : Moon, label: isDark ? 'Light Mode' : 'Dark Mode', shortcut: IS_MAC ? '⌘L' : 'Ctrl+L', action: toggleTheme },
    { type: 'sep' },
    ...(s.showSectionLabels ? [{ type: 'label', label: 'Scrapi' }] : []),
    { icon: Home, label: 'Console Home', action: () => navigate('/home') },
    // { icon: Sparkles, label: 'Mira AI', action: () => navigate('/chat') },
    { icon: Store, label: 'Scrapi Store', action: () => navigate('/store') },
    { type: 'sep' },
    {
      icon: Settings, label: 'User Settings', action: () => navigate('/settings'), submenu: [
        { label: 'Account', path: '/settings?tab=account' },
        { label: 'Login & Privacy', path: '/settings?tab=login-privacy' },
        { label: 'API & Integrations', path: '/settings?tab=api-integrations' },
        { label: 'Organizations', path: '/settings?tab=organizations' },
        { label: 'Notifications', path: '/settings?tab=notifications' },
        { label: 'Referrals', path: '/settings?tab=referrals' },
      ]
    },
    {
      icon: BadgeDollarSign, label: 'Billing', action: () => navigate('/billing'), submenu: [
        { label: 'Current period', path: '/billing?tab=current' },
        { label: 'Historical usage', path: '/billing?tab=historical' },
        { label: 'Subscription', path: '/billing?tab=subscription' },
        { label: 'Pricing', path: '/billing?tab=pricing' },
        { label: 'Invoices', path: '/billing?tab=invoices' },
        { label: 'Limits', path: '/billing?tab=limits' },
      ]
    },
    // { icon: HelpCircle, label: 'Documentation', action: () => window.open('https://docs.scrapi.com', '_blank'), externalLink: true },
    ...(user ? [
      { type: 'sep' },
      { icon: LogOut, label: 'Logout', danger: true, action: logout },
    ] : []),
  ], [isDark, user, selectedText, handleCopyLink, navigate, openModal, toggleTheme, logout, s]);

  const interactableItems = useCallback(
    () => buildItems().filter(i => !i.type),
    [buildItems]
  );

  // ── Open / close ──────────────────────────────────────────────────────────
  const close = useCallback(() => {
    setMenuState(st => ({ ...st, visible: false }));
    setFocusedIdx(-1);
  }, []);

  const open = useCallback((x, y) => {
    const items = buildItems();
    const h = estimateMenuHeight(items, s);
    const pos = clampPosition(x, y, s.menuWidth, h);
    setMenuState({ visible: true, x: pos.left, y: pos.top });
    setFocusedIdx(-1);
    itemRefs.current = [];
  }, [buildItems, s]);

  // ── Right-click intercept ─────────────────────────────────────────────────
  useEffect(() => {
    const onContextMenu = (e) => {
      e.preventDefault();
      // Capture any highlighted text at the moment of right-click
      const sel = window.getSelection()?.toString().trim() ?? '';
      setSelectedText(sel);
      open(e.clientX, e.clientY);
    };
    document.addEventListener('contextmenu', onContextMenu);
    return () => document.removeEventListener('contextmenu', onContextMenu);
  }, [open]);

  // ── Outside click ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!menuState.visible) return;
    const onPointerDown = (e) => {
      // Don't close if clicking inside a submenu portal
      if (e.target.closest?.('[data-ctx-submenu]')) return;
      if (menuRef.current && !menuRef.current.contains(e.target)) close();
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [menuState.visible, close]);

  // ── Scroll ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!menuState.visible) return;
    window.addEventListener('scroll', close, true);
    return () => window.removeEventListener('scroll', close, true);
  }, [menuState.visible, close]);

  // ── Window blur ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!menuState.visible) return;
    window.addEventListener('blur', close);
    return () => window.removeEventListener('blur', close);
  }, [menuState.visible, close]);

  // ── Keyboard navigation ───────────────────────────────────────────────────
  useEffect(() => {
    if (!menuState.visible) return;
    const actionable = interactableItems();
    const onKeyDown = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIdx(i => {
          const next = (i + 1) % actionable.length;
          itemRefs.current[next]?.focus();
          return next;
        });
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIdx(i => {
          const prev = (i - 1 + actionable.length) % actionable.length;
          itemRefs.current[prev]?.focus();
          return prev;
        });
        return;
      }
      if ((e.key === 'Enter' || e.key === ' ') && focusedIdx >= 0) {
        e.preventDefault();
        actionable[focusedIdx]?.action?.();
        close();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [menuState.visible, focusedIdx, close, interactableItems]);

  // ── Focus container on open ───────────────────────────────────────────────
  useEffect(() => {
    if (menuState.visible) {
      const raf = requestAnimationFrame(() => menuRef.current?.focus());
      return () => cancelAnimationFrame(raf);
    }
  }, [menuState.visible]);

  // ── Render ────────────────────────────────────────────────────────────────
  const renderItems = () => {
    const items = buildItems();
    let actionIdx = -1;
    return items.map((item, i) => {
      if (item.type === 'sep') return <Separator key={i} s={s} isDark={isDark} />;
      if (item.type === 'label') return <SectionLabel key={i} s={s} isDark={isDark}>{item.label}</SectionLabel>;

      actionIdx++;
      const thisActionIdx = actionIdx;

      // Render submenu item for Settings / Billing
      if (item.submenu) {
        return (
          <SubMenuItem
            key={i}
            icon={item.icon}
            label={item.label}
            submenu={item.submenu}
            focused={focusedIdx === thisActionIdx}
            onMouseEnter={() => setFocusedIdx(thisActionIdx)}
            onMouseLeave={() => setFocusedIdx(-1)}
            s={s}
            isDark={isDark}
            onSubClick={(sub) => { close(); navigate(sub.path); }}
          />
        );
      }

      return (
        <Item
          key={i}
          ref={el => { itemRefs.current[thisActionIdx] = el; }}
          icon={item.icon}
          label={item.label}
          shortcut={item.shortcut}
          danger={item.danger}
          externalLink={item.externalLink}
          focused={focusedIdx === thisActionIdx}
          onMouseEnter={() => setFocusedIdx(thisActionIdx)}
          onMouseLeave={() => setFocusedIdx(-1)}
          onClick={() => { close(); item.action?.(); }}
          s={s}
          isDark={isDark}
        />
      );
    });
  };

  const menu = menuState.visible
    ? ReactDOM.createPortal(
      <div
        ref={menuRef}
        role="menu"
        tabIndex={-1}
        style={{
          position: 'fixed',
          top: menuState.y,
          left: menuState.x,
          width: `${s.menuWidth}px`,
          minWidth: `${s.menuMinWidth}px`,
          zIndex: 99999,
          backgroundColor: s.menuBg(isDark),
          border: s.menuBorder(isDark),
          borderRadius: s.menuBorderRadius,
          boxShadow: s.menuShadow(isDark),
          padding: s.menuPadding,
          backdropFilter: s.menuBlur,
          WebkitBackdropFilter: s.menuBlur,
          outline: 'none',
          animation: s.animation,
        }}
      >
        <style>{s.animationKeyframes}</style>
        {renderItems()}
      </div>,
      document.body
    )
    : null;

  return (
    <>
      <div style={{ height: '100%', width: '100%' }}>{children}</div>
      {menu}
    </>
  );
};

export default GlobalContextMenu;
