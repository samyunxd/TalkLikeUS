import { ORDERED_MODE_CONFIGS } from '../config/modes';
import type { EditableModeState, VoiceMode } from '../types/transform';

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

export function formatAllResultsForClipboard(
  resultsMap: Record<VoiceMode, EditableModeState>,
  includeTeachMeNotes = false
): string {
  return ORDERED_MODE_CONFIGS.map((cfg) => {
    const entry = resultsMap[cfg.id];
    const body = entry?.text?.trim() || '';
    if (!includeTeachMeNotes || !entry?.explanations?.length) {
      return `${cfg.copyLabel}\n${body}`;
    }

    const notesLines = entry.explanations
      .map(
        (n) =>
          `  - "${n.replacement}" (from "${n.original}") [${n.type} · ${n.register.replace('_', ' ')}]: ${n.reason}`
      )
      .join('\n');

    const extraPattern = entry.reusablePattern
      ? `\n  Pattern: ${entry.reusablePattern}`
      : '';

    return `${cfg.copyLabel}\n${body}\n\nTEACH ME NOTES (${cfg.copyLabel}):\n${notesLines}${extraPattern}`;
  }).join('\n\n');
}
