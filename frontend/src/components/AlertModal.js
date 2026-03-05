import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './ui/button';
import {
  AlertCircle,
  CheckCircle2,
  XCircle,
  Info,
  AlertTriangle,
  X
} from 'lucide-react';

/**
 * Centralized Alert Modal Component
 * 
 * Usage Examples:
 * 
 * 1. Simple Alert:
 * <AlertModal
 *   show={showAlert}
 *   onClose={() => setShowAlert(false)}
 *   title="Success"
 *   message="Operation completed successfully!"
 *   type="success"
 * />
 * 
 * 2. Confirmation Dialog:
 * <AlertModal
 *   show={showConfirm}
 *   onClose={() => setShowConfirm(false)}
 *   onConfirm={handleDelete}
 *   title="Confirm Delete"
 *   message="Are you sure you want to delete this item?"
 *   type="warning"
 *   showCancel={true}
 *   confirmText="Delete"
 *   cancelText="Cancel"
 * />
 * 
 * 3. Alert with Details:
 * <AlertModal
 *   show={showError}
 *   onClose={() => setShowError(false)}
 *   title="Error"
 *   message="Failed to complete the operation"
 *   type="error"
 *   details={[
 *     { label: 'Error Code', value: '500' },
 *     { label: 'Message', value: errorMessage }
 *   ]}
 * />
 */

const AlertModal = ({
  show = false,
  onClose,
  onConfirm,
  title,
  message,
  type = 'info', // 'success', 'error', 'warning', 'info'
  details = [], // Array of { label, value } objects
  showCancel = false,
  confirmText = 'OK',
  cancelText = 'Cancel',
  confirmButtonClass = '',
  size = 'md' // 'sm', 'md', 'lg'
}) => {
  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && show) {
        onClose();
      }
    };

    if (show) {
      window.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      window.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [show, onClose]);

  if (!show) return null;

  // Configuration for different alert types - matched with app theme
  const typeConfig = {
    success: {
      icon: CheckCircle2,
      iconBgColor: 'bg-green-500/10',
      iconColor: 'text-green-500',
      confirmBgColor: 'bg-blue-600 hover:bg-blue-700'
    },
    error: {
      icon: XCircle,
      iconBgColor: 'bg-destructive/10',
      iconColor: 'text-destructive',
      confirmBgColor: 'bg-destructive hover:bg-destructive/90'
    },
    warning: {
      icon: AlertTriangle,
      iconBgColor: 'bg-orange-500/10',
      iconColor: 'text-orange-500',
      confirmBgColor: 'bg-orange-600 hover:bg-orange-700'
    },
    info: {
      icon: Info,
      iconBgColor: 'bg-blue-500/10',
      iconColor: 'text-blue-500',
      confirmBgColor: 'bg-blue-600 hover:bg-blue-700'
    }
  };

  const config = typeConfig[type] || typeConfig.info;
  const IconComponent = config.icon;

  // Size configurations
  const sizeConfig = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg'
  };

  const modalSizeClass = sizeConfig[size] || sizeConfig.md;

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    onClose();
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 w-screen h-screen bg-black/70 flex items-center justify-center z-[100000] backdrop-blur-[2px] p-4 m-0 animate-in fade-in duration-300"
      onClick={handleBackdropClick}
    >
      <div
        className={`w-full ${modalSizeClass} bg-white dark:bg-[#0F1014] rounded-xl shadow-2xl overflow-hidden border border-gray-200 dark:border-white/10 animate-scrapi-modal-enter`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header (Optional based on title) */}
        {title && (
          <div className="px-4 py-2 border-b border-gray-200 dark:border-white/10 flex items-center justify-between">
            <h2 className="text-[15px] font-bold text-gray-900 dark:text-gray-50">
              {title}
            </h2>
            {!showCancel && (
              <button
                onClick={onClose}
                className="p-1 rounded transition-colors text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        <div className="px-4 py-3.5">
          {/* Content */}
          <div className="min-w-0">
            {/* Message */}
            {message && (
              <p className="text-[13.5px] text-gray-700 dark:text-gray-300 leading-relaxed font-semibold">
                {message}
              </p>
            )}

            {/* Details Section */}
            {details.length > 0 && (
              <div className="mt-2.5 bg-muted/50 rounded-lg p-2.5 space-y-1.5 border border-border">
                {details.map((detail, index) => (
                  <div key={index}>
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">
                      {detail.label}
                    </p>
                    <p className="text-[12px] font-mono text-foreground break-all bg-background px-2 py-0.5 rounded border border-border">
                      {detail.value}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 justify-end mt-4">
            {showCancel && (
              <button
                onClick={onClose}
                className="px-4 py-2 text-[13px] font-semibold text-foreground hover:bg-muted/50 rounded-lg transition-colors"
              >
                {cancelText}
              </button>
            )}
            <button
              onClick={handleConfirm}
              className={`px-5 py-2 text-[13px] font-semibold text-white rounded-lg transition-colors shadow-sm active:scale-95 ${confirmButtonClass || config.confirmBgColor}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default AlertModal;
