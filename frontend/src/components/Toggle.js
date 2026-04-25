/**
 * Toggle — Reusable iOS-style switch component.
 *
 * Usage:
 *   <Toggle on={value} onChange={setValue} />
 *   <Toggle on={value} onChange={setValue} size="sm" />
 */
import React from 'react';

const Toggle = ({ on, onChange, disabled = false, size = 'md', id }) => {
  const sizes = {
    sm: { track: 'h-4 w-7',   thumb: 'h-3 w-3',   translate: 'translate-x-3.5', init: 'translate-x-0.5', mt: 'mt-0.5' },
    md: { track: 'h-5 w-9',   thumb: 'h-4 w-4',   translate: 'translate-x-5',   init: 'translate-x-0.5', mt: 'mt-0.5' },
    lg: { track: 'h-6 w-11',  thumb: 'h-5 w-5',   translate: 'translate-x-5.5', init: 'translate-x-0.5', mt: 'mt-0.5' },
  };
  const s = sizes[size] || sizes.md;

  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={() => !disabled && onChange(!on)}
      className={`
        relative inline-flex shrink-0 rounded-full cursor-pointer
        transition-colors duration-200 ease-in-out
        focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1
        ${s.track}
        ${on ? 'bg-blue-600' : 'bg-muted'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <span
        aria-hidden="true"
        className={`
          inline-block rounded-full bg-white shadow-sm
          transition-transform duration-200 ease-in-out
          ${s.thumb} ${s.mt}
          ${on ? s.translate : s.init}
        `}
      />
    </button>
  );
};

export default Toggle;
