import React, { useEffect } from 'react';
import { X, AlertTriangle, CheckCircle } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  children: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'primary' | 'danger' | 'warning' | 'success';
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
      if (e.key === 'Escape' && !isLoading) onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose, isLoading]);

  // Prevent scrolling when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const variantConfig = {
    primary: {
      btn: 'bg-blue-600 hover:bg-blue-700 text-white border-transparent',
      icon: null
    },
    danger: {
      btn: 'bg-red-600 hover:bg-red-700 text-white border-transparent',
      icon: <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
    },
    warning: {
      btn: 'bg-yellow-600 hover:bg-yellow-700 text-white border-transparent',
      icon: <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2" />
    },
    success: {
      btn: 'bg-green-600 hover:bg-green-700 text-white border-transparent',
      icon: <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
    }
  };

  const style = variantConfig[variant];

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 animate-in fade-in duration-300" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-[2px]"
        onClick={() => !isLoading && onClose()}
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-2xl bg-card shadow-2xl rounded-xl animate-scrapi-modal-enter flex flex-col max-h-[90vh] border border-border overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-card rounded-t-xl">
          <h3 className="text-[17px] font-bold text-foreground flex items-center" id="modal-title">
            {style.icon}
            {title}
          </h3>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-1 rounded transition-colors text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <span className="sr-only">Close</span>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-6 overflow-y-auto text-sm text-foreground leading-relaxed">
          {children}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-muted/30 border-t border-border flex justify-end gap-3 rounded-b-xl">
          <button
            type="button"
            className="px-4 py-1.5 text-sm font-semibold text-foreground bg-card border border-border rounded hover:bg-muted focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-all"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={`px-4 py-1.5 text-sm font-semibold rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${style.btn}`}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </div>
            ) : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
