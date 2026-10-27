import { ORDERED_MODE_CONFIGS } from '../config/modes';
import { PixelFlagStamp, PixelModeIcon } from './PixelIcons';
import type { ActiveNavSection } from './RetroHeader';

interface InfoViewsProps {
  section: Exclude<ActiveNavSection, 'home'>;
  onReturnToStudio: () => void;
  onLoadSampleAndReturn: (sampleText: string) => void;
}

export function InfoViews({
  section,
  onReturnToStudio,
  onLoadSampleAndReturn,
}: InfoViewsProps) {
  if (section === 'how') {
    return (
      <section aria-labelledby="how-heading" className="retro-window">
        <div className="bg-[#142850] text-[#F7F5EC] px-4 py-2.5 flex items-center justify-between gap-3 border-b-2 border-[#141B29]">
          <h2 id="how-heading" className="font-pixel text-xs sm:text-sm tracking-wide">
            How TalkLikeUS Works
          </h2>
          <button
            type="button"
            onClick={onReturnToStudio}
            className="retro-btn px-3 py-1 text-xs font-semibold whitespace-nowrap shrink-0"
          >
            Back to Studio
          </button>
        </div>

        <div className="p-5 sm:p-7 space-y-6 text-[#141B29]">
          <div className="space-y-2">
            <h3 className="font-pixel text-base sm:text-lg text-[#142850]">
              Same idea. Four American voices. Your words, upgraded.
            </h3>
            <p className="text-sm sm:text-base leading-relaxed text-[#252D3D]">
              Conventional grammar tools flatten your personality into stiff textbook English. TalkLikeUS
              preserves every fact, opinion, and nuance in your message while rewriting how it sounds across
              four distinct contemporary American registers.
            </p>
          </div>

          <ol className="space-y-4 border-t border-b border-dashed border-[#ABA48E] py-5">
            <li className="space-y-1">
              <p className="font-mono text-sm font-semibold text-[#142850]">
                Step 01. Drop Your Text (Short or 500+ Words)
              </p>
              <p className="text-sm leading-relaxed text-[#2C3342]">
                Paste a quick reply, a frustrated vent, a Slack message, or a multi-paragraph email up to
                20,000 characters. Long inputs are split cleanly along paragraph boundaries so nothing gets
                summarized away.
              </p>
            </li>
            <li className="space-y-1">
              <p className="font-mono text-sm font-semibold text-[#142850]">
                Step 02. Compare All Four Voices Side by Side
              </p>
              <p className="text-sm leading-relaxed text-[#2C3342]">
                One click generates Natural American, Casual &amp; Slang, Unfiltered &amp; Blunt, and Badass
                &amp; Confident simultaneously—each with its own rhythm, vocabulary, and directness.
              </p>
            </li>
            <li className="space-y-1">
              <p className="font-mono text-sm font-semibold text-[#142850]">
                Step 03. Edit, Regenerate One Card, or Turn On &ldquo;Teach Me&rdquo;
              </p>
              <p className="text-sm leading-relaxed text-[#2C3342]">
                Every output window is a live text editor. Tweak a phrase before copying, regenerate just one
                mode without touching the other three, or toggle Teach Me to inspect idioms, contractions,
                register warnings, and reusable sentence patterns.
              </p>
            </li>
          </ol>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <button
              type="button"
              onClick={() =>
                onLoadSampleAndReturn(
                  "I don't know what to say because this happened so suddenly."
                )
              }
              className="retro-link font-mono text-xs sm:text-sm font-semibold"
            >
              Load quick example in Studio &rarr;
            </button>
            <button
              type="button"
              onClick={onReturnToStudio}
              className="retro-btn-primary px-5 py-2 text-xs sm:text-sm whitespace-nowrap shrink-0"
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
      <section aria-labelledby="voices-heading" className="retro-window">
        <div className="bg-[#142850] text-[#F7F5EC] px-4 py-2.5 flex items-center justify-between gap-3 border-b-2 border-[#141B29]">
          <h2 id="voices-heading" className="font-pixel text-xs sm:text-sm tracking-wide">
            The Four American Voice Profiles
          </h2>
          <button
            type="button"
            onClick={onReturnToStudio}
            className="retro-btn px-3 py-1 text-xs font-semibold whitespace-nowrap shrink-0"
          >
            Back to Studio
          </button>
        </div>

        <div className="p-5 sm:p-7 space-y-5">
          <p className="text-sm sm:text-base text-[#252D3D] leading-relaxed">
            Each mode uses a dedicated linguistic strategy so you never get four near-identical rewrites
            with a single swapped adjective:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ORDERED_MODE_CONFIGS.map((cfg) => (
              <div key={cfg.id} className="bg-[#ECE8D9] border-2 border-[#141B29] p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <div className={`${cfg.headerBgClass} p-1.5 border border-[#141B29]`}>
                    <PixelModeIcon mode={cfg.id} className="w-4 h-4" />
                  </div>
                  <h3 className="font-pixel text-xs sm:text-sm text-[#141B29]">
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
              className="retro-btn-primary px-5 py-2 text-xs sm:text-sm whitespace-nowrap shrink-0"
            >
              Try Your Own Text
            </button>
          </div>
        </div>
      </section>
    );
  }

  // section === 'about'
  return (
    <section aria-labelledby="about-heading" className="retro-window">
      <div className="bg-[#142850] text-[#F7F5EC] px-4 py-2.5 flex items-center justify-between gap-3 border-b-2 border-[#141B29]">
        <h2 id="about-heading" className="font-pixel text-xs sm:text-sm tracking-wide">
          About TalkLikeUS &amp; Privacy Principles
        </h2>
        <button
          type="button"
          onClick={onReturnToStudio}
          className="retro-btn px-3 py-1 text-xs font-semibold whitespace-nowrap shrink-0"
        >
          Back to Studio
        </button>
      </div>

      <div className="p-5 sm:p-7 space-y-6 text-[#141B29]">
        <div className="flex items-start gap-4">
          <PixelFlagStamp className="w-12 h-8 shrink-0 mt-1" />
          <div className="space-y-2">
            <h3 className="font-pixel text-base sm:text-lg text-[#142850]">
              Built for Expressive, Human English
            </h3>
            <p className="text-sm sm:text-base leading-relaxed text-[#252D3D]">
              Non-native speakers often know all the grammar rules yet feel boxed in when trying to sound
              warm, casual, blunt, or self-assured in American English. TalkLikeUS bridges the gap between
              textbook accuracy and how people actually speak.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 border-t border-b border-dashed border-[#ABA48E] py-5">
          <div className="space-y-2">
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

          <div className="space-y-2">
            <h4 className="font-mono text-sm font-semibold text-[#142850]">
              Session-Only Privacy
            </h4>
            <ul className="space-y-1.5 text-sm text-[#2C3342] list-disc pl-5">
              <li>No account or sign-in required.</li>
              <li>No database or hidden conversation history on our server.</li>
              <li>No third-party analytics capturing your pasted text.</li>
              <li>
                Text is sent over a server-side proxy to Google&apos;s Gemini API solely to generate your
                rewrites, and Reset Studio wipes your workspace immediately.
              </li>
            </ul>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onReturnToStudio}
            className="retro-btn-primary px-5 py-2 text-xs sm:text-sm whitespace-nowrap shrink-0"
          >
            Back to Studio
          </button>
        </div>
      </div>
    </section>
  );
}
