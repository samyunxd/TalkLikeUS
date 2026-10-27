import { useCallback, useRef, useState } from 'react';
import { InfoViews } from './components/InfoViews';
import { ModeResultCard } from './components/ModeResultCard';
import { PixelFlagStamp } from './components/PixelIcons';
import { RetroHeader, type ActiveNavSection } from './components/RetroHeader';
import { TextEditorWindow } from './components/TextEditorWindow';
import { MODE_CONFIGS, ORDERED_MODE_CONFIGS } from './config/modes';
import {
  ClientApiError,
  requestAllTransformations,
  requestSingleRegeneration,
  requestTeachMeExplanations,
} from './services/api';
import {
  VOICE_MODES,
  type ModeTransformation,
  type VoiceMode,
} from './types/transform';
import { SAMPLE_PROMPTS, trimToSafeBoundary } from './utils/textStats';

type ResultsMap = Record<VoiceMode, ModeTransformation>;

function buildResultsMap(results: ModeTransformation[]): ResultsMap {
  const map = {} as ResultsMap;
  for (const mode of VOICE_MODES) {
    const found = results.find((r) => r.mode === mode);
    map[mode] = {
      mode,
      text: found?.text || '',
      explanations: found?.explanations || [],
      toneSummary: found?.toneSummary,
      reusablePattern: found?.reusablePattern,
    };
  }
  return map;
}

export default function App() {
  const [activeSection, setActiveSection] = useState<ActiveNavSection>('home');
  const [inputText, setInputText] = useState<string>('');
  const [submittedSourceText, setSubmittedSourceText] = useState<string>('');
  const [teachMe, setTeachMe] = useState<boolean>(true);
  const [sampleIndex, setSampleIndex] = useState<number>(0);

  const [resultsMap, setResultsMap] = useState<ResultsMap | null>(null);

  const [isTransformingAll, setIsTransformingAll] = useState<boolean>(false);
  const [regeneratingModes, setRegeneratingModes] = useState<Record<VoiceMode, boolean>>({
    natural_american: false,
    casual_slang: false,
    unfiltered_blunt: false,
    badass_confident: false,
  });
  const [isLoadingNotes, setIsLoadingNotes] = useState<boolean>(false);

  const [errorBanner, setErrorBanner] = useState<{
    message: string;
    retryable: boolean;
    retryFn?: () => void;
  } | null>(null);

  const [liveAnnouncement, setLiveAnnouncement] = useState<string>('');

  const transformAbortRef = useRef<AbortController | null>(null);
  const resultsAnchorRef = useRef<HTMLDivElement | null>(null);

  const announce = useCallback((msg: string) => {
    setLiveAnnouncement('');
    window.setTimeout(() => setLiveAnnouncement(msg), 30);
  }, []);

  const isAnyModeRegenerating = Object.values(regeneratingModes).some(Boolean);
  const isAnyBusy = isTransformingAll || isAnyModeRegenerating;

  const executeTransformAll = useCallback(
    async (textToProcess: string, teachMeEnabled: boolean) => {
      const trimmed = textToProcess.trim();
      if (!trimmed) return;

      transformAbortRef.current?.abort();
      const controller = new AbortController();
      transformAbortRef.current = controller;

      setErrorBanner(null);
      setIsTransformingAll(true);
      announce('Generating four American English voices...');

      try {
        const res = await requestAllTransformations({
          text: trimmed,
          teachMe: teachMeEnabled,
          signal: controller.signal,
        });

        setSubmittedSourceText(trimmed);
        setResultsMap(buildResultsMap(res.results));
        announce('All four American voices are ready below.');

        window.setTimeout(() => {
          resultsAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 80);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          announce('Transformation canceled.');
          return;
        }
        const message =
          err instanceof ClientApiError
            ? err.message
            : 'Unable to transform text right now. Please retry.';
        const retryable = err instanceof ClientApiError ? err.retryable : true;
        setErrorBanner({
          message,
          retryable,
          retryFn: () => executeTransformAll(textToProcess, teachMeEnabled),
        });
        announce(`Error: ${message}`);
      } finally {
        if (transformAbortRef.current === controller) {
          setIsTransformingAll(false);
          transformAbortRef.current = null;
        }
      }
    },
    [announce]
  );

  const handleAmericanizeSubmit = () => {
    if (isAnyBusy || !inputText.trim()) return;
    executeTransformAll(inputText, teachMe);
  };

  const handleCancelTransform = () => {
    transformAbortRef.current?.abort();
    setIsTransformingAll(false);
  };

  const executeSingleRegenerate = useCallback(
    async (mode: VoiceMode) => {
      const source = inputText.trim() || submittedSourceText;
      if (!source) return;

      setErrorBanner(null);
      setRegeneratingModes((prev) => ({ ...prev, [mode]: true }));
      const modeTitle = MODE_CONFIGS[mode].title;
      announce(`Regenerating ${modeTitle}...`);

      const previousResult = resultsMap?.[mode]?.text;
      const otherResults: Partial<Record<VoiceMode, string>> = {};
      if (resultsMap) {
        for (const m of VOICE_MODES) {
          if (m !== mode) {
            otherResults[m] = resultsMap[m].text;
          }
        }
      }

      try {
        const res = await requestSingleRegeneration({
          text: source,
          mode,
          teachMe,
          previousResult,
          otherResults,
        });

        setResultsMap((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            [mode]: {
              mode,
              text: res.result.text,
              explanations: res.result.explanations || [],
              toneSummary: res.result.toneSummary,
              reusablePattern: res.result.reusablePattern,
            },
          };
        });
        announce(`${modeTitle} updated with a fresh variation.`);
      } catch (err) {
        const message =
          err instanceof ClientApiError
            ? err.message
            : `Could not regenerate ${modeTitle}. Your existing text was preserved.`;
        const retryable = err instanceof ClientApiError ? err.retryable : true;
        setErrorBanner({
          message,
          retryable,
          retryFn: () => executeSingleRegenerate(mode),
        });
        announce(`Error regenerating ${modeTitle}: ${message}`);
      } finally {
        setRegeneratingModes((prev) => ({ ...prev, [mode]: false }));
      }
    },
    [announce, inputText, resultsMap, submittedSourceText, teachMe]
  );

  const fetchNotesForExistingResults = useCallback(
    async (currentMap: ResultsMap, source: string) => {
      if (!source) return;
      setIsLoadingNotes(true);
      try {
        const res = await requestTeachMeExplanations({
          text: source,
          currentResults: {
            natural_american: currentMap.natural_american.text,
            casual_slang: currentMap.casual_slang.text,
            unfiltered_blunt: currentMap.unfiltered_blunt.text,
            badass_confident: currentMap.badass_confident.text,
          },
        });

        setResultsMap((prev) => {
          if (!prev) return prev;
          const next = { ...prev };
          for (const m of VOICE_MODES) {
            const info = res.explanationsByMode[m];
            if (info) {
              next[m] = {
                ...next[m],
                explanations: info.explanations,
                toneSummary: info.toneSummary,
                reusablePattern: info.reusablePattern,
              };
            }
          }
          return next;
        });
        announce('Teach Me learning notes loaded for all four voices.');
      } catch (err) {
        const message =
          err instanceof ClientApiError
            ? err.message
            : 'Could not load Teach Me notes right now.';
        setErrorBanner({
          message,
          retryable: true,
          retryFn: () => fetchNotesForExistingResults(currentMap, source),
        });
      } finally {
        setIsLoadingNotes(false);
      }
    },
    [announce]
  );

  const handleToggleTeachMe = () => {
    const nextVal = !teachMe;
    setTeachMe(nextVal);
    announce(nextVal ? 'Teach Me mode enabled.' : 'Teach Me mode disabled.');

    if (nextVal && resultsMap) {
      const missingNotes = VOICE_MODES.some(
        (m) => resultsMap[m].explanations.length === 0
      );
      if (missingNotes && !isLoadingNotes) {
        const source = submittedSourceText || inputText.trim();
        fetchNotesForExistingResults(resultsMap, source);
      }
    }
  };

  const handleCycleSample = () => {
    const sample = SAMPLE_PROMPTS[sampleIndex % SAMPLE_PROMPTS.length];
    setSampleIndex((prev) => prev + 1);
    setInputText(sample.text);
    setActiveSection('home');
    announce(`Loaded sample: ${sample.label}`);
  };

  const handleClearInput = () => {
    setInputText('');
    setResultsMap(null);
    setSubmittedSourceText('');
    setErrorBanner(null);
    announce('Text cleared.');
  };

  const handleTrimOversizedInput = () => {
    setInputText((prev) => trimToSafeBoundary(prev));
    setErrorBanner(null);
    announce('Input trimmed cleanly to the nearest paragraph boundary within the studio limit.');
  };

  return (
    <div id="studio" className="min-h-screen flex flex-col">
      {/* Screen-reader live region */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {liveAnnouncement}
      </div>

      {/* Top Navigation Bar */}
      <RetroHeader
        activeSection={activeSection}
        onSelectSection={(sec) => setActiveSection(sec)}
        onCycleSample={handleCycleSample}
      />

      {/* Centered Content Container */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-9 space-y-6">
        {activeSection !== 'home' ? (
          <InfoViews
            section={activeSection}
            onReturnToStudio={() => setActiveSection('home')}
            onLoadSampleAndReturn={(sample) => {
              setInputText(sample);
              setActiveSection('home');
            }}
          />
        ) : (
          <>
            {/* Studio Hero Banner */}
            <section className="text-center space-y-2.5 max-w-2xl mx-auto">
              <div className="inline-flex items-center justify-center gap-2.5 font-mono text-xs text-[#3E3A30]">
                <PixelFlagStamp className="w-7 h-4 shrink-0" />
                <span>TalkLikeUS &middot; American English Voice Lab</span>
              </div>

              <h1
                style={{ textWrap: 'balance' }}
                className="font-mono text-2xl sm:text-4xl font-bold text-[#141B29] tracking-tight leading-tight"
              >
                Say it like you mean it.
              </h1>

              <p
                style={{ textWrap: 'balance' }}
                className="text-sm sm:text-base text-[#2C3342] leading-relaxed"
              >
                Drop your text. Get four American voices. Keep the one that sounds like you.
              </p>
            </section>

            {/* Error Alert Window */}
            {errorBanner && (
              <div
                role="alert"
                className="retro-window !bg-[#FDF0ED] !border-[#B41616] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <p className="font-mono text-xs font-bold text-[#8F1111]">
                    Transformation Notice
                  </p>
                  <p className="text-sm text-[#4A0B0B] leading-relaxed">
                    {errorBanner.message}
                  </p>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  {errorBanner.retryable && errorBanner.retryFn && (
                    <button
                      type="button"
                      onClick={() => errorBanner.retryFn?.()}
                      className="retro-btn px-3.5 py-2 text-xs font-semibold whitespace-nowrap shrink-0"
                    >
                      Retry
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setErrorBanner(null)}
                    className="retro-btn px-3 py-2 text-xs font-semibold whitespace-nowrap shrink-0"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            {/* Main Studio Text Editor */}
            <TextEditorWindow
              inputText={inputText}
              onChangeText={setInputText}
              teachMe={teachMe}
              onToggleTeachMe={handleToggleTeachMe}
              isTransformingAll={isTransformingAll}
              isAnyBusy={isAnyBusy}
              onSubmitTransform={handleAmericanizeSubmit}
              onCancelTransform={handleCancelTransform}
              onClearText={handleClearInput}
              onTrimToLimit={handleTrimOversizedInput}
            />

            {/* Compact Top-to-Bottom Results Section (No Intermediate Banner Box) */}
            {resultsMap && (
              <section
                ref={resultsAnchorRef}
                aria-label="Generated American English voices"
                className="retro-window divide-y-2 divide-[#141B29]"
              >
                {ORDERED_MODE_CONFIGS.map((cfg) => (
                  <ModeResultCard
                    key={cfg.id}
                    config={cfg}
                    data={resultsMap[cfg.id]}
                    teachMe={teachMe}
                    isRegenerating={regeneratingModes[cfg.id]}
                    isAnyTransformAllRunning={isTransformingAll}
                    isLoadingNotes={isLoadingNotes}
                    onRegenerate={() => executeSingleRegenerate(cfg.id)}
                    onRequestNotes={() =>
                      fetchNotesForExistingResults(
                        resultsMap,
                        submittedSourceText || inputText.trim()
                      )
                    }
                    onAnnounce={announce}
                  />
                ))}
              </section>
            )}
          </>
        )}
      </main>

      {/* Quiet Authentic 1990s Footer */}
      <footer className="w-full border-t-2 border-[#141B29] bg-[#E5E0D0] mt-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 font-mono text-xs text-[#3E3A30]">
          <span>
            <strong className="text-[#141B29]">TalkLikeUS</strong> &middot; Same idea. Four American voices.
          </span>
          <div className="flex flex-wrap items-center gap-4">
            <a
              href="#how"
              onClick={(e) => {
                e.preventDefault();
                setActiveSection('how');
              }}
              className="retro-link whitespace-nowrap shrink-0"
            >
              How It Works
            </a>
            <a
              href="#voices"
              onClick={(e) => {
                e.preventDefault();
                setActiveSection('voices');
              }}
              className="retro-link whitespace-nowrap shrink-0"
            >
              Voice Guide
            </a>
            <a
              href="#about"
              onClick={(e) => {
                e.preventDefault();
                setActiveSection('about');
              }}
              className="retro-link whitespace-nowrap shrink-0"
            >
              Privacy &amp; About
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
