import React, { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export type AlertType = 'success' | 'error' | 'info' | 'warning';

export interface AlertProps {
  id: string;
  type: AlertType;
  message: string;
  onClose: (id: string) => void;
}

export const Alert: React.FC<AlertProps> = ({ id, type, message, onClose }) => {
  const [isPaused, setIsPaused] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (isPaused) return;

    const timer = setTimeout(() => {
      setIsVisible(false); // Trigger exit animation
      // Allow animation to play before actual removal
      setTimeout(() => onClose(id), 300); 
    }, 2000); // 2 seconds visible time

    return () => clearTimeout(timer);
  }, [id, onClose, isPaused]);

  const styles = {
    success: {
      border: 'border-l-[#1d8102]', // AWS Green
      icon: <CheckCircle className="h-4 w-4 text-[#1d8102]" />,
      title: 'Success',
      bg: 'bg-white'
    },
    error: {
      border: 'border-l-[#d13212]', // AWS Red
      icon: <AlertCircle className="h-4 w-4 text-[#d13212]" />,
      title: 'Error',
      bg: 'bg-white'
    },
    warning: {
      border: 'border-l-[#ec7211]', // AWS Orange
      icon: <AlertTriangle className="h-4 w-4 text-[#ec7211]" />,
      title: 'Warning',
      bg: 'bg-white'
    },
    info: {
      border: 'border-l-[#0073bb]', // AWS Blue
      icon: <Info className="h-4 w-4 text-[#0073bb]" />,
      title: 'Info',
      bg: 'bg-white'
    }
  };

  const style = styles[type];

  return (
    <div 
      className={`
        relative 
        flex items-start 
        w-[340px] 
        bg-white 
        shadow-[0_1px_1px_0_rgba(0,28,36,0.3),_1px_1px_1px_0_rgba(0,28,36,0.15),_-1px_1px_1px_0_rgba(0,28,36,0.15)] 
        border-l-[4px] ${style.border} 
        rounded-sm 
        p-3
        mb-2
        transition-all duration-300 ease-in-out
        ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      `}
      role="alert"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="flex-shrink-0 mt-0.5 mr-2.5">
        {style.icon}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-bold text-[#16191f] leading-5 mb-0.5">
            {style.title}
        </h4>
        <div className="text-xs text-[#545b64] leading-4 break-words">
            {message}
        </div>
      </div>
      <button 
        onClick={() => {
            setIsVisible(false);
            setTimeout(() => onClose(id), 300);
        }}
        className="flex-shrink-0 ml-3 text-[#545b64] hover:text-[#16191f] transition-colors focus:outline-none p-0.5 rounded-sm hover:bg-gray-100"
        aria-label="Close notification"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};
