import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

const SimpleTooltip = ({ children, content, show = true }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (isVisible && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.top + rect.height / 2,
        left: rect.right
      });
    }
  }, [isVisible]);

  useEffect(() => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (isVisible) {
      // Show tooltip after 500ms delay
      timeoutRef.current = setTimeout(() => {
        setShowTooltip(true);
      }, 500);
    } else {
      // Hide tooltip immediately
      setShowTooltip(false);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isVisible]);

  if (!show) {
    return children;
  }

  return (
    <>
      <div
        ref={triggerRef}
        className="w-full"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        {children}
      </div>
      {isVisible && content && createPortal(
        <div
          className="fixed z-[9999] pointer-events-none"
          style={{
            top: `${position.top}px`,
            left: `${position.left + 12}px`,
            transform: 'translateY(-50%)'
          }}
        >
          <div className="bg-gray-900 text-white text-sm font-medium px-3 py-2 rounded-lg shadow-2xl whitespace-nowrap flex items-center animate-in fade-in-0 zoom-in-95 duration-100">
            {/* Arrow pointing left */}
            <div className="absolute right-full mr-[-1px] top-1/2 -translate-y-1/2 w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-r-[6px] border-r-gray-900" />
            {content}
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default SimpleTooltip;
