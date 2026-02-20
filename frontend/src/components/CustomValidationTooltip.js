import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { AlertCircle } from 'lucide-react';

const CustomValidationTooltip = ({ message, show, onClose, children }) => {
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const [arrowStyle, setArrowStyle] = useState({});
    const triggerRef = useRef(null);
    const tooltipRef = useRef(null);
    const { theme } = useTheme();

    // Handle outside clicks and auto-dismiss timeout
    useEffect(() => {
        let timeoutId;

        const handleClickOutside = (event) => {
            if (show && onClose &&
                tooltipRef.current && !tooltipRef.current.contains(event.target) &&
                triggerRef.current && !triggerRef.current.contains(event.target)) {
                onClose();
            }
        };

        if (show) {
            document.addEventListener('mousedown', handleClickOutside);

            // Auto-hide after 3 seconds
            if (onClose) {
                timeoutId = setTimeout(() => {
                    onClose();
                }, 2500);
            }
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        };
    }, [show, onClose]);
    useEffect(() => {
        if (show && triggerRef.current && tooltipRef.current) {
            const triggerRect = triggerRef.current.getBoundingClientRect();
            const tooltipRect = tooltipRef.current.getBoundingClientRect();

            // Default position is bottom (unlike the hover tooltip which is top)
            // for form fields this usually looks better
            let top = triggerRect.bottom + 8;
            let left = triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2);

            // Arrow defaults to pointing up (tooltip is below the trigger)
            const arrowColor = theme === 'dark' ? '#1f2937' : '#ffffff'; // gray-800 or white
            const arrowBorderColor = theme === 'dark' ? '#374151' : '#e5e7eb'; // matching the border color

            let arrowProps = {
                top: '-6px', // pull it up slightly more
                left: '50%',
                transform: 'translateX(-50%)',
                borderBottomWidth: '6px',
                borderTopWidth: '0',
                borderLeftWidth: '6px',
                borderRightWidth: '6px',
                borderColor: `transparent transparent ${arrowBorderColor} transparent`
            };

            // Inner arrow (to cover the border line)
            let innerArrowProps = {
                top: '-4px', // inside the outer arrow
                left: '50%',
                transform: 'translateX(-50%)',
                borderBottomWidth: '5px',
                borderTopWidth: '0',
                borderLeftWidth: '5px',
                borderRightWidth: '5px',
                borderColor: `transparent transparent ${arrowColor} transparent`
            };

            // Adjust if overflows bottom edge (tooltip moves above the trigger)
            if (top + tooltipRect.height > window.innerHeight - 10) {
                top = triggerRect.top - tooltipRect.height - 8;
                arrowProps = {
                    ...arrowProps,
                    bottom: '-6px',
                    top: 'auto',
                    borderTopWidth: '6px',
                    borderBottomWidth: '0',
                    borderColor: `${arrowBorderColor} transparent transparent transparent`
                };
                innerArrowProps = {
                    ...innerArrowProps,
                    bottom: '-4px',
                    top: 'auto',
                    borderTopWidth: '5px',
                    borderBottomWidth: '0',
                    borderColor: `${arrowColor} transparent transparent transparent`
                };
            }

            // Adjust if overflows right edge
            if (left + tooltipRect.width > window.innerWidth - 10) {
                left = window.innerWidth - tooltipRect.width - 10;
                // Shift arrow to align with trigger if shifted left
                const shiftX = (triggerRect.left + triggerRect.width / 2) - left;
                arrowProps.left = `${shiftX}px`;
                innerArrowProps.left = `${shiftX}px`;
            }

            // Adjust if overflows left edge
            if (left < 10) {
                left = 10;
                const shiftX = (triggerRect.left + triggerRect.width / 2) - left;
                arrowProps.left = `${shiftX}px`;
                innerArrowProps.left = `${shiftX}px`;
            }

            setPosition({ top, left });
            setArrowStyle({ outer: arrowProps, inner: innerArrowProps });
        }
    }, [show, theme]);

    return (
        <div className="relative inline-block w-full">
            <div ref={triggerRef} className="w-full">
                {children}
            </div>

            {show && (
                <div
                    ref={tooltipRef}
                    style={{ top: position.top, left: position.left, position: 'fixed' }}
                    className={`flex items-center space-x-2 w-[max-content] max-w-[250px] px-3 py-2 text-[13px] rounded-md shadow-lg z-[9999] font-medium pointer-events-none transition-opacity duration-200
            ${theme === 'dark'
                            ? 'bg-gray-800 text-white border border-gray-700'
                            : 'bg-white text-gray-900 border border-gray-200 shadow-md'}`}
                >
                    <div className="flex-shrink-0 w-4 h-4 bg-orange-500 rounded-sm flex items-center justify-center">
                        <span className="text-white text-[11px] font-bold">!</span>
                    </div>
                    <span>{message}</span>

                    {/* Tooltip Arrow (Border & Inner fill) */}
                    <div
                        className="absolute border-solid pointer-events-none"
                        style={arrowStyle.outer}
                    />
                    <div
                        className="absolute border-solid pointer-events-none z-10"
                        style={arrowStyle.inner}
                    />
                </div>
            )}
        </div>
    );
};

export default CustomValidationTooltip;
