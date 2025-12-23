import React, { useEffect } from 'react';
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
  if (!show) return null;

  // Configuration for different alert types - matched with app theme
  const typeConfig = {
    success: {
      icon: CheckCircle2,
      iconBgColor: 'bg-green-50',
      iconColor: 'text-green-600',
      confirmBgColor: 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800'
    },
    error: {
      icon: XCircle,
      iconBgColor: 'bg-red-50',
      iconColor: 'text-red-600',
      confirmBgColor: 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800'
    },
    warning: {
      icon: AlertTriangle,
      iconBgColor: 'bg-orange-50',
      iconColor: 'text-orange-600',
      confirmBgColor: 'bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800'
    },
    info: {
      icon: Info,
      iconBgColor: 'bg-gray-50',
      iconColor: 'text-gray-700',
      confirmBgColor: 'bg-gradient-to-r from-gray-700 to-gray-900 hover:from-gray-600 hover:to-gray-800'
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

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[100] backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div 
        className={`bg-white rounded-xl shadow-2xl p-6 ${modalSizeClass} w-full mx-4 animate-in fade-in zoom-in duration-200 border border-gray-200`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className={`flex-shrink-0 w-12 h-12 rounded-full ${config.iconBgColor} flex items-center justify-center ring-2 ring-offset-2 ${
            type === 'success' ? 'ring-green-200' :
            type === 'error' ? 'ring-red-200' :
            type === 'warning' ? 'ring-orange-200' :
            'ring-gray-200'
          }`}>
            <IconComponent className={`w-6 h-6 ${config.iconColor}`} />
          </div>

          {/* Content */}
          <div className="flex-1">
            {/* Title */}
            {title && (
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                {title}
              </h3>
            )}

            {/* Message */}
            {message && (
              <p className="text-sm text-gray-700 mb-4 leading-relaxed">
                {message}
              </p>
            )}

            {/* Details Section */}
            {details.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-3 border border-gray-200">
                {details.map((detail, index) => (
                  <div key={index}>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                      {detail.label}
                    </p>
                    <p className="text-sm font-mono text-gray-900 break-all bg-white px-2 py-1 rounded border border-gray-200">
                      {detail.value}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-3 justify-end mt-6">
              {showCancel && (
                <Button
                  onClick={onClose}
                  variant="outline"
                  size="sm"
                  className="px-5 py-2 border-gray-300 hover:bg-gray-50 text-gray-700 font-medium"
                >
                  {cancelText}
                </Button>
              )}
              <Button
                onClick={handleConfirm}
                size="sm"
                className={`px-5 py-2 ${confirmButtonClass || config.confirmBgColor} text-white font-medium shadow-md hover:shadow-lg transition-all`}
              >
                {confirmText}
              </Button>
            </div>
          </div>

          {/* Close button (optional, for non-confirmation modals) */}
          {!showCancel && (
            <button
              onClick={onClose}
              className="flex-shrink-0 text-gray-400 hover:text-gray-700 transition-colors hover:bg-gray-100 rounded-full p-1"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AlertModal;
