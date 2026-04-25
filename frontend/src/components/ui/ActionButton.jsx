import React from 'react';
import CustomTooltip from '../CustomTooltip';

const ActionButton = ({ icon: Icon, label, onClick, title, disabled, variant = 'default', className = '' }) => {
  const baseStyles = "h-[30px] rounded-md transition-all flex items-center justify-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20";
  const variants = {
    default: "bg-accent text-muted-foreground hover:brightness-95 dark:hover:brightness-110 hover:text-foreground border border-border shadow-sm",
    danger: "bg-accent text-red-600 hover:brightness-95 dark:hover:brightness-110 border border-border shadow-sm"
  };

  const button = (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]} ${label ? 'px-3' : 'w-[30px] shrink-0'} ${className} disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {Icon && <Icon className="w-3.5 h-3.5" />}
      {label && <span className="text-sm font-semibold">{label}</span>}
    </button>
  );

  if (title) {
    return (
      <CustomTooltip content={title}>
        {button}
      </CustomTooltip>
    );
  }

  return button;
};

export default ActionButton;
