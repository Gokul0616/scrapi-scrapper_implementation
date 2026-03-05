import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * Custom Checkbox component
 * @param {Object} props
 * @param {boolean} props.checked - Checked state.
 * @param {function} props.onChange - Change handler.
 * @param {string} [props.className] - Optional extra classes for the container.
 * @param {boolean} [props.disabled] - Disabled state.
 * @param {string} [props.id] - Optional ID.
 */
const CustomCheckbox = ({ checked, onChange, className, id, disabled }) => {
    const handleClick = (e) => {
        e.stopPropagation();
        if (!disabled && onChange) {
            onChange({
                target: {
                    checked: !checked,
                    id: id
                },
                stopPropagation: () => { },
                preventDefault: () => { }
            });
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            handleClick(e);
        }
    };

    return (
        <div
            id={id}
            role="checkbox"
            aria-checked={checked}
            tabIndex={disabled ? -1 : 0}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            className={cn(
                "relative flex items-center justify-center shrink-0 h-[18px] w-[18px] rounded-[4px] border transition-all duration-200 ease-in-out cursor-pointer outline-none shadow-sm",
                checked
                    ? "bg-blue-600 border-blue-600 hover:bg-blue-700 hover:border-blue-700"
                    : "bg-card border-border hover:border-blue-500/60 hover:bg-muted/30",
                "focus-visible:ring-2 focus-visible:ring-blue-500/20",
                disabled && "opacity-50 grayscale bg-muted border-muted cursor-not-allowed",
                className
            )}
        >
            <span
                className={cn(
                    "text-white text-[12px] font-bold transition-all duration-300 ease-out transform scale-0 select-none",
                    checked && "scale-100"
                )}
            >
                ✓
            </span>
        </div>
    );
};

export default CustomCheckbox;
