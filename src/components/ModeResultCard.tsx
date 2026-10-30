import { memo, useRef, useState } from 'react';
import type { ModeConfig } from '../config/modes';
import type { ModeTransformation } from '../types/transform';
import { copyTextToClipboard } from '../utils/clipboard';
import { PixelCheckIcon, PixelCopyIcon, PixelModeIcon } from './PixelIcons';
import { TeachMePanel } from './TeachMePanel';

interface ModeResultCardProps {
  config: ModeConfig;
  staggerIndex: number;
  data: ModeTransformation;
  teachMe: boolean;
  isAnyTransformAllRunning: boolean;
  isLoadingNotes: boolean;
  onAnnounce: (msg: string) => void;
}

const STAGGER_CLASSES = [
  'retro-stagger-1',
  'retro-stagger-2',
  'retro-stagger-3',
  'retro-stagger-4',
] as const;

export const ModeResultCard = memo(function ModeResultCard({
  config,
  staggerIndex,
  data,
  teachMe,
  isAnyTransformAllRunning,
  isLoadingNotes,
  onAnnounce,
}: ModeResultCardProps) {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  const fallbackSelectRef = useRef<HTMLDivElement | null>(null);

  const handleCopy = async () => {
    if (!data.text.trim()) return;
    const res = await copyTextToClipboard(data.text);
    if (res.ok) {
      setCopyStatus('copied');
      onAnnounce(`Copied ${config.title} text to clipboard.`);
      window.setTimeout(() => setCopyStatus('idle'), 1600);
    } else {
      setCopyStatus('failed');
      if (fallbackSelectRef.current && typeof window !== 'undefined') {
        try {
          const selection = window.getSelection();
          const range = document.createRange();
          range.selectNodeContents(fallbackSelectRef.current);
          selection?.removeAllRanges();
          selection?.addRange(range);
        } catch {
          // Ignore selection errors
        }
      }
      onAnnounce('Automatic clipboard blocked. Text selected—press Copy on your device.');
      window.setTimeout(() => setCopyStatus('idle'), 3500);
    }
  };

  const hasMobileNotes =
    isLoadingNotes || data.explanations.length > 0 || Boolean(data.toneSummary);
  const hasDesktopOnlyNotes = !hasMobileNotes && Boolean(data.reusablePattern);

  const collapseStateClass = !teachMe
    ? ''
    : hasMobileNotes
      ? 'retro-collapse-open'
      : hasDesktopOnlyNotes
        ? 'retro-collapse-desktop-only'
        : '';

  const staggerClass = STAGGER_CLASSES[staggerIndex] ?? 'retro-stagger-1';

  return (
    <article
      aria-labelledby={`mode-heading-${config.id}`}
      className={`retro-result-card retro-card-enter ${staggerClass} px-3 min-[375px]:px-3.5 py-3 md:px-5 md:py-4 bg-[#F4F1E6] space-y-2 min-w-0`}
    >
      {/* Clean Single-Line Card Title + Copy Affordance Cue */}
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <span
            className={`${config.headerBgClass} p-1 border border-[#141B29] inline-flex items-center justify-center shrink-0`}
          >
            <PixelModeIcon mode={config.id} className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          </span>
          <h3
            id={`mode-heading-${config.id}`}
            className="font-mono text-xs min-[375px]:text-sm md:text-base font-bold text-[#141B29] truncate"
          >
            {config.number}. {config.title}
          </h3>
          {data.chatMode && (
            <span className="hidden md:inline font-mono text-xs font-semibold text-[#15603A] whitespace-nowrap shrink-0">
              &middot; Chat
            </span>
          )}
        </div>

        {copyStatus === 'idle' && !isAnyTransformAllRunning && (
          <span
            aria-hidden="true"
            className="retro-copy-idle-hint inline-flex items-center gap-1 font-mono text-[11px] text-[#4A4538] whitespace-nowrap shrink-0 select-none"
          >
            <PixelCopyIcon className="w-3 h-3 shrink-0" />
            <span className="md:hidden">Tap to copy</span>
            <span className="hidden md:inline">Click to copy</span>
          </span>
        )}

        {copyStatus === 'failed' && (
          <span
            role="status"
            aria-live="polite"
            className="retro-pop-in font-mono text-[11px] font-semibold text-[#B41616] whitespace-nowrap shrink-0"
          >
            Select text to copy
          </span>
        )}
      </div>

      {/* Interactive Output Text Well — Click, Tap, or Enter/Space to Copy */}
      <div className="retro-well-wrap relative min-w-0">
        {copyStatus === 'idle' && !isAnyTransformAllRunning && (
          <span
            aria-hidden="true"
            className="retro-copy-hover-tip absolute -top-3 right-2.5 md:right-3 z-10 inline-flex items-center gap-1 bg-[#FFFDE4] text-[#141B29] border border-[#141B29] shadow-[2px_2px_0_#141B29] px-2 py-0.5 font-mono text-[11px] font-semibold whitespace-nowrap select-none"
          >
            <PixelCopyIcon className="w-3 h-3 shrink-0" />
            <span className="md:hidden">Tap to copy</span>
            <span className="hidden md:inline">Click to copy</span>
          </span>
        )}

        {copyStatus === 'copied' && (
          <span
            role="status"
            aria-live="polite"
            className="retro-pop-in pointer-events-none absolute -top-3 right-2.5 md:right-3 z-10 inline-flex items-center gap-1 bg-[#E6F7EC] text-[#15603A] border border-[#15603A] shadow-[2px_2px_0_#141B29] px-2 py-0.5 font-mono text-[11px] font-bold whitespace-nowrap select-none"
          >
            <PixelCheckIcon className="w-3 h-3 shrink-0" />
            <span>COPIED!</span>
          </span>
        )}

        <div
          ref={fallbackSelectRef}
          role={copyStatus === 'failed' ? undefined : 'button'}
          tabIndex={copyStatus === 'failed' ? undefined : 0}
          aria-label={copyStatus === 'failed' ? undefined : `Copy ${config.title} text`}
          onClick={() => {
            if (copyStatus !== 'failed') {
              void handleCopy();
            }
          }}
          onKeyDown={(e) => {
            if (copyStatus !== 'failed' && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault();
              void handleCopy();
            }
          }}
          className={`retro-well retro-well-copyable w-full text-left px-3 md:px-3.5 py-2.5 md:py-3 min-w-0 ${
            isAnyTransformAllRunning ? 'retro-shimmer-surface opacity-75 ' : ''
          }${
            copyStatus === 'copied'
              ? '!bg-[#E6F7EC] !border-[#15603A] cursor-pointer'
              : copyStatus === 'failed'
                ? '!bg-[#FFF8DE] !border-[#6B3A00] select-all cursor-text'
                : 'active:bg-[#EFECE0] cursor-pointer'
          }`}
        >
          <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-[15px] md:text-base leading-relaxed text-[#141B29]">
            {data.text}
          </p>
        </div>
      </div>

      {/* Smooth CSS Grid Accordion for Teach Me Notes: Shown automatically when Teach Me is ON */}
      <div className={`retro-collapse ${collapseStateClass}`}>
        <div className="retro-collapse-inner">
          <TeachMePanel
            modeTitle={config.title}
            explanations={data.explanations}
            toneSummary={data.toneSummary}
            reusablePattern={data.reusablePattern}
            isLoadingNotes={isLoadingNotes}
          />
        </div>
      </div>
    </article>
  );
});
