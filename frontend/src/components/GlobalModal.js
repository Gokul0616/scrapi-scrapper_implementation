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
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
    full: 'max-w-[95vw]'
  };

  const handleBackdropClick = (e) => {
    if (closeOnBackdropClick && e.target === e.currentTarget) {
      closeModal();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/30 flex items-center justify-center z-[10000] p-4 backdrop-blur-sm"
      onClick={handleBackdropClick}
      data-testid={`${modalId}-backdrop`}
    >
      <div
        className={`w-full ${sizeClasses[size]} rounded-lg shadow-xl bg-background border border-border ${className}`}
        onClick={(e) => e.stopPropagation()}
        data-testid={`${modalId}-container`}
      >
        {/* Header */}
        {(title || customHeader || showCloseButton) && (
          <div
            className="flex items-center justify-between px-5 py-3 border-b border-border"
          >
            {customHeader ? (
              customHeader
            ) : (
              <h2
                className="text-sm font-semibold text-foreground"
              >
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button
                onClick={closeModal}
                className="p-1 rounded transition-colors text-muted-foreground hover:bg-muted hover:text-foreground"
                data-testid={`${modalId}-close-button`}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className={contentClassName}>
          {children}
        </div>

        {/* Footer */}
        {customFooter && (
          <div
            className="px-5 py-3 border-t border-border"
          >
            {customFooter}
          </div>
        )}
      </div>
    </div>
  );
};

export default GlobalModal;
