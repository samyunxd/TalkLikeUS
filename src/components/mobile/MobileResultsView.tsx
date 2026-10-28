import { useState } from 'react';
import { ORDERED_MODE_CONFIGS } from '../../config/modes';
import {
  VOICE_MODES,
  type ModeTransformation,
  type VoiceMode,
} from '../../types/transform';
import { copyTextToClipboard } from '../../utils/clipboard';
import {
  PixelChatModeIcon,
  PixelCheckIcon,
  PixelCopyIcon,
  PixelResultsTabIcon,
} from '../PixelIcons';
import { MobileResultCard } from './MobileResultCard';

interface MobileResultsViewProps {
  resultsMap: Record<VoiceMode, ModeTransformation> | null;
  editingDrafts: Record<VoiceMode, string | null>;
  onStartEdit: (mode: VoiceMode) => void;
  onChangeEditDraft: (mode: VoiceMode, draft: string) => void;
  onSaveEdit: (mode: VoiceMode) => void;
  onCancelEdit: (mode: VoiceMode) => void;
  onResetModeEdit: (mode: VoiceMode) => void;
  teachMe: boolean;
  chatModeEnabled: boolean;
  resultsBatchChatMode: boolean;
  regeneratingModes: Record<VoiceMode, boolean>;
  isTransformingAll: boolean;
  isAnyBusy: boolean;
  isLoadingNotes: boolean;
  onRegenerateSingle: (mode: VoiceMode) => void;
  onRegenerateAll: () => void;
  onRequestNotes: () => void;
  onReturnToWrite: () => void;
  pendingReplaceAllConfirm: boolean;
  onConfirmReplaceAll: () => void;
  onCancelReplaceAll: () => void;
  onAnnounce: (msg: string) => void;
}

export function MobileResultsView({
  resultsMap,
  editingDrafts,
  onStartEdit,
  onChangeEditDraft,
  onSaveEdit,
  onCancelEdit,
  onResetModeEdit,
  teachMe,
  chatModeEnabled,
  resultsBatchChatMode,
  regeneratingModes,
  isTransformingAll,
  isAnyBusy,
  isLoadingNotes,
  onRegenerateSingle,
  onRegenerateAll,
  onRequestNotes,
  onReturnToWrite,
  pendingReplaceAllConfirm,
  onConfirmReplaceAll,
  onCancelReplaceAll,
  onAnnounce,
}: MobileResultsViewProps) {
  const [copyAllStatus, setCopyAllStatus] = useState<'idle' | 'copied' | 'failed'>('idle');

  if (!resultsMap) {
    return (
      <section
        aria-labelledby="mobile-empty-results-heading"
        className="bg-[#F4F1E6] border border-[#141B29] shadow-[2px_2px_0_#141B29] p-5 text-center space-y-3.5 mt-2"
      >
        <div className="w-10 h-10 mx-auto bg-[#142850] text-[#F7F5EC] border border-[#141B29] flex items-center justify-center">
          <PixelResultsTabIcon className="w-5 h-5" />
        </div>

        <div className="space-y-1.5">
          <h1
            id="mobile-empty-results-heading"
            className="font-pixel text-xs min-[375px]:text-sm text-[#141B29]"
          >
            NO VOICES GENERATED YET
          </h1>
          <p className="text-xs min-[375px]:text-sm text-[#3E3A30] leading-relaxed">
            Enter a message on the Write screen and tap <strong>AMERICANIZE</strong> to generate all
            four American voices here.
          </p>
        </div>

        <button
          type="button"
          onClick={onReturnToWrite}
          className="retro-btn min-h-[46px] w-full px-4 text-xs font-bold inline-flex items-center justify-center"
        >
          Return to Write &rarr;
        </button>
      </section>
    );
  }

  const allDisplayedAreChat = VOICE_MODES.every((m) => Boolean(resultsMap[m].chatMode));
  const anyDisplayedAreChat = VOICE_MODES.some((m) => Boolean(resultsMap[m].chatMode));
  const hasPendingChatDiff =
    chatModeEnabled !== resultsBatchChatMode || allDisplayedAreChat !== anyDisplayedAreChat;

  const handleCopyAll = async () => {
    const formatted = ORDERED_MODE_CONFIGS.map((cfg) => {
      const item = resultsMap[cfg.id];
      const tag = item.chatMode ? ' (Chat)' : '';
      return `[${cfg.number}. ${cfg.title}${tag}]\n${item.text}`;
    }).join('\n\n');

    const res = await copyTextToClipboard(formatted);
    if (res.ok) {
      setCopyAllStatus('copied');
      onAnnounce('Copied all four American voices to clipboard.');
      window.setTimeout(() => setCopyAllStatus('idle'), 2200);
    } else {
      setCopyAllStatus('failed');
      onAnnounce('Automatic clipboard blocked. Copy individual cards below.');
      window.setTimeout(() => setCopyAllStatus('idle'), 3500);
    }
  };

  return (
    <div className="space-y-3.5 min-w-0">
      {/* Compact Results Heading + Active Chat Mode Status + Secondary Actions */}
      <div className="space-y-2.5 pt-0.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="font-pixel text-sm min-[375px]:text-base text-[#141B29] tracking-tight">
            YOUR FOUR VOICES
          </h1>

          {/* Active Chat Mode State Readout */}
          <div className="inline-flex items-center gap-1.5 bg-[#ECE8D9] border border-[#141B29] px-2 py-1 font-mono text-[11px]">
            <PixelChatModeIcon className="w-3.5 h-3.5 shrink-0" />
            {allDisplayedAreChat ? (
              <span className="font-bold text-[#15603A]">CHAT MODE: ON</span>
            ) : anyDisplayedAreChat ? (
              <span className="font-semibold text-[#142850]">CHAT: MIXED</span>
            ) : (
              <span className="font-semibold text-[#433E32]">CHAT MODE: OFF</span>
            )}
          </div>
        </div>

        {hasPendingChatDiff && (
          <p className="font-mono text-[11px] text-[#142850] bg-[#DCE6FA] border border-[#142850] px-2.5 py-1.5">
            Next generation uses <strong>CHAT MODE: {chatModeEnabled ? 'ON' : 'OFF'}</strong>. Tap{' '}
            <strong>Regenerate All</strong> to update all 4 cards now.
          </p>
        )}

        {/* Secondary Top Actions: COPY ALL + Regenerate All */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={isAnyBusy}
            onClick={handleCopyAll}
            className={`retro-btn min-h-[44px] px-3 text-xs font-semibold inline-flex items-center justify-center gap-1.5 whitespace-nowrap ${
              copyAllStatus === 'copied'
                ? '!bg-[#D6F5DF] !border-[#15603A] !text-[#0F4224] font-bold'
                : ''
            }`}
          >
            {copyAllStatus === 'copied' ? (
              <>
                <PixelCheckIcon className="w-3.5 h-3.5 shrink-0" />
                <span>COPIED ALL!</span>
              </>
            ) : (
              <>
                <PixelCopyIcon className="w-3.5 h-3.5 shrink-0" />
                <span>COPY ALL</span>
              </>
            )}
          </button>

          <button
            type="button"
            disabled={isAnyBusy}
            onClick={onRegenerateAll}
            className="retro-btn min-h-[44px] px-3 text-xs font-semibold inline-flex items-center justify-center whitespace-nowrap"
          >
            {isTransformingAll ? 'Working...' : 'Regenerate All'}
          </button>
        </div>

        {/* Inline Overwrite Confirmation for Regenerate All */}
        {pendingReplaceAllConfirm && (
          <div
            role="region"
            aria-label="Confirm replacing edited results"
            className="bg-[#FFF8DE] border-2 border-[#6B3A00] p-3 space-y-2.5"
          >
            <p className="text-xs text-[#3D2200] leading-relaxed">
              <strong className="font-mono">Manual edits detected: </strong>
              Regenerating all voices will replace your edited cards.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onConfirmReplaceAll}
                className="retro-btn-primary min-h-[44px] px-3 text-xs font-bold inline-flex items-center justify-center"
              >
                Replace All
              </button>
              <button
                type="button"
                onClick={onCancelReplaceAll}
                className="retro-btn min-h-[44px] px-3 text-xs font-semibold inline-flex items-center justify-center"
              >
                Keep Edits
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Four Vertically Stacked Voice Cards (Never a Carousel) */}
      <div className="space-y-3.5">
        {ORDERED_MODE_CONFIGS.map((cfg) => (
          <MobileResultCard
            key={cfg.id}
            config={cfg}
            data={resultsMap[cfg.id]}
            teachMe={teachMe}
            editDraft={editingDrafts[cfg.id]}
            onStartEdit={() => onStartEdit(cfg.id)}
            onChangeEditDraft={(draft) => onChangeEditDraft(cfg.id, draft)}
            onSaveEdit={() => onSaveEdit(cfg.id)}
            onCancelEdit={() => onCancelEdit(cfg.id)}
            onResetEditedText={() => onResetModeEdit(cfg.id)}
            isRegenerating={regeneratingModes[cfg.id]}
            isAnyTransformAllRunning={isTransformingAll}
            isLoadingNotes={isLoadingNotes}
            onRegenerate={() => onRegenerateSingle(cfg.id)}
            onRequestNotes={onRequestNotes}
            onAnnounce={onAnnounce}
          />
        ))}
      </div>
    </div>
  );
}
