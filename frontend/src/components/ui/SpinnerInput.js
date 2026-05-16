import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

const SpinnerInput = ({ value, onChange, min = 0, max = Infinity, className = "", inputClassName = "w-12 text-center", suffix }) => (
    <div className={`flex items-center border border-border rounded-lg overflow-hidden bg-background ${className}`}>
        <input
            type="number"
            value={value}
            onChange={e => {
                const v = Math.max(min, Math.min(max, parseInt(e.target.value) || 0));
                onChange(v);
            }}
            className={`${inputClassName} text-sm font-semibold text-foreground bg-transparent border-none outline-none py-1.5`}
            min={min}
            max={max}
            style={{ MozAppearance: 'textfield' }}
        />
        {suffix && <span className="text-[13px] text-muted-foreground pr-2">{suffix}</span>}
        <div className="flex flex-col border-l border-border">
            <button
                type="button"
                onClick={() => onChange(Math.min(max, value + 1))}
                className="px-1.5 py-0.5 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
                <ChevronUp className="w-3 h-3" />
            </button>
            <button
                type="button"
                onClick={() => onChange(Math.max(min, value - 1))}
                className="px-1.5 py-0.5 hover:bg-muted transition-colors border-t border-border text-muted-foreground hover:text-foreground"
            >
                <ChevronDown className="w-3 h-3" />
            </button>
        </div>
        <style>{`
            input[type=number]::-webkit-inner-spin-button, 
            input[type=number]::-webkit-outer-spin-button { 
                -webkit-appearance: none; 
                margin: 0; 
            }
        `}</style>
    </div>
);

export default SpinnerInput;
