import { useCallback, useRef, useState } from 'react';
import { ComparisonPanel } from './components/ComparisonPanel';
import { InfoViews } from './components/InfoViews';
import { ModeResultCard } from './components/ModeResultCard';
import { PixelFlagStamp } from './components/PixelIcons';
import { RetroConfirmDialog } from './components/RetroConfirmDialog';
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
  type EditableModeState,
  type ModeTransformation,
  type VoiceMode,
} from './types/transform';
import { copyTextToClipboard, formatAllResultsForClipboard } from './utils/clipboard';
import { trimToSafeBoundary } from './utils/textStats';

type ResultsMap = Record<VoiceMode, EditableModeState>;

interface PendingConfirmState {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
}

function buildEditableMap(results: ModeTransformation[]): ResultsMap {
  const map = {} as ResultsMap;
  for (const mode of VOICE_MODES) {
    const found = results.find((r) => r.mode === mode);
    const text = found?.text || '';
    map[mode] = {
      mode,
      text,
      aiOriginalText: text,
      isEdited: false,
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
  const [teachMe, setTeachMe] = useState<boolean>(false);

  const [resultsMap, setResultsMap] = useState<ResultsMap | null>(null);
  const [lastChunkCount, setLastChunkCount] = useState<number>(1);

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

  const [compareModeOpen, setCompareModeOpen] = useState<boolean>(false);
  const [compareSelectedMode, setCompareSelectedMode] = useState<VoiceMode>('natural_american');

  const [includeNotesInCopyAll, setIncludeNotesInCopyAll] = useState<boolean>(false);
  const [copyAllStatus, setCopyAllStatus] = useState<'idle' | 'copied' | 'manual'>('idle');

  const [liveAnnouncement, setLiveAnnouncement] = useState<string>('');
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirmState | null>(null);

  const transformAbortRef = useRef<AbortController | null>(null);
  const resultsAnchorRef = useRef<HTMLDivElement | null>(null);

  const announce = useCallback((msg: string) => {
    setLiveAnnouncement('');
    window.setTimeout(() => setLiveAnnouncement(msg), 30);
  }, []);

  const isAnyModeRegenerating = Object.values(regeneratingModes).some(Boolean);
  const isAnyBusy = isTransformingAll || isAnyModeRegenerating;

  const hasAnyManualEdits = resultsMap
    ? VOICE_MODES.some((m) => resultsMap[m].isEdited)
    : false;

  const hasWorkspaceContent = inputText.trim().length > 0 || resultsMap !== null;

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
        setResultsMap(buildEditableMap(res.results));
        setLastChunkCount(res.chunkCount || 1);
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

    if (hasAnyManualEdits && resultsMap) {
      setPendingConfirm({
        title: 'Replace Edited Results?',
        message:
          'One or more voice cards below contain your manual edits. Generating a fresh set of four voices will replace them.',
        confirmLabel: 'Replace & Americanize',
        onConfirm: () => {
          setPendingConfirm(null);
          executeTransformAll(inputText, teachMe);
        },
      });
      return;
    }

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
              aiOriginalText: res.result.text,
              isEdited: false,
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

  const handleRequestSingleRegenerate = (mode: VoiceMode) => {
    if (regeneratingModes[mode] || isTransformingAll) return;

    if (resultsMap?.[mode]?.isEdited) {
      const title = MODE_CONFIGS[mode].title;
      setPendingConfirm({
        title: `Overwrite Edits in ${title}?`,
        message: `You edited the ${title} card manually. Regenerating this card will replace your changes in this window (your other three cards stay untouched).`,
        confirmLabel: `Regenerate ${title}`,
        onConfirm: () => {
          setPendingConfirm(null);
          executeSingleRegenerate(mode);
        },
      });
      return;
    }

    executeSingleRegenerate(mode);
  };

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

  const handleEditCardText = (mode: VoiceMode, nextText: string) => {
    setResultsMap((prev) => {
      if (!prev) return prev;
      const card = prev[mode];
      return {
        ...prev,
        [mode]: {
          ...card,
          text: nextText,
          isEdited: nextText !== card.aiOriginalText,
        },
      };
    });
  };

  const handleRestoreCardOriginal = (mode: VoiceMode) => {
    setResultsMap((prev) => {
      if (!prev) return prev;
      const card = prev[mode];
      return {
        ...prev,
        [mode]: {
          ...card,
          text: card.aiOriginalText,
          isEdited: false,
        },
      };
    });
    announce(`Restored original AI draft for ${MODE_CONFIGS[mode].title}.`);
  };

  const handleCopyAll = async () => {
    if (!resultsMap) return;
    const formatted = formatAllResultsForClipboard(
      resultsMap,
      teachMe && includeNotesInCopyAll
    );
    const outcome = await copyTextToClipboard(formatted);
    if (outcome.ok) {
      setCopyAllStatus('copied');
      announce('Copied all four American voices to clipboard.');
      window.setTimeout(() => setCopyAllStatus('idle'), 2200);
    } else {
      setCopyAllStatus('manual');
      announce('Clipboard permission blocked—copy cards individually.');
      window.setTimeout(() => setCopyAllStatus('idle'), 4000);
    }
  };

  const executeResetWorkspace = () => {
    transformAbortRef.current?.abort();
    setIsTransformingAll(false);
    setInputText('');
    setSubmittedSourceText('');
    setResultsMap(null);
    setErrorBanner(null);
    setCompareModeOpen(false);
    setActiveSection('home');
    announce('Studio workspace cleared.');
  };

  const handleResetWorkspace = () => {
    if (hasAnyManualEdits) {
      setPendingConfirm({
        title: 'Clear Studio & Edits?',
        message:
          'Starting over will clear your original text, all four voices, and your manual edits from this session.',
        confirmLabel: 'Clear Everything',
        onConfirm: () => {
          setPendingConfirm(null);
          executeResetWorkspace();
        },
      });
      return;
    }
    executeResetWorkspace();
  };

  const handleClearInputOnly = () => {
    setInputText('');
    setErrorBanner(null);
    announce('Original input text cleared.');
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
        hasWorkspaceContent={hasWorkspaceContent}
        onResetWorkspace={handleResetWorkspace}
      />

      {/* Centered Content Container */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-7 sm:py-10 space-y-8">
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
            <section className="text-center space-y-3 max-w-2xl mx-auto">
              <div className="inline-flex items-center justify-center gap-3 font-mono text-xs text-[#3E3A30]">
                <PixelFlagStamp className="w-8 h-5 shrink-0" />
                <span>American English Voice Lab &middot; Session Private</span>
              </div>

              <h1
                style={{ textWrap: 'balance' }}
                className="font-pixel text-2xl sm:text-4xl font-bold text-[#141B29] tracking-tight leading-tight"
              >
                Say it like you mean it.
              </h1>

              <p
                style={{ textWrap: 'balance' }}
                className="text-base sm:text-lg text-[#2C3342] leading-relaxed"
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
                  <p className="font-pixel text-xs text-[#8F1111]">
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
              onClearText={handleClearInputOnly}
              onTrimToLimit={handleTrimOversizedInput}
            />

            {/* Results Laboratory Section */}
            {resultsMap && (
              <section
                ref={resultsAnchorRef}
                aria-labelledby="results-lab-heading"
                className="space-y-5 pt-2"
              >
                {/* Results Master Control Bar */}
                <div className="retro-window px-4 py-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <h2
                      id="results-lab-heading"
                      className="font-pixel text-sm sm:text-base text-[#142850]"
                    >
                      Four American Voices Ready
                    </h2>
                    <p className="font-mono text-xs text-[#4B4639]">
                      Edit any window directly before copying
                      {lastChunkCount > 1
                        ? ` · Reassembled cleanly across ${lastChunkCount} paragraphs`
                        : ''}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    {teachMe && (
                      <label className="inline-flex items-center gap-1.5 font-mono text-xs text-[#2C3342] cursor-pointer mr-1 whitespace-nowrap shrink-0">
                        <input
                          type="checkbox"
                          checked={includeNotesInCopyAll}
                          onChange={(e) => setIncludeNotesInCopyAll(e.target.checked)}
                          className="w-4 h-4 accent-[#142850]"
                        />
                        <span>Include notes in Copy All</span>
                      </label>
                    )}

                    <button
                      type="button"
                      onClick={handleCopyAll}
                      className={`retro-btn min-h-[40px] px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 ${
                        copyAllStatus === 'copied' ? '!bg-[#D6F5DF] !text-[#0F5128]' : ''
                      }`}
                    >
                      {copyAllStatus === 'copied' ? 'ALL 4 COPIED!' : 'Copy All'}
                    </button>

                    <button
                      type="button"
                      onClick={() => setCompareModeOpen((prev) => !prev)}
                      className={`retro-btn min-h-[40px] px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 ${
                        compareModeOpen ? '!bg-[#DCE6FA] !border-[#142850]' : ''
                      }`}
                    >
                      {compareModeOpen ? 'Hide Compare' : 'Side-by-Side Compare'}
                    </button>

                    <button
                      type="button"
                      onClick={handleAmericanizeSubmit}
                      disabled={isAnyBusy || !inputText.trim()}
                      className="retro-btn min-h-[40px] px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0"
                    >
                      Regenerate All
                    </button>

                    <button
                      type="button"
                      onClick={handleResetWorkspace}
                      disabled={isAnyBusy}
                      className="retro-btn min-h-[40px] px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0"
                    >
                      Start Over
                    </button>
                  </div>
                </div>

                {/* Optional Side-by-Side Comparison View */}
                {compareModeOpen && (
                  <ComparisonPanel
                    originalText={submittedSourceText || inputText}
                    selectedMode={compareSelectedMode}
                    onSelectMode={setCompareSelectedMode}
                    resultsMap={resultsMap}
                    onEditSelected={handleEditCardText}
                    onClose={() => setCompareModeOpen(false)}
                    onAnnounce={announce}
                  />
                )}

                {/* Balanced 2-Column Laboratory Result Grid (1-Column on Mobile) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
                  {ORDERED_MODE_CONFIGS.map((cfg) => (
                    <ModeResultCard
                      key={cfg.id}
                      config={cfg}
                      data={resultsMap[cfg.id]}
                      teachMe={teachMe}
                      isRegenerating={regeneratingModes[cfg.id]}
                      isAnyTransformAllRunning={isTransformingAll}
                      isLoadingNotes={isLoadingNotes}
                      onEditText={(next) => handleEditCardText(cfg.id, next)}
                      onRestoreOriginal={() => handleRestoreCardOriginal(cfg.id)}
                      onRegenerate={() => handleRequestSingleRegenerate(cfg.id)}
                      onOpenCompare={() => {
                        setCompareSelectedMode(cfg.id);
                        setCompareModeOpen(true);
                      }}
                      onRequestNotes={() =>
                        fetchNotesForExistingResults(
                          resultsMap,
                          submittedSourceText || inputText.trim()
                        )
                      }
                      onAnnounce={announce}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      {/* Quiet Authentic 1990s Footer */}
      <footer className="w-full border-t-2 border-[#141B29] bg-[#E5E0D0] mt-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 font-mono text-xs text-[#3E3A30]">
          <span>TalkLikeUS &middot; Same idea. Four American voices.</span>
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

      {/* Accessible Confirmation Dialog for Overwriting Manual Edits */}
      <RetroConfirmDialog
        open={pendingConfirm !== null}
        title={pendingConfirm?.title || ''}
        message={pendingConfirm?.message || ''}
        confirmLabel={pendingConfirm?.confirmLabel || 'Confirm'}
        onConfirm={() => pendingConfirm?.onConfirm()}
        onCancel={() => setPendingConfirm(null)}
      />
    </div>
  );
}
