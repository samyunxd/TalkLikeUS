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
  const hasContent =
    explanations.length > 0 || Boolean(toneSummary) || Boolean(reusablePattern);

  return (
    <div className="bg-[#ECE8D9] border border-[#8E8772] px-2.5 sm:px-3.5 py-2 sm:py-2.5 space-y-1.5 sm:space-y-2 text-xs min-w-0">
      {isLoadingNotes ? (
        <p className="font-mono text-xs text-[#142850]">
          Loading {modeTitle} notes...
        </p>
      ) : !hasContent ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
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
            <p className="hidden sm:block text-xs text-[#1E2533] leading-relaxed break-words [overflow-wrap:anywhere]">
              <strong className="font-mono text-[#142850]">Context: </strong>
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
                    <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 font-mono text-[11px] sm:text-xs break-words [overflow-wrap:anywhere]">
                      <span className="line-through text-[#666052]">
                        &ldquo;{item.original}&rdquo;
                      </span>
                      <span aria-hidden="true" className="text-[#141B29]">
                        &rarr;
                      </span>
                      <span className="font-semibold text-[#141B29]">
                        &ldquo;{item.replacement}&rdquo;
                      </span>
                      <span aria-hidden="true" className="text-[#8E8772]">
                        &middot;
                      </span>
                      <span className={`font-semibold ${regInfo.textClass}`}>
                        {regInfo.label}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-[#232B3A] leading-snug sm:leading-relaxed break-words [overflow-wrap:anywhere]">
                      {item.reason}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}

          {reusablePattern && (
            <div className="hidden sm:block pt-1.5 border-t border-dashed border-[#C4BDA9] text-xs text-[#142850] break-words [overflow-wrap:anywhere]">
              <strong className="font-mono">Pattern: </strong>
              <span>{reusablePattern}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
