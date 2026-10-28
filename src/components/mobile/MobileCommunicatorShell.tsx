import { useEffect, useState } from 'react';
import type { ModeTransformation, VoiceMode } from '../../types/transform';
import { InfoViews } from '../InfoViews';
import {
  MobileBottomNav,
  type MobilePrimaryTab,
} from './MobileBottomNav';
import { MobileResultsView } from './MobileResultsView';
import { MobileSettingsView } from './MobileSettingsView';
import {
  MobileTopBar,
  type MobileDrawerPage,
} from './MobileTopBar';
import { MobileWriteView } from './MobileWriteView';

interface MobileCommunicatorShellProps {
  activeTab: MobilePrimaryTab;
  onSelectTab: (tab: MobilePrimaryTab) => void;
  drawerPage: MobileDrawerPage;
  onSelectDrawerPage: (page: MobileDrawerPage) => void;
  inputText: string;
  onChangeText: (next: string) => void;
  onClearText: () => void;
  onClearWorkspace: () => void;
  onLoadQuickSample: () => void;
  onLoadSpecificSample: (sampleText: string) => void;
  teachMe: boolean;
  onToggleTeachMe: () => void;
  chatModeEnabled: boolean;
  onToggleChatMode: () => void;
  resultsMap: Record<VoiceMode, ModeTransformation> | null;
  resultsBatchChatMode: boolean;
  hasPendingChatModeDiff: boolean;
  editingDrafts: Record<VoiceMode, string | null>;
  onStartEdit: (mode: VoiceMode) => void;
  onChangeEditDraft: (mode: VoiceMode, draft: string) => void;
  onSaveEdit: (mode: VoiceMode) => void;
  onCancelEdit: (mode: VoiceMode) => void;
  onResetModeEdit: (mode: VoiceMode) => void;
  isTransformingAll: boolean;
  regeneratingModes: Record<VoiceMode, boolean>;
  isAnyBusy: boolean;
  isLoadingNotes: boolean;
  onSubmitTransform: () => void;
  onRegenerateSingle: (mode: VoiceMode) => void;
  onRegenerateAll: () => void;
  onTrimToLimit: () => void;
  onRequestNotes: () => void;
  errorBanner: {
    message: string;
    retryable: boolean;
    retryFn?: () => void;
  } | null;
  onDismissError: () => void;
  pendingReplaceAllConfirm: boolean;
  onConfirmReplaceAll: () => void;
  onCancelReplaceAll: () => void;
  liveAnnouncement: string;
  onAnnounce: (msg: string) => void;
}

export function MobileCommunicatorShell({
  activeTab,
  onSelectTab,
  drawerPage,
  onSelectDrawerPage,
  inputText,
  onChangeText,
  onClearText,
  onClearWorkspace,
  onLoadQuickSample,
  onLoadSpecificSample,
  teachMe,
  onToggleTeachMe,
  chatModeEnabled,
  onToggleChatMode,
  resultsMap,
  resultsBatchChatMode,
  hasPendingChatModeDiff,
  editingDrafts,
  onStartEdit,
  onChangeEditDraft,
  onSaveEdit,
  onCancelEdit,
  onResetModeEdit,
  isTransformingAll,
  regeneratingModes,
  isAnyBusy,
  isLoadingNotes,
  onSubmitTransform,
  onRegenerateSingle,
  onRegenerateAll,
  onTrimToLimit,
  onRequestNotes,
  errorBanner,
  onDismissError,
  pendingReplaceAllConfirm,
  onConfirmReplaceAll,
  onCancelReplaceAll,
  liveAnnouncement,
  onAnnounce,
}: MobileCommunicatorShellProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState<boolean>(false);

  // Detect virtual mobile keyboard via focused text inputs AND visualViewport height shrink
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const baselineHeight = window.innerHeight;

    const evaluateKeyboardState = () => {
      const active = document.activeElement;
      const isTextFocused =
        active instanceof HTMLTextAreaElement ||
        (active instanceof HTMLInputElement &&
          !['checkbox', 'radio', 'button', 'submit'].includes(active.type));

      const vvHeight = window.visualViewport?.height ?? window.innerHeight;
      const viewportShrunk = baselineHeight - vvHeight > 130;

      setIsKeyboardOpen(isTextFocused || viewportShrunk);
    };

    const handleFocusIn = () => evaluateKeyboardState();
    const handleFocusOut = () => {
      window.setTimeout(evaluateKeyboardState, 80);
    };

    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);
    window.visualViewport?.addEventListener('resize', evaluateKeyboardState);

    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
      window.visualViewport?.removeEventListener('resize', evaluateKeyboardState);
    };
  }, []);

  const handleSelectBottomTab = (tab: MobilePrimaryTab) => {
    onSelectDrawerPage(null);
    onSelectTab(tab);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  };

  const handleNavigateHome = () => {
    onSelectDrawerPage(null);
    onSelectTab('write');
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  };

  return (
    <div id="studio" className="min-h-screen min-h-dvh flex flex-col bg-[#EAE6D7]">
      {/* Screen-reader live region */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {liveAnnouncement}
      </div>

      {/* A. Compact 1990s Communicator Top Bar + Slide-out Navigation Drawer */}
      <MobileTopBar
        isBusy={isAnyBusy}
        isDrawerOpen={isDrawerOpen}
        onOpenDrawer={() => setIsDrawerOpen(true)}
        onCloseDrawer={() => setIsDrawerOpen(false)}
        onNavigateHome={handleNavigateHome}
        onOpenDrawerPage={(page) => {
          onSelectDrawerPage(page);
          if (typeof window !== 'undefined') {
            window.scrollTo({ top: 0, behavior: 'auto' });
          }
        }}
        chatModeEnabled={chatModeEnabled}
        onToggleChatMode={onToggleChatMode}
        teachMe={teachMe}
        onToggleTeachMe={onToggleTeachMe}
        onClearWorkspace={onClearWorkspace}
        activeDrawerPage={drawerPage}
      />

      {/* B. Main Mobile Workspace (generous bottom clearance so fixed nav never covers content) */}
      <main
        className={`flex-1 w-full safe-area-x pt-3.5 space-y-3.5 min-w-0 ${
          isKeyboardOpen
            ? 'pb-6'
            : 'pb-[calc(5.75rem+env(safe-area-inset-bottom))]'
        }`}
      >
        {/* Error Alert Banner */}
        {errorBanner && (
          <div
            role="alert"
            className="bg-[#FDF0ED] border-2 border-[#B41616] p-3 space-y-2.5"
          >
            <div className="space-y-1">
              <p className="font-pixel text-[10px] text-[#8F1111]">
                TRANSMISSION NOTICE
              </p>
              <p className="text-xs text-[#4A0B0B] leading-relaxed break-words">
                {errorBanner.message}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {errorBanner.retryable && errorBanner.retryFn && (
                <button
                  type="button"
                  onClick={() => errorBanner.retryFn?.()}
                  className="retro-btn min-h-[44px] px-3 text-xs font-semibold inline-flex items-center justify-center"
                >
                  Retry
                </button>
              )}
              <button
                type="button"
                onClick={onDismissError}
                className="retro-btn min-h-[44px] px-3 text-xs font-semibold inline-flex items-center justify-center"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Secondary Drawer Pages (How It Works / About TalkLikeUS) */}
        {drawerPage !== null ? (
          <InfoViews
            section={drawerPage}
            onReturnToStudio={handleNavigateHome}
            onLoadSampleAndReturn={(sample) => {
              onLoadSpecificSample(sample);
              handleNavigateHome();
            }}
          />
        ) : activeTab === 'write' ? (
          <MobileWriteView
            inputText={inputText}
            onChangeText={onChangeText}
            onClearText={onClearText}
            onLoadQuickSample={onLoadQuickSample}
            chatModeEnabled={chatModeEnabled}
            teachMe={teachMe}
            hasResults={resultsMap !== null}
            isTransformingAll={isTransformingAll}
            isAnyBusy={isAnyBusy}
            onSubmitTransform={onSubmitTransform}
            onTrimToLimit={onTrimToLimit}
            onOpenSettings={() => handleSelectBottomTab('settings')}
            onOpenResults={() => handleSelectBottomTab('results')}
            pendingReplaceAllConfirm={pendingReplaceAllConfirm}
            onConfirmReplaceAll={onConfirmReplaceAll}
            onCancelReplaceAll={onCancelReplaceAll}
          />
        ) : activeTab === 'results' ? (
          <MobileResultsView
            resultsMap={resultsMap}
            editingDrafts={editingDrafts}
            onStartEdit={onStartEdit}
            onChangeEditDraft={onChangeEditDraft}
            onSaveEdit={onSaveEdit}
            onCancelEdit={onCancelEdit}
            onResetModeEdit={onResetModeEdit}
            teachMe={teachMe}
            chatModeEnabled={chatModeEnabled}
            resultsBatchChatMode={resultsBatchChatMode}
            regeneratingModes={regeneratingModes}
            isTransformingAll={isTransformingAll}
            isAnyBusy={isAnyBusy}
            isLoadingNotes={isLoadingNotes}
            onRegenerateSingle={onRegenerateSingle}
            onRegenerateAll={onRegenerateAll}
            onRequestNotes={onRequestNotes}
            onReturnToWrite={() => handleSelectBottomTab('write')}
            pendingReplaceAllConfirm={pendingReplaceAllConfirm}
            onConfirmReplaceAll={onConfirmReplaceAll}
            onCancelReplaceAll={onCancelReplaceAll}
            onAnnounce={onAnnounce}
          />
        ) : (
          <MobileSettingsView
            chatModeEnabled={chatModeEnabled}
            onToggleChatMode={onToggleChatMode}
            teachMe={teachMe}
            onToggleTeachMe={onToggleTeachMe}
            hasResults={resultsMap !== null}
            hasPendingChatModeDiff={hasPendingChatModeDiff}
            isAnyBusy={isAnyBusy}
            onRegenerateAll={() => {
              handleSelectBottomTab('results');
              onRegenerateAll();
            }}
            onGoToWrite={() => handleSelectBottomTab('write')}
            onGoToResults={() => handleSelectBottomTab('results')}
          />
        )}
      </main>

      {/* C. Fixed Bottom Navigation (WRITE | RESULTS | SETTINGS — hides when keyboard opens) */}
      <MobileBottomNav
        activeTab={drawerPage !== null ? 'write' : activeTab}
        onSelectTab={handleSelectBottomTab}
        hasResults={resultsMap !== null}
        isHiddenByKeyboard={isKeyboardOpen || isDrawerOpen}
      />
    </div>
  );
}
