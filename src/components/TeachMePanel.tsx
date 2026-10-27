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
    label: 'Very Informal (Friends/Texting)',
    textClass: 'text-[#6B3A00]',
  },
  blunt: {
    label: 'Direct / Blunt',
    textClass: 'text-[#8C2B0E]',
  },
  vulgar: {
    label: 'Vulgar / Strong Language',
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
    <div className="mt-4 pt-3 border-t border-dashed border-[#8E8772]">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          aria-expanded={expanded}
          className="inline-flex items-center gap-2 font-mono text-xs font-semibold text-[#0000EE] hover:text-[#551A8B] underline underline-offset-4 cursor-pointer whitespace-nowrap shrink-0"
        >
          <PixelBookIcon className="w-4 h-4 shrink-0" />
          <span>
            {expanded ? '[-] Hide Teach Me Notes' : `[+] Show Teach Me Notes (${explanations.length})`}
          </span>
        </button>

        <span className="font-mono text-[11px] text-[#555043] truncate">
          Excluded from Copy
        </span>
      </div>

      {expanded && (
        <div className="mt-3 bg-[#EDE9DA] border border-[#8E8772] p-3.5 space-y-3 text-sm">
          {isLoadingNotes ? (
            <p className="font-mono text-xs text-[#142850]">
              Analyzing {modeTitle} phrasing and idioms...
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
                  className="retro-btn px-3 py-1 text-xs font-semibold whitespace-nowrap shrink-0"
                >
                  Generate Notes
                </button>
              )}
            </div>
          ) : (
            <>
              {toneSummary && (
                <p className="text-xs sm:text-sm text-[#1E2533] leading-relaxed">
                  <strong className="font-mono text-xs text-[#142850]">When it fits: </strong>
                  {toneSummary}
                </p>
              )}

              {explanations.length > 0 && (
                <ul className="space-y-2.5 divide-y divide-dashed divide-[#BCB5A1]">
                  {explanations.map((item, idx) => {
                    const regInfo = REGISTER_LABELS[item.register] || REGISTER_LABELS.everyday;
                    return (
                      <li key={`${item.replacement}-${idx}`} className={idx > 0 ? 'pt-2.5' : ''}>
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
                        </div>

                        <div className="mt-1 flex flex-wrap items-center gap-1.5 font-mono text-[11px] text-[#555043]">
                          <span className="capitalize">{item.type}</span>
                          <span aria-hidden="true">&middot;</span>
                          <span className={`font-semibold ${regInfo.textClass}`}>
                            {regInfo.label}
                          </span>
                        </div>

                        <p className="mt-1 text-xs sm:text-sm text-[#232B3A] leading-relaxed">
                          {item.reason}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              )}

              {reusablePattern && (
                <div className="pt-2.5 border-t border-dashed border-[#BCB5A1] text-xs sm:text-sm text-[#142850]">
                  <strong className="font-mono text-xs">Reusable Pattern: </strong>
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
