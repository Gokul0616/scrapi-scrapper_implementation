import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useModal } from '../contexts/ModalContext';
import { Keyboard } from 'lucide-react';

const ShortcutsModal = () => {
  const { theme } = useTheme();
  const { isModalOpen, closeModal } = useModal();
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  const isOpen = isModalOpen('shortcuts-modal');

  const navigationAndSystem = [
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
    }
  ];

  const generalShortcuts = [
    { keys: [isMac ? '⌘' : 'Ctrl', 'K'], description: 'Open Command Menu' },
    { keys: [isMac ? '⌘' : 'Ctrl', 'B'], description: 'Toggle Sidebar' },
    { keys: [isMac ? '⌘' : 'Ctrl', 'L'], description: 'Toggle Theme' },
    { keys: ['Shift', '?'], description: 'Open Keyboard Shortcuts' },
    { keys: ['Esc'], description: 'Close Dialog' },
  ];

  const ShortcutRow = ({ description, keys }) => (
    <div className={`flex items-center justify-between py-2.5 px-5 transition-colors ${
      theme === 'dark'
        ? 'hover:bg-gray-800/50'
        : 'hover:bg-gray-50'
    }`}>
      <span className={`text-sm ${
        theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
      }`}>
        {description}
      </span>
      <div className="flex items-center gap-1">
        {keys.map((key, i) => (
          <React.Fragment key={i}>
            <kbd className={`px-2 py-0.5 text-xs font-semibold rounded-md ${
              theme === 'dark'
                ? 'bg-gray-800 text-gray-300 border border-gray-700'
                : 'bg-gray-100 text-gray-600 border border-gray-200'
            }`}>
              {key}
            </kbd>
            {i < keys.length - 1 && (
              <span className={`text-xs mx-0.5 ${
                theme === 'dark' ? 'text-gray-600' : 'text-gray-400'
              }`}>
                +
              </span>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] px-4 backdrop-blur-sm"
      style={{ 
        backgroundColor: theme === 'dark' ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.2)'
      }}
      onClick={closeModal}
    >
      <div
        className={`w-full max-w-3xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[75vh] animate-in fade-in zoom-in-95 duration-200 ${
          theme === 'dark' 
            ? 'bg-[#1A1B1E] border border-gray-800' 
            : 'bg-white border border-gray-200'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center gap-3 px-4 py-3 border-b ${
          theme === 'dark' ? 'border-gray-800' : 'border-gray-100'
        }`}>
          <Keyboard className={`w-5 h-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-400'}`} />
          <h2 className={`flex-1 text-lg font-semibold ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            Keyboard Shortcuts
          </h2>
          <kbd className={`hidden sm:inline-block px-2 py-0.5 text-xs font-semibold rounded-md ${
            theme === 'dark'
              ? 'text-gray-400 bg-gray-800 border border-gray-700'
              : 'text-gray-400 bg-gray-50 border border-gray-200'
          }`}>
            ESC
          </kbd>
        </div>

        {/* Content Area - No Scrollbar */}
        <div 
          className="flex-1 overflow-y-auto"
          style={{
            msOverflowStyle: 'none',
            scrollbarWidth: 'none',
          }}
        >
          <style>
            {`
              .hide-scrollbar::-webkit-scrollbar {
                display: none;
              }
            `}
          </style>

          <div className="grid grid-cols-1 md:grid-cols-2 min-h-full hide-scrollbar">
            {/* Left Side */}
            <div className={`border-r ${theme === 'dark' ? 'border-gray-800' : 'border-gray-100'}`}>
              {navigationAndSystem.map((section, idx) => (
                <div key={section.title}>
                  {idx > 0 && (
                    <div className={`h-[1px] mx-5 ${
                      theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'
                    }`} />
                  )}
                  <div className="py-2">
                    <div className={`px-5 py-2 text-xs font-semibold uppercase tracking-wider ${
                      theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                    }`}>
                      {section.title}
                    </div>
                    {section.shortcuts.map((s, i) => (
                      <ShortcutRow key={i} {...s} />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Right Side */}
            <div>
              <div className="py-2">
                <div className={`px-5 py-2 text-xs font-semibold uppercase tracking-wider ${
                  theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                }`}>
                  General
                </div>
                {generalShortcuts.map((s, i) => (
                  <ShortcutRow key={i} {...s} />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`px-4 py-2 text-xs border-t flex items-center justify-between ${
          theme === 'dark'
            ? 'bg-gray-900/50 text-gray-500 border-gray-800'
            : 'bg-gray-50 text-gray-400 border-gray-100'
        }`}>
          <span>Press any key combination to use</span>
          <span className="hidden sm:inline">Use <span className="font-semibold">Shift + ?</span> anytime</span>
        </div>
      </div>
    </div>
  );
};

export default ShortcutsModal;
