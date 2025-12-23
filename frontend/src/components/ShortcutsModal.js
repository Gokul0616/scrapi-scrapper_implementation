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
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden ${
          theme === 'dark' ? 'bg-[#1A1B1E]' : 'bg-white'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-6 py-5 border-b ${
            theme === 'dark' ? 'border-gray-800' : 'border-gray-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              theme === 'dark' ? 'bg-purple-500/10' : 'bg-purple-50'
            }`}>
              <Keyboard className={`w-5 h-5 ${
                theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
              }`} />
            </div>
            <div>
              <h2
                className={`text-lg font-semibold ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}
              >
                Keyboard Shortcuts
              </h2>
              <p
                className={`text-xs mt-0.5 ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                }`}
              >
                Navigate faster with keyboard shortcuts
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              theme === 'dark'
                ? 'hover:bg-gray-800 text-gray-400 hover:text-white'
                : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'
            }`}
            data-testid="shortcuts-modal-close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className={`px-6 py-5 max-h-[65vh] overflow-y-auto ${
          theme === 'dark' ? 'scrollbar-dark' : 'scrollbar-light'
        }`}>
          <div className="space-y-6">
            {shortcutSections.map((section, sectionIdx) => (
              <div key={sectionIdx}>
                <h3
                  className={`text-xs font-semibold uppercase tracking-wider mb-3 ${
                    theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                  }`}
                >
                  {section.title}
                </h3>
                <div className="space-y-1">
                  {section.shortcuts.map((shortcut, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center justify-between py-2.5 px-3 rounded-lg transition-colors ${
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
                      <div className="flex items-center gap-1.5">
                        {shortcut.keys.map((key, keyIdx) => (
                          <React.Fragment key={keyIdx}>
                            {keyIdx > 0 && (
                              <span
                                className={`text-xs ${
                                  theme === 'dark' ? 'text-gray-600' : 'text-gray-400'
                                }`}
                              >
                                then
                              </span>
                            )}
                            <kbd
                              className={`px-2 py-1 rounded-md text-xs font-medium min-w-[28px] text-center ${
                                theme === 'dark'
                                  ? 'bg-gray-800 text-gray-300 border border-gray-700 shadow-sm'
                                  : 'bg-white text-gray-700 border border-gray-300 shadow-sm'
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
          className={`px-6 py-4 border-t ${
            theme === 'dark' ? 'border-gray-800 bg-gray-900/20' : 'border-gray-200 bg-gray-50'
          }`}
        >
          <p className={`text-xs flex items-center gap-2 ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
          }`}>
            <Command className="w-3.5 h-3.5" />
            Press <kbd className={`px-1.5 py-0.5 rounded text-xs font-medium ${
              theme === 'dark'
                ? 'bg-gray-800 text-gray-300 border border-gray-700'
                : 'bg-white text-gray-700 border border-gray-300'
            }`}>Esc</kbd> to close
          </p>
        </div>
      </div>
    </div>
  );
};

export default ShortcutsModal;
