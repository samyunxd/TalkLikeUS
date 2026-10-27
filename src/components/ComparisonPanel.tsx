import { useState } from 'react';
import { MODE_CONFIGS, ORDERED_MODE_CONFIGS } from '../config/modes';
import type { EditableModeState, VoiceMode } from '../types/transform';
import { copyTextToClipboard } from '../utils/clipboard';
import { getTextMetrics } from '../utils/textStats';

interface ComparisonPanelProps {
  originalText: string;
  selectedMode: VoiceMode;
  onSelectMode: (mode: VoiceMode) => void;
  resultsMap: Record<VoiceMode, EditableModeState>;
  onEditSelected: (mode: VoiceMode, nextText: string) => void;
  onClose: () => void;
  onAnnounce: (msg: string) => void;
}

export function ComparisonPanel({
  originalText,
  selectedMode,
  onSelectMode,
  resultsMap,
  onEditSelected,
  onClose,
  onAnnounce,
}: ComparisonPanelProps) {
  const [copiedSide, setCopiedSide] = useState<'none' | 'selected'>('none');

  const activeConfig = MODE_CONFIGS[selectedMode];
  const activeResult = resultsMap[selectedMode];
  const origMetrics = getTextMetrics(originalText);
  const rewMetrics = getTextMetrics(activeResult?.text || '');
  const wordDelta = rewMetrics.words - origMetrics.words;

  const handleCopySelected = async () => {
    if (!activeResult) return;
    const outcome = await copyTextToClipboard(activeResult.text);
    if (outcome.ok) {
      setCopiedSide('selected');
      onAnnounce(`Copied ${activeConfig.title} from comparison view.`);
      window.setTimeout(() => setCopiedSide('none'), 2000);
    }
  };

  return (
    <section
      aria-labelledby="comparison-window-heading"
      className="retro-window overflow-hidden"
    >
      <div className="bg-[#142850] text-[#F7F5EC] px-4 py-2.5 flex items-center justify-between gap-3 border-b-2 border-[#141B29]">
        <h3 id="comparison-window-heading" className="font-pixel text-xs sm:text-sm tracking-wide">
          Side-by-Side Voice Comparison
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="retro-btn px-3 py-1 text-xs font-semibold whitespace-nowrap shrink-0"
        >
          Close Compare
        </button>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="px-4 py-2.5 bg-[#ECE8D9] border-b border-dashed border-[#ABA48E] flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Select voice to compare" className="flex flex-wrap items-center gap-2">
          {ORDERED_MODE_CONFIGS.map((cfg) => {
            const isSelected = cfg.id === selectedMode;
            return (
              <button
                key={cfg.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => onSelectMode(cfg.id)}
                className={`retro-btn px-3 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 ${
                  isSelected ? '!bg-[#142850] !text-[#F7F5EC]' : ''
                }`}
              >
                {cfg.number}. {cfg.title}
              </button>
            );
          })}
        </div>

        <span className="font-mono text-xs text-[#4B4639] tabular-nums">
          Length delta: {wordDelta > 0 ? `+${wordDelta}` : wordDelta} words
        </span>
      </div>

      {/* Two-Column Split Comparison */}
      <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
        {/* Left: Original Source */}
        <div className="flex flex-col space-y-2">
          <div className="flex items-center justify-between font-mono text-xs text-[#3E3A30] tabular-nums">
            <span className="font-semibold text-[#141B29]">Original Input</span>
            <span>{origMetrics.words.toLocaleString()} words</span>
          </div>
          <div className="retro-well bg-[#FBF9F2] p-3.5 flex-1 whitespace-pre-wrap text-sm sm:text-base leading-relaxed text-[#2C3342]">
            {originalText}
          </div>
        </div>

        {/* Right: Selected American Voice (Editable) */}
        <div className="flex flex-col space-y-2">
          <div className="flex items-center justify-between gap-2 font-mono text-xs text-[#3E3A30] tabular-nums">
            <span className="font-semibold text-[#142850]">
              {activeConfig.number}. {activeConfig.title}
            </span>
            <div className="flex items-center gap-2">
              <span>{rewMetrics.words.toLocaleString()} words</span>
              <button
                type="button"
                onClick={handleCopySelected}
                className="retro-link font-semibold whitespace-nowrap shrink-0"
              >
                {copiedSide === 'selected' ? 'COPIED!' : 'Copy'}
              </button>
            </div>
          </div>
          <div className="retro-well flex-1 flex">
            <label htmlFor="compare-selected-editor" className="sr-only">
              Edit {activeConfig.title} in comparison view
            </label>
            <textarea
              id="compare-selected-editor"
              value={activeResult?.text || ''}
              onChange={(e) => onEditSelected(selectedMode, e.target.value)}
              rows={6}
              className="w-full p-3.5 bg-transparent text-[#141B29] text-sm sm:text-base leading-relaxed resize-y focus:outline-none"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
