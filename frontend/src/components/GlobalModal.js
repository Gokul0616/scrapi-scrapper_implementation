import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useModal } from '../contexts/ModalContext';

/**
 * GlobalModal - Reusable modal wrapper component
 * 
 * Features:
 * - Only one modal can be open at a time (managed by ModalContext)
 * - ESC key to close (handled globally by ModalContext)
 * - Click outside to close
 * - Consistent styling and z-index management
 * - Theme support (dark/light)
 * 
 * Usage:
 * <GlobalModal
 *   modalId="unique-modal-id"
 *   title="Modal Title"
 *   size="md" // 'sm', 'md', 'lg', 'xl', 'full'
 *   showCloseButton={true}
 *   closeOnBackdropClick={true}
 * >
 *   {children}
 * </GlobalModal>
 */

const GlobalModal = ({
  modalId,
  children,
  title,
  size = 'md',
  showCloseButton = true,
  closeOnBackdropClick = true,
  customHeader = null,
  customFooter = null,
  className = '',
  contentClassName = ''
}) => {
  const { theme } = useTheme();
  const { isModalOpen, closeModal } = useModal();

  const isOpen = isModalOpen(modalId);

  // Size configurations
  const sizeClasses = {
    sm: 'max-w-md',
    xs: 'max-w-xl',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
    full: 'w-screen h-screen max-w-none rounded-none' // True fullscreen matching Scrapi Out-Of-Layout modals
  };

  const handleBackdropClick = (e) => {
    if (closeOnBackdropClick && e.target === e.currentTarget) {
      closeModal();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 bg-black/70 flex items-center justify-center z-[10000] backdrop-blur-[2px] animate-in fade-in duration-300 ${size === 'full' ? 'p-0' : 'p-4'}`}
      onClick={handleBackdropClick}
      data-testid={`${modalId}-backdrop`}
    >
      <div
        className={`w-full animate-scrapi-modal-enter ${sizeClasses[size]} ${size !== 'full' ? 'rounded-xl shadow-2xl overflow-hidden' : ''} bg-white dark:bg-[#0F1014] border border-gray-200 dark:border-white/10 ${className} flex flex-col`}
        onClick={(e) => e.stopPropagation()}
        data-testid={`${modalId}-container`}
      >
        {/* Header */}
        {(title || customHeader || showCloseButton) && (
          <div
            className={`flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-white/10 ${size === 'full' ? 'relative' : ''}`}
          >
            {/* Full screen Logo on the left */}
            {size === 'full' && (
              <div className="absolute left-6 flex items-center gap-2">
                <img src="/logo.png" alt="Logo" className="w-5 h-5 object-contain" />
                <span className="font-bold text-foreground text-[16px] tracking-tight">Scrapi</span>
              </div>
            )}

            <div className={`flex-1 ${size === 'full' ? 'flex justify-center' : ''}`}>
              {customHeader ? (
                customHeader
              ) : (
                <h2
                  className={`text-[17px] font-bold text-gray-900 dark:text-gray-50 ${size === 'full' ? 'text-center' : ''}`}
                >
                  {title}
                </h2>
              )}
            </div>

            {showCloseButton && (
              <button
                onClick={closeModal}
                className="p-1 rounded transition-colors text-muted-foreground hover:bg-muted hover:text-foreground relative z-10"
                data-testid={`${modalId}-close-button`}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className={`${contentClassName} ${size === 'full' ? 'flex-1 overflow-y-auto' : ''}`}>
          {children}
        </div>

        {/* Footer */}
        {customFooter && (
          <div
            className="px-5 py-3 border-t border-gray-200 dark:border-white/10"
          >
            {customFooter}
          </div>
        )}
      </div>
    </div>
  );
};

export default GlobalModal;
