import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// Custom Sparkle Icon SVG Component
const ChatIcon = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L13.5 8.5L20 10L13.5 11.5L12 18L10.5 11.5L4 10L10.5 8.5L12 2Z" fill="currentColor" fillOpacity="0.9" />
    <path d="M19 3L19.8 5.8L22.5 6.5L19.8 7.2L19 10L18.2 7.2L15.5 6.5L18.2 5.8L19 3Z" fill="currentColor" fillOpacity="0.7" />
    <path d="M6 14L6.6 16.2L9 17L6.6 17.8L6 20L5.4 17.8L3 17L5.4 16.2L6 14Z" fill="currentColor" fillOpacity="0.7" />
  </svg>
);

const GlobalChat = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Draggable state
  const [position, setPosition] = useState(() => {
    const saved = localStorage.getItem('chatPosition');
    return saved ? JSON.parse(saved) : { corner: 'bottom-right' };
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragMoved, setDragMoved] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });
  const buttonRef = useRef(null);
  const DRAG_THRESHOLD = 5;

  // Attach drag listeners — must be declared before any early return
  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (e) => {
      e.preventDefault();
      const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
      const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;
      if (
        Math.abs(clientX - dragStart.startX) > DRAG_THRESHOLD ||
        Math.abs(clientY - dragStart.startY) > DRAG_THRESHOLD
      ) {
        setDragMoved(true);
      }
      setCurrentPos({ x: clientX - dragStart.x, y: clientY - dragStart.y });
    };

    const handleEnd = () => {
      setIsDragging(false);
      if (dragMoved) {
        const buttonSize = 56;
        const centerX = currentPos.x + buttonSize / 2;
        const centerY = currentPos.y + buttonSize / 2;
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        const isLeft = centerX < windowWidth - centerX;
        const isTop = centerY < windowHeight - centerY;
        let corner = 'bottom-right';
        if (isTop && isLeft) corner = 'top-left';
        else if (isTop && !isLeft) corner = 'top-right';
        else if (!isTop && isLeft) corner = 'bottom-left';
        const newPosition = { corner };
        setPosition(newPosition);
        localStorage.setItem('chatPosition', JSON.stringify(newPosition));
      }
      setTimeout(() => setDragMoved(false), 50);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchmove', handleMove, { passive: false });
    document.addEventListener('touchend', handleEnd);
    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, currentPos, dragStart, dragMoved]);

  // Don't show FAB when already on /chat page — after all hooks
  const isChatPage = location.pathname === '/chat';
  if (isChatPage) return null;

  const getPositionStyles = () => {
    const spacing = 24;
    const positions = {
      'top-left':     { top: `${spacing}px`,    left: `${spacing}px`,  bottom: 'auto', right: 'auto' },
      'top-right':    { top: `${spacing}px`,    right: `${spacing}px`, bottom: 'auto', left: 'auto'  },
      'bottom-left':  { bottom: `${spacing}px`, left: `${spacing}px`,  top: 'auto',    right: 'auto' },
      'bottom-right': { bottom: `${spacing}px`, right: `${spacing}px`, top: 'auto',    left: 'auto'  },
    };
    return positions[position.corner] || positions['bottom-right'];
  };

  const handleDragStart = (e) => {
    setIsDragging(true);
    setDragMoved(false);
    const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
    const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
    const rect = buttonRef.current.getBoundingClientRect();
    setDragStart({ x: clientX - rect.left, y: clientY - rect.top, startX: clientX, startY: clientY });
    setCurrentPos({ x: rect.left, y: rect.top });
  };

  return (
    <button
      ref={buttonRef}
      onMouseDown={handleDragStart}
      onTouchStart={handleDragStart}
      onClick={() => {
        if (!dragMoved) navigate('/chat');
      }}
      title="Chat with Mira AI (Drag to move)"
      style={
        isDragging
          ? { position: 'fixed', left: `${currentPos.x}px`, top: `${currentPos.y}px`, cursor: 'grabbing', transition: 'none' }
          : { position: 'fixed', ...getPositionStyles(), cursor: 'grab', transition: 'all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)' }
      }
      className="w-14 h-14 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full shadow-lg hover:shadow-xl flex items-center justify-center z-[70] active:scale-95 transition-all duration-200 group"
    >
      <ChatIcon className="w-6 h-6" />
      {/* Online pulse indicator */}
      <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-background animate-pulse" />
      {/* Hover tooltip */}
      <span className="absolute bottom-full mb-2 right-0 whitespace-nowrap px-2 py-1 rounded-md bg-popover border border-border text-xs font-medium text-foreground shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
        Chat with Mira
      </span>
    </button>
  );
};

export default GlobalChat;
