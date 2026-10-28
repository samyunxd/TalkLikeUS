import { useCallback, useEffect, useRef, useState } from 'react';
import type { ModeConfig } from '../../config/modes';
import type { ModeTransformation } from '../../types/transform';
import { copyTextToClipboard } from '../../utils/clipboard';
import {
  PixelCheckIcon,
  PixelCopyIcon,
  PixelEditIcon,
  PixelHourglassIcon,
  PixelRefreshIcon,
} from '../PixelIcons';
import { TeachMePanel } from '../TeachMePanel';

interface MobileResultCardProps {
  config: ModeConfig;
  data: ModeTransformation;
  teachMe: boolean;
  editDraft: string | null;
  onStartEdit: () => void;
  onChangeEditDraft: (draft: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onResetEditedText: () => void;
  isRegenerating: boolean;
  isAnyTransformAllRunning: boolean;
  isLoadingNotes: boolean;
  onRegenerate: () => void;
  onRequestNotes: () => void;
  onAnnounce: (msg: string) => void;
}

export function MobileResultCard({
  config,
  data,
  teachMe,
  editDraft,
  onStartEdit,
  onChangeEditDraft,
  onSaveEdit,
  onCancelEdit,
  onResetEditedText,
  isRegenerating,
  isAnyTransformAllRunning,
  isLoadingNotes,
  onRegenerate,
  onRequestNotes,
  onAnnounce,
}: MobileResultCardProps) {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  const [confirmingReplace, setConfirmingReplace] = useState<boolean>(false);

  const editTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const textWellRef = useRef<HTMLDivElement | null>(null);

  const isEditing = editDraft !== null;
  const isDisabledActions = isRegenerating || isAnyTransformAllRunning;

  const syncEditHeight = useCallback(() => {
    const el = editTextareaRef.current;
    if (!el || typeof window === 'undefined') return;
    const maxH = Math.min(280, Math.max(130, Math.round(window.innerHeight * 0.42)));
    el.style.height = 'auto';
    const nextH = Math.min(Math.max(el.scrollHeight, 118), maxH);
    el.style.height = `${nextH}px`;
    el.style.overflowY = el.scrollHeight > nextH ? 'auto' : 'hidden';
  }, []);

  useEffect(() => {
    if (isEditing) {
      syncEditHeight();
    }
  }, [isEditing, editDraft, syncEditHeight]);

  useEffect(() => {
    if (isRegenerating) {
      setConfirmingReplace(false);
    }
  }, [isRegenerating]);

  const handleCopy = async () => {
    if (isRegenerating || !data.text.trim()) return;
    const res = await copyTextToClipboard(data.text);
    if (res.ok) {
      setCopyStatus('copied');
      onAnnounce(`Copied ${config.title} to clipboard.`);
      window.setTimeout(() => setCopyStatus('idle'), 2000);
    } else {
      setCopyStatus('failed');
      if (textWellRef.current && typeof window !== 'undefined') {
        try {
          const sel = window.getSelection();
          const range = document.createRange();
          range.selectNodeContents(textWellRef.current);
          sel?.removeAllRanges();
          sel?.addRange(range);
        } catch {
          // Ignore selection error
        }
      }
      onAnnounce('Clipboard blocked. Text selected—use Copy on your screen.');
      window.setTimeout(() => setCopyStatus('idle'), 4000);
    }
  };

  const handleEnterEdit = () => {
    if (isDisabledActions) return;
    setConfirmingReplace(false);
    onStartEdit();
    onAnnounce(`Editing ${config.title}.`);
    window.setTimeout(() => {
      editTextareaRef.current?.focus({ preventScroll: true });
    }, 25);
  };

  const handleRegenerateClick = () => {
    if (isDisabledActions) return;
    if (data.isEdited) {
      setConfirmingReplace(true);
      onAnnounce(`${config.title} has manual edits. Confirm Replace Edit or Keep Edit.`);
      return;
    }
    onRegenerate();
  };

  return (
    <article
      aria-labelledby={`mobile-card-title-${config.id}`}
      className="bg-[#F4F1E6] border border-[#141B29] shadow-[2px_2px_0_#141B29] p-3 space-y-2.5 min-w-0"
    >
      {/* Card Header: Small Numbered Pixel Badge + Clear Title + Subtle Status */}
      <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <span
            className={`${config.headerBgClass} text-[#F7F5EC] border border-[#141B29] px-1.5 py-0.5 font-pixel text-[10px] leading-none shrink-0`}
          >
            {config.number}
          </span>
          <h2
            id={`mobile-card-title-${config.id}`}
            className="font-mono text-sm font-bold text-[#141B29] break-words"
          >
            {config.title}
          </h2>
          {data.chatMode && (
            <span className="font-mono text-[11px] font-semibold text-[#15603A] whitespace-nowrap">
              &middot; Chat
            </span>
          )}
          {data.isEdited && (
            <span className="font-mono text-[11px] font-semibold text-[#6B3A00] whitespace-nowrap">
              &middot; Edited
            </span>
          )}
        </div>

        {copyStatus !== 'idle' && (
          <span
            role="status"
            aria-live="polite"
            className={`font-mono text-[11px] font-bold whitespace-nowrap ${
              copyStatus === 'copied' ? 'text-[#15603A]' : 'text-[#B41616]'
            }`}
          >
            {copyStatus === 'copied' ? 'COPIED!' : 'Select & copy'}
          </span>
        )}
      </div>

      {/* Generated Text Well (Selectable & Separate from Toolbar) OR Mobile Edit Area */}
      {isEditing ? (
        <div className="space-y-2.5 min-w-0">
          <div className="bg-white border-2 border-[#142850] min-w-0">
            <label htmlFor={`mobile-edit-${config.id}`} className="sr-only">
              Edit {config.title}
            </label>
            <textarea
              ref={editTextareaRef}
              id={`mobile-edit-${config.id}`}
              value={editDraft ?? ''}
              onChange={(e) => onChangeEditDraft(e.target.value)}
              rows={4}
              inputMode="text"
              autoCapitalize="sentences"
              autoCorrect="on"
              spellCheck={true}
              className="w-full min-h-[118px] p-3 bg-transparent text-[#141B29] text-base leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere] resize-none focus:outline-none block"
            />
          </div>

          {/* Primary SAVE CHANGES + Secondary Cancel / Undo */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onSaveEdit();
                onAnnounce(`Saved changes to ${config.title}.`);
              }}
              className="retro-btn-primary flex-1 min-h-[44px] px-3.5 text-xs font-bold inline-flex items-center justify-center whitespace-nowrap"
            >
              SAVE CHANGES
            </button>
            <button
              type="button"
              onClick={() => {
                onCancelEdit();
                onAnnounce(`Canceled editing ${config.title}.`);
              }}
              className="retro-btn min-h-[44px] px-3.5 text-xs font-semibold inline-flex items-center justify-center whitespace-nowrap"
            >
              Cancel
            </button>
            {data.isEdited && (
              <button
                type="button"
                onClick={() => {
                  onResetEditedText();
                  onAnnounce(`Restored original ${config.title} text.`);
                }}
                className="retro-btn min-h-[44px] px-3 text-xs font-semibold inline-flex items-center justify-center whitespace-nowrap"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      ) : (
        <div
          ref={textWellRef}
          className={`bg-white border p-3 min-w-0 select-text transition-colors ${
            copyStatus === 'copied'
              ? 'border-[#15603A] bg-[#F0FBF3]'
              : 'border-[#ABA48E]'
          }`}
        >
          <p className="text-base leading-relaxed text-[#141B29] whitespace-pre-wrap break-words [overflow-wrap:anywhere] select-text">
            {data.text}
          </p>
        </div>
      )}

      {/* Inline Confirmation Before Overwriting Manual Edit */}
      {confirmingReplace && (
        <div
          role="region"
          aria-label={`Confirm replacing manual edits in ${config.title}`}
          className="bg-[#FFF8DE] border border-[#6B3A00] p-2.5 space-y-2"
        >
          <p className="text-xs text-[#3D2200] leading-relaxed">
            <strong>Replace your manual edit?</strong> Regenerating {config.title} will overwrite
            your changes.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setConfirmingReplace(false);
                onRegenerate();
              }}
              className="retro-btn-primary min-h-[44px] px-3 text-xs font-bold inline-flex items-center justify-center"
            >
              Replace Edit
            </button>
            <button
              type="button"
              onClick={() => setConfirmingReplace(false)}
              className="retro-btn min-h-[44px] px-3 text-xs font-semibold inline-flex items-center justify-center"
            >
              Keep Edit
            </button>
          </div>
        </div>
      )}

      {/* Regenerating Status Strip */}
      {isRegenerating && (
        <div
          role="status"
          aria-live="polite"
          className="bg-[#ECE8D9] border border-[#141B29] px-2.5 py-1.5 flex items-center gap-2"
        >
          <PixelHourglassIcon className="w-3.5 h-3.5 shrink-0" />
          <span className="font-mono text-xs font-semibold text-[#141B29]">
            Rewriting {config.title}...
          </span>
        </div>
      )}

      {/* Separate Compact Action Toolbar (Copy, Edit, Regenerate Icons) + Expandable Teach Me */}
      {!isEditing && (
        <div className="pt-1 border-t border-dashed border-[#C4BDA9] flex flex-wrap items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              disabled={isRegenerating || !data.text.trim()}
              aria-label={`Copy ${config.title}`}
              title={`Copy ${config.title}`}
              className={`retro-btn w-11 h-11 min-h-[44px] min-w-[44px] inline-flex items-center justify-center ${
                copyStatus === 'copied'
                  ? '!bg-[#D6F5DF] !border-[#15603A] !text-[#0F4224]'
                  : 'text-[#141B29]'
              }`}
            >
              {copyStatus === 'copied' ? (
                <PixelCheckIcon className="w-4 h-4" />
              ) : (
                <PixelCopyIcon className="w-4 h-4" />
              )}
            </button>

            <button
              type="button"
              onClick={handleEnterEdit}
              disabled={isDisabledActions}
              aria-label={`Edit ${config.title}`}
              title={`Edit ${config.title}`}
              className="retro-btn w-11 h-11 min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-[#141B29]"
            >
              <PixelEditIcon className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleRegenerateClick}
              disabled={isDisabledActions}
              aria-label={`Regenerate ${config.title}`}
              title={`Regenerate ${config.title}`}
              className="retro-btn w-11 h-11 min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-[#141B29]"
            >
              <PixelRefreshIcon className="w-4 h-4" />
            </button>
          </div>

          <span className="font-mono text-[11px] text-[#555043]">
            Copy &middot; Edit &middot; Redo
          </span>
        </div>
      )}

      {teachMe && !isEditing && (
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
