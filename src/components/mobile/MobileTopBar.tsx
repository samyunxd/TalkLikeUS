import { useEffect, useRef } from 'react';
import {
  PixelCloseIcon,
  PixelFlagStamp,
  PixelMenuIcon,
} from '../PixelIcons';

export type MobileDrawerPage = 'how' | 'about' | null;

interface MobileTopBarProps {
  isBusy: boolean;
  isDrawerOpen: boolean;
  onOpenDrawer: () => void;
  onCloseDrawer: () => void;
  onNavigateHome: () => void;
  onOpenDrawerPage: (page: 'how' | 'about') => void;
  chatModeEnabled: boolean;
  onToggleChatMode: () => void;
  teachMe: boolean;
  onToggleTeachMe: () => void;
  onClearWorkspace: () => void;
  activeDrawerPage: MobileDrawerPage;
}

export function MobileTopBar({
  isBusy,
  isDrawerOpen,
  onOpenDrawer,
  onCloseDrawer,
  onNavigateHome,
  onOpenDrawerPage,
  chatModeEnabled,
  onToggleChatMode,
  teachMe,
  onToggleTeachMe,
  onClearWorkspace,
  activeDrawerPage,
}: MobileTopBarProps) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!isDrawerOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseDrawer();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    const focusTimer = window.setTimeout(() => {
      closeButtonRef.current?.focus({ preventScroll: true });
    }, 30);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.clearTimeout(focusTimer);
    };
  }, [isDrawerOpen, onCloseDrawer]);

  return (
    <>
      <header className="sticky top-0 z-30 w-full bg-[#142850] text-[#F7F5EC] border-b-2 border-[#141B29] pt-[env(safe-area-inset-top)]">
        <div className="min-h-[48px] py-0.5 safe-area-x flex items-center justify-between gap-2">
          {/* Small TalkLikeUS Pixel Logo */}
          <button
            type="button"
            onClick={onNavigateHome}
            className="min-h-[44px] inline-flex items-center gap-2 font-mono text-sm min-[375px]:text-base font-bold tracking-tight text-[#F7F5EC] touch-manipulation cursor-pointer whitespace-nowrap shrink-0"
          >
            <PixelFlagStamp className="w-5 h-3.5 shrink-0" />
            <span>TalkLikeUS</span>
          </button>

          {/* Retro Communicator Status Light + Monospace Status */}
          <div
            aria-live="polite"
            className="inline-flex items-center gap-1.5 bg-[#0D1B38] border border-[#3B5998] px-2 py-0.5 font-mono text-[10px] tracking-wider text-[#DCE6FA] whitespace-nowrap shrink-0"
          >
            <span
              aria-hidden="true"
              className={`w-2 h-2 border border-[#141B29] shrink-0 ${
                isBusy ? 'bg-[#FDE047]' : 'bg-[#4ADE80]'
              }`}
            />
            <span>{isBusy ? 'WORKING' : 'AI READY'}</span>
          </div>

          {/* Compact Icon-Only Hamburger Menu Button (44x44px hitbox) */}
          <button
            type="button"
            onClick={onOpenDrawer}
            aria-label="Open Menu"
            aria-expanded={isDrawerOpen}
            aria-controls="mobile-retro-drawer"
            title="Open Menu"
            className="retro-btn w-11 h-11 min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-[#141B29] shrink-0"
          >
            <PixelMenuIcon className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Slide-Out 1990s Communicator Navigation Drawer */}
      {isDrawerOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-end"
          role="dialog"
          aria-modal="true"
          aria-label="TalkLikeUS Navigation Menu"
        >
          {/* Backdrop */}
          <div
            onClick={onCloseDrawer}
            aria-hidden="true"
            className="fixed inset-0 bg-[#141B29]/50 transition-opacity duration-150"
          />

          {/* Retro Bordered Drawer Panel */}
          <aside
            id="mobile-retro-drawer"
            className="relative z-10 w-[280px] max-w-[86vw] h-full bg-[#F4F1E6] border-l-2 border-[#141B29] shadow-[-4px_0_0_#141B29] flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] overflow-y-auto"
          >
            {/* Drawer Header with Obvious Close Button */}
            <div className="bg-[#142850] text-[#F7F5EC] px-3.5 py-2 border-b-2 border-[#141B29] flex items-center justify-between gap-2">
              <span className="font-pixel text-xs tracking-wide">SYSTEM MENU</span>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={onCloseDrawer}
                aria-label="Close Menu"
                title="Close Menu"
                className="retro-btn min-h-[44px] min-w-[44px] px-2.5 text-xs font-bold inline-flex items-center justify-center gap-1.5 text-[#141B29]"
              >
                <PixelCloseIcon className="w-3.5 h-3.5" />
                <span>Close</span>
              </button>
            </div>

            {/* Functional Drawer Menu Items */}
            <nav aria-label="Secondary navigation" className="p-3 space-y-2 flex-1">
              <button
                type="button"
                onClick={() => {
                  onNavigateHome();
                  onCloseDrawer();
                }}
                className={`w-full min-h-[46px] px-3 border border-[#141B29] text-left font-mono text-xs font-semibold flex items-center justify-between touch-manipulation cursor-pointer ${
                  activeDrawerPage === null
                    ? 'bg-[#DCE6FA] text-[#142850] font-bold'
                    : 'bg-[#ECE8D9] text-[#141B29] active:bg-[#DFDAC8]'
                }`}
              >
                <span>Home</span>
                <span aria-hidden="true" className="text-[#555043]">&rarr;</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onOpenDrawerPage('how');
                  onCloseDrawer();
                }}
                className={`w-full min-h-[46px] px-3 border border-[#141B29] text-left font-mono text-xs font-semibold flex items-center justify-between touch-manipulation cursor-pointer ${
                  activeDrawerPage === 'how'
                    ? 'bg-[#DCE6FA] text-[#142850] font-bold'
                    : 'bg-[#ECE8D9] text-[#141B29] active:bg-[#DFDAC8]'
                }`}
              >
                <span>How It Works</span>
                <span aria-hidden="true" className="text-[#555043]">&rarr;</span>
              </button>

              <div className="pt-1 pb-1 border-t border-b border-dashed border-[#ABA48E] space-y-2">
                <p className="font-pixel text-[10px] text-[#555043] px-0.5">
                  QUICK MODIFIERS
                </p>

                <button
                  type="button"
                  role="switch"
                  aria-checked={chatModeEnabled}
                  onClick={onToggleChatMode}
                  className={`w-full min-h-[46px] px-3 border border-[#141B29] text-left font-mono text-xs font-semibold flex items-center justify-between gap-2 touch-manipulation cursor-pointer ${
                    chatModeEnabled
                      ? 'bg-[#D6F5DF] text-[#0F4224]'
                      : 'bg-[#ECE8D9] text-[#141B29]'
                  }`}
                >
                  <span>Chat Mode</span>
                  <span
                    className={`px-2 py-0.5 border border-[#141B29] text-[11px] font-bold ${
                      chatModeEnabled
                        ? 'bg-[#15603A] text-white'
                        : 'bg-[#F4F1E6] text-[#433E32]'
                    }`}
                  >
                    {chatModeEnabled ? 'ON' : 'OFF'}
                  </span>
                </button>

                <button
                  type="button"
                  role="switch"
                  aria-checked={teachMe}
                  onClick={onToggleTeachMe}
                  className={`w-full min-h-[46px] px-3 border border-[#141B29] text-left font-mono text-xs font-semibold flex items-center justify-between gap-2 touch-manipulation cursor-pointer ${
                    teachMe
                      ? 'bg-[#DCE6FA] text-[#142850]'
                      : 'bg-[#ECE8D9] text-[#141B29]'
                  }`}
                >
                  <span>Teach Me</span>
                  <span
                    className={`px-2 py-0.5 border border-[#141B29] text-[11px] font-bold ${
                      teachMe
                        ? 'bg-[#142850] text-white'
                        : 'bg-[#F4F1E6] text-[#433E32]'
                    }`}
                  >
                    {teachMe ? 'ON' : 'OFF'}
                  </span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  onOpenDrawerPage('about');
                  onCloseDrawer();
                }}
                className={`w-full min-h-[46px] px-3 border border-[#141B29] text-left font-mono text-xs font-semibold flex items-center justify-between touch-manipulation cursor-pointer ${
                  activeDrawerPage === 'about'
                    ? 'bg-[#DCE6FA] text-[#142850] font-bold'
                    : 'bg-[#ECE8D9] text-[#141B29] active:bg-[#DFDAC8]'
                }`}
              >
                <span>About TalkLikeUS</span>
                <span aria-hidden="true" className="text-[#555043]">&rarr;</span>
              </button>

              <div className="pt-2">
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => {
                    onClearWorkspace();
                    onCloseDrawer();
                  }}
                  className="retro-btn w-full min-h-[46px] px-3 text-left font-mono text-xs font-semibold text-[#8F1111] flex items-center justify-between disabled:opacity-50"
                >
                  <span>Clear Workspace</span>
                  <span aria-hidden="true" className="font-bold">[CLR]</span>
                </button>
              </div>
            </nav>

            <div className="px-3.5 py-2.5 border-t border-dashed border-[#ABA48E] bg-[#ECE8D9] font-mono text-[11px] text-[#4B4639]">
              TalkLikeUS Pocket Edition &middot; Session-only privacy
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
