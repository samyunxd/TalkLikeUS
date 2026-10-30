import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { MAX_INPUT_CHARS } from '../config/modes';
import { SAMPLE_PROMPTS, getTextMetrics } from '../utils/textStats';
import { PixelBookIcon, PixelChatModeIcon, PixelSpinnerIcon } from './PixelIcons';

interface TextEditorWindowProps {
  inputText: string;
  onChangeText: (next: string) => void;
  onLoadSampleText: (sampleText: string) => void;
  onClearText: () => void;
  teachMe: boolean;
  onToggleTeachMe: () => void;
  chatModeEnabled: boolean;
  onToggleChatMode: () => void;
  isTransformingAll: boolean;
  isAnyBusy: boolean;
  onSubmitTransform: () => void;
  onTrimToLimit: () => void;
}

export const TextEditorWindow = memo(function TextEditorWindow({
  inputText,
  onChangeText,
  onLoadSampleText,
  onClearText,
  teachMe,
  onToggleTeachMe,
  chatModeEnabled,
  onToggleChatMode,
  isTransformingAll,
  isAnyBusy,
  onSubmitTransform,
  onTrimToLimit,
}: TextEditorWindowProps) {
  const metrics = useMemo(() => getTextMetrics(inputText), [inputText]);
  const canSubmit =
    inputText.trim().length > 0 && !metrics.isOverLimit && !isAnyBusy;
  const canClear = inputText.length > 0 && !isAnyBusy;

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const prevLenRef = useRef<number>(inputText.length);
  const lastHeightRef = useRef<number>(0);

  const adjustTextareaHeight = useCallback((forceRecalc = false) => {
    const el = textareaRef.current;
    if (!el || typeof window === 'undefined') return;

    const isMobile = window.innerWidth < 640;
    const minHeight = isMobile ? 104 : 150;
    const maxHeight = isMobile
      ? Math.min(240, Math.max(120, Math.round(window.innerHeight * 0.38)))
      : 360;

    const currentLen = el.value.length;
    const mayHaveShrunk =
      forceRecalc || currentLen < prevLenRef.current || currentLen === 0;
    prevLenRef.current = currentLen;

    if (mayHaveShrunk) {
      el.style.height = 'auto';
    }

    const rawScrollHeight = el.scrollHeight;
    const nextHeight = Math.min(Math.max(rawScrollHeight, minHeight), maxHeight);

    if (lastHeightRef.current !== nextHeight || mayHaveShrunk) {
      el.style.height = `${nextHeight}px`;
      lastHeightRef.current = nextHeight;
    }

    const nextOverflow = rawScrollHeight > nextHeight ? 'auto' : 'hidden';
    if (el.style.overflowY !== nextOverflow) {
      el.style.overflowY = nextOverflow;
    }
  }, []);

  useLayoutEffect(() => {
    adjustTextareaHeight(false);
  }, [inputText, adjustTextareaHeight]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let rafId = 0;
    const handleViewportChange = () => {
      window.cancelAnimationFrame(rafId);
      rafId = window.requestAnimationFrame(() => adjustTextareaHeight(true));
    };
    window.addEventListener('resize', handleViewportChange, { passive: true });
    window.addEventListener('orientationchange', handleViewportChange, { passive: true });
    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('orientationchange', handleViewportChange);
    };
  }, [adjustTextareaHeight]);

  return (
    <section aria-labelledby="original-text-label" className="retro-window min-w-0">
      {/* Compact Title Bar — Minimal on mobile, detailed on desktop */}
      <div className="bg-[#142850] text-[#F7F5EC] min-h-[44px] px-3 sm:px-4 flex items-center justify-between gap-2 border-b-2 border-[#141B29]">
        <label
          id="original-text-label"
          htmlFor="studio-original-textarea"
          className="font-pixel text-[11px] sm:text-sm tracking-wide cursor-pointer whitespace-nowrap shrink-0"
        >
          <span className="md:hidden">YOUR TEXT</span>
          <span className="hidden md:inline">YOUR ORIGINAL TEXT</span>
        </label>

        <div className="flex items-center gap-2 shrink-0">
          <div className="font-mono text-[11px] sm:text-xs text-[#DCE4F5] tabular-nums whitespace-nowrap">
            {metrics.words > 0 && (
              <span className="md:hidden inline-block">
                {metrics.words.toLocaleString()}w
              </span>
            )}
            <span className="hidden md:inline">
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
        {/* Sample quick-fill bar: Desktop only (mobile uses the clean "Sample" button in header) */}
        <div className="hidden md:flex flex-wrap items-center gap-x-3 gap-y-0 font-mono text-xs text-[#433E32] -my-1.5">
          <span className="font-semibold text-[#141B29] whitespace-nowrap shrink-0">
            Samples:
          </span>
          {SAMPLE_PROMPTS.map((sample, idx) => (
            <span key={sample.id} className="inline-flex items-center gap-3 shrink-0">
              <button
                type="button"
                disabled={isAnyBusy}
                onClick={() => onLoadSampleText(sample.text)}
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
        <div className="retro-well retro-well-input min-w-0">
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
            placeholder="Type or paste text..."
            className="w-full min-h-[104px] sm:min-h-[150px] p-2.5 sm:p-3.5 bg-transparent text-[#141B29] placeholder:text-[#767060] text-base leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere] resize-none md:resize-y focus:outline-none block"
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
            <span className="md:hidden">Long text ({metrics.words.toLocaleString()}w)</span>
            <span className="hidden md:inline">
              Long-form ({metrics.words.toLocaleString()}w): splits cleanly by paragraph without summarizing.
            </span>
          </p>
        )}

        {/* Clean 2-Row Mobile Controls / Single-Line Desktop Toolbar — Fixed ON/OFF slots prevent width shifts */}
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
            <span>
              TEACH ME:{' '}
              <span className="inline-block w-[3ch] text-left">{teachMe ? 'ON' : 'OFF'}</span>
            </span>
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
            <span>
              CHAT MODE:{' '}
              <span className="inline-block w-[3ch] text-left">
                {chatModeEnabled ? 'ON' : 'OFF'}
              </span>
            </span>
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

          {/* 4. Primary Action Button with Calm Loading Indicator */}
          <button
            type="button"
            onClick={onSubmitTransform}
            disabled={!canSubmit}
            aria-busy={isTransformingAll}
            className={`retro-btn-primary ${
              isTransformingAll ? 'retro-btn-loading' : ''
            } col-span-2 md:ml-auto min-h-[46px] md:min-h-[44px] md:h-11 w-full md:w-auto md:min-w-[208px] px-3.5 lg:px-5 inline-flex items-center justify-center gap-2.5 text-xs lg:text-sm leading-none font-bold tracking-wide whitespace-nowrap shrink-0`}
          >
            {isTransformingAll ? (
              <>
                <PixelSpinnerIcon className="w-4 h-4 shrink-0" />
                <span>AMERICANIZING</span>
                <span className="inline-flex items-center gap-1" aria-hidden="true">
                  <span className="w-1.5 h-2.5 bg-[#FDE047] retro-loader-block-1" />
                  <span className="w-1.5 h-2.5 bg-[#FFFFFF] retro-loader-block-2" />
                  <span className="w-1.5 h-2.5 bg-[#FDE047] retro-loader-block-3" />
                </span>
              </>
            ) : (
              <span>AMERICANIZE IT!</span>
            )}
          </button>
        </div>

        {/* Helper & Live Counter Footer — Desktop only so mobile stays crisp & uncluttered */}
        <div className="hidden md:flex flex-wrap items-center justify-between gap-2 text-xs text-[#4B4639]">
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
});
