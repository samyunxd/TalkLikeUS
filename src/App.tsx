import { useCallback, useRef, useState } from 'react';
import { InfoViews } from './components/InfoViews';
import { ModeResultCard } from './components/ModeResultCard';
import { PixelChatModeIcon, PixelFlagStamp, PixelModeIcon } from './components/PixelIcons';
import { RetroHeader, type ActiveNavSection } from './components/RetroHeader';
import { TextEditorWindow } from './components/TextEditorWindow';
import { ORDERED_MODE_CONFIGS } from './config/modes';
import {
  ClientApiError,
  requestAllTransformations,
  requestTeachMeExplanations,
} from './services/api';
import {
  VOICE_MODES,
  type ModeTransformation,
  type VoiceMode,
} from './types/transform';
import { SAMPLE_PROMPTS, trimToSafeBoundary } from './utils/textStats';

type ResultsMap = Record<VoiceMode, ModeTransformation>;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

function buildResultsMap(results: ModeTransformation[], chatMode: boolean): ResultsMap {
  const map = {} as ResultsMap;
  for (const mode of VOICE_MODES) {
    const found = results.find((r) => r.mode === mode);
    const cleanText = found?.text || '';
    map[mode] = {
      mode,
      text: cleanText,
      generatedText: cleanText,
      isEdited: false,
      explanations: found?.explanations || [],
      toneSummary: found?.toneSummary,
      reusablePattern: found?.reusablePattern,
      chatMode: found?.chatMode ?? chatMode,
    };
  }
  return map;
}

export default function App() {
  const [activeSection, setActiveSection] = useState<ActiveNavSection>('home');

  const [inputText, setInputText] = useState<string>('');
  const [submittedSourceText, setSubmittedSourceText] = useState<string>('');
  const [teachMe, setTeachMe] = useState<boolean>(true);
  const [chatModeEnabled, setChatModeEnabled] = useState<boolean>(false);

  const [resultsMap, setResultsMap] = useState<ResultsMap | null>(null);
  const [resultsBatchChatMode, setResultsBatchChatMode] = useState<boolean>(false);

  const [isTransformingAll, setIsTransformingAll] = useState<boolean>(false);
  const [isLoadingNotes, setIsLoadingNotes] = useState<boolean>(false);

  const [errorBanner, setErrorBanner] = useState<{
    message: string;
    retryable: boolean;
    retryFn?: () => void;
  } | null>(null);

  const [liveAnnouncement, setLiveAnnouncement] = useState<string>('');

  const transformAbortRef = useRef<AbortController | null>(null);
  const inFlightLockRef = useRef<boolean>(false);
  const inFlightNotesRef = useRef<boolean>(false);
  const sampleIndexRef = useRef<number>(0);
  const resultsAnchorRef = useRef<HTMLDivElement | null>(null);

  const isAnyBusy = isTransformingAll;

  // Latest state snapshot ref so memoized child callbacks stay referentially stable across keystrokes
  const latestRef = useRef({
    inputText,
    submittedSourceText,
    teachMe,
    chatModeEnabled,
    resultsMap,
    isAnyBusy,
  });
  latestRef.current = {
    inputText,
    submittedSourceText,
    teachMe,
    chatModeEnabled,
    resultsMap,
    isAnyBusy,
  };

  const announce = useCallback((msg: string) => {
    setLiveAnnouncement('');
    window.setTimeout(() => setLiveAnnouncement(msg), 30);
  }, []);

  const executeTransformAll = useCallback(
    async (textToProcess: string, teachMeOn: boolean, chatModeOn: boolean) => {
      const trimmed = textToProcess.trim();
      if (!trimmed || inFlightLockRef.current) return;

      inFlightLockRef.current = true;
      transformAbortRef.current?.abort();
      const controller = new AbortController();
      transformAbortRef.current = controller;

      setErrorBanner(null);
      setIsTransformingAll(true);
      announce(
        chatModeOn
          ? 'Generating four concise American chat voices...'
          : 'Generating four American English voices...'
      );

      try {
        const res = await requestAllTransformations({
          text: trimmed,
          teachMe: teachMeOn,
          chatMode: chatModeOn,
          signal: controller.signal,
        });

        setSubmittedSourceText(trimmed);
        setResultsMap(buildResultsMap(res.results, chatModeOn));
        setResultsBatchChatMode(chatModeOn);
        announce('All four American voices are ready.');

        window.setTimeout(() => {
          const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
          resultsAnchorRef.current?.scrollIntoView({
            behavior: prefersReducedMotion() ? 'auto' : 'smooth',
            block: isMobile ? 'start' : 'nearest',
          });
        }, 60);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }
        const message =
          err instanceof ClientApiError
            ? err.message
            : 'Unable to transform text right now. Your original text is safe—please retry.';
        const retryable = err instanceof ClientApiError ? err.retryable : true;
        setErrorBanner({
          message,
          retryable,
          retryFn: () => executeTransformAll(textToProcess, teachMeOn, chatModeOn),
        });
        announce(`Error: ${message}`);
      } finally {
        inFlightLockRef.current = false;
        if (transformAbortRef.current === controller) {
          setIsTransformingAll(false);
          transformAbortRef.current = null;
        }
      }
    },
    [announce]
  );

  const handleAmericanizeSubmit = useCallback(() => {
    const {
      inputText: txt,
      teachMe: tm,
      chatModeEnabled: cm,
      isAnyBusy: busy,
    } = latestRef.current;
    if (busy || inFlightLockRef.current || !txt.trim()) return;
    void executeTransformAll(txt, tm, cm);
  }, [executeTransformAll]);

  const handleClearText = useCallback(() => {
    if (latestRef.current.isAnyBusy) return;
    setInputText('');
    setErrorBanner(null);
    announce('Cleared text editor.');
  }, [announce]);

  const fetchNotesForExistingResults = useCallback(
    async (currentMap: ResultsMap, source: string, isChat: boolean) => {
      if (!source || inFlightNotesRef.current) return;
      inFlightNotesRef.current = true;
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
          chatMode: isChat,
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
          retryFn: () => {
            void fetchNotesForExistingResults(currentMap, source, isChat);
          },
        });
      } finally {
        inFlightNotesRef.current = false;
        setIsLoadingNotes(false);
      }
    },
    [announce]
  );

  const handleToggleTeachMe = useCallback(() => {
    const {
      teachMe: prevTeachMe,
      resultsMap: currentMap,
      submittedSourceText: currentSubmitted,
      inputText: currentInput,
    } = latestRef.current;
    const nextVal = !prevTeachMe;
    setTeachMe(nextVal);
    announce(nextVal ? 'Teach Me enabled.' : 'Teach Me disabled.');

    if (nextVal && currentMap && !inFlightNotesRef.current) {
      const missingNotes = VOICE_MODES.some(
        (m) => currentMap[m].explanations.length === 0 && !currentMap[m].toneSummary
      );
      if (missingNotes) {
        const source = currentSubmitted || currentInput.trim();
        const anyChat = VOICE_MODES.some((m) => Boolean(currentMap[m].chatMode));
        void fetchNotesForExistingResults(currentMap, source, anyChat);
      }
    }
  }, [announce, fetchNotesForExistingResults]);

  const handleToggleChatMode = useCallback(() => {
    const nextVal = !latestRef.current.chatModeEnabled;
    setChatModeEnabled(nextVal);
    announce(
      nextVal
        ? 'Chat Mode ON. Applies to your next generation.'
        : 'Chat Mode OFF. Applies to your next generation.'
    );
  }, [announce]);

  const handleLoadSampleText = useCallback(
    (sampleText: string, label?: string) => {
      setInputText(sampleText);
      setActiveSection('home');
      if (label) {
        announce(`Loaded sample: ${label}`);
      }
    },
    [announce]
  );

  const handleCycleSample = useCallback(() => {
    const idx = sampleIndexRef.current;
    const sample = SAMPLE_PROMPTS[idx % SAMPLE_PROMPTS.length];
    sampleIndexRef.current = idx + 1;
    handleLoadSampleText(sample.text, sample.label);
  }, [handleLoadSampleText]);

  const handleSelectSection = useCallback((section: ActiveNavSection) => {
    setActiveSection((prev) => {
      if (prev === section) return prev;
      if (typeof window !== 'undefined' && window.scrollY > 0) {
        window.scrollTo({ top: 0, behavior: 'auto' });
      }
      return section;
    });
  }, []);

  const handleReturnToStudio = useCallback(() => {
    handleSelectSection('home');
  }, [handleSelectSection]);

  const handleLoadSampleFromInfo = useCallback(
    (sampleText: string) => {
      if (typeof window !== 'undefined' && window.scrollY > 0) {
        window.scrollTo({ top: 0, behavior: 'auto' });
      }
      handleLoadSampleText(sampleText, 'Quick example');
    },
    [handleLoadSampleText]
  );

  const handleTrimOversizedInput = useCallback(() => {
    setInputText((prev) => trimToSafeBoundary(prev));
    setErrorBanner(null);
    announce('Input trimmed cleanly to the nearest paragraph boundary within the studio limit.');
  }, [announce]);

  const allDisplayedAreChat = resultsMap
    ? VOICE_MODES.every((m) => Boolean(resultsMap[m].chatMode))
    : false;
  const anyDisplayedAreChat = resultsMap
    ? VOICE_MODES.some((m) => Boolean(resultsMap[m].chatMode))
    : false;
  const hasPendingChatModeDiff =
    resultsMap !== null &&
    (chatModeEnabled !== resultsBatchChatMode ||
      allDisplayedAreChat !== anyDisplayedAreChat);

  const showResultsStatusStrip =
    resultsMap !== null && (anyDisplayedAreChat || chatModeEnabled || hasPendingChatModeDiff);

  return (
    <div id="studio" className="min-h-screen min-h-dvh flex flex-col">
      {/* Screen-reader live region */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {liveAnnouncement}
      </div>

      {/* Top Navigation Bar */}
      <RetroHeader
        activeSection={activeSection}
        onSelectSection={handleSelectSection}
        onCycleSample={handleCycleSample}
      />

      {/* Responsive Studio Content Container */}
      <main className="flex-1 w-full max-w-4xl mx-auto safe-area-x py-3 md:py-8 min-w-0">
        <div
          key={activeSection}
          className="retro-view-fade space-y-3 md:space-y-6 min-w-0"
        >
          {activeSection !== 'home' ? (
            <InfoViews
              section={activeSection}
              onReturnToStudio={handleReturnToStudio}
              onLoadSampleAndReturn={handleLoadSampleFromInfo}
            />
          ) : (
            <>
              {/* Studio Hero Banner — Minimal 1-line prompt on mobile, full editorial header on desktop */}
              <section className="text-center space-y-1 md:space-y-2.5 max-w-2xl mx-auto">
                <div className="hidden md:inline-flex items-center justify-center gap-2.5 font-mono text-xs text-[#3E3A30]">
                  <PixelFlagStamp className="w-7 h-4 shrink-0" />
                  <span>TalkLikeUS &middot; American English Voice Lab</span>
                </div>

                <h1 className="font-mono text-lg min-[375px]:text-xl md:text-4xl font-bold text-[#141B29] tracking-tight leading-tight text-balance">
                  Say it like you mean it.
                </h1>

                <p className="hidden md:block text-base text-[#2C3342] leading-relaxed text-balance">
                  Drop your text. Get four American voices. Keep the one that sounds like you.
                </p>
              </section>

              {/* Error Alert Window */}
              {errorBanner && (
                <div
                  role="alert"
                  className="retro-window !bg-[#FDF0ED] !border-[#B41616] p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4"
                >
                  <div className="space-y-1 min-w-0">
                    <p className="font-mono text-xs font-bold text-[#8F1111]">
                      Transformation Notice
                    </p>
                    <p className="text-sm text-[#4A0B0B] leading-relaxed break-words">
                      {errorBanner.message}
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    {errorBanner.retryable && errorBanner.retryFn && (
                      <button
                        type="button"
                        onClick={() => errorBanner.retryFn?.()}
                        className="retro-btn min-h-[44px] px-4 text-xs font-semibold inline-flex items-center justify-center whitespace-nowrap"
                      >
                        Retry
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setErrorBanner(null)}
                      className="retro-btn min-h-[44px] px-3.5 text-xs font-semibold inline-flex items-center justify-center whitespace-nowrap"
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
                onLoadSampleText={handleLoadSampleText}
                onClearText={handleClearText}
                teachMe={teachMe}
                onToggleTeachMe={handleToggleTeachMe}
                chatModeEnabled={chatModeEnabled}
                onToggleChatMode={handleToggleChatMode}
                isTransformingAll={isTransformingAll}
                isAnyBusy={isAnyBusy}
                onSubmitTransform={handleAmericanizeSubmit}
                onTrimToLimit={handleTrimOversizedInput}
              />

              {/* Calm Shimmer Preview on First Generation (zero slide/shake) */}
              {isTransformingAll && !resultsMap && (
                <section
                  ref={resultsAnchorRef}
                  aria-label="Generating American English voices"
                  aria-busy="true"
                  className="retro-window retro-view-fade divide-y-2 divide-[#141B29] min-w-0"
                >
                  {ORDERED_MODE_CONFIGS.map((cfg) => (
                    <div
                      key={cfg.id}
                      className="px-3 min-[375px]:px-3.5 py-3 md:px-5 md:py-4 bg-[#F4F1E6] space-y-2 min-w-0"
                    >
                      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                        <span
                          className={`${cfg.headerBgClass} p-1 border border-[#141B29] inline-flex items-center justify-center shrink-0`}
                        >
                          <PixelModeIcon mode={cfg.id} className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        </span>
                        <h3 className="font-mono text-xs min-[375px]:text-sm md:text-base font-bold text-[#141B29] truncate">
                          {cfg.number}. {cfg.title}
                        </h3>
                      </div>

                      <div
                        aria-hidden="true"
                        className="retro-well retro-shimmer-surface px-3 md:px-3.5 py-3 md:py-3.5 space-y-2"
                      >
                        <div className="h-3.5 w-11/12 bg-[#E8E4D5]" />
                        <div className="h-3.5 w-3/4 bg-[#EFECE0]" />
                      </div>
                    </div>
                  ))}
                </section>
              )}

              {/* Vertical List of Four Result Cards — Stable keys prevent DOM remount jitter */}
              {resultsMap && (
                <section
                  ref={resultsAnchorRef}
                  aria-label="Generated American English voices"
                  className="retro-window retro-view-fade divide-y-2 divide-[#141B29] min-w-0"
                >
                  {showResultsStatusStrip && (
                    <div className="hidden md:flex px-5 py-2.5 bg-[#E6E2D2] items-center justify-between gap-3 font-mono text-xs min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-[#141B29] min-w-0">
                        <PixelChatModeIcon className="w-4 h-4 shrink-0" />
                        {allDisplayedAreChat ? (
                          <span className="font-bold text-[#15603A]">CHAT MODE ENABLED</span>
                        ) : anyDisplayedAreChat ? (
                          <span className="font-semibold text-[#142850]">
                            MIXED MODE RESULTS (Chat rows marked)
                          </span>
                        ) : (
                          <span className="font-semibold text-[#3E3A30]">
                            CURRENT RESULTS: STANDARD MODE
                          </span>
                        )}

                        {hasPendingChatModeDiff && (
                          <>
                            <span aria-hidden="true" className="text-[#8E8772]">
                              &middot;
                            </span>
                            <span className="text-[#2C3342]">
                              <strong>CHAT MODE: {chatModeEnabled ? 'ON' : 'OFF'}</strong> applies next
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {ORDERED_MODE_CONFIGS.map((cfg) => (
                    <ModeResultCard
                      key={cfg.id}
                      config={cfg}
                      data={resultsMap[cfg.id]}
                      teachMe={teachMe}
                      isAnyTransformAllRunning={isTransformingAll}
                      isLoadingNotes={isLoadingNotes}
                      onAnnounce={announce}
                    />
                  ))}
                </section>
              )}
            </>
          )}
        </div>
      </main>

      {/* Quiet Authentic 1990s Footer */}
      <footer className="w-full border-t-2 border-[#141B29] bg-[#E5E0D0] mt-5 md:mt-10">
        <div className="max-w-4xl mx-auto safe-area-x py-1.5 md:py-3 flex items-center justify-center md:justify-between gap-3 font-mono text-[11px] md:text-xs text-[#3E3A30]">
          <span className="hidden md:inline">
            <strong className="text-[#141B29]">TalkLikeUS</strong> &middot; Same idea. Four American voices.
          </span>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-0">
            <a
              href="#how"
              onClick={(e) => {
                e.preventDefault();
                handleSelectSection('how');
              }}
              className="retro-link min-h-[44px] inline-flex items-center whitespace-nowrap shrink-0"
            >
              How It Works
            </a>
            <a
              href="#voices"
              onClick={(e) => {
                e.preventDefault();
                handleSelectSection('voices');
              }}
              className="retro-link min-h-[44px] inline-flex items-center whitespace-nowrap shrink-0"
            >
              Voice Guide
            </a>
            <a
              href="#about"
              onClick={(e) => {
                e.preventDefault();
                handleSelectSection('about');
              }}
              className="retro-link min-h-[44px] inline-flex items-center whitespace-nowrap shrink-0"
            >
              <span className="md:hidden">About</span>
              <span className="hidden md:inline">Privacy &amp; About</span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
