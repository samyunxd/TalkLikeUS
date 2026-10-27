import { useState } from 'react';
import type { ExplanationNote, RegisterLevel } from '../types/transform';
import { PixelBookIcon } from './PixelIcons';

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
    label: 'Everyday Safe',
    textClass: 'text-[#15603A]',
  },
  mildly_informal: {
    label: 'Mildly Informal',
    textClass: 'text-[#142850]',
  },
  very_informal: {
    label: 'Very Informal',
    textClass: 'text-[#6B3A00]',
  },
  blunt: {
    label: 'Direct / Blunt',
    textClass: 'text-[#8C2B0E]',
  },
  vulgar: {
    label: 'Vulgar / Strong',
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
  const [expanded, setExpanded] = useState(true);

  const hasContent =
    explanations.length > 0 || Boolean(toneSummary) || Boolean(reusablePattern);

  return (
    <div className="pt-2">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
        className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-[#0000EE] hover:text-[#551A8B] underline underline-offset-4 cursor-pointer whitespace-nowrap shrink-0"
      >
        <PixelBookIcon className="w-3.5 h-3.5 shrink-0" />
        <span>
          {expanded ? '[-] Hide Teach Me Notes' : `[+] Teach Me Notes (${explanations.length})`}
        </span>
      </button>

      {expanded && (
        <div className="mt-2 bg-[#ECE8D9] border border-[#8E8772] px-3.5 py-2.5 space-y-2 text-xs sm:text-sm">
          {isLoadingNotes ? (
            <p className="font-mono text-xs text-[#142850]">
              Loading {modeTitle} learning notes...
            </p>
          ) : !hasContent ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-[#3E3A30]">
                No Teach Me notes loaded for this version yet.
              </p>
              {onRequestNotes && (
                <button
                  type="button"
                  onClick={onRequestNotes}
                  className="retro-btn px-2.5 py-1 text-xs font-semibold whitespace-nowrap shrink-0"
                >
                  Generate Notes
                </button>
              )}
            </div>
          ) : (
            <>
              {toneSummary && (
                <p className="text-xs text-[#1E2533] leading-relaxed">
                  <strong className="font-mono text-[#142850]">Context: </strong>
                  {toneSummary}
                </p>
              )}

              {explanations.length > 0 && (
                <ul className="space-y-1.5 divide-y divide-dashed divide-[#C4BDA9]">
                  {explanations.map((item, idx) => {
                    const regInfo = REGISTER_LABELS[item.register] || REGISTER_LABELS.everyday;
                    return (
                      <li key={`${item.replacement}-${idx}`} className={idx > 0 ? 'pt-1.5' : ''}>
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 font-mono text-xs">
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
                          <span className="capitalize text-[#555043]">{item.type}</span>
                          <span aria-hidden="true" className="text-[#8E8772]">
                            &middot;
                          </span>
                          <span className={`font-semibold ${regInfo.textClass}`}>
                            {regInfo.label}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-[#232B3A] leading-relaxed">
                          {item.reason}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              )}

              {reusablePattern && (
                <div className="pt-1.5 border-t border-dashed border-[#C4BDA9] text-xs text-[#142850]">
                  <strong className="font-mono">Pattern: </strong>
                  <span>{reusablePattern}</span>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
