import { useState } from 'react';
import type { ModeConfig } from '../config/modes';
import type { ModeTransformation } from '../types/transform';
import { copyTextToClipboard } from '../utils/clipboard';
import { PixelHourglassIcon, PixelModeIcon } from './PixelIcons';
import { TeachMePanel } from './TeachMePanel';

interface ModeResultCardProps {
  config: ModeConfig;
  data: ModeTransformation;
  teachMe: boolean;
  isRegenerating: boolean;
  isAnyTransformAllRunning: boolean;
  isLoadingNotes: boolean;
  onRegenerate: () => void;
  onRequestNotes: () => void;
  onAnnounce: (msg: string) => void;
}

export function ModeResultCard({
  config,
  data,
  teachMe,
  isRegenerating,
  isAnyTransformAllRunning,
  isLoadingNotes,
  onRegenerate,
  onRequestNotes,
  onAnnounce,
}: ModeResultCardProps) {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle');

  const handleCopy = async () => {
    if (isRegenerating || !data.text.trim()) return;
    const res = await copyTextToClipboard(data.text);
    if (res.ok) {
      setCopyStatus('copied');
      onAnnounce(`Copied ${config.title} text to clipboard.`);
      window.setTimeout(() => setCopyStatus('idle'), 1800);
    } else {
      setCopyStatus('failed');
      onAnnounce(`Could not access clipboard automatically.`);
      window.setTimeout(() => setCopyStatus('idle'), 3000);
    }
  };

  return (
    <article
      aria-labelledby={`mode-heading-${config.id}`}
      className="px-4 py-3.5 sm:px-5 sm:py-4 bg-[#F4F1E6] space-y-2.5"
    >
      {/* Compact Row Header: Mode Title + Click-to-Copy Feedback + Regenerate */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`${config.headerBgClass} p-1 border border-[#141B29] inline-flex items-center justify-center shrink-0`}
          >
            <PixelModeIcon mode={config.id} className="w-3.5 h-3.5" />
          </span>
          <h3
            id={`mode-heading-${config.id}`}
            className="font-mono text-sm sm:text-base font-bold text-[#141B29] truncate"
          >
            {config.number}. {config.title}
          </h3>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span
            aria-live="polite"
            className={`font-mono text-xs whitespace-nowrap shrink-0 ${
              copyStatus === 'copied'
                ? 'font-bold text-[#15603A]'
                : copyStatus === 'failed'
                  ? 'font-semibold text-[#B41616]'
                  : 'text-[#555043]'
            }`}
          >
            {copyStatus === 'copied'
              ? 'COPIED!'
              : copyStatus === 'failed'
                ? 'Clipboard blocked'
                : 'Click text to copy'}
          </span>

          <button
            type="button"
            onClick={onRegenerate}
            disabled={isRegenerating || isAnyTransformAllRunning}
            className="retro-btn px-3 py-1 text-xs font-semibold whitespace-nowrap shrink-0"
          >
            {isRegenerating ? 'Regenerating...' : 'Regenerate'}
          </button>
        </div>
      </div>

      {/* Click-to-Copy Output Box (No Textarea, No Text Caret / Cursor) */}
      <button
        type="button"
        onClick={handleCopy}
        disabled={isRegenerating || !data.text.trim()}
        aria-label={`Copy ${config.title} output text`}
        className={`retro-well w-full text-left px-3.5 py-3 transition-colors select-none caret-transparent cursor-pointer block focus-visible:outline-2 focus-visible:outline-dotted focus-visible:outline-[#0000EE] disabled:opacity-55 ${
          copyStatus === 'copied'
            ? '!bg-[#E6F7EC] !border-[#15603A]'
            : 'hover:bg-[#FAF8F1] active:bg-[#EFECE0]'
        }`}
      >
        <span className="block whitespace-pre-wrap text-[15px] sm:text-base leading-relaxed text-[#141B29] select-none caret-transparent">
          {data.text}
        </span>
      </button>

      {isRegenerating && (
        <div
          role="status"
          aria-live="polite"
          className="bg-[#EDE9DA] border border-[#141B29] px-3 py-1.5 flex items-center gap-2"
        >
          <PixelHourglassIcon className="w-4 h-4 shrink-0" />
          <span className="font-mono text-xs font-semibold text-[#141B29]">
            Rewriting {config.title}...
          </span>
        </div>
      )}

      {teachMe && (
        <TeachMePanel
          modeTitle={config.title}
          explanations={data.explanations}
          toneSummary={data.toneSummary}
          reusablePattern={data.reusablePattern}
          isLoadingNotes={isLoadingNotes}
          onRequestNotes={onRequestNotes}
        />
      )}
    </article>
  );
}
