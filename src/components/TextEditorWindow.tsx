import { MAX_INPUT_CHARS } from '../config/modes';
import { SAMPLE_PROMPTS, getTextMetrics } from '../utils/textStats';
import { PixelBookIcon, PixelHourglassIcon } from './PixelIcons';

interface TextEditorWindowProps {
  inputText: string;
  onChangeText: (next: string) => void;
  teachMe: boolean;
  onToggleTeachMe: () => void;
  isTransformingAll: boolean;
  isAnyBusy: boolean;
  onSubmitTransform: () => void;
  onCancelTransform: () => void;
  onClearText: () => void;
  onTrimToLimit: () => void;
}

export function TextEditorWindow({
  inputText,
  onChangeText,
  teachMe,
  onToggleTeachMe,
  isTransformingAll,
  isAnyBusy,
  onSubmitTransform,
  onCancelTransform,
  onClearText,
  onTrimToLimit,
}: TextEditorWindowProps) {
  const metrics = getTextMetrics(inputText);
  const canSubmit =
    inputText.trim().length > 0 && !metrics.isOverLimit && !isAnyBusy;

  return (
    <section aria-labelledby="original-text-label" className="retro-window">
      {/* Classic 1990s Window Title Bar */}
      <div className="bg-[#142850] text-[#F7F5EC] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 border-b-2 border-[#141B29]">
        <label
          id="original-text-label"
          htmlFor="studio-original-textarea"
          className="font-pixel text-xs sm:text-sm tracking-wide cursor-pointer"
        >
          YOUR ORIGINAL TEXT
        </label>

        <div className="flex items-center gap-2 font-mono text-xs text-[#DCE4F5] tabular-nums">
          <span>{metrics.words.toLocaleString()} words</span>
          <span aria-hidden="true">&middot;</span>
          <span>
            {metrics.chars.toLocaleString()} / {MAX_INPUT_CHARS.toLocaleString()} chars
          </span>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-4">
        {/* Sample quick-fill bar */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 font-mono text-xs text-[#433E32]">
          <span className="font-semibold text-[#141B29]">Try a sample:</span>
          {SAMPLE_PROMPTS.map((sample, idx) => (
            <span key={sample.id} className="inline-flex items-center gap-3">
              <button
                type="button"
                disabled={isAnyBusy}
                onClick={() => onChangeText(sample.text)}
                className="retro-link disabled:opacity-50 whitespace-nowrap shrink-0"
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

        {/* Main Sunken Document Textarea */}
        <div className="retro-well">
          <textarea
            id="studio-original-textarea"
            value={inputText}
            onChange={(e) => onChangeText(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && canSubmit) {
                e.preventDefault();
                onSubmitTransform();
              }
            }}
            rows={7}
            placeholder="Paste your message here... a sentence, a paragraph, or the whole thing."
            className="w-full min-h-[180px] p-4 bg-transparent text-[#141B29] placeholder:text-[#767060] text-base leading-relaxed resize-y focus:outline-none"
          />
        </div>

        {/* Oversized input recovery banner */}
        {metrics.isOverLimit && (
          <div
            role="alert"
            className="bg-[#FDF0ED] border-2 border-[#B41616] p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <p className="text-xs sm:text-sm text-[#6E0D0D] leading-relaxed">
              <strong className="font-mono font-semibold">Limit Exceeded: </strong>
              Your paste has {metrics.chars.toLocaleString()} characters, exceeding the{' '}
              {MAX_INPUT_CHARS.toLocaleString()}-character studio ceiling. We never truncate silently—trim to
              the nearest paragraph boundary or edit manually.
            </p>
            <button
              type="button"
              onClick={onTrimToLimit}
              className="retro-btn px-3.5 py-2 text-xs font-semibold whitespace-nowrap shrink-0"
            >
              Trim to Safe Boundary
            </button>
          </div>
        )}

        {/* Long multi-chunk notice */}
        {metrics.isLongChunked && !metrics.isOverLimit && (
          <p className="font-mono text-xs text-[#142850] bg-[#E5EAF5] border border-[#142850] px-3 py-2">
            Long-form mode active ({metrics.words.toLocaleString()} words): TalkLikeUS will split along
            paragraph boundaries and reassemble your full text without summarizing.
          </p>
        )}

        {/* Loading status bar when transforming all 4 modes */}
        {isTransformingAll && (
          <div
            role="status"
            aria-live="polite"
            className="bg-[#EDE9DA] border-2 border-[#141B29] p-3.5 space-y-2.5"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <PixelHourglassIcon className="w-5 h-5 shrink-0" />
                <span className="font-mono text-xs sm:text-sm font-semibold text-[#141B29]">
                  {metrics.isLongChunked
                    ? 'Processing multi-paragraph text across all four American voices...'
                    : 'Generating all four American voices from your message...'}
                </span>
              </div>
              <button
                type="button"
                onClick={onCancelTransform}
                className="retro-btn px-3 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0"
              >
                Cancel
              </button>
            </div>
            <div className="h-3 w-full border border-[#141B29] bg-[#FFFFFF] overflow-hidden">
              <div className="h-full w-full retro-progress-bar" />
            </div>
          </div>
        )}

        {/* Bottom Studio Control Deck */}
        <div className="pt-2 border-t border-dashed border-[#ABA48E] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Live Word & Char Readout */}
            <div
              aria-live="off"
              className="font-mono text-xs text-[#3E3A30] bg-[#E8E3D3] border border-[#8E8772] px-3 py-2 tabular-nums whitespace-nowrap shrink-0"
            >
              <span>Words: {metrics.words.toLocaleString()}</span>
              <span aria-hidden="true" className="mx-2">
                &middot;
              </span>
              <span>Chars: {metrics.chars.toLocaleString()}</span>
            </div>

            {/* Teach Me Optional Toggle */}
            <button
              type="button"
              role="switch"
              aria-checked={teachMe}
              onClick={onToggleTeachMe}
              className={`retro-btn min-h-[40px] px-3.5 py-2 text-xs font-semibold inline-flex items-center gap-2 whitespace-nowrap shrink-0 ${
                teachMe ? '!bg-[#DCE6FA] !border-[#142850]' : ''
              }`}
            >
              <span
                aria-hidden="true"
                className="font-mono font-bold text-[#142850]"
              >
                {teachMe ? '[X]' : '[ ]'}
              </span>
              <PixelBookIcon className="w-4 h-4 shrink-0" />
              <span>Teach Me {teachMe ? '(On)' : '(Off)'}</span>
            </button>

            {/* Clear Text Button */}
            <button
              type="button"
              onClick={onClearText}
              disabled={inputText.length === 0 || isAnyBusy}
              className="retro-btn min-h-[40px] px-3.5 py-2 text-xs font-semibold whitespace-nowrap shrink-0"
            >
              Clear Text
            </button>
          </div>

          {/* Primary Action Button */}
          <div className="flex items-center">
            <button
              type="button"
              onClick={onSubmitTransform}
              disabled={!canSubmit}
              className="retro-btn-primary w-full lg:w-auto min-h-[44px] px-6 py-2.5 text-sm sm:text-base font-bold tracking-wide whitespace-nowrap shrink-0"
            >
              {isTransformingAll ? 'WORKING...' : 'AMERICANIZE IT!'}
            </button>
          </div>
        </div>

        {/* Subtle Meaning & Privacy Helper Line */}
        <p className="text-xs text-[#4B4639] leading-relaxed">
          All four voices keep your core point, stance, and factual details intact—only the rhythm and
          delivery change. Text stays in your current browser session and is sent securely to Google Gemini
          strictly to generate your rewrites.
        </p>
      </div>
    </section>
  );
}
