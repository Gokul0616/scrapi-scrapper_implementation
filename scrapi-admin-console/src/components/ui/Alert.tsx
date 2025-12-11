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
      border: 'border-l-green-500',
      icon: <CheckCircle className="h-5 w-5 text-green-600" />,
      title: 'Success'
    },
    error: {
      border: 'border-l-red-600',
      icon: <AlertCircle className="h-5 w-5 text-red-600" />,
      title: 'Error'
    },
    warning: {
      border: 'border-l-aws-orange',
      icon: <AlertTriangle className="h-5 w-5 text-aws-orange" />,
      title: 'Warning'
    },
    info: {
      border: 'border-l-aws-blue',
      icon: <Info className="h-5 w-5 text-aws-blue" />,
      title: 'Info'
    }
  };

  const style = styles[type];

  return (
    <div className={`bg-white border border-gray-200 border-l-[6px] ${style.border} p-4 shadow-lg flex items-start space-x-3 min-w-[320px] max-w-md animate-in slide-in-from-right fade-in duration-300 rounded-sm`}>
      <div className="flex-shrink-0 mt-0.5">
        {style.icon}
      </div>
      <div className="flex-1">
        <h4 className="text-sm font-bold text-aws-text mb-0.5">
            {style.title}
        </h4>
        <p className="text-sm text-aws-text-secondary leading-relaxed">
            {message}
        </p>
      </div>
      <button 
        onClick={() => onClose(id)}
        className="flex-shrink-0 ml-4 text-gray-400 hover:text-aws-text transition-colors focus:outline-none"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};
