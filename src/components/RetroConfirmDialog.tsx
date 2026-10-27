import { useEffect, useRef } from 'react';

interface RetroConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function RetroConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Keep My Edits',
  onConfirm,
  onCancel,
}: RetroConfirmDialogProps) {
  const cancelBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    cancelBtnRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#141B29]/60"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="retro-confirm-title"
        aria-describedby="retro-confirm-desc"
        className="retro-window w-full max-w-md overflow-hidden"
      >
        <div className="bg-[#142850] text-[#F7F5EC] px-3.5 py-2 flex items-center justify-between border-b-2 border-[#141B29]">
          <h2 id="retro-confirm-title" className="font-pixel text-xs sm:text-sm tracking-wide">
            {title}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close confirmation dialog"
            className="retro-btn px-2 py-0.5 text-xs font-bold leading-none whitespace-nowrap shrink-0"
          >
            X
          </button>
        </div>

        <div className="p-5 space-y-5">
          <p id="retro-confirm-desc" className="text-sm sm:text-base leading-relaxed text-[#141B29]">
            {message}
          </p>

          <div className="flex flex-wrap items-center justify-end gap-3 pt-2 border-t border-dashed border-[#ABA48E]">
            <button
              ref={cancelBtnRef}
              type="button"
              onClick={onCancel}
              className="retro-btn px-4 py-2 text-xs font-semibold whitespace-nowrap shrink-0"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="retro-btn-primary px-4 py-2 text-xs whitespace-nowrap shrink-0"
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
