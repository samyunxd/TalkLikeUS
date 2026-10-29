import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ModeConfig } from '../config/modes';
import type { ModeTransformation, VoiceMode } from '../types/transform';
import { copyTextToClipboard } from '../utils/clipboard';
import { PixelBookIcon, PixelHourglassIcon, PixelModeIcon } from './PixelIcons';
import { TeachMePanel } from './TeachMePanel';

interface ModeResultCardProps {
  config: ModeConfig;
  staggerIndex: number;
  data: ModeTransformation;
  teachMe: boolean;
  isRegenerating: boolean;
  isAnyTransformAllRunning: boolean;
  isLoadingNotes: boolean;
  onUpdateModeText: (mode: VoiceMode, nextText: string) => void;
  onResetModeEdit: (mode: VoiceMode) => void;
  onRegenerateMode: (mode: VoiceMode) => void;
  onRequestNotes: () => void;
  onAnnounce: (msg: string) => void;
}

const STAGGER_CLASSES = [
  'retro-stagger-1',
  'retro-stagger-2',
  'retro-stagger-3',
  'retro-stagger-4',
] as const;

export const ModeResultCard = memo(function ModeResultCard({
  config,
  staggerIndex,
  data,
  teachMe,
  isRegenerating,
  isAnyTransformAllRunning,
  isLoadingNotes,
  onUpdateModeText,
  onResetModeEdit,
  onRegenerateMode,
  onRequestNotes,
  onAnnounce,
}: ModeResultCardProps) {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [confirmingReplace, setConfirmingReplace] = useState<boolean>(false);
  // Desktop toggle state; on mobile (<768px) Teach Me notes always show automatically when teachMe is ON
  const [notesOpen, setNotesOpen] = useState<boolean>(true);
  const [regenAnimKey, setRegenAnimKey] = useState<number>(0);

  const editTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fallbackSelectRef = useRef<HTMLDivElement | null>(null);
  const wasRegeneratingRef = useRef<boolean>(false);

  const syncEditHeight = useCallback(() => {
    const el = editTextareaRef.current;
    if (!el || typeof window === 'undefined') return;
    el.style.height = 'auto';
    const nextH = Math.min(Math.max(el.scrollHeight, 100), 340);
    el.style.height = `${nextH}px`;
    el.style.overflowY = el.scrollHeight > nextH ? 'auto' : 'hidden';
  }, []);

  useLayoutEffect(() => {
    if (isEditing) {
      syncEditHeight();
    }
  }, [isEditing, data.text, syncEditHeight]);

  useEffect(() => {
    if (isRegenerating) {
      wasRegeneratingRef.current = true;
      setConfirmingReplace(false);
      setIsEditing(false);
    } else if (wasRegeneratingRef.current) {
      wasRegeneratingRef.current = false;
      setRegenAnimKey((prev) => prev + 1);
    }
  }, [isRegenerating]);

  // Ensure mobile view never stays trapped in desktop inline-edit state when resizing
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 767px)');
    const handleViewport = () => {
      if (mq.matches) {
        setIsEditing(false);
        setConfirmingReplace(false);
      }
    };
    handleViewport();
    mq.addEventListener('change', handleViewport);
    return () => mq.removeEventListener('change', handleViewport);
  }, []);

  const handleCopy = async () => {
    if (isRegenerating || !data.text.trim()) return;
    const res = await copyTextToClipboard(data.text);
    if (res.ok) {
      setCopyStatus('copied');
      onAnnounce(`Copied ${config.title} text to clipboard.`);
      window.setTimeout(() => setCopyStatus('idle'), 1600);
    } else {
      setCopyStatus('failed');
      if (fallbackSelectRef.current && typeof window !== 'undefined') {
        try {
          const selection = window.getSelection();
          const range = document.createRange();
          range.selectNodeContents(fallbackSelectRef.current);
          selection?.removeAllRanges();
          selection?.addRange(range);
        } catch {
          // Ignore selection errors
        }
      }
      onAnnounce('Automatic clipboard blocked. Text selected—tap Copy on your screen.');
      window.setTimeout(() => setCopyStatus('idle'), 3500);
    }
  };

  const handleToggleEdit = () => {
    if (isRegenerating || isAnyTransformAllRunning) return;
    setConfirmingReplace(false);
    const next = !isEditing;
    setIsEditing(next);
    if (next) {
      onAnnounce(`Editing ${config.title}.`);
      window.setTimeout(() => {
        editTextareaRef.current?.focus({ preventScroll: true });
      }, 20);
    } else {
      onAnnounce(`Saved ${config.title} text.`);
    }
  };

  const handleRegenerateClick = () => {
    if (isRegenerating || isAnyTransformAllRunning) return;
    if (data.isEdited) {
      setConfirmingReplace(true);
      onAnnounce(
        `${config.title} has manual edits. Confirm Replace Edit to regenerate or Keep My Edit.`
      );
      return;
    }
    onRegenerateMode(config.id);
  };

  const handleConfirmRegenerate = () => {
    setConfirmingReplace(false);
    setIsEditing(false);
    onRegenerateMode(config.id);
  };

  const isDisabledActions = isRegenerating || isAnyTransformAllRunning;
  const isRefreshingVisual = isRegenerating || isAnyTransformAllRunning;

  const hasMobileNotes =
    isLoadingNotes || data.explanations.length > 0 || Boolean(data.toneSummary);

  const collapseStateClass = !teachMe
    ? ''
    : notesOpen
      ? hasMobileNotes
        ? 'retro-collapse-open'
        : 'retro-collapse-desktop-only'
      : hasMobileNotes
        ? 'retro-collapse-mobile-only'
        : '';

  const staggerClass = STAGGER_CLASSES[staggerIndex] ?? 'retro-stagger-1';

  return (
    <article
      aria-labelledby={`mode-heading-${config.id}`}
      className={`retro-card-enter ${staggerClass} px-3 min-[375px]:px-3.5 py-3 md:px-5 md:py-4 bg-[#F4F1E6] space-y-2 min-w-0`}
    >
      {/* Clean Single-Line Card Title */}
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <span
            className={`${config.headerBgClass} p-1 border border-[#141B29] inline-flex items-center justify-center shrink-0`}
          >
            <PixelModeIcon mode={config.id} className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          </span>
          <h3
            id={`mode-heading-${config.id}`}
            className="font-mono text-xs min-[375px]:text-sm md:text-base font-bold text-[#141B29] truncate"
          >
            {config.number}. {config.title}
          </h3>
          {data.chatMode && (
            <span className="hidden md:inline font-mono text-xs font-semibold text-[#15603A] whitespace-nowrap shrink-0">
              &middot; Chat
            </span>
          )}
          {data.isEdited && (
            <span className="hidden md:inline retro-pop-in font-mono text-xs font-semibold text-[#6B3A00] whitespace-nowrap shrink-0">
              &middot; Edited
            </span>
          )}
        </div>

        {isRegenerating ? (
          <span
            role="status"
            aria-live="polite"
            className="retro-pop-in inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold text-[#142850] whitespace-nowrap shrink-0"
          >
            <PixelHourglassIcon className="w-3.5 h-3.5 shrink-0 retro-hourglass-spin" />
            <span>Rewriting</span>
          </span>
        ) : (
          copyStatus !== 'idle' && (
            <span
              role="status"
              aria-live="polite"
              className={`retro-pop-in font-mono text-[11px] whitespace-nowrap shrink-0 ${
                copyStatus === 'copied'
                  ? 'font-bold text-[#15603A]'
                  : 'font-semibold text-[#B41616]'
              }`}
            >
              {copyStatus === 'copied' ? 'COPIED!' : 'Hold text to copy'}
            </span>
          )
        )}
      </div>

      {/* Output Area: Desktop Inline Editor OR Crisp White Text Well */}
      {isEditing ? (
        <div className="hidden md:block retro-pop-in space-y-2 min-w-0">
          <div className="retro-well retro-well-input !border-[#142850] min-w-0">
            <label htmlFor={`edit-textarea-${config.id}`} className="sr-only">
              Edit {config.title} result
            </label>
            <textarea
              ref={editTextareaRef}
              id={`edit-textarea-${config.id}`}
              value={data.text}
              onChange={(e) => onUpdateModeText(config.id, e.target.value)}
              rows={3}
              inputMode="text"
              autoCapitalize="sentences"
              autoCorrect="on"
              spellCheck={true}
              className="w-full min-h-[100px] p-3.5 bg-[#FFFEF9] text-[#141B29] text-base leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere] resize-y focus:outline-none block"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleEdit}
              className="retro-btn !bg-[#DCE6FA] !border-[#142850] min-h-[44px] min-w-[44px] px-4 text-xs font-bold inline-flex items-center justify-center whitespace-nowrap"
            >
              Done
            </button>
            {data.isEdited && (
              <button
                type="button"
                onClick={() => {
                  onResetModeEdit(config.id);
                  onAnnounce(`Restored original generated text for ${config.title}.`);
                }}
                className="retro-btn min-h-[44px] min-w-[44px] px-3.5 text-xs font-semibold inline-flex items-center justify-center whitespace-nowrap"
              >
                Undo
              </button>
            )}
          </div>
        </div>
      ) : (
        <div
          ref={fallbackSelectRef}
          onClick={() => {
            if (copyStatus !== 'failed') {
              void handleCopy();
            }
          }}
          className={`retro-well retro-well-copyable w-full text-left px-3 md:px-3.5 py-2.5 md:py-3 min-w-0 ${
            isRefreshingVisual ? 'retro-shimmer-surface opacity-75 ' : ''
          }${
            copyStatus === 'copied'
              ? '!bg-[#E6F7EC] !border-[#15603A] cursor-pointer'
              : copyStatus === 'failed'
                ? '!bg-[#FFF8DE] !border-[#6B3A00] select-all cursor-text'
                : 'hover:bg-[#FAF8F1] active:bg-[#EFECE0] cursor-pointer'
          }`}
        >
          <p
            key={regenAnimKey}
            className={`${
              regenAnimKey > 0 ? 'retro-pop-in ' : ''
            }whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-[15px] md:text-base leading-relaxed text-[#141B29]`}
          >
            {data.text}
          </p>
        </div>
      )}

      {/* Desktop Inline Confirmation Before Overwriting Manually Edited Card */}
      {confirmingReplace && (
        <div
          role="region"
          aria-label={`Confirm replacing manual edits in ${config.title}`}
          className="hidden md:flex retro-banner-enter bg-[#FFF8DE] border-2 border-[#6B3A00] p-2.5 items-center justify-between gap-2"
        >
          <p className="text-xs text-[#3D2200] font-mono font-semibold">
            Replace your manual edit?
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleConfirmRegenerate}
              className="retro-btn-primary min-h-[44px] px-3 text-xs font-bold inline-flex items-center justify-center whitespace-nowrap"
            >
              Replace Edit
            </button>
            <button
              type="button"
              onClick={() => setConfirmingReplace(false)}
              className="retro-btn min-h-[44px] px-3 text-xs font-semibold inline-flex items-center justify-center whitespace-nowrap"
            >
              Keep My Edit
            </button>
          </div>
        </div>
      )}

      {/* Desktop-Only Action Row (Copy, Edit, Regenerate, Notes removed on mobile per user preference) */}
      {!isEditing && (
        <div className="hidden md:flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              disabled={isRegenerating || !data.text.trim()}
              aria-label={`Copy ${config.title}`}
              className={`retro-btn min-h-[44px] min-w-[44px] px-3.5 text-xs font-semibold inline-flex items-center justify-center whitespace-nowrap ${
                copyStatus === 'copied'
                  ? '!bg-[#D6F5DF] !border-[#15603A] !text-[#0F4224] font-bold'
                  : ''
              }`}
            >
              {copyStatus === 'copied' ? 'Copied' : 'Copy'}
            </button>

            <button
              type="button"
              onClick={handleToggleEdit}
              disabled={isDisabledActions}
              aria-label={`Edit ${config.title}`}
              className="retro-btn min-h-[44px] min-w-[44px] px-3.5 text-xs font-semibold inline-flex items-center justify-center whitespace-nowrap"
            >
              Edit
            </button>

            <button
              type="button"
              onClick={handleRegenerateClick}
              disabled={isDisabledActions}
              aria-label={`Regenerate ${config.title}`}
              className="retro-btn min-h-[44px] min-w-[44px] px-3.5 text-xs font-semibold inline-flex items-center justify-center whitespace-nowrap"
            >
              {isRegenerating ? 'Rewriting' : 'Regenerate'}
            </button>
          </div>

          {teachMe && (
            <button
              type="button"
              onClick={() => setNotesOpen((prev) => !prev)}
              aria-expanded={notesOpen}
              aria-label={`${notesOpen ? 'Hide' : 'Show'} Teach Me Notes for ${config.title}`}
              className={`bg-transparent border-0 shadow-none min-h-[44px] px-2 text-xs font-mono font-semibold inline-flex items-center justify-center gap-1 whitespace-nowrap underline underline-offset-3 transition-colors duration-150 cursor-pointer ${
                notesOpen ? 'text-[#551A8B]' : 'text-[#0000EE]'
              }`}
            >
              <PixelBookIcon className="w-3.5 h-3.5 shrink-0" />
              <span>
                {notesOpen
                  ? '[-] Hide Teach Me Notes'
                  : `[+] Teach Me Notes (${data.explanations.length})`}
              </span>
            </button>
          )}
        </div>
      )}

      {/* Smooth CSS Grid Accordion for Teach Me Notes: Automatic on mobile when Teach Me is ON */}
      <div className={`retro-collapse ${collapseStateClass}`}>
        <div className="retro-collapse-inner">
          <TeachMePanel
            modeTitle={config.title}
            explanations={data.explanations}
            toneSummary={data.toneSummary}
            reusablePattern={data.reusablePattern}
            isLoadingNotes={isLoadingNotes}
            onRequestNotes={onRequestNotes}
          />
        </div>
      </div>
    </article>
  );
});
