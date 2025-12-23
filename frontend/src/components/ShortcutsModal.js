import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useModal } from '../contexts/ModalContext';
import GlobalModal from './GlobalModal';
import { Separator } from './ui/separator';

const ShortcutsModal = () => {
  const { theme } = useTheme();
  const { isModalOpen } = useModal();

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
    <GlobalModal
      modalId="shortcuts-modal"
      title="Keyboard Shortcuts"
      size="lg"
      showCloseButton={true}
      closeOnBackdropClick={true}
      contentClassName={`px-5 py-4 ${
        theme === 'dark' ? 'bg-[#1A1B1E]' : 'bg-white'
      }`}
      customFooter={
        <p className={`text-xs ${
          theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
        }`}>
          Press <kbd className={`px-1 py-0.5 rounded text-xs font-medium ${
            theme === 'dark'
              ? 'bg-gray-800 text-gray-300 border border-gray-700'
              : 'bg-gray-100 text-gray-700 border border-gray-300'
          }`}>Esc</kbd> to close
        </p>
      }
    >
      {/* Content - NO SCROLL, Display all in single view like Notion */}
      <div className="grid grid-cols-3 gap-6">
        {shortcutSections.map((section, sectionIdx) => (
          <React.Fragment key={sectionIdx}>
            <div>
              <h3
                className={`text-xs font-medium mb-3 uppercase tracking-wide ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}
              >
                {section.title}
              </h3>
              <div className="space-y-1">
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
                      className={`text-xs ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`}
                    >
                      {shortcut.description}
                    </span>
                    <div className="flex items-center gap-1 ml-2">
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
                            className={`px-1.5 py-0.5 rounded text-xs font-medium whitespace-nowrap ${
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
            {/* Vertical Divider between sections (not after the last section) */}
            {sectionIdx < shortcutSections.length - 1 && (
              <Separator 
                orientation="vertical" 
                className={`h-auto ${
                  theme === 'dark' ? 'bg-gray-800' : 'bg-gray-200'
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    </GlobalModal>
  );
};

export default ShortcutsModal;
