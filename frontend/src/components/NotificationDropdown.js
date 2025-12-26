import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useNotifications } from '../contexts/NotificationContext';
import { Check, Sun } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow';

const NotificationDropdown = ({ isOpen, onClose, triggerRef }) => {
  const { theme } = useTheme();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        isOpen &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target)
      ) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose, triggerRef]);

  // Close dropdown on ESC key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  const handleNotificationClick = async (notification) => {
    // Mark as read if unread
    if (!notification.read) {
      await markAsRead([notification.notification_id]);
    }

    // Navigate to link if provided
    if (notification.link) {
      window.location.href = notification.link;
    }
  };

  if (!isOpen) return null;

  // Calculate dropdown position
  const getDropdownPosition = () => {
    if (!triggerRef.current) return { top: '50px', left: '16px' };

    const rect = triggerRef.current.getBoundingClientRect();
    return {
      top: `${rect.bottom + 8}px`,
      left: `${rect.left}px`
    };
  };

  const position = getDropdownPosition();

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[9998]"
        onClick={onClose}
        data-testid="notification-backdrop"
      />

      {/* Notification Dropdown */}
      <div
        ref={dropdownRef}
        className={`fixed rounded-lg border z-[9999] shadow-2xl ${
          theme === 'dark'
            ? 'bg-[#1A1B1E] border-gray-800'
            : 'bg-white border-gray-200'
        }`}
        style={{
          width: '380px',
          maxHeight: '500px',
          ...position
        }}
        data-testid="notification-dropdown"
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-4 py-3 border-b ${
            theme === 'dark' ? 'border-gray-800' : 'border-gray-200'
          }`}
        >
          <h3
            className={`text-sm font-semibold ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}
          >
            Notifications
          </h3>
          <button
            onClick={handleMarkAllAsRead}
            disabled={unreadCount === 0}
            className={`flex items-center space-x-1 text-xs font-medium px-2 py-1 rounded transition-colors ${
              unreadCount === 0
                ? theme === 'dark'
                  ? 'text-gray-600 cursor-not-allowed'
                  : 'text-gray-400 cursor-not-allowed'
                : theme === 'dark'
                ? 'text-gray-300 hover:bg-gray-800'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
            data-testid="mark-all-as-read-button"
          >
            <Check className="w-3 h-3" />
            <span>Mark all as read</span>
          </button>
        </div>

        {/* Content */}
        <div
          className="overflow-y-auto"
          style={{ maxHeight: '420px' }}
        >
          {notifications.length === 0 ? (
            // Empty State
            <div className="flex flex-col items-center justify-center py-16 px-6">
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                  theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'
                }`}
              >
                <Sun
                  className={`w-8 h-8 ${
                    theme === 'dark' ? 'text-gray-600' : 'text-gray-400'
                  }`}
                />
              </div>
              <p
                className={`text-sm font-medium ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}
              >
                Nothing here, you're all good.
              </p>
            </div>
          ) : (
            // Notification List
            <div className="py-1">
              {notifications.map((notification) => (
                <button
                  key={notification.notification_id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`w-full px-4 py-3 text-left transition-colors border-b ${
                    theme === 'dark'
                      ? 'border-gray-800 hover:bg-gray-800/50'
                      : 'border-gray-100 hover:bg-gray-50'
                  } ${!notification.read ? (theme === 'dark' ? 'bg-gray-900/30' : 'bg-blue-50/30') : ''}`}
                  data-testid={`notification-item-${notification.notification_id}`}
                >
                  <div className="flex items-start space-x-3">
                    {/* Icon */}
                    {notification.icon && (
                      <span className="text-2xl flex-shrink-0">
                        {notification.icon}
                      </span>
                    )}

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-1">
                        <h4
                          className={`text-sm font-semibold ${
                            theme === 'dark' ? 'text-white' : 'text-gray-900'
                          }`}
                        >
                          {notification.title}
                        </h4>
                        {!notification.read && (
                          <div
                            className={`w-2 h-2 rounded-full flex-shrink-0 ml-2 mt-1 ${
                              theme === 'dark' ? 'bg-blue-500' : 'bg-blue-600'
                            }`}
                          />
                        )}
                      </div>
                      <p
                        className={`text-xs mb-2 ${
                          theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                        }`}
                      >
                        {notification.message}
                      </p>
                      <span
                        className={`text-xs ${
                          theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                        }`}
                      >
                        {formatDistanceToNow(new Date(notification.created_at), {
                          addSuffix: true
                        })}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default NotificationDropdown;
