import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useModal } from '../contexts/ModalContext';
import { Keyboard } from 'lucide-react';
import GlobalModal from './GlobalModal';

const ShortcutsModal = () => {
  const { theme } = useTheme();
  const { isModalOpen, closeModal } = useModal();
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  const isOpen = isModalOpen('shortcuts-modal');

  const navigationShortcuts = [
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
    { keys: ['S', 'P'], description: 'Go to Proxy' },
    { keys: ['S', 'D'], description: 'Go to Storage' },
    { keys: ['S', 'B'], description: 'Go to Billing' },
  ];

  const settingsShortcuts = [
    { keys: ['S', 'G'], description: 'Go to Settings' },
  ];

  const generalShortcuts = [
    { keys: [isMac ? '⌘' : 'Ctrl', 'K'], description: 'Open Command Menu' },
    { keys: [isMac ? '⌘' : 'Ctrl', 'B'], description: 'Toggle Sidebar' },
    { keys: [isMac ? '⌘' : 'Ctrl', 'L'], description: 'Toggle Theme' },
    { keys: ['Shift', '?'], description: 'Open Keyboard Shortcuts' },
    { keys: ['Esc'], description: 'Close Dialog' },
  ];

  const ShortcutRow = ({ description, keys }) => (
    <div className="flex items-center justify-between py-1.5 px-5 transition-colors hover:bg-muted/50">
      <span className="text-sm text-foreground">
        {description}
      </span>
      <div className="flex items-center gap-1">
        {keys.map((key, i) => (
          <React.Fragment key={i}>
            <kbd className="px-2 py-0.5 text-xs font-semibold rounded-md bg-muted text-muted-foreground border border-border">
              {key}
            </kbd>
            {i < keys.length - 1 && (
              <span className="text-xs mx-0.5 text-muted-foreground">
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
    <GlobalModal
      modalId="shortcuts-modal"
      size="md"
      className="max-w-3xl"
      showCloseButton={false}
      customHeader={
        <div className="flex items-center gap-3">
          <Keyboard className="w-5 h-5 text-muted-foreground" />
          <h2 className="flex-1 text-lg font-semibold text-foreground">
            Keyboard Shortcuts
          </h2>
          <kbd className="hidden sm:inline-block px-2 py-0.5 text-xs font-semibold rounded-md text-muted-foreground bg-muted border border-border">
            ESC
          </kbd>
        </div>
      }
      customFooter={
        <div className="flex items-center justify-between text-muted-foreground w-full">
          <span>Press any key combination to use</span>
          <span className="hidden sm:inline">Use <span className="font-semibold text-foreground">Shift + ?</span> anytime</span>
        </div>
      }
    >
      {/* Content Area - No Scrollbar */}
      <div
        className="flex-1 overflow-y-auto max-h-[60vh]"
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
          {/* Left Side - Navigation */}
          <div className="border-r border-border">
            <div className="py-1.5">
              <div className="px-5 py-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                Navigation
              </div>
              {navigationShortcuts.map((s, i) => (
                <ShortcutRow key={i} {...s} />
              ))}
            </div>
          </div>

          {/* Right Side - General & Settings */}
          <div>
            <div className="py-1.5">
              <div className="px-5 py-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                General
              </div>
              {generalShortcuts.map((s, i) => (
                <ShortcutRow key={i} {...s} />
              ))}
            </div>

            <div className="h-[1px] mx-5 bg-border my-1" />

            <div className="py-1.5">
              <div className="px-5 py-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                Settings
              </div>
              {settingsShortcuts.map((s, i) => (
                <ShortcutRow key={i} {...s} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </GlobalModal>
  );
};

export default ShortcutsModal;
