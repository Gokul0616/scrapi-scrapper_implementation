import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../contexts/ThemeContext';

const CustomTooltip = ({ content, children, className = "inline-flex" }) => {
    const [isOpen, setIsOpen] = useState(false);        // logical open/close
    const [shouldRender, setShouldRender] = useState(false); // keep in DOM during close animation
    const [isAnimating, setIsAnimating] = useState(false);   // controls opacity
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const [arrowStyle, setArrowStyle] = useState({});
    const triggerRef = useRef(null);
    const tooltipRef = useRef(null);
    const closeTimer = useRef(null);
    const { theme } = useTheme();

    // Open: render first, then animate in after a frame
    const openTooltip = () => {
        clearTimeout(closeTimer.current);
        setShouldRender(true);
        // requestAnimationFrame ensures the element is in the DOM before we fade in
        requestAnimationFrame(() => {
            requestAnimationFrame(() => setIsAnimating(true));
        });
    };

    // Close: animate out fast, then unmount
    const closeTooltip = () => {
        setIsAnimating(false);
        closeTimer.current = setTimeout(() => {
            setShouldRender(false);
        }, 100); // match the fast close duration
    };

    const handleClick = (e) => {
        e.stopPropagation();
        setIsOpen((prev) => {
            const next = !prev;
            if (next) openTooltip();
            else closeTooltip();
            return next;
        });
    };

    // Close tooltip when clicking outside
    const handleClickOutside = useCallback((e) => {
        if (
            triggerRef.current && !triggerRef.current.contains(e.target) &&
            tooltipRef.current && !tooltipRef.current.contains(e.target)
        ) {
            setIsOpen(false);
            closeTooltip();
        }
    }, []);

    // Close tooltip on Escape key
    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Escape') {
            setIsOpen(false);
            closeTooltip();
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleKeyDown);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, handleClickOutside, handleKeyDown]);

    const updatePosition = useCallback(() => {
        if (triggerRef.current && tooltipRef.current) {
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
    }, [theme]);

    useEffect(() => {
        if (shouldRender) {
            // Initial positioning
            updatePosition();
            
            // Reposition on scroll (capture: true listens to any scrollable parent) and resize
            window.addEventListener('scroll', updatePosition, true);
            window.addEventListener('resize', updatePosition);

            return () => {
                window.removeEventListener('scroll', updatePosition, true);
                window.removeEventListener('resize', updatePosition);
            };
        }
    }, [shouldRender, updatePosition]);

    return (
        <>
            <div
                ref={triggerRef}
                onClick={handleClick}
                className={`${className} tooltip-trigger-pointer`}
            >
                <style dangerouslySetInnerHTML={{ __html: `
                    .tooltip-trigger-pointer, .tooltip-trigger-pointer * {
                        cursor: pointer !important;
                    }
                `}} />
                {children}
            </div>

            {shouldRender && typeof document !== 'undefined' && createPortal(
                <div
                    ref={tooltipRef}
                    style={{
                        top: position.top,
                        left: position.left,
                        position: 'fixed',
                        opacity: isAnimating ? 1 : 0,
                        transition: isAnimating
                            ? 'opacity 150ms ease-in'   /* faster open */
                            : 'opacity 100ms ease-out', /* fast close */
                    }}
                    className={`w-auto max-w-[400px] p-2 text-xs font-semibold rounded shadow-lg z-[99999] font-normal text-center
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

