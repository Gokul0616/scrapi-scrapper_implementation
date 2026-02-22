import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';

interface CustomTooltipProps {
    content: React.ReactNode;
    children: React.ReactNode;
    isDisabled?: boolean;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ content, children, isDisabled = false }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const [arrowStyle, setArrowStyle] = useState<React.CSSProperties>({});
    const triggerRef = useRef<HTMLDivElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);
    const { theme } = useTheme();

    const handleMouseEnter = () => {
        if (!isDisabled) setIsVisible(true);
    };
    const handleMouseLeave = () => setIsVisible(false);

    useEffect(() => {
        if (isVisible && triggerRef.current && tooltipRef.current) {
            const triggerRect = triggerRef.current.getBoundingClientRect();
            const tooltipRect = tooltipRef.current.getBoundingClientRect();

            // Default position is right for the sidebar
            let top = triggerRect.top + (triggerRect.height / 2) - (tooltipRect.height / 2);
            let left = triggerRect.right + 8;

            let arrowProps: any = {
                left: '-5px',
                top: '50%',
                transform: 'translateY(-50%)',
                borderTopWidth: '5px',
                borderBottomWidth: '5px',
                borderRightWidth: '5px',
                borderLeftWidth: '0',
                borderColor: 'transparent transparent transparent transparent'
            };

            const arrowColor = theme === 'dark' ? '#1f2937' : '#ffffff';
            arrowProps.borderRightColor = arrowColor;

            // Adjust if overflows bottom edge
            if (top + tooltipRect.height > window.innerHeight - 10) {
                top = window.innerHeight - tooltipRect.height - 10;
            }

            // Adjust if overflows top edge
            if (top < 10) {
                top = 10;
            }

            // Adjust if overflows right edge (switch to top pointing down)
            if (left + tooltipRect.width > window.innerWidth - 10) {
                top = triggerRect.top - tooltipRect.height - 8;
                left = triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2);

                arrowProps = {
                    bottom: '-5px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    borderTopWidth: '5px',
                    borderBottomWidth: '0',
                    borderLeftWidth: '5px',
                    borderRightWidth: '5px',
                    borderColor: 'transparent transparent transparent transparent',
                    borderTopColor: arrowColor
                };
            }

            setPosition({ top, left });
            setArrowStyle(arrowProps);
        }
    }, [isVisible, theme]);

    // Don't render empty tooltips
    if (!content) {
        return <>{children}</>;
    }

    return (
        <>
            <div
                ref={triggerRef}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                className="inline-flex w-full"
            >
                {children}
            </div>

            {isVisible && (
                <div
                    ref={tooltipRef}
                    style={{ top: position.top, left: position.left, position: 'fixed' }}
                    className={`w-[max-content] max-w-[220px] p-2 text-xs rounded shadow-lg z-[9999] font-normal text-center pointer-events-none transition-opacity duration-200
            ${theme === 'dark'
                            ? 'bg-gray-950 text-white border border-gray-700'
                            : 'bg-white text-gray-900 border border-gray-200 shadow-md'}`}
                >
                    {content}
                    <div
                        className="absolute border-solid"
                        style={arrowStyle}
                    />
                </div>
            )}
        </>
    );
};

export default CustomTooltip;
