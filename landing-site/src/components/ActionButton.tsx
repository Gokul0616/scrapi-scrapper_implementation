import React from 'react';

interface ActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    icon?: React.ComponentType<{ className?: string }>;
    label?: string;
    variant?: 'default' | 'danger' | 'primary' | 'outline' | 'ghost';
}

const ActionButton: React.FC<ActionButtonProps> = ({
    icon: Icon,
    label,
    onClick,
    title,
    disabled,
    variant = 'default',
    className = '',
    ...props
}) => {
    // Exact baseStyles and default/danger styling from frontend ActionButton
    const baseStyles = "h-[30px] rounded-md transition-all flex items-center justify-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20";
    const variants = {
        default: "bg-accent text-muted-foreground hover:brightness-95 dark:hover:brightness-110 hover:text-foreground border border-border shadow-sm",
        danger: "bg-accent text-red-600 hover:brightness-95 dark:hover:brightness-110 border border-border shadow-sm",
        primary: "bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:brightness-95 dark:hover:brightness-110 border border-transparent shadow-sm",
        outline: "bg-transparent border border-input hover:bg-accent hover:text-accent-foreground text-foreground shadow-sm",
        ghost: "bg-transparent hover:bg-accent hover:text-accent-foreground text-muted-foreground border border-transparent"
    };

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            title={title}
            className={`${baseStyles} ${variants[variant]} ${label ? 'px-3' : 'w-[30px] shrink-0'} ${className} disabled:opacity-50 disabled:cursor-not-allowed`}
            {...props}
        >
            {Icon && <Icon className="w-3.5 h-3.5" />}
            {label && <span className="text-sm font-semibold">{label}</span>}
        </button>
    );
};

export default ActionButton;
