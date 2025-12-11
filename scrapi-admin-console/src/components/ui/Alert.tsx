import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export type AlertType = 'success' | 'error' | 'info' | 'warning';

export interface AlertProps {
  id: string;
  type: AlertType;
  message: string;
  onClose: (id: string) => void;
}

export const Alert: React.FC<AlertProps> = ({ id, type, message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id);
    }, 5000); // Auto close after 5 seconds

    return () => clearTimeout(timer);
  }, [id, onClose]);

  const styles = {
    success: {
      bg: 'bg-green-50',
      border: 'border-green-500',
      text: 'text-green-800',
      icon: <CheckCircle className="h-5 w-5 text-green-500" />
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-500',
      text: 'text-red-800',
      icon: <AlertCircle className="h-5 w-5 text-red-500" />
    },
    warning: {
      bg: 'bg-orange-50',
      border: 'border-orange-500',
      text: 'text-orange-800',
      icon: <AlertTriangle className="h-5 w-5 text-orange-500" />
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-500',
      text: 'text-blue-800',
      icon: <Info className="h-5 w-5 text-blue-500" />
    }
  };

  const style = styles[type];

  return (
    <div className={`${style.bg} border-l-4 ${style.border} p-4 rounded shadow-md flex items-start space-x-3 min-w-[300px] max-w-md transition-all duration-300 transform translate-x-0 animate-in slide-in-from-right font-inter`}>
      <div className="flex-shrink-0 mt-0.5">
        {style.icon}
      </div>
      <div className={`flex-1 text-sm font-medium ${style.text}`}>
        {message}
      </div>
      <button 
        onClick={() => onClose(id)}
        className={`flex-shrink-0 ml-4 ${style.text} hover:opacity-75 transition-opacity focus:outline-none`}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};
