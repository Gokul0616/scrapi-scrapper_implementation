import React, { useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { X } from 'lucide-react';

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
      shortcuts: [
        { keys: ['S', 'H'], description: 'Go to Home' },
        { keys: ['S', 'O'], description: 'Go to Scrapi Store' },
        { keys: ['S', 'A'], description: 'Go to Actors' },
        { keys: ['S', 'R'], description: 'Go to Runs' },
        { keys: ['S', 'T'], description: 'Go to Saved Tasks' },
        { keys: ['S', 'I'], description: 'Go to Integrations' },
        { keys: ['S', 'C'], description: 'Go to Schedules' },
        { keys: ['S', 'M'], description: 'Go to My Actors' },
        { keys: ['S', 'N'], description: 'Go to Insights' },
        { keys: ['S', 'E'], description: 'Go to Messaging' },
      ]
    },
    {
      title: 'System',
      shortcuts: [
        { keys: ['S', 'P'], description: 'Go to Proxy' },
        { keys: ['S', 'D'], description: 'Go to Storage' },
        { keys: ['S', 'B'], description: 'Go to Billing' },
        { keys: ['S', 'G'], description: 'Go to Settings' },
      ]
    },
    {
      title: 'General',
      shortcuts: [
        { keys: [isMac ? '⌘' : 'Ctrl', 'K'], description: 'Open Command Menu' },
        { keys: [isMac ? '⌘' : 'Ctrl', 'B'], description: 'Toggle Sidebar' },
        { keys: [isMac ? '⌘' : 'Ctrl', 'L'], description: 'Toggle Theme' },
        { keys: ['Shift', '?'], description: 'Open Keyboard Shortcuts' },
        { keys: ['Esc'], description: 'Close Dialog or Menu' },
      ]
    }
  ];

  return (
    <div
      className="fixed inset-0 bg-black/30 flex items-center justify-center z-[10000] p-4"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-3xl rounded-lg shadow-xl ${
          theme === 'dark' ? 'bg-[#1A1B1E]' : 'bg-white'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-5 py-3 border-b ${
            theme === 'dark' ? 'border-gray-800' : 'border-gray-200'
          }`}
        >
          <h2
            className={`text-sm font-semibold ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}
          >
            Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            className={`p-1 rounded transition-colors ${
              theme === 'dark'
                ? 'hover:bg-gray-800 text-gray-400 hover:text-white'
                : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'
            }`}
            data-testid="shortcuts-modal-close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content - Scrollable with two columns */}
        <div className={`px-5 py-4 max-h-[70vh] overflow-y-auto ${
          theme === 'dark' ? 'scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900' : 'scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100'
        }`}>
          <div className="grid grid-cols-2 gap-x-6 gap-y-5">
            {shortcutSections.map((section, sectionIdx) => (
              <div key={sectionIdx}>
                <h3
                  className={`text-xs font-medium mb-2 ${
                    theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                  }`}
                >
                  {section.title}
                </h3>
                <div className="space-y-0.5">
                  {section.shortcuts.map((shortcut, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center justify-between py-1.5 px-2 rounded transition-colors ${
                        theme === 'dark'
                          ? 'hover:bg-gray-800/50'
                          : 'hover:bg-gray-50'
                      }`}
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
                                +
                              </span>
                            )}
                            <kbd
                              className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                                theme === 'dark'
                                  ? 'bg-gray-800 text-gray-300 border border-gray-700'
                                  : 'bg-gray-100 text-gray-700 border border-gray-300'
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

        </div>

        {/* Footer */}
        <div
          className={`px-5 py-2 border-t ${
            theme === 'dark' ? 'border-gray-800' : 'border-gray-200'
          }`}
        >
          <p className={`text-xs ${
            theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
          }`}>
            Press <kbd className={`px-1 py-0.5 rounded text-xs font-medium ${
              theme === 'dark'
                ? 'bg-gray-800 text-gray-300 border border-gray-700'
                : 'bg-gray-100 text-gray-700 border border-gray-300'
            }`}>Esc</kbd> to close
          </p>
        </div>
      </div>
    </div>
  );
};

export default ShortcutsModal;