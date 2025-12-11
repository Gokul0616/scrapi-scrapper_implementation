import React, { useEffect } from 'react';
import { X, AlertTriangle, Info } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  children: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'primary' | 'danger' | 'warning';
  isLoading?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  children,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'primary',
  isLoading = false,
}) => {
  if (!isOpen) return null;

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const variantStyles = {
    primary: 'bg-aws-blue hover:bg-[#00558b] text-white',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    warning: 'bg-aws-orange hover:bg-orange-600 text-white',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/50 backdrop-blur-sm">
      <div 
        className="bg-white w-full max-w-xl rounded-sm shadow-lg border border-gray-200 animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50/50">
          <h2 className="text-lg font-bold text-aws-text flex items-center gap-2">
            {variant === 'danger' && <AlertTriangle className="h-5 w-5 text-red-600" />}
            {variant === 'warning' && <AlertTriangle className="h-5 w-5 text-aws-orange" />}
            {variant === 'primary' && <Info className="h-5 w-5 text-aws-blue" />}
            {title}
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-aws-text transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="px-6 py-6 text-aws-text text-sm">
          {children}
        </div>
        
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-aws-text bg-white border border-gray-300 rounded-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-aws-blue"
            disabled={isLoading}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium border border-transparent rounded-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-aws-blue disabled:opacity-50 disabled:cursor-not-allowed ${variantStyles[variant]}`}
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
