import { MAX_INPUT_CHARS } from '../config/modes';

export interface TextMetrics {
  words: number;
  chars: number;
  paragraphs: number;
  isOverLimit: boolean;
  isLongChunked: boolean;
}

export function getTextMetrics(text: string): TextMetrics {
  const chars = text.length;
  const trimmed = text.trim();
  const words = trimmed ? trimmed.split(/\s+/).length : 0;
  const paragraphs = trimmed ? trimmed.split(/\n{2,}/).filter(Boolean).length : 0;

  return {
    words,
    chars,
    paragraphs,
    isOverLimit: chars > MAX_INPUT_CHARS,
    isLongChunked: chars > 4000 && chars <= MAX_INPUT_CHARS,
  };
}

export function normalizeClientTextPreservingFormat(raw: string): string {
  const unix = raw.replace(/\r\n?/g, '\n');
  if (unix.trim().length === 0) return '';

  const trimmedBoundaries = unix
    .replace(/^(?:[ \t]*\n)+/, '')
    .replace(/(?:\n[ \t]*)+$/, '')
    .replace(/[ \t]+$/, '');

  if (!trimmedBoundaries.includes('\n')) {
    return trimmedBoundaries.trim();
  }

  return trimmedBoundaries;
}

/**
 * Safely trims an oversized paste to the last complete paragraph, line, or sentence
 * within MAX_INPUT_CHARS so the user can recover in one click without mid-word/mid-item cuts.
 */
export function trimToSafeBoundary(text: string, limit = MAX_INPUT_CHARS): string {
  if (text.length <= limit) return text;
  const slice = text.slice(0, limit);

  const lastParaBreak = slice.lastIndexOf('\n\n');
  if (lastParaBreak > limit * 0.65) {
    return normalizeClientTextPreservingFormat(slice.slice(0, lastParaBreak));
  }

  const lastLineBreak = slice.lastIndexOf('\n');
  if (lastLineBreak > limit * 0.65) {
    return normalizeClientTextPreservingFormat(slice.slice(0, lastLineBreak));
  }

  const lastSentenceEnd = Math.max(
    slice.lastIndexOf('. '),
    slice.lastIndexOf('! '),
    slice.lastIndexOf('? ')
  );
  if (lastSentenceEnd > limit * 0.65) {
    return normalizeClientTextPreservingFormat(slice.slice(0, lastSentenceEnd + 1));
  }

  const lastSpace = slice.lastIndexOf(' ');
  return normalizeClientTextPreservingFormat(
    lastSpace > 0 ? slice.slice(0, lastSpace) : slice
  );
}

export interface SamplePrompt {
  id: string;
  label: string;
  shortLabel: string;
  text: string;
}

export const SAMPLE_PROMPTS: SamplePrompt[] = [
  {
    id: 'sudden',
    label: 'Sudden surprise',
    shortLabel: 'Surprise',
    text: "I don't know what to say because this happened so suddenly, and nobody informed me ahead of time.",
  },
  {
    id: 'frustrated',
    label: 'Wasted time',
    shortLabel: 'Wasted time',
    text: "I'm pissed off because they wasted my time for two weeks and didn't even bother telling me the meeting was canceled.",
  },
  {
    id: 'nuanced',
    label: 'Respectful disagreement',
    shortLabel: 'Pushback',
    text: 'I disagree with the decision they made on the launch schedule, but I still respect the person who made it and understand why they were cautious.',
  },
  {
    id: 'casual_plans',
    label: 'Changing weekend plans',
    shortLabel: 'Plans',
    text: 'I am very tired after working late all week, so I would prefer to stay at home tonight instead of going to the party, if you do not mind.',
  },
];
