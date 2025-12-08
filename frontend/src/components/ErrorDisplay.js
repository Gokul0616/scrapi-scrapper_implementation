import React, { useEffect, useState } from 'react';
import { X, AlertCircle, XCircle, AlertTriangle, Info } from 'lucide-react';

/**
 * Unique animated error display component
 * Slides in from bottom-right with custom animations
 */
const ErrorDisplay = ({ message, type = 'error', onClose, duration = 5000, title }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    setTimeout(() => setIsVisible(true), 10);

    // Auto-dismiss after duration
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      if (onClose) onClose();
    }, 300);
  };

  const getIcon = () => {
    switch (type) {
      case 'error':
        return <XCircle className="w-5 h-5" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5" />;
      case 'info':
        return <Info className="w-5 h-5" />;
      case 'success':
        return <AlertCircle className="w-5 h-5" />;
      default:
        return <AlertCircle className="w-5 h-5" />;
    }
  };

  const getColors = () => {
    switch (type) {
      case 'error':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          icon: 'text-red-500',
          text: 'text-red-900',
          progressBar: 'bg-red-500'
        };
      case 'warning':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          icon: 'text-yellow-500',
          text: 'text-yellow-900',
          progressBar: 'bg-yellow-500'
        };
      case 'info':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          icon: 'text-blue-500',
          text: 'text-blue-900',
          progressBar: 'bg-blue-500'
        };
      case 'success':
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          icon: 'text-green-500',
          text: 'text-green-900',
          progressBar: 'bg-green-500'
        };
      default:
        return {
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          icon: 'text-gray-500',
          text: 'text-gray-900',
          progressBar: 'bg-gray-500'
        };
    }
  };

  const colors = getColors();

  return (
    <div
      className={`
        fixed bottom-6 right-6 z-[9999]
        transform transition-all duration-300 ease-out
        ${isVisible && !isExiting ? 'translate-x-0 opacity-100 scale-100' : 'translate-x-full opacity-0 scale-95'}
      `}
      style={{
        maxWidth: '400px',
        minWidth: '300px'
      }}
    >
      <div
        className={`
          ${colors.bg} ${colors.border}
          border-l-4 rounded-lg shadow-lg
          overflow-hidden
          backdrop-blur-sm
          animate-bounce-in
        `}
      >
        <div className="p-4">
          <div className="flex items-start space-x-3">
            <div className={`${colors.icon} flex-shrink-0 mt-0.5`}>
              {getIcon()}
            </div>
            
            <div className="flex-1 min-w-0">
              {title && (
                <h3 className={`text-sm font-semibold ${colors.text} mb-1`}>
                  {title}
                </h3>
              )}
              <p className={`text-sm ${colors.text} opacity-90`}>
                {message}
              </p>
            </div>

            <button
              onClick={handleClose}
              className={`${colors.icon} hover:opacity-70 transition-opacity flex-shrink-0`}
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Animated progress bar */}
        {duration > 0 && (
          <div className="h-1 bg-gray-200 bg-opacity-30">
            <div
              className={`h-full ${colors.progressBar} transition-all ease-linear`}
              style={{
                animation: `shrink ${duration}ms linear forwards`
              }}
            />
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes shrink {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }

        @keyframes bounce-in {
          0% {
            transform: translateX(100%) scale(0.9);
            opacity: 0;
          }
          50% {
            transform: translateX(-10px) scale(1.02);
          }
          100% {
            transform: translateX(0) scale(1);
            opacity: 1;
          }
        }

        .animate-bounce-in {
          animation: bounce-in 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }
      `}</style>
    </div>
  );
};

// Container component to manage multiple error displays
export const ErrorDisplayContainer = () => {
  const [errors, setErrors] = useState([]);

  useEffect(() => {
    // Listen for custom error events
    const handleError = (event) => {
      const { message, type, title, duration } = event.detail;
      const id = Date.now() + Math.random();
      
      setErrors((prev) => [...prev, { id, message, type, title, duration }]);
    };

    window.addEventListener('show-error', handleError);
    return () => window.removeEventListener('show-error', handleError);
  }, []);

  const removeError = (id) => {
    setErrors((prev) => prev.filter((err) => err.id !== id));
  };

  return (
    <>
      {errors.map((error, index) => (
        <div
          key={error.id}
          style={{
            position: 'fixed',
            bottom: `${24 + index * 120}px`,
            right: '24px',
            zIndex: 9999
          }}
        >
          <ErrorDisplay
            message={error.message}
            type={error.type}
            title={error.title}
            duration={error.duration}
            onClose={() => removeError(error.id)}
          />
        </div>
      ))}
    </>
  );
};

// Helper function to show errors from anywhere in the app
export const showError = (message, options = {}) => {
  const event = new CustomEvent('show-error', {
    detail: {
      message,
      type: options.type || 'error',
      title: options.title,
      duration: options.duration !== undefined ? options.duration : 5000
    }
  });
  window.dispatchEvent(event);
};

export default ErrorDisplay;
