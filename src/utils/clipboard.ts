export interface CopyOutcome {
  ok: boolean;
  usedFallback?: boolean;
}

export async function copyTextToClipboard(text: string): Promise<CopyOutcome> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return { ok: true };
    } catch {
      // Fall through to execCommand fallback for restricted iframe contexts
    }
  }

  if (typeof document !== 'undefined') {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', 'true');
      textarea.style.position = 'fixed';
      textarea.style.top = '-9999px';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const succeeded = document.execCommand('copy');
      document.body.removeChild(textarea);
      if (succeeded) {
        return { ok: true, usedFallback: true };
      }
    } catch {
      return { ok: false };
    }
  }

  return { ok: false };
}
