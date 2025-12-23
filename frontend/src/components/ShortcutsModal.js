import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useModal } from '../contexts/ModalContext';
import GlobalModal from './GlobalModal';

const ShortcutsModal = () => {
  const { theme } = useTheme();
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

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

  const bgClass = theme === 'dark' ? 'bg-[#1A1B1E]' : 'bg-white';
  const textClass = theme === 'dark' ? 'text-gray-300' : 'text-gray-700';
  const labelClass = theme === 'dark' ? 'text-gray-400' : 'text-gray-600';
  const dividerClass = theme === 'dark' ? 'border-gray-800' : 'border-gray-200';
  const kbdBgClass = theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-gray-100 border-gray-300';
  const kbdTextClass = theme === 'dark' ? 'text-gray-300' : 'text-gray-600';

  const ShortcutRow = ({ description, keys }) => (
    <div className="flex items-center justify-between py-1 group">
      <span className={`text-[12px] opacity-70 group-hover:opacity-100 transition-opacity truncate pr-2 ${textClass}`}>
        {description}
      </span>
      <div className="flex items-center gap-1 shrink-0">
        {keys.map((key, i) => (
          <React.Fragment key={i}>
            <kbd className={`px-1 py-0.5 text-[10px] font-sans rounded border shadow-sm ${kbdBgClass} ${kbdTextClass} min-w-[18px] text-center`}>
              {key}
            </kbd>
            {i < keys.length - 1 && <span className={`text-[9px] ${labelClass}`}>+</span>}
          </React.Fragment>
        ))}
      </div>
    </div>
  );

  return (
    <GlobalModal
      modalId="shortcuts-modal"
      showCloseButton={false}
      closeOnBackdropClick={true}
      contentClassName={`p-0 ${bgClass} rounded-lg shadow-xl border ${dividerClass} overflow-hidden`}
      wrapperClassName="flex items-center justify-center"
    >
      <div className="w-full h-[400px] flex flex-col pointer-events-auto">
        
        {/* Header */}
        <div className={`px-4 py-2.5 border-b ${dividerClass} flex items-center justify-between`}>
          <h2 className={`text-[11px] font-bold uppercase tracking-widest ${labelClass}`}>Keyboard Shortcuts</h2>
          <span className={`text-[10px] ${labelClass}`}>Esc</span>
        </div>

        {/* Scrollable Content Area - Hide scrollbar via inline CSS */}
        <div 
          className="flex-1 overflow-y-auto"
          style={{
            msOverflowStyle: 'none',  /* IE and Edge */
            scrollbarWidth: 'none',   /* Firefox */
          }}
        >
          {/* Webkit specific styles to hide scrollbar */}
          <style>
            {`
              div::-webkit-scrollbar {
                display: none;
              }
            `}
          </style>

          <div className="grid grid-cols-[1fr_1px_1fr] min-h-full">
            {/* Left Side */}
            <div className="p-4 space-y-6">
              {navigationAndSystem.map((section) => (
                <div key={section.title}>
                  <h3 className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${labelClass}`}>
                    {section.title}
                  </h3>
                  <div className="flex flex-col">
                    {section.shortcuts.map((s, i) => (
                      <ShortcutRow key={i} {...s} />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Vertical Divider Line */}
            <div className={`w-[1px] ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-200'}`} />

            {/* Right Side */}
            <div className="p-4">
              <h3 className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${labelClass}`}>
                General
              </h3>
              <div className="flex flex-col">
                {generalShortcuts.map((s, i) => (
                  <ShortcutRow key={i} {...s} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </GlobalModal>
  );
};

export default ShortcutsModal;
