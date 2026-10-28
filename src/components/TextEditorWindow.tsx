import { useCallback, useEffect, useRef, useState } from 'react';
import { MAX_INPUT_CHARS } from '../config/modes';
import { SAMPLE_PROMPTS, getTextMetrics } from '../utils/textStats';
import { PixelBookIcon, PixelChatModeIcon } from './PixelIcons';

interface TextEditorWindowProps {
  inputText: string;
  onChangeText: (next: string) => void;
  onClearText: () => void;
  teachMe: boolean;
  onToggleTeachMe: () => void;
  chatModeEnabled: boolean;
  onToggleChatMode: () => void;
  isTransformingAll: boolean;
  isAnyBusy: boolean;
  onSubmitTransform: () => void;
  onTrimToLimit: () => void;
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

export function TextEditorWindow({
  inputText,
  onChangeText,
  onClearText,
  teachMe,
  onToggleTeachMe,
  chatModeEnabled,
  onToggleChatMode,
  isTransformingAll,
  isAnyBusy,
  onSubmitTransform,
  onTrimToLimit,
  pendingReplaceAllConfirm,
  onConfirmReplaceAll,
  onCancelReplaceAll,
}: TextEditorWindowProps) {
  const metrics = getTextMetrics(inputText);
  const canSubmit =
    inputText.trim().length > 0 && !metrics.isOverLimit && !isAnyBusy;
  const canClear = inputText.length > 0 && !isAnyBusy;

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [countdown, setCountdown] = useState<number>(12);

  const adjustTextareaHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el || typeof window === 'undefined') return;

    const isMobile = window.innerWidth < 640;
    const minHeight = isMobile ? 104 : 150;
    const maxHeight = isMobile
      ? Math.min(240, Math.max(120, Math.round(window.innerHeight * 0.38)))
      : 360;

    el.style.height = 'auto';
    const nextHeight = Math.min(Math.max(el.scrollHeight, minHeight), maxHeight);
    el.style.height = `${nextHeight}px`;
    el.style.overflowY = el.scrollHeight > nextHeight ? 'auto' : 'hidden';
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [inputText, adjustTextareaHeight]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleViewportChange = () => adjustTextareaHeight();
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('orientationchange', handleViewportChange);
    return () => {
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('orientationchange', handleViewportChange);
    };
  }, [adjustTextareaHeight]);

  useEffect(() => {
    if (!isTransformingAll) return;

    const initial = estimateCountdownSeconds(inputText.length, teachMe);
    setCountdown(initial);

    const timer = window.setInterval(() => {
      setCountdown((prev) => (prev > 1 ? prev - 1 : 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isTransformingAll, inputText.length, teachMe]);

  return (
    <section aria-labelledby="original-text-label" className="retro-window min-w-0">
      {/* Compact Title Bar — Houses minimal count + mobile Clear button with 0 layout jump */}
      <div className="bg-[#142850] text-[#F7F5EC] min-h-[44px] px-3 sm:px-4 flex items-center justify-between gap-2 border-b-2 border-[#141B29]">
        <label
          id="original-text-label"
          htmlFor="studio-original-textarea"
          className="font-pixel text-[11px] sm:text-sm tracking-wide cursor-pointer whitespace-nowrap shrink-0"
        >
          <span className="sm:hidden">ORIGINAL TEXT</span>
          <span className="hidden sm:inline">YOUR ORIGINAL TEXT</span>
        </label>

        <div className="flex items-center gap-2 shrink-0">
          <div className="font-mono text-[11px] sm:text-xs text-[#DCE4F5] tabular-nums whitespace-nowrap">
            <span className="sm:hidden">
              {metrics.words > 0 ? `${metrics.words.toLocaleString()}w` : '0w'}
            </span>
            <span className="hidden sm:inline">
              {metrics.words.toLocaleString()} words &middot; {metrics.chars.toLocaleString()} /{' '}
              {MAX_INPUT_CHARS.toLocaleString()} chars
            </span>
          </div>

          {/* Mobile inline Clear button right inside the 44px title bar — zero extra vertical rows */}
          {canClear && (
            <button
              type="button"
              onClick={onClearText}
              aria-label="Clear Text"
              className="md:hidden min-h-[44px] min-w-[44px] px-2 -mr-2 inline-flex items-center justify-center font-mono text-[11px] font-semibold text-[#FDE047] underline underline-offset-2 touch-manipulation cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="p-2.5 min-[375px]:p-3 sm:p-5 space-y-2.5 sm:space-y-3.5 min-w-0">
        {/* Sample quick-fill bar: Desktop/Tablet only (mobile uses the clean "Sample" button in header) */}
        <div className="hidden sm:flex flex-wrap items-center gap-x-3 gap-y-0 font-mono text-xs text-[#433E32] -my-1.5">
          <span className="font-semibold text-[#141B29] whitespace-nowrap shrink-0">
            Samples:
          </span>
          {SAMPLE_PROMPTS.map((sample, idx) => (
            <span key={sample.id} className="inline-flex items-center gap-3 shrink-0">
              <button
                type="button"
                disabled={isAnyBusy}
                onClick={() => onChangeText(sample.text)}
                aria-label={`Load sample: ${sample.label}`}
                className="retro-link min-h-[44px] inline-flex items-center disabled:opacity-50 whitespace-nowrap shrink-0"
              >
                {sample.label}
              </button>
              {idx < SAMPLE_PROMPTS.length - 1 && (
                <span aria-hidden="true" className="text-[#8E8772]">
                  &middot;
                </span>
              )}
            </span>
          ))}
        </div>

        {/* Auto-expanding Sunken Document Textarea (16px font prevents iOS zoom jump) */}
        <div className="retro-well min-w-0">
          <textarea
            ref={textareaRef}
            id="studio-original-textarea"
            value={inputText}
            onChange={(e) => onChangeText(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && canSubmit) {
                e.preventDefault();
                onSubmitTransform();
              }
            }}
            rows={3}
            inputMode="text"
            enterKeyHint="send"
            autoCapitalize="sentences"
            autoCorrect="on"
            spellCheck={true}
            placeholder="Paste or type your message..."
            className="w-full min-h-[104px] sm:min-h-[150px] p-2.5 sm:p-3.5 bg-transparent text-[#141B29] placeholder:text-[#767060] text-base leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere] resize-none sm:resize-y focus:outline-none block"
          />
        </div>

        {/* Oversized input recovery banner */}
        {metrics.isOverLimit && (
          <div
            role="alert"
            className="bg-[#FDF0ED] border-2 border-[#B41616] p-2.5 sm:p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
          >
            <p className="text-xs sm:text-sm text-[#6E0D0D] leading-relaxed break-words">
              <strong className="font-mono font-semibold">Limit Exceeded: </strong>
              {metrics.chars.toLocaleString()} / {MAX_INPUT_CHARS.toLocaleString()} chars.
            </p>
            <button
              type="button"
              onClick={onTrimToLimit}
              className="retro-btn min-h-[44px] px-3.5 text-xs font-semibold whitespace-nowrap shrink-0"
            >
              Trim to Limit
            </button>
          </div>
        )}

        {/* Long multi-chunk notice (concise) */}
        {metrics.isLongChunked && !metrics.isOverLimit && (
          <p className="font-mono text-[11px] sm:text-xs text-[#142850] bg-[#E5EAF5] border border-[#142850] px-2.5 py-1.5 break-words">
            Long-form ({metrics.words.toLocaleString()}w): splits cleanly by paragraph without summarizing.
          </p>
        )}

        {/* Inline confirmation if user re-runs Americanize It while manual card edits exist */}
        {pendingReplaceAllConfirm && (
          <div
            role="region"
            aria-label="Confirm replacing edited results"
            className="bg-[#FFF8DE] border-2 border-[#6B3A00] p-2.5 sm:p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
          >
            <p className="text-xs sm:text-sm text-[#3D2200] leading-relaxed">
              <strong className="font-mono font-semibold">Replace your manual edits?</strong>
            </p>
            <div className="grid grid-cols-2 sm:flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onConfirmReplaceAll}
                className="retro-btn-primary min-h-[44px] px-3.5 text-xs font-bold inline-flex items-center justify-center whitespace-nowrap"
              >
                Replace All
              </button>
              <button
                type="button"
                onClick={onCancelReplaceAll}
                className="retro-btn min-h-[44px] px-3.5 text-xs font-semibold inline-flex items-center justify-center whitespace-nowrap"
              >
                Keep My Edits
              </button>
            </div>
          </div>
        )}

        {/* Clean 2-Row Mobile Controls / Single-Line Desktop Toolbar */}
        <div className="grid grid-cols-2 md:flex md:flex-nowrap md:items-center gap-2 md:gap-2.5 sm:pt-2 sm:border-t sm:border-dashed sm:border-[#ABA48E]">
          {/* 1. Teach Me Toggle */}
          <button
            type="button"
            role="switch"
            aria-checked={teachMe}
            onClick={onToggleTeachMe}
            className={`retro-btn col-span-1 min-h-[44px] md:h-11 px-2 min-[375px]:px-2.5 md:px-3 text-[11px] min-[375px]:text-xs leading-none font-semibold inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 ${
              teachMe ? '!bg-[#DCE6FA] !border-[#142850]' : ''
            }`}
          >
            <span
              aria-hidden="true"
              className="hidden sm:inline font-mono font-bold text-[#142850]"
            >
              {teachMe ? '[X]' : '[ ]'}
            </span>
            <PixelBookIcon className="hidden min-[365px]:block w-3.5 h-3.5 shrink-0" />
            <span>TEACH ME: {teachMe ? 'ON' : 'OFF'}</span>
          </button>

          {/* 2. Universal Chat Mode Toggle */}
          <button
            type="button"
            role="switch"
            aria-checked={chatModeEnabled}
            onClick={onToggleChatMode}
            className={`retro-btn col-span-1 min-h-[44px] md:h-11 px-2 min-[375px]:px-2.5 md:px-3 text-[11px] min-[375px]:text-xs leading-none font-semibold inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 ${
              chatModeEnabled
                ? '!bg-[#D6F5DF] !border-[#15603A] !text-[#0F4224]'
                : ''
            }`}
          >
            <span
              aria-hidden="true"
              className={`hidden sm:inline font-mono font-bold ${
                chatModeEnabled ? 'text-[#15603A]' : 'text-[#142850]'
              }`}
            >
              {chatModeEnabled ? '[X]' : '[ ]'}
            </span>
            <PixelChatModeIcon className="hidden min-[365px]:block w-3.5 h-3.5 shrink-0" />
            <span>CHAT MODE: {chatModeEnabled ? 'ON' : 'OFF'}</span>
          </button>

          {/* 3. Desktop Clear Text button (mobile Clear lives cleanly in the title bar when text exists) */}
          <button
            type="button"
            onClick={onClearText}
            disabled={!canClear}
            aria-label="Clear Text"
            className="hidden md:inline-flex retro-btn md:h-11 min-w-[44px] px-3 text-xs leading-none font-semibold items-center justify-center whitespace-nowrap shrink-0"
          >
            Clear Text
          </button>

          {/* 4. Primary Action Button */}
          <button
            type="button"
            onClick={onSubmitTransform}
            disabled={!canSubmit}
            className="retro-btn-primary col-span-2 md:ml-auto min-h-[46px] md:min-h-[44px] md:h-11 w-full md:w-auto px-3.5 lg:px-5 inline-flex items-center justify-center text-xs lg:text-sm leading-none font-bold tracking-wide tabular-nums whitespace-nowrap shrink-0"
          >
            {isTransformingAll
              ? `AMERICANIZE IT! (${String(countdown).padStart(2, '0')}s)`
              : 'AMERICANIZE IT!'}
          </button>
        </div>

        {/* Thin Retro Progress Bar During Generation (no wordy caption on mobile) */}
        {isTransformingAll && (
          <div role="status" aria-live="polite" className="h-2 w-full border border-[#141B29] bg-[#DFDAC8] overflow-hidden">
            <div className="h-full w-full retro-progress-bar" />
          </div>
        )}

        {/* Helper & Live Counter Footer — Desktop only so mobile stays crisp & uncluttered */}
        <div className="hidden sm:flex flex-wrap items-center justify-between gap-2 text-xs text-[#4B4639]">
          <p className="leading-relaxed">
            {chatModeEnabled
              ? 'Chat Mode ON: compresses your message into short, real American texts.'
              : 'Preserves your exact meaning across four American voices.'}
          </p>
          <span className="font-mono text-[11px] text-[#555043] tabular-nums whitespace-nowrap shrink-0">
            Words: {metrics.words.toLocaleString()} &middot; Chars: {metrics.chars.toLocaleString()}
          </span>
        </div>
      </div>
    </section>
  );
}
