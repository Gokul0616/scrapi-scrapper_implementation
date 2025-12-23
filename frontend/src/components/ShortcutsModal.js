import React, { useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { X, Command, Keyboard } from 'lucide-react';

const ShortcutsModal = ({ isOpen, onClose }) => {
  const { theme } = useTheme();

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
    }
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  const shortcutSections = [
    {
      title: 'Navigation',
      icon: Navigation,
      shortcuts: [
        { keys: ['S', 'H'], description: 'Go to Home' },
        { keys: ['S', 'O'], description: 'Go to Scrapi Store' },
        { keys: ['S', 'A'], description: 'Go to Actors' },
        { keys: ['S', 'R'], description: 'Go to Runs' },
        { keys: ['S', 'T'], description: 'Go to Saved Tasks' },
        { keys: ['S', 'I'], description: 'Go to Integrations' },
        { keys: ['S', 'C'], description: 'Go to Schedules' },
      ]
    },
    {
      title: 'Development',
      icon: Zap,
      shortcuts: [
        { keys: ['S', 'M'], description: 'Go to My Actors' },
        { keys: ['S', 'N'], description: 'Go to Insights' },
        { keys: ['S', 'E'], description: 'Go to Messaging' },
      ]
    },
    {
      title: 'Settings & Management',
      icon: Globe,
      shortcuts: [
        { keys: ['S', 'P'], description: 'Go to Proxy' },
        { keys: ['S', 'D'], description: 'Go to Storage' },
        { keys: ['S', 'B'], description: 'Go to Billing' },
        { keys: ['S', 'G'], description: 'Go to Settings' },
      ]
    },
    {
      title: 'Global Shortcuts',
      icon: Zap,
      shortcuts: [
        { keys: [isMac ? '⌘' : 'Ctrl', 'K'], description: 'Open Search' },
        { keys: [isMac ? '⌘' : 'Ctrl', 'B'], description: 'Toggle Sidebar' },
        { keys: [isMac ? '⌘' : 'Ctrl', 'L'], description: 'Toggle Theme' },
        { keys: ['Shift', '?'], description: 'Show Shortcuts' },
      ]
    }
  ];

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-4xl rounded-xl shadow-2xl overflow-hidden ${
          theme === 'dark' ? 'bg-[#1A1B1E]' : 'bg-white'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-b ${
            theme === 'dark' ? 'border-gray-800 bg-[#25262B]' : 'border-gray-200 bg-gray-50'
          }`}
        >
          <div>
            <h2
              className={`text-xl font-bold ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}
            >
              Keyboard Shortcuts
            </h2>
            <p
              className={`text-sm mt-1 ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}
            >
              Navigate quickly through the application
            </p>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              theme === 'dark'
                ? 'hover:bg-gray-800 text-gray-400 hover:text-white'
                : 'hover:bg-gray-200 text-gray-600 hover:text-gray-900'
            }`}
            data-testid="shortcuts-modal-close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {shortcutSections.map((section, sectionIdx) => (
              <div key={sectionIdx}>
                <div className="flex items-center gap-2 mb-3">
                  <section.icon
                    className={`w-4 h-4 ${
                      theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                    }`}
                  />
                  <h3
                    className={`text-sm font-semibold uppercase tracking-wide ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}
                  >
                    {section.title}
                  </h3>
                </div>
                <div className="space-y-2">
                  {section.shortcuts.map((shortcut, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center justify-between py-2 px-3 rounded-lg ${
                        theme === 'dark'
                          ? 'bg-[#25262B] hover:bg-[#2C2D30]'
                          : 'bg-gray-50 hover:bg-gray-100'
                      } transition-colors`}
                    >
                      <span
                        className={`text-sm ${
                          theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                        }`}
                      >
                        {shortcut.description}
                      </span>
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((key, keyIdx) => (
                          <React.Fragment key={keyIdx}>
                            {keyIdx > 0 && (
                              <span
                                className={`text-xs mx-0.5 ${
                                  theme === 'dark' ? 'text-gray-600' : 'text-gray-400'
                                }`}
                              >
                                then
                              </span>
                            )}
                            <kbd
                              className={`px-2.5 py-1 rounded text-xs font-mono font-medium shadow-sm ${
                                theme === 'dark'
                                  ? 'bg-gray-700 text-gray-200 border border-gray-600'
                                  : 'bg-white text-gray-700 border border-gray-300'
                              }`}
                            >
                              {key}
                            </kbd>
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Footer Tip */}
          <div
            className={`mt-6 p-4 rounded-lg border ${
              theme === 'dark'
                ? 'bg-purple-900/20 border-purple-700/50 text-purple-200'
                : 'bg-purple-50 border-purple-200 text-purple-900'
            }`}
          >
            <p className="text-sm">
              <span className="font-semibold">💡 Tip:</span> Press{' '}
              <kbd
                className={`px-2 py-0.5 rounded text-xs font-mono mx-1 ${
                  theme === 'dark'
                    ? 'bg-purple-800 text-purple-100'
                    : 'bg-purple-200 text-purple-900'
                }`}
              >
                Shift
              </kbd>
              +
              <kbd
                className={`px-2 py-0.5 rounded text-xs font-mono mx-1 ${
                  theme === 'dark'
                    ? 'bg-purple-800 text-purple-100'
                    : 'bg-purple-200 text-purple-900'
                }`}
              >
                ?
              </kbd>
              anytime to view this shortcuts guide
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShortcutsModal;
