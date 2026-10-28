import { useCallback, useEffect, useRef, useState } from 'react';
import { InfoViews } from './components/InfoViews';
import { ModeResultCard } from './components/ModeResultCard';
import { PixelChatModeIcon, PixelFlagStamp } from './components/PixelIcons';
import { RetroHeader, type ActiveNavSection } from './components/RetroHeader';
import { TextEditorWindow } from './components/TextEditorWindow';
import type { MobilePrimaryTab } from './components/mobile/MobileBottomNav';
import { MobileCommunicatorShell } from './components/mobile/MobileCommunicatorShell';
import type { MobileDrawerPage } from './components/mobile/MobileTopBar';
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

const EMPTY_EDIT_DRAFTS: Record<VoiceMode, string | null> = {
  natural_american: null,
  casual_slang: null,
  unfiltered_blunt: null,
  badass_confident: null,
};

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

function detectMobileShellViewport(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(max-width: 767px)').matches;
}

export default function App() {
  const [isMobileShell, setIsMobileShell] = useState<boolean>(detectMobileShellViewport);

  // Desktop navigation state
  const [activeDesktopSection, setActiveDesktopSection] = useState<ActiveNavSection>('home');

  // Dedicated mobile app navigation state
  const [mobileTab, setMobileTab] = useState<MobilePrimaryTab>('write');
  const [mobileDrawerPage, setMobileDrawerPage] = useState<MobileDrawerPage>(null);

  // Shared core application state (consistent across mobile & desktop)
  const [inputText, setInputText] = useState<string>('');
  const [submittedSourceText, setSubmittedSourceText] = useState<string>('');
  const [teachMe, setTeachMe] = useState<boolean>(true);
  const [chatModeEnabled, setChatModeEnabled] = useState<boolean>(false);
  const [sampleIndex, setSampleIndex] = useState<number>(0);

  const [resultsMap, setResultsMap] = useState<ResultsMap | null>(null);
  const [resultsBatchChatMode, setResultsBatchChatMode] = useState<boolean>(false);
  const [editingDrafts, setEditingDrafts] =
    useState<Record<VoiceMode, string | null>>(EMPTY_EDIT_DRAFTS);
  const [pendingReplaceAllAction, setPendingReplaceAllAction] = useState<(() => void) | null>(null);

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
  const inFlightLockRef = useRef<boolean>(false);
  const inFlightModesRef = useRef<Record<VoiceMode, boolean>>({
    natural_american: false,
    casual_slang: false,
    unfiltered_blunt: false,
    badass_confident: false,
  });
  const resultsAnchorRef = useRef<HTMLDivElement | null>(null);

  // Switch cleanly between the dedicated 90s Mobile Communicator Shell (<768px) and Desktop Studio (>=768px)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 767px)');
    const handleChange = () => setIsMobileShell(mq.matches);
    handleChange();
    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, []);

  const announce = useCallback((msg: string) => {
    setLiveAnnouncement('');
    window.setTimeout(() => setLiveAnnouncement(msg), 30);
  }, []);

  const isAnyModeRegenerating = Object.values(regeneratingModes).some(Boolean);
  const isAnyBusy = isTransformingAll || isAnyModeRegenerating;

  const hasAnyManualEdits = resultsMap
    ? VOICE_MODES.some(
        (m) => Boolean(resultsMap[m].isEdited) || editingDrafts[m] !== null
      )
    : false;

  const executeTransformAll = useCallback(
    async (textToProcess: string, teachMeOn: boolean, chatModeOn: boolean) => {
      const trimmed = textToProcess.trim();
      if (!trimmed || inFlightLockRef.current) return;

      inFlightLockRef.current = true;
      transformAbortRef.current?.abort();
      const controller = new AbortController();
      transformAbortRef.current = controller;

      setPendingReplaceAllAction(null);
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
        setEditingDrafts(EMPTY_EDIT_DRAFTS);
        setResultsBatchChatMode(chatModeOn);
        announce('All four American voices are ready.');

        // On mobile app shell, navigate straight to YOUR FOUR VOICES results view
        if (typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches) {
          setMobileDrawerPage(null);
          setMobileTab('results');
          window.scrollTo({ top: 0, behavior: 'auto' });
        } else {
          window.setTimeout(() => {
            resultsAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }, 80);
        }
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

  const requestBatchTransformWithEditGuard = useCallback(
    (textToProcess: string, teachMeOn: boolean, chatModeOn: boolean) => {
      if (isAnyBusy || inFlightLockRef.current || !textToProcess.trim()) return;
      if (hasAnyManualEdits) {
        setPendingReplaceAllAction(() => () => {
          void executeTransformAll(textToProcess, teachMeOn, chatModeOn);
        });
        announce('Manual edits detected. Confirm Replace All or Keep Edits.');
        return;
      }
      void executeTransformAll(textToProcess, teachMeOn, chatModeOn);
    },
    [announce, executeTransformAll, hasAnyManualEdits, isAnyBusy]
  );

  const handleAmericanizeSubmit = () => {
    requestBatchTransformWithEditGuard(inputText, teachMe, chatModeEnabled);
  };

  const handleClearText = () => {
    if (isAnyBusy) return;
    setInputText('');
    setErrorBanner(null);
    setPendingReplaceAllAction(null);
    announce('Cleared text editor.');
  };

  const handleClearWorkspace = () => {
    if (isAnyBusy) return;
    setInputText('');
    setSubmittedSourceText('');
    setResultsMap(null);
    setEditingDrafts(EMPTY_EDIT_DRAFTS);
    setErrorBanner(null);
    setPendingReplaceAllAction(null);
    setMobileDrawerPage(null);
    setMobileTab('write');
    announce('Workspace cleared.');
  };

  // Desktop live edit handler
  const handleUpdateModeTextLive = useCallback((mode: VoiceMode, nextText: string) => {
    setResultsMap((prev) => {
      if (!prev) return prev;
      const current = prev[mode];
      const baseGenerated = current.generatedText ?? current.text;
      return {
        ...prev,
        [mode]: {
          ...current,
          text: nextText,
          generatedText: baseGenerated,
          isEdited: nextText.trim() !== baseGenerated.trim(),
        },
      };
    });
  }, []);

  // Mobile draft-based SAVE CHANGES handlers (persisted across tab navigation)
  const handleStartMobileEdit = useCallback(
    (mode: VoiceMode) => {
      if (!resultsMap) return;
      setEditingDrafts((prev) => ({
        ...prev,
        [mode]: prev[mode] ?? resultsMap[mode].text,
      }));
    },
    [resultsMap]
  );

  const handleChangeMobileEditDraft = useCallback((mode: VoiceMode, draft: string) => {
    setEditingDrafts((prev) => ({
      ...prev,
      [mode]: draft,
    }));
  }, []);

  const handleSaveMobileEdit = useCallback(
    (mode: VoiceMode) => {
      const draft = editingDrafts[mode];
      if (draft === null) return;
      handleUpdateModeTextLive(mode, draft);
      setEditingDrafts((prev) => ({
        ...prev,
        [mode]: null,
      }));
    },
    [editingDrafts, handleUpdateModeTextLive]
  );

  const handleCancelMobileEdit = useCallback((mode: VoiceMode) => {
    setEditingDrafts((prev) => ({
      ...prev,
      [mode]: null,
    }));
  }, []);

  const handleResetModeEdit = useCallback((mode: VoiceMode) => {
    setResultsMap((prev) => {
      if (!prev) return prev;
      const current = prev[mode];
      const restored = current.generatedText ?? current.text;
      return {
        ...prev,
        [mode]: {
          ...current,
          text: restored,
          generatedText: restored,
          isEdited: false,
        },
      };
    });
    setEditingDrafts((prev) => ({
      ...prev,
      [mode]: null,
    }));
  }, []);

  const executeSingleRegenerate = useCallback(
    async (mode: VoiceMode) => {
      const source = inputText.trim() || submittedSourceText;
      if (!source || inFlightModesRef.current[mode] || inFlightLockRef.current) return;

      inFlightModesRef.current[mode] = true;
      setErrorBanner(null);
      setEditingDrafts((prev) => ({ ...prev, [mode]: null }));
      setRegeneratingModes((prev) => ({ ...prev, [mode]: true }));
      const modeTitle = MODE_CONFIGS[mode].title;
      announce(
        chatModeEnabled
          ? `Regenerating ${modeTitle} with Chat Mode...`
          : `Regenerating ${modeTitle}...`
      );

      const previousResult = resultsMap?.[mode]?.generatedText || resultsMap?.[mode]?.text;
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
          chatMode: chatModeEnabled,
          previousResult,
          otherResults,
        });

        setResultsMap((prev) => {
          if (!prev) return prev;
          const freshText = res.result.text;
          const next = {
            ...prev,
            [mode]: {
              mode,
              text: freshText,
              generatedText: freshText,
              isEdited: false,
              explanations: res.result.explanations || [],
              toneSummary: res.result.toneSummary,
              reusablePattern: res.result.reusablePattern,
              chatMode: res.result.chatMode ?? chatModeEnabled,
            },
          };
          const allMatchCurrentToggle = VOICE_MODES.every(
            (m) => Boolean(next[m].chatMode) === chatModeEnabled
          );
          if (allMatchCurrentToggle) {
            setResultsBatchChatMode(chatModeEnabled);
          }
          return next;
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
        inFlightModesRef.current[mode] = false;
        setRegeneratingModes((prev) => ({ ...prev, [mode]: false }));
      }
    },
    [announce, chatModeEnabled, inputText, resultsMap, submittedSourceText, teachMe]
  );

  const fetchNotesForExistingResults = useCallback(
    async (currentMap: ResultsMap, source: string, isChat: boolean) => {
      if (!source || isLoadingNotes) return;
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
          retryFn: () => fetchNotesForExistingResults(currentMap, source, isChat),
        });
      } finally {
        setIsLoadingNotes(false);
      }
    },
    [announce, isLoadingNotes]
  );

  const handleToggleTeachMe = () => {
    const nextVal = !teachMe;
    setTeachMe(nextVal);
    announce(nextVal ? 'Teach Me enabled.' : 'Teach Me disabled.');

    if (nextVal && resultsMap) {
      const missingNotes = VOICE_MODES.some(
        (m) => resultsMap[m].explanations.length === 0
      );
      if (missingNotes && !isLoadingNotes) {
        const source = submittedSourceText || inputText.trim();
        const anyChat = VOICE_MODES.some((m) => Boolean(resultsMap[m].chatMode));
        void fetchNotesForExistingResults(resultsMap, source, anyChat);
      }
    }
  };

  const handleToggleChatMode = () => {
    const nextVal = !chatModeEnabled;
    setChatModeEnabled(nextVal);
    announce(
      nextVal
        ? 'Chat Mode ON. Applies to your next generation or regeneration.'
        : 'Chat Mode OFF. Applies to your next generation or regeneration.'
    );
  };

  const handleCycleSample = () => {
    const sample = SAMPLE_PROMPTS[sampleIndex % SAMPLE_PROMPTS.length];
    setSampleIndex((prev) => prev + 1);
    setInputText(sample.text);
    setActiveDesktopSection('home');
    setMobileDrawerPage(null);
    setMobileTab('write');
    announce(`Loaded sample: ${sample.label}`);
  };

  const handleTrimOversizedInput = () => {
    setInputText((prev) => trimToSafeBoundary(prev));
    setErrorBanner(null);
    announce('Input trimmed cleanly to the nearest paragraph boundary within the studio limit.');
  };

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

  // Dedicated 1990s Mobile Communicator Application (<768px)
  if (isMobileShell) {
    return (
      <MobileCommunicatorShell
        activeTab={mobileTab}
        onSelectTab={setMobileTab}
        drawerPage={mobileDrawerPage}
        onSelectDrawerPage={setMobileDrawerPage}
        inputText={inputText}
        onChangeText={setInputText}
        onClearText={handleClearText}
        onClearWorkspace={handleClearWorkspace}
        onLoadQuickSample={handleCycleSample}
        onLoadSpecificSample={(sample) => setInputText(sample)}
        teachMe={teachMe}
        onToggleTeachMe={handleToggleTeachMe}
        chatModeEnabled={chatModeEnabled}
        onToggleChatMode={handleToggleChatMode}
        resultsMap={resultsMap}
        resultsBatchChatMode={resultsBatchChatMode}
        hasPendingChatModeDiff={hasPendingChatModeDiff}
        editingDrafts={editingDrafts}
        onStartEdit={handleStartMobileEdit}
        onChangeEditDraft={handleChangeMobileEditDraft}
        onSaveEdit={handleSaveMobileEdit}
        onCancelEdit={handleCancelMobileEdit}
        onResetModeEdit={handleResetModeEdit}
        isTransformingAll={isTransformingAll}
        regeneratingModes={regeneratingModes}
        isAnyBusy={isAnyBusy}
        isLoadingNotes={isLoadingNotes}
        onSubmitTransform={handleAmericanizeSubmit}
        onRegenerateSingle={(mode) => void executeSingleRegenerate(mode)}
        onRegenerateAll={() =>
          requestBatchTransformWithEditGuard(
            inputText.trim() || submittedSourceText,
            teachMe,
            chatModeEnabled
          )
        }
        onTrimToLimit={handleTrimOversizedInput}
        onRequestNotes={() => {
          if (!resultsMap) return;
          void fetchNotesForExistingResults(
            resultsMap,
            submittedSourceText || inputText.trim(),
            anyDisplayedAreChat
          );
        }}
        errorBanner={errorBanner}
        onDismissError={() => setErrorBanner(null)}
        pendingReplaceAllConfirm={pendingReplaceAllAction !== null}
        onConfirmReplaceAll={() => {
          const action = pendingReplaceAllAction;
          setPendingReplaceAllAction(null);
          action?.();
        }}
        onCancelReplaceAll={() => setPendingReplaceAllAction(null)}
        liveAnnouncement={liveAnnouncement}
        onAnnounce={announce}
      />
    );
  }

  // Intact Desktop Studio Experience (>=768px)
  return (
    <div id="studio" className="min-h-screen min-h-dvh flex flex-col">
      {/* Screen-reader live region */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {liveAnnouncement}
      </div>

      {/* Top Navigation Bar */}
      <RetroHeader
        activeSection={activeDesktopSection}
        onSelectSection={(sec) => setActiveDesktopSection(sec)}
        onCycleSample={handleCycleSample}
      />

      {/* Desktop Content Container */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-6 py-8 space-y-6 min-w-0">
        {activeDesktopSection !== 'home' ? (
          <InfoViews
            section={activeDesktopSection}
            onReturnToStudio={() => setActiveDesktopSection('home')}
            onLoadSampleAndReturn={(sample) => {
              setInputText(sample);
              setActiveDesktopSection('home');
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
                className="font-mono text-4xl font-bold text-[#141B29] tracking-tight leading-tight"
              >
                Say it like you mean it.
              </h1>

              <p
                style={{ textWrap: 'balance' }}
                className="text-base text-[#2C3342] leading-relaxed"
              >
                Drop your text. Get four American voices. Keep the one that sounds like you.
              </p>
            </section>

            {/* Error Alert Window */}
            {errorBanner && (
              <div
                role="alert"
                className="retro-window !bg-[#FDF0ED] !border-[#B41616] p-4 flex items-center justify-between gap-4"
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

            {/* Main Desktop Studio Text Editor */}
            <TextEditorWindow
              inputText={inputText}
              onChangeText={setInputText}
              onClearText={handleClearText}
              teachMe={teachMe}
              onToggleTeachMe={handleToggleTeachMe}
              chatModeEnabled={chatModeEnabled}
              onToggleChatMode={handleToggleChatMode}
              isTransformingAll={isTransformingAll}
              isAnyBusy={isAnyBusy}
              onSubmitTransform={handleAmericanizeSubmit}
              onTrimToLimit={handleTrimOversizedInput}
              pendingReplaceAllConfirm={pendingReplaceAllAction !== null}
              onConfirmReplaceAll={() => {
                const action = pendingReplaceAllAction;
                setPendingReplaceAllAction(null);
                action?.();
              }}
              onCancelReplaceAll={() => setPendingReplaceAllAction(null)}
            />

            {/* Vertical List of Four Result Cards */}
            {resultsMap && (
              <section
                ref={resultsAnchorRef}
                aria-label="Generated American English voices"
                className="retro-window divide-y-2 divide-[#141B29] min-w-0"
              >
                {showResultsStatusStrip && (
                  <div className="px-5 py-2.5 bg-[#E6E2D2] flex items-center justify-between gap-2 font-mono text-xs min-w-0">
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
                            <strong>CHAT MODE: {chatModeEnabled ? 'ON' : 'OFF'}</strong> will apply
                            to your next generation
                          </span>
                        </>
                      )}
                    </div>

                    {hasPendingChatModeDiff && (
                      <button
                        type="button"
                        disabled={isAnyBusy}
                        onClick={() =>
                          requestBatchTransformWithEditGuard(
                            inputText.trim() || submittedSourceText,
                            teachMe,
                            chatModeEnabled
                          )
                        }
                        className="retro-link min-h-[44px] inline-flex items-center text-xs font-semibold disabled:opacity-50 whitespace-nowrap shrink-0"
                      >
                        Regenerate All with Chat Mode {chatModeEnabled ? 'ON' : 'OFF'}
                      </button>
                    )}
                  </div>
                )}

                {ORDERED_MODE_CONFIGS.map((cfg) => (
                  <ModeResultCard
                    key={cfg.id}
                    config={cfg}
                    data={resultsMap[cfg.id]}
                    teachMe={teachMe}
                    isRegenerating={regeneratingModes[cfg.id]}
                    isAnyTransformAllRunning={isTransformingAll}
                    isLoadingNotes={isLoadingNotes}
                    onUpdateText={(nextText) => handleUpdateModeTextLive(cfg.id, nextText)}
                    onResetEditedText={() => handleResetModeEdit(cfg.id)}
                    onRegenerate={() => void executeSingleRegenerate(cfg.id)}
                    onRequestNotes={() =>
                      void fetchNotesForExistingResults(
                        resultsMap,
                        submittedSourceText || inputText.trim(),
                        anyDisplayedAreChat
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
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between gap-3 font-mono text-xs text-[#3E3A30]">
          <span>
            <strong className="text-[#141B29]">TalkLikeUS</strong> &middot; Same idea. Four American voices.
          </span>
          <div className="flex items-center gap-4">
            <a
              href="#how"
              onClick={(e) => {
                e.preventDefault();
                setActiveDesktopSection('how');
              }}
              className="retro-link min-h-[44px] inline-flex items-center whitespace-nowrap shrink-0"
            >
              How It Works
            </a>
            <a
              href="#voices"
              onClick={(e) => {
                e.preventDefault();
                setActiveDesktopSection('voices');
              }}
              className="retro-link min-h-[44px] inline-flex items-center whitespace-nowrap shrink-0"
            >
              Voice Guide
            </a>
            <a
              href="#about"
              onClick={(e) => {
                e.preventDefault();
                setActiveDesktopSection('about');
              }}
              className="retro-link min-h-[44px] inline-flex items-center whitespace-nowrap shrink-0"
            >
              Privacy &amp; About
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
