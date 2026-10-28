import { useCallback, useEffect, useRef, useState } from 'react';
import { MAX_INPUT_CHARS } from '../../config/modes';
import { getTextMetrics } from '../../utils/textStats';
import { PixelClearIcon, PixelHourglassIcon } from '../PixelIcons';

interface MobileWriteViewProps {
  inputText: string;
  onChangeText: (next: string) => void;
  onClearText: () => void;
  onLoadQuickSample: () => void;
  chatModeEnabled: boolean;
  teachMe: boolean;
  hasResults: boolean;
  isTransformingAll: boolean;
  isAnyBusy: boolean;
  onSubmitTransform: () => void;
  onTrimToLimit: () => void;
  onOpenSettings: () => void;
  onOpenResults: () => void;
  pendingReplaceAllConfirm: boolean;
  onConfirmReplaceAll: () => void;
  onCancelReplaceAll: () => void;
}

function estimateCountdownSeconds(charCount: number, teachMe: boolean): number {
  let base = 10;
  if (charCount > 4000) {
    base = 24;
  } else if (charCount > 900) {
    base = 15;
  }
  return teachMe ? base + 2 : base;
}

export function MobileWriteView({
  inputText,
  onChangeText,
  onClearText,
  onLoadQuickSample,
  chatModeEnabled,
  teachMe,
  hasResults,
  isTransformingAll,
  isAnyBusy,
  onSubmitTransform,
  onTrimToLimit,
  onOpenSettings,
  onOpenResults,
  pendingReplaceAllConfirm,
  onConfirmReplaceAll,
  onCancelReplaceAll,
}: MobileWriteViewProps) {
  const metrics = getTextMetrics(inputText);
  const canSubmit =
    inputText.trim().length > 0 && !metrics.isOverLimit && !isAnyBusy;
  const canClear = inputText.length > 0 && !isAnyBusy;

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [countdown, setCountdown] = useState<number>(12);

  const syncTextareaHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el || typeof window === 'undefined') return;

    const minH = 144;
    const maxH = Math.min(280, Math.max(144, Math.round(window.innerHeight * 0.42)));

    el.style.height = 'auto';
    const nextH = Math.min(Math.max(el.scrollHeight, minH), maxH);
    el.style.height = `${nextH}px`;
    el.style.overflowY = el.scrollHeight > nextH ? 'auto' : 'hidden';
  }, []);

  useEffect(() => {
    syncTextareaHeight();
  }, [inputText, syncTextareaHeight]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onResize = () => syncTextareaHeight();
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, [syncTextareaHeight]);

  useEffect(() => {
    if (!isTransformingAll) return;

    setCountdown(estimateCountdownSeconds(inputText.length, teachMe));
    const timer = window.setInterval(() => {
      setCountdown((prev) => (prev > 1 ? prev - 1 : 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isTransformingAll, inputText.length, teachMe]);

  return (
    <div className="space-y-4 min-w-0">
      {/* Compact Workspace Heading */}
      <div className="space-y-1 pt-0.5">
        <h1 className="font-pixel text-sm min-[375px]:text-base text-[#141B29] leading-snug tracking-tight">
          SAY IT LIKE YOU MEAN IT.
        </h1>
        <p className="text-xs text-[#433E32]">
          4 American voices. Your choice.
        </p>
      </div>

      {/* Dedicated Phone Editor Panel */}
      <section
        aria-labelledby="mobile-your-text-label"
        className="bg-[#F4F1E6] border border-[#141B29] shadow-[2px_2px_0_#141B29] p-3 space-y-2.5 min-w-0"
      >
        {/* Editor Top Strip: YOUR TEXT Label + Word Counter + Clear Icon Button */}
        <div className="flex items-center justify-between gap-2">
          <label
            id="mobile-your-text-label"
            htmlFor="mobile-original-textarea"
            className="font-pixel text-[11px] text-[#142850] tracking-wide cursor-pointer"
          >
            YOUR TEXT
          </label>

          <div className="flex items-center gap-2 shrink-0">
            <span className="font-mono text-xs text-[#4B4639] tabular-nums whitespace-nowrap">
              {metrics.words.toLocaleString()} {metrics.words === 1 ? 'word' : 'words'}
              {metrics.chars > 15000
                ? ` · ${metrics.chars.toLocaleString()}/${MAX_INPUT_CHARS / 1000}k`
                : ''}
            </span>

            <button
              type="button"
              onClick={onClearText}
              disabled={!canClear}
              aria-label="Clear Text"
              title="Clear Text"
              className="retro-btn min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-[#141B29] disabled:opacity-40"
            >
              <PixelClearIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Large Comfortable Auto-Expanding Textarea */}
        <div className="bg-white border border-[#141B29] shadow-[inset_1px_1px_0_#CDC7B4] min-w-0">
          <textarea
            ref={textareaRef}
            id="mobile-original-textarea"
            value={inputText}
            onChange={(e) => onChangeText(e.target.value)}
            rows={5}
            inputMode="text"
            enterKeyHint="go"
            autoCapitalize="sentences"
            autoCorrect="on"
            spellCheck={true}
            placeholder="Type or paste what you want to say..."
            className="w-full min-h-[144px] p-3 bg-transparent text-[#141B29] placeholder:text-[#767060] text-base leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere] resize-none focus:outline-none block"
          />
        </div>

        {/* Empty-editor quick sample helper */}
        {inputText.trim().length === 0 && (
          <div className="flex items-center justify-between gap-2 pt-0.5">
            <button
              type="button"
              disabled={isAnyBusy}
              onClick={onLoadQuickSample}
              className="retro-link min-h-[40px] inline-flex items-center font-mono text-xs"
            >
              Load sample text &rarr;
            </button>
            <span className="font-mono text-[11px] text-[#666052]">
              Up to 20,000 chars
            </span>
          </div>
        )}

        {/* Oversized Paste Recovery */}
        {metrics.isOverLimit && (
          <div
            role="alert"
            className="bg-[#FDF0ED] border border-[#B41616] p-2.5 space-y-2"
          >
            <p className="text-xs text-[#6E0D0D] leading-relaxed">
              <strong>Over 20,000-char limit ({metrics.chars.toLocaleString()}).</strong> Trim to
              the nearest paragraph boundary to continue.
            </p>
            <button
              type="button"
              onClick={onTrimToLimit}
              className="retro-btn min-h-[44px] w-full px-3 text-xs font-semibold inline-flex items-center justify-center"
            >
              Trim to Safe Boundary
            </button>
          </div>
        )}

        {/* Long Multi-Chunk Notice */}
        {metrics.isLongChunked && !metrics.isOverLimit && (
          <p className="font-mono text-[11px] text-[#142850] bg-[#E5EAF5] border border-[#142850] px-2.5 py-1.5">
            Long text ({metrics.words.toLocaleString()} words): will transform paragraph by
            paragraph without summarizing.
          </p>
        )}
      </section>

      {/* Quiet Mode Readout + Secondary Open Settings Button */}
      <div className="bg-[#ECE8D9] border border-[#ABA48E] px-3 py-2 flex items-center justify-between gap-2.5">
        <div className="font-mono text-xs text-[#232B3A] leading-snug min-w-0">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
            <span className="whitespace-nowrap">
              Chat:{' '}
              <strong className={chatModeEnabled ? 'text-[#15603A]' : 'text-[#433E32]'}>
                {chatModeEnabled ? 'ON' : 'OFF'}
              </strong>
            </span>
            <span className="whitespace-nowrap">
              Teach Me:{' '}
              <strong className={teachMe ? 'text-[#142850]' : 'text-[#433E32]'}>
                {teachMe ? 'ON' : 'OFF'}
              </strong>
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenSettings}
          className="retro-btn min-h-[44px] px-3 text-xs font-semibold inline-flex items-center justify-center whitespace-nowrap shrink-0"
        >
          Open Settings
        </button>
      </div>

      {/* Inline Overwrite Confirmation if Manual Edits Exist */}
      {pendingReplaceAllConfirm && (
        <div
          role="region"
          aria-label="Confirm replacing edited results"
          className="bg-[#FFF8DE] border-2 border-[#6B3A00] p-3 space-y-2.5"
        >
          <p className="text-xs text-[#3D2200] leading-relaxed">
            <strong className="font-mono">Manual edits detected: </strong>
            Generating new voices will replace your edited results.
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

      {/* Separate Prominent Full-Width Primary Action Button */}
      <div className="space-y-2.5 pt-0.5">
        <button
          type="button"
          onClick={onSubmitTransform}
          disabled={!canSubmit}
          className="retro-btn-primary w-full min-h-[50px] px-4 inline-flex items-center justify-center text-sm font-bold tracking-wide tabular-nums whitespace-nowrap"
        >
          {isTransformingAll
            ? `AMERICANIZE (${String(countdown).padStart(2, '0')}s)`
            : 'AMERICANIZE'}
        </button>

        {isTransformingAll && (
          <div role="status" aria-live="polite" className="space-y-1.5">
            <div className="h-2.5 w-full border border-[#141B29] bg-[#DFDAC8] overflow-hidden">
              <div className="h-full w-full retro-progress-bar" />
            </div>
            <p className="font-mono text-xs text-[#142850] flex items-center gap-2">
              <PixelHourglassIcon className="w-3.5 h-3.5 shrink-0" />
              <span>
                {chatModeEnabled
                  ? 'Compressing into 4 American text voices...'
                  : 'Generating 4 American voices...'}
              </span>
            </p>
          </div>
        )}

        {hasResults && !isTransformingAll && (
          <button
            type="button"
            onClick={onOpenResults}
            className="retro-btn w-full min-h-[44px] px-3 text-xs font-semibold inline-flex items-center justify-center"
          >
            View Current Results (4) &rarr;
          </button>
        )}
      </div>
    </div>
  );
}
