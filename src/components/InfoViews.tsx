import { memo } from 'react';
import { ORDERED_MODE_CONFIGS } from '../config/modes';
import { PixelFlagStamp, PixelModeIcon } from './PixelIcons';
import type { ActiveNavSection } from './RetroHeader';

interface InfoViewsProps {
  section: Exclude<ActiveNavSection, 'home'>;
  onReturnToStudio: () => void;
  onLoadSampleAndReturn: (sampleText: string) => void;
}

const STAGGER_CLASSES = [
  'retro-stagger-1',
  'retro-stagger-2',
  'retro-stagger-3',
  'retro-stagger-4',
] as const;

export const InfoViews = memo(function InfoViews({
  section,
  onReturnToStudio,
  onLoadSampleAndReturn,
}: InfoViewsProps) {
  if (section === 'how') {
    return (
      <section aria-labelledby="how-heading" className="retro-window min-w-0">
        <div className="bg-[#142850] text-[#F7F5EC] px-3.5 sm:px-4 py-2 flex items-center justify-between gap-2.5 border-b-2 border-[#141B29]">
          <h2 id="how-heading" className="font-mono text-xs min-[375px]:text-sm sm:text-base font-bold tracking-tight min-w-0 break-words">
            How TalkLikeUS Works
          </h2>
          <button
            type="button"
            onClick={onReturnToStudio}
            className="retro-btn min-h-[44px] px-3 text-xs font-semibold inline-flex items-center justify-center whitespace-nowrap shrink-0"
          >
            Back to Studio
          </button>
        </div>

        <div className="p-4 sm:p-7 space-y-5 sm:space-y-6 text-[#141B29]">
          <div className="space-y-2">
            <h3 className="font-mono text-base sm:text-lg font-bold text-[#142850]">
              Same idea. Four American voices. Your words, upgraded.
            </h3>
            <p className="text-sm sm:text-base leading-relaxed text-[#252D3D]">
              Conventional grammar tools flatten your personality into stiff textbook English. TalkLikeUS
              preserves every fact, opinion, and nuance in your message while rewriting how it sounds across
              four distinct contemporary American registers.
            </p>
          </div>

          <ol className="space-y-4 border-t border-b border-dashed border-[#ABA48E] py-5">
            <li className="space-y-1 retro-card-enter retro-stagger-1">
              <p className="font-mono text-sm font-semibold text-[#142850]">
                Step 01. Drop Your Text &amp; Choose Standard or Chat Mode
              </p>
              <p className="text-sm leading-relaxed text-[#2C3342]">
                Paste anything from a quick reply to a 500+ word message. Toggle <strong>CHAT MODE: ON</strong>{' '}
                anytime you want all four voices compressed into concise, authentic American text messages,
                DMs, or Discord replies (with natural shorthand like &ldquo;idk&rdquo;, &ldquo;ngl&rdquo;,
                &ldquo;lmk&rdquo;, and &ldquo;rn&rdquo; where appropriate).
              </p>
            </li>
            <li className="space-y-1 retro-card-enter retro-stagger-2">
              <p className="font-mono text-sm font-semibold text-[#142850]">
                Step 02. Scan All Four Voices Top to Bottom
              </p>
              <p className="text-sm leading-relaxed text-[#2C3342]">
                One tap generates Natural American, Casual &amp; Slang, Unfiltered &amp; Blunt, and Badass
                &amp; Confident in a clean vertical stack—with expandable Teach Me learning notes on every
                card.
              </p>
            </li>
            <li className="space-y-1 retro-card-enter retro-stagger-3">
              <p className="font-mono text-sm font-semibold text-[#142850]">
                Step 03. Copy, Edit, or Regenerate Any Voice
              </p>
              <p className="text-sm leading-relaxed text-[#2C3342]">
                Tap Copy (or tap the output well directly) to copy immediately, tap Edit to fine-tune any
                card in place with full protection against accidental overwrites, or tap Regenerate on a
                single voice without affecting the other three.
              </p>
            </li>
          </ol>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <button
              type="button"
              onClick={() =>
                onLoadSampleAndReturn(
                  "I don't know what to say because this happened so suddenly."
                )
              }
              className="retro-link min-h-[44px] inline-flex items-center font-mono text-xs sm:text-sm font-semibold text-left"
            >
              Load quick example in Studio &rarr;
            </button>
            <button
              type="button"
              onClick={onReturnToStudio}
              className="retro-btn-primary min-h-[44px] w-full sm:w-auto px-5 text-xs sm:text-sm inline-flex items-center justify-center whitespace-nowrap shrink-0"
            >
              Return to Studio
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (section === 'voices') {
    return (
      <section aria-labelledby="voices-heading" className="retro-window min-w-0">
        <div className="bg-[#142850] text-[#F7F5EC] px-3.5 sm:px-4 py-2 flex items-center justify-between gap-2.5 border-b-2 border-[#141B29]">
          <h2 id="voices-heading" className="font-mono text-xs min-[375px]:text-sm sm:text-base font-bold tracking-tight min-w-0 break-words">
            The Four American Voice Profiles
          </h2>
          <button
            type="button"
            onClick={onReturnToStudio}
            className="retro-btn min-h-[44px] px-3 text-xs font-semibold inline-flex items-center justify-center whitespace-nowrap shrink-0"
          >
            Back to Studio
          </button>
        </div>

        <div className="p-4 sm:p-7 space-y-4 sm:space-y-5">
          <p className="text-sm sm:text-base text-[#252D3D] leading-relaxed">
            Each mode uses a dedicated linguistic strategy—both in standard prose and when{' '}
            <strong>CHAT MODE: ON</strong> compresses messages into real American texting language:
          </p>

          <div className="space-y-3">
            {ORDERED_MODE_CONFIGS.map((cfg, idx) => (
              <div
                key={cfg.id}
                className={`retro-card-enter ${
                  STAGGER_CLASSES[idx] ?? 'retro-stagger-1'
                } bg-[#ECE8D9] border-2 border-[#141B29] p-3.5 sm:p-4 space-y-1.5`}
              >
                <div className="flex items-center gap-2">
                  <div className={`${cfg.headerBgClass} p-1 border border-[#141B29] shrink-0`}>
                    <PixelModeIcon mode={cfg.id} className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="font-mono text-sm font-bold text-[#141B29]">
                    {cfg.number}. {cfg.title}
                  </h3>
                </div>
                <p className="text-sm text-[#232B3A] leading-relaxed">{cfg.description}</p>
                <p className="font-mono text-xs text-[#4B4639] pt-1 border-t border-dashed border-[#ABA48E]">
                  <strong>Best for:</strong> {cfg.bestFor}
                </p>
              </div>
            ))}
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={onReturnToStudio}
              className="retro-btn-primary min-h-[44px] w-full sm:w-auto px-5 text-xs sm:text-sm inline-flex items-center justify-center whitespace-nowrap shrink-0"
            >
              Try Your Own Text
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="about-heading" className="retro-window min-w-0">
      <div className="bg-[#142850] text-[#F7F5EC] px-3.5 sm:px-4 py-2 flex items-center justify-between gap-2.5 border-b-2 border-[#141B29]">
        <h2 id="about-heading" className="font-mono text-xs min-[375px]:text-sm sm:text-base font-bold tracking-tight min-w-0 break-words">
          About TalkLikeUS &amp; Privacy
        </h2>
        <button
          type="button"
          onClick={onReturnToStudio}
          className="retro-btn min-h-[44px] px-3 text-xs font-semibold inline-flex items-center justify-center whitespace-nowrap shrink-0"
        >
          Back to Studio
        </button>
      </div>

      <div className="p-4 sm:p-7 space-y-5 sm:space-y-6 text-[#141B29]">
        <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
          <PixelFlagStamp className="w-10 h-7 sm:w-12 sm:h-8 shrink-0" />
          <div className="space-y-2">
            <h3 className="font-mono text-base sm:text-lg font-bold text-[#142850]">
              Built for Expressive, Human English
            </h3>
            <p className="text-sm sm:text-base leading-relaxed text-[#252D3D]">
              Non-native speakers often know all the grammar rules yet feel boxed in when trying to sound
              warm, casual, blunt, or self-assured in American English. TalkLikeUS bridges the gap between
              textbook accuracy and how people actually speak and text.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 border-t border-b border-dashed border-[#ABA48E] py-5">
          <div className="space-y-2 retro-card-enter retro-stagger-1">
            <h4 className="font-mono text-sm font-semibold text-[#142850]">
              Meaning-First Guarantee
            </h4>
            <ul className="space-y-1.5 text-sm text-[#2C3342] list-disc pl-5">
              <li>Preserves your core intent, facts, names, dates, and numbers.</li>
              <li>Never flips a question into a statement or reverses your opinion.</li>
              <li>Respects emotional intensity—never moralizes over honest frustration.</li>
              <li>Avoids forced clichés and fake caricature slang.</li>
            </ul>
          </div>

          <div className="space-y-2 retro-card-enter retro-stagger-2">
            <h4 className="font-mono text-sm font-semibold text-[#142850]">
              Session-Only Privacy
            </h4>
            <ul className="space-y-1.5 text-sm text-[#2C3342] list-disc pl-5">
              <li>No account or sign-in required.</li>
              <li>No database or hidden conversation history on our server.</li>
              <li>No third-party analytics capturing your pasted text.</li>
              <li>
                Text is sent over a server-side proxy to Google&apos;s Gemini API solely to generate your
                rewrites, and stays strictly in your active browser session.
              </li>
            </ul>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onReturnToStudio}
            className="retro-btn-primary min-h-[44px] w-full sm:w-auto px-5 text-xs sm:text-sm inline-flex items-center justify-center whitespace-nowrap shrink-0"
          >
            Back to Studio
          </button>
        </div>
      </div>
    </section>
  );
});
