import { useCallback, useEffect, useRef, useState } from 'react';
import type { ModeConfig } from '../config/modes';
import type { ModeTransformation } from '../types/transform';
import { copyTextToClipboard } from '../utils/clipboard';
import { PixelBookIcon, PixelHourglassIcon, PixelModeIcon } from './PixelIcons';
import { TeachMePanel } from './TeachMePanel';

interface ModeResultCardProps {
  config: ModeConfig;
  data: ModeTransformation;
  teachMe: boolean;
  isRegenerating: boolean;
  isAnyTransformAllRunning: boolean;
  isLoadingNotes: boolean;
  onUpdateText: (nextText: string) => void;
  onResetEditedText: () => void;
  onRegenerate: () => void;
  onRequestNotes: () => void;
  onAnnounce: (msg: string) => void;
}

export function ModeResultCard({
  config,
  data,
  teachMe,
  isRegenerating,
  isAnyTransformAllRunning,
  isLoadingNotes,
  onUpdateText,
  onResetEditedText,
  onRegenerate,
  onRequestNotes,
  onAnnounce,
}: ModeResultCardProps) {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [confirmingReplace, setConfirmingReplace] = useState<boolean>(false);
  // Collapsed by default on mobile (<640px) for a compact, uncluttered screen; expanded on desktop
  const [notesOpen, setNotesOpen] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 640 : false
  );

  const editTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fallbackSelectRef = useRef<HTMLDivElement | null>(null);

  const syncEditHeight = useCallback(() => {
    const el = editTextareaRef.current;
    if (!el || typeof window === 'undefined') return;
    const maxH = window.innerWidth < 640 ? 240 : 340;
    el.style.height = 'auto';
    const nextH = Math.min(Math.max(el.scrollHeight, 100), maxH);
    el.style.height = `${nextH}px`;
    el.style.overflowY = el.scrollHeight > nextH ? 'auto' : 'hidden';
  }, []);

  useEffect(() => {
    if (isEditing) {
      syncEditHeight();
    }
  }, [isEditing, data.text, syncEditHeight]);

  useEffect(() => {
    if (isRegenerating) {
      setConfirmingReplace(false);
      setIsEditing(false);
    }
  }, [isRegenerating]);

  const handleCopy = async () => {
    if (isRegenerating || !data.text.trim()) return;
    const res = await copyTextToClipboard(data.text);
    if (res.ok) {
      setCopyStatus('copied');
      onAnnounce(`Copied ${config.title} text to clipboard.`);
      window.setTimeout(() => setCopyStatus('idle'), 1800);
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
      onAnnounce(`Automatic clipboard blocked. Text selected—tap Copy on your screen.`);
      window.setTimeout(() => setCopyStatus('idle'), 4000);
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
    onRegenerate();
  };

  const handleConfirmRegenerate = () => {
    setConfirmingReplace(false);
    setIsEditing(false);
    onRegenerate();
  };

  const isDisabledActions = isRegenerating || isAnyTransformAllRunning;

  return (
    <article
      aria-labelledby={`mode-heading-${config.id}`}
      className="px-2.5 min-[375px]:px-3.5 py-2.5 sm:px-5 sm:py-4 bg-[#F4F1E6] space-y-2 min-w-0"
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
            className="font-mono text-xs min-[375px]:text-sm sm:text-base font-bold text-[#141B29] truncate"
          >
            {config.number}. {config.title}
          </h3>
          {data.chatMode && (
            <span className="font-mono text-[11px] sm:text-xs font-semibold text-[#15603A] whitespace-nowrap shrink-0">
              &middot; Chat
            </span>
          )}
          {data.isEdited && (
            <span className="font-mono text-[11px] sm:text-xs font-semibold text-[#6B3A00] whitespace-nowrap shrink-0">
              &middot; Edited
            </span>
          )}
        </div>

        {isRegenerating ? (
          <span
            role="status"
            aria-live="polite"
            className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-[#142850] whitespace-nowrap shrink-0"
          >
            <PixelHourglassIcon className="w-3 h-3 shrink-0" />
            <span>Rewriting...</span>
          </span>
        ) : (
          copyStatus !== 'idle' && (
            <span
              role="status"
              aria-live="polite"
              className={`font-mono text-[11px] whitespace-nowrap shrink-0 ${
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

      {/* Output Area: Editable Mobile Textarea OR Crisp White Text Well */}
      {isEditing ? (
        <div className="space-y-2 min-w-0">
          <div className="retro-well !border-[#142850] min-w-0">
            <label htmlFor={`edit-textarea-${config.id}`} className="sr-only">
              Edit {config.title} result
            </label>
            <textarea
              ref={editTextareaRef}
              id={`edit-textarea-${config.id}`}
              value={data.text}
              onChange={(e) => onUpdateText(e.target.value)}
              rows={3}
              inputMode="text"
              autoCapitalize="sentences"
              autoCorrect="on"
              spellCheck={true}
              className="w-full min-h-[100px] p-2.5 sm:p-3.5 bg-[#FFFEF9] text-[#141B29] text-base leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere] resize-y focus:outline-none block"
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
                  onResetEditedText();
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
          className={`retro-well w-full text-left px-3 sm:px-3.5 py-2.5 sm:py-3 transition-colors min-w-0 ${
            copyStatus === 'copied'
              ? '!bg-[#E6F7EC] !border-[#15603A] cursor-pointer'
              : copyStatus === 'failed'
                ? '!bg-[#FFF8DE] !border-[#6B3A00] select-all cursor-text'
                : 'hover:bg-[#FAF8F1] active:bg-[#EFECE0] cursor-pointer'
          }`}
        >
          <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-[15px] sm:text-base leading-relaxed text-[#141B29]">
            {data.text}
          </p>
        </div>
      )}

      {/* Inline Confirmation Before Overwriting Manually Edited Card */}
      {confirmingReplace && (
        <div
          role="region"
          aria-label={`Confirm replacing manual edits in ${config.title}`}
          className="bg-[#FFF8DE] border-2 border-[#6B3A00] p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
        >
          <p className="text-xs text-[#3D2200] font-mono font-semibold">
            Replace your manual edit?
          </p>
          <div className="grid grid-cols-2 sm:flex items-center gap-2 shrink-0">
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

      {/* Single Unified Compact Action Row: Copy + Edit + Regen + Optional Notes Toggle (cuts mobile card height in half!) */}
      {!isEditing && (
        <div
          className={`grid ${
            teachMe ? 'grid-cols-4' : 'grid-cols-3'
          } sm:flex sm:items-center sm:justify-between gap-1.5 sm:gap-2 min-w-0`}
        >
          <div className="contents sm:flex sm:items-center sm:gap-2">
            <button
              type="button"
              onClick={handleCopy}
              disabled={isRegenerating || !data.text.trim()}
              aria-label={`Copy ${config.title}`}
              className={`retro-btn min-h-[44px] min-w-[44px] px-1.5 sm:px-3.5 text-[11px] sm:text-xs font-semibold inline-flex items-center justify-center whitespace-nowrap ${
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
              className="retro-btn min-h-[44px] min-w-[44px] px-1.5 sm:px-3.5 text-[11px] sm:text-xs font-semibold inline-flex items-center justify-center whitespace-nowrap"
            >
              Edit
            </button>

            <button
              type="button"
              onClick={handleRegenerateClick}
              disabled={isDisabledActions}
              aria-label={`Regenerate ${config.title}`}
              className="retro-btn min-h-[44px] min-w-[44px] px-1 sm:px-3.5 text-[11px] sm:text-xs font-semibold inline-flex items-center justify-center whitespace-nowrap"
            >
              <span className="sm:hidden">{isRegenerating ? '...' : 'Regen'}</span>
              <span className="hidden sm:inline">
                {isRegenerating ? 'Rewriting' : 'Regenerate'}
              </span>
            </button>
          </div>

          {teachMe && (
            <button
              type="button"
              onClick={() => setNotesOpen((prev) => !prev)}
              aria-expanded={notesOpen}
              aria-label={`${notesOpen ? 'Hide' : 'Show'} Teach Me Notes for ${config.title}`}
              className={`retro-btn sm:bg-transparent sm:border-0 sm:shadow-none min-h-[44px] min-w-[44px] px-1 sm:px-2 text-[11px] sm:text-xs font-mono font-semibold inline-flex items-center justify-center gap-1 whitespace-nowrap ${
                notesOpen
                  ? '!bg-[#DCE6FA] !border-[#142850] sm:!bg-transparent sm:text-[#551A8B] sm:underline'
                  : 'sm:text-[#0000EE] sm:underline'
              }`}
            >
              <PixelBookIcon className="hidden sm:block w-3.5 h-3.5 shrink-0" />
              <span className="sm:hidden">
                {notesOpen ? 'Hide' : `Notes${data.explanations.length ? ` (${data.explanations.length})` : ''}`}
              </span>
              <span className="hidden sm:inline">
                {notesOpen
                  ? '[-] Hide Teach Me Notes'
                  : `[+] Teach Me Notes (${data.explanations.length})`}
              </span>
            </button>
          )}
        </div>
      )}

      {teachMe && notesOpen && (
        <TeachMePanel
          modeTitle={config.title}
          explanations={data.explanations}
          toneSummary={data.toneSummary}
          reusablePattern={data.reusablePattern}
          isLoadingNotes={isLoadingNotes}
          onRequestNotes={onRequestNotes}
        />
      )}
    </article>
  );
}
