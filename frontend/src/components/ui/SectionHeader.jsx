import React from 'react';
import { HelpCircle } from 'lucide-react';
import CustomTooltip from '../CustomTooltip';

/**
 * A standardized header for card sections.
 * Supports a title, an optional tooltip, and optional extra actions (buttons, etc.)
 */
const SectionHeader = ({ title, tip, children, className = "" }) => {
  return (
    <div className={`flex items-center justify-between px-5 py-1.5 border-b border-border bg-accent gap-4 ${className}`}>
      <div className="flex items-center gap-2 min-w-0">
        {typeof title === 'string' ? (
          <h3 className="text-sm font-bold text-foreground truncate">{title}</h3>
        ) : (
          title
        )}
        {tip && (
          <div className="shrink-0 flex items-center">
            <CustomTooltip content={tip}>
              <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/50 hover:text-foreground cursor-help transition-colors" />
            </CustomTooltip>
          </div>
        )}
      </div>
      {children && (
        <div className="flex items-center gap-2 shrink-0">
          {children}
        </div>
      )}
    </div>
  );
};

export default SectionHeader;
