export interface CopyOutcome {
  ok: boolean;
  usedFallback?: boolean;
}

export async function copyTextToClipboard(text: string): Promise<CopyOutcome> {
  if (!text) return { ok: false };

  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return { ok: true };
    } catch {
      // Fall through to mobile/iframe execCommand fallback
    }
  }

  if (typeof document !== 'undefined') {
    const scrollX = typeof window !== 'undefined' ? window.scrollX : 0;
    const scrollY = typeof window !== 'undefined' ? window.scrollY : 0;

    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.setAttribute('aria-hidden', 'true');
      // 16px prevents iOS Safari from auto-zooming during programmatic selection
      textarea.style.position = 'fixed';
      textarea.style.top = '0';
      textarea.style.left = '0';
      textarea.style.width = '1px';
      textarea.style.height = '1px';
      textarea.style.padding = '0';
      textarea.style.border = '0';
      textarea.style.opacity = '0';
      textarea.style.fontSize = '16px';
      textarea.style.pointerEvents = 'none';

      document.body.appendChild(textarea);
      textarea.focus({ preventScroll: true });
      textarea.select();
      textarea.setSelectionRange(0, textarea.value.length);

      const succeeded = document.execCommand('copy');
      document.body.removeChild(textarea);

      if (typeof window !== 'undefined') {
        window.scrollTo(scrollX, scrollY);
      }

      if (succeeded) {
        return { ok: true, usedFallback: true };
      }
    } catch {
      if (typeof window !== 'undefined') {
        window.scrollTo(scrollX, scrollY);
      }
      return { ok: false };
    }
  }

  return { ok: false };
}
