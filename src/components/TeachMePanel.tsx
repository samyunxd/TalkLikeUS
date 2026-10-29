import type { ExplanationNote, RegisterLevel } from '../types/transform';

interface TeachMePanelProps {
  modeTitle: string;
  explanations: ExplanationNote[];
  toneSummary?: string;
  reusablePattern?: string;
  isLoadingNotes?: boolean;
  onRequestNotes?: () => void;
}

const REGISTER_LABELS: Record<RegisterLevel, { label: string; textClass: string }> = {
  everyday: {
    label: 'Everyday',
    textClass: 'text-[#15603A]',
  },
  mildly_informal: {
    label: 'Casual',
    textClass: 'text-[#142850]',
  },
  very_informal: {
    label: 'Very Casual',
    textClass: 'text-[#6B3A00]',
  },
  blunt: {
    label: 'Blunt',
    textClass: 'text-[#8C2B0E]',
  },
  vulgar: {
    label: 'Strong',
    textClass: 'text-[#B41616]',
  },
};

export function TeachMePanel({
  modeTitle,
  explanations,
  toneSummary,
  reusablePattern,
  isLoadingNotes,
  onRequestNotes,
}: TeachMePanelProps) {
  const hasDesktopContent =
    explanations.length > 0 || Boolean(toneSummary) || Boolean(reusablePattern);
  const hasMobileContent = explanations.length > 0 || Boolean(toneSummary);

  return (
    <div
      className={`${
        !isLoadingNotes && !hasMobileContent ? 'hidden md:block ' : ''
      }bg-[#ECE8D9] border border-[#8E8772] px-2.5 md:px-3.5 py-2 md:py-2.5 space-y-1.5 md:space-y-2 text-xs min-w-0`}
    >
      {isLoadingNotes ? (
        <div className="inline-flex items-center gap-2 font-mono text-[11px] md:text-xs text-[#142850]">
          <span className="inline-flex items-center gap-0.5" aria-hidden="true">
            <span className="w-1 h-2.5 bg-[#142850] retro-loader-block-1" />
            <span className="w-1 h-2.5 bg-[#D92323] retro-loader-block-2" />
            <span className="w-1 h-2.5 bg-[#142850] retro-loader-block-3" />
          </span>
          <span className="md:hidden">Loading notes</span>
          <span className="hidden md:inline">Loading {modeTitle} notes</span>
        </div>
      ) : !hasDesktopContent ? (
        <div className="hidden md:flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-[#3E3A30]">No notes loaded yet.</p>
          {onRequestNotes && (
            <button
              type="button"
              onClick={onRequestNotes}
              className="retro-btn min-h-[44px] px-3 text-xs font-semibold whitespace-nowrap shrink-0"
            >
              Load Notes
            </button>
          )}
        </div>
      ) : (
        <>
          {toneSummary && (
            <p
              className={`${
                explanations.length > 0 ? 'hidden md:block ' : ''
              }text-xs text-[#1E2533] leading-relaxed break-words [overflow-wrap:anywhere]`}
            >
              <strong className="hidden md:inline font-mono text-[#142850]">Context: </strong>
              {toneSummary}
            </p>
          )}

          {explanations.length > 0 && (
            <ul className="space-y-1.5 divide-y divide-dashed divide-[#C4BDA9]">
              {explanations.map((item, idx) => {
                const regInfo = REGISTER_LABELS[item.register] || REGISTER_LABELS.everyday;
                return (
                  <li
                    key={`${item.replacement}-${idx}`}
                    className={`${idx > 0 ? 'pt-1.5' : ''} min-w-0`}
                  >
                    <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 font-mono text-[11px] md:text-xs break-words [overflow-wrap:anywhere]">
                      <span className="line-through text-[#666052]">
                        &ldquo;{item.original}&rdquo;
                      </span>
                      <span aria-hidden="true" className="text-[#141B29]">
                        &rarr;
                      </span>
                      <span className="font-semibold text-[#141B29]">
                        &ldquo;{item.replacement}&rdquo;
                      </span>
                      <span aria-hidden="true" className="hidden md:inline text-[#8E8772]">
                        &middot;
                      </span>
                      <span className={`hidden md:inline font-semibold ${regInfo.textClass}`}>
                        {regInfo.label}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-[#232B3A] leading-snug md:leading-relaxed break-words [overflow-wrap:anywhere]">
                      {item.reason}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}

          {reusablePattern && (
            <div className="hidden md:block pt-1.5 border-t border-dashed border-[#C4BDA9] text-xs text-[#142850] break-words [overflow-wrap:anywhere]">
              <strong className="font-mono">Pattern: </strong>
              <span>{reusablePattern}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
