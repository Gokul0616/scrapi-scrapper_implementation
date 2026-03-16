import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../contexts/ThemeContext';

const CustomTooltip = ({ content, children, className = "inline-flex" }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const [arrowStyle, setArrowStyle] = useState({});
    const triggerRef = useRef(null);
    const tooltipRef = useRef(null);
    const { theme } = useTheme();

    const handleMouseEnter = () => {
        setIsVisible(true);
    };

    const handleMouseLeave = () => {
        setIsVisible(false);
    };

    useEffect(() => {
        if (isVisible && triggerRef.current && tooltipRef.current) {
            const triggerRect = triggerRef.current.getBoundingClientRect();
            const tooltipRect = tooltipRef.current.getBoundingClientRect();

            // Default position is top
            let top = triggerRect.top - tooltipRect.height - 8;
            let left = triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2);

            // Arrow defaults to pointing down
            let arrowProps = {
                bottom: '-5px',
                left: '50%',
                transform: 'translateX(-50%)',
                borderTopWidth: '5px',
                borderBottomWidth: '0',
                borderLeftWidth: '5px',
                borderRightWidth: '5px',
                borderColor: 'transparent transparent transparent transparent'
            };

            // Set the arrow border color based on theme
            const arrowColor = theme === 'dark' ? '#1f2937' : '#ffffff'; // gray-800 or white
            arrowProps.borderTopColor = arrowColor;

            // Adjust if overflows top edge
            if (top < 10) {
                top = triggerRect.bottom + 8;
                arrowProps = {
                    ...arrowProps,
                    top: '-5px',
                    bottom: 'auto',
                    borderTopWidth: '0',
                    borderBottomWidth: '5px',
                    borderBottomColor: arrowColor,
                    borderTopColor: 'transparent'
                };
            }

            // Adjust if overflows right edge
            if (left + tooltipRect.width > window.innerWidth - 10) {
                left = window.innerWidth - tooltipRect.width - 10;
                // Shift arrow to align with trigger if shifted left
                const shiftX = (triggerRect.left + triggerRect.width / 2) - left;
                arrowProps.left = `${shiftX}px`;
            }

            // Adjust if overflows left edge
            if (left < 10) {
                left = 10;
                const shiftX = (triggerRect.left + triggerRect.width / 2) - left;
                arrowProps.left = `${shiftX}px`;
            }

            setPosition({ top, left });
            setArrowStyle(arrowProps);
        }
    }, [isVisible, theme]);

    return (
        <>
            <div
                ref={triggerRef}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                className={className}
            >
                {children}
            </div>

            {isVisible && typeof document !== 'undefined' && createPortal(
                <div
                    ref={tooltipRef}
                    style={{ top: position.top, left: position.left, position: 'fixed' }}
                    className={`w-auto max-w-[400px] p-2 text-xs font-semibold rounded shadow-lg z-[99999] font-normal text-center pointer-events-none transition-opacity duration-200
            ${theme === 'dark'
                            ? 'bg-gray-950 text-white border border-gray-700'
                            : 'bg-white text-gray-900 border border-gray-200 shadow-md'}`}
                >
                    {content}
                    {/* Tooltip Arrow */}
                    <div
                        className="absolute border-solid"
                        style={arrowStyle}
                    />
                </div>,
                document.body
            )}
        </>
    );
};

export default CustomTooltip;
