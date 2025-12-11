import React, { useEffect } from 'react';
import { X, AlertTriangle, Info, CheckCircle } from 'lucide-react';

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
      btn: 'bg-[#ec7211] hover:bg-[#eb5f07] text-white border-transparent', // AWS Orange
      icon: null
    },
    danger: {
      btn: 'bg-[#ec7211] hover:bg-[#eb5f07] text-white border-transparent', // AWS typically uses Orange for actions, even destructive ones, unless critical
      icon: <AlertTriangle className="h-5 w-5 text-[#d13212] mr-2" /> // Red icon for danger context
    },
    warning: {
      btn: 'bg-[#ec7211] hover:bg-[#eb5f07] text-white border-transparent',
      icon: <AlertTriangle className="h-5 w-5 text-[#ec7211] mr-2" />
    },
    success: {
        btn: 'bg-[#ec7211] hover:bg-[#eb5f07] text-white border-transparent',
        icon: <CheckCircle className="h-5 w-5 text-[#1d8102] mr-2" />
    }
  };

  const style = variantConfig[variant];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-[#16191f] bg-opacity-50 transition-opacity backdrop-blur-[1px]" 
        onClick={() => !isLoading && onClose()}
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-lg bg-white shadow-xl rounded-sm transform transition-all flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#eaeded] bg-[#fdfdfd]">
          <h3 className="text-lg font-bold text-[#16191f] flex items-center" id="modal-title">
            {style.icon}
            {title}
          </h3>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-[#545b64] hover:text-[#16191f] focus:outline-none transition-colors p-1"
          >
            <span className="sr-only">Close</span>
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6 overflow-y-auto text-sm text-[#16191f] leading-relaxed">
          {children}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[#fdfdfd] border-t border-[#eaeded] flex justify-end gap-3 rounded-b-sm">
          <button
            type="button"
            className="px-4 py-1.5 text-sm font-bold text-[#16191f] bg-white border border-[#545b64] rounded-sm hover:bg-[#f2f3f3] hover:border-[#16191f] focus:outline-none focus:ring-2 focus:ring-[#0073bb] focus:ring-offset-1 transition-all"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={`px-4 py-1.5 text-sm font-bold rounded-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0073bb] focus:ring-offset-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${style.btn}`}
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
