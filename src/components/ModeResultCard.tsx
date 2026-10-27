import { useRef, useState } from 'react';
import type { ModeConfig } from '../config/modes';
import type { EditableModeState } from '../types/transform';
import { copyTextToClipboard } from '../utils/clipboard';
import { getTextMetrics } from '../utils/textStats';
import { PixelHourglassIcon, PixelModeIcon } from './PixelIcons';
import { TeachMePanel } from './TeachMePanel';

interface ModeResultCardProps {
  config: ModeConfig;
  data: EditableModeState;
  teachMe: boolean;
  isRegenerating: boolean;
  isAnyTransformAllRunning: boolean;
  isLoadingNotes: boolean;
  onEditText: (nextText: string) => void;
  onRestoreOriginal: () => void;
  onRegenerate: () => void;
  onOpenCompare: () => void;
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
  onEditText,
  onRestoreOriginal,
  onRegenerate,
  onOpenCompare,
  onRequestNotes,
  onAnnounce,
}: ModeResultCardProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'manual'>('idle');

  const metrics = getTextMetrics(data.text);
  const estimatedRows = Math.min(14, Math.max(4, Math.ceil(data.text.length / 68)));

  const handleCopy = async () => {
    const res = await copyTextToClipboard(data.text);
    if (res.ok) {
      setCopyStatus('copied');
      onAnnounce(`Copied ${config.title} rewrite to clipboard.`);
      window.setTimeout(() => setCopyStatus('idle'), 2000);
    } else {
      textareaRef.current?.focus();
      textareaRef.current?.select();
      setCopyStatus('manual');
      onAnnounce(`Selected ${config.title} text. Press Ctrl+C or Cmd+C to copy.`);
      window.setTimeout(() => setCopyStatus('idle'), 4500);
    }
  };

  const handleFocusEdit = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.focus();
    const len = el.value.length;
    el.setSelectionRange(len, len);
  };

  return (
    <article
      aria-labelledby={`mode-heading-${config.id}`}
      className="retro-window flex flex-col justify-between relative"
    >
      {/* Distinct Mode Window Title Bar */}
      <div>
        <div
          className={`${config.headerBgClass} ${config.headerTextClass} px-4 py-2.5 flex items-center justify-between gap-3 border-b-2 border-[#141B29]`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <PixelModeIcon mode={config.id} className="w-4 h-4 shrink-0" />
            <h3
              id={`mode-heading-${config.id}`}
              className="font-pixel text-xs sm:text-sm tracking-wide truncate"
            >
              {config.number}. {config.title}
            </h3>
          </div>

          <span className="font-mono text-[11px] opacity-90 whitespace-nowrap shrink-0">
            {config.shortTag}
          </span>
        </div>

        {/* Voice Description & Metadata Subbar */}
        <div className="px-4 pt-3 pb-2.5 border-b border-dashed border-[#ABA48E] bg-[#ECE8D9]">
          <p className="text-xs sm:text-sm text-[#232B3A] leading-snug">
            {config.description}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] text-[#555043] tabular-nums">
            <span>
              {metrics.words.toLocaleString()} words &middot; {metrics.chars.toLocaleString()} chars
            </span>
            {data.isEdited && (
              <span className="inline-flex items-center gap-2 text-[#142850] font-semibold">
                <span>Edited by you</span>
                <span aria-hidden="true">&middot;</span>
                <button
                  type="button"
                  onClick={onRestoreOriginal}
                  className="retro-link text-[11px] font-normal whitespace-nowrap shrink-0"
                >
                  Restore AI Draft
                </button>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Editable Body & Actions */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3.5">
        <div className="relative">
          <label htmlFor={`result-editor-${config.id}`} className="sr-only">
            {config.title} editable output
          </label>
          <div className="retro-well">
            <textarea
              ref={textareaRef}
              id={`result-editor-${config.id}`}
              value={data.text}
              onChange={(e) => onEditText(e.target.value)}
              disabled={isRegenerating}
              rows={estimatedRows}
              className="w-full p-3.5 bg-transparent text-[#141B29] text-[15px] sm:text-base leading-relaxed resize-y focus:outline-none disabled:opacity-50"
            />
          </div>

          {isRegenerating && (
            <div
              role="status"
              aria-live="polite"
              className="mt-2.5 bg-[#EDE9DA] border border-[#141B29] px-3 py-2 flex items-center gap-2.5"
            >
              <PixelHourglassIcon className="w-4 h-4 shrink-0" />
              <span className="font-mono text-xs font-semibold text-[#141B29]">
                Rewriting {config.title} (keeping other three cards intact)...
              </span>
            </div>
          )}

          {copyStatus === 'manual' && (
            <p role="alert" className="mt-2 font-mono text-xs text-[#6B3A00]">
              Clipboard blocked by browser permissions—text is selected, press Ctrl+C / Cmd+C to copy.
            </p>
          )}
        </div>

        {/* Card Action Bar + Optional Teach Me Drawer */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleCopy}
                disabled={isRegenerating || !data.text.trim()}
                className={`retro-btn min-h-[40px] px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 ${
                  copyStatus === 'copied' ? '!bg-[#D6F5DF] !text-[#0F5128]' : ''
                }`}
              >
                {copyStatus === 'copied' ? 'COPIED!' : 'Copy'}
              </button>

              <button
                type="button"
                onClick={handleFocusEdit}
                disabled={isRegenerating}
                className="retro-btn min-h-[40px] px-3 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0"
              >
                Edit
              </button>

              <button
                type="button"
                onClick={onOpenCompare}
                disabled={isRegenerating}
                className="retro-btn min-h-[40px] px-3 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0"
              >
                Compare
              </button>
            </div>

            <button
              type="button"
              onClick={onRegenerate}
              disabled={isRegenerating || isAnyTransformAllRunning}
              className="retro-btn min-h-[40px] px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0"
            >
              {isRegenerating ? 'Regenerating...' : 'Regenerate'}
            </button>
          </div>

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
        </div>
      </div>
    </article>
  );
}
