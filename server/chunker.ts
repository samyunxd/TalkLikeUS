import { CHUNK_THRESHOLD_CHARS, TARGET_CHUNK_CHARS } from '../src/config/modes.ts';
import { normalizeInputPreservingFormat } from './formatAnalyzer.ts';

export interface TextChunk {
  index: number;
  total: number;
  content: string;
  separatorAfter: string;
  previousContextTail: string;
}

function isWholeJsonDocument(text: string): boolean {
  const t = text.trim();
  if (
    !(t.startsWith('{') && t.endsWith('}')) &&
    !(t.startsWith('[') && t.endsWith(']'))
  ) {
    return false;
  }
  try {
    const parsed = JSON.parse(t) as unknown;
    return typeof parsed === 'object' && parsed !== null;
  } catch {
    return false;
  }
}

/**
 * Splits text into top-level blocks separated by blank lines while keeping
 * fenced code blocks (``` or ~~~) atomic even if they contain blank lines inside.
 * Preserves exact blank-line separator runs (\n\n, \n\n\n, etc.) and leading indentation.
 */
function splitIntoFormatSafeBlocks(text: string): Array<{ text: string; sep: string }> {
  const lines = text.split('\n');
  const blocks: Array<{ text: string; sep: string }> = [];

  let currentLines: string[] = [];
  let inFence = false;
  let fenceChar = '';
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const fenceMatch = line.match(/^[ \t]*(`{3,}|~{3,})/);

    if (fenceMatch) {
      const char = fenceMatch[1][0];
      if (!inFence) {
        inFence = true;
        fenceChar = char;
      } else if (char === fenceChar) {
        inFence = false;
        fenceChar = '';
      }
      currentLines.push(line);
      i++;
      continue;
    }

    if (inFence) {
      currentLines.push(line);
      i++;
      continue;
    }

    if (line.trim().length === 0) {
      let blankCount = 0;
      while (i < lines.length && lines[i].trim().length === 0) {
        blankCount++;
        i++;
      }
      if (currentLines.length > 0) {
        blocks.push({
          text: currentLines.join('\n'),
          sep: i < lines.length ? '\n'.repeat(blankCount + 1) : '',
        });
        currentLines = [];
      }
      continue;
    }

    currentLines.push(line);
    i++;
  }

  if (currentLines.length > 0) {
    blocks.push({
      text: currentLines.join('\n'),
      sep: '',
    });
  }

  return blocks;
}

/**
 * Groups lines in an oversized multi-line block (e.g., long bullet lists, numbered lists,
 * dialogues, subtitles, tables) into logical line units so indented continuation lines stay
 * attached to their parent list/speaker item, then packs them with '\n' separators.
 */
function splitOversizedMultiLineBlock(
  blockText: string,
  trailingSep: string
): Array<{ text: string; sep: string }> {
  const lines = blockText.split('\n');
  const logicalUnits: string[] = [];

  for (const line of lines) {
    const isListOrTurnStart =
      /^[ \t]*(?:[-*+•‣⁃▪▸▹→⇒–—]|\[[ xX]\]|\(\d{1,3}\)|\d{1,3}[.)]|#\d{1,3}|#{1,6}|\|)/.test(
        line
      ) || /^[ \t]*[A-Za-z0-9_][A-Za-z0-9_ .'/&-]{0,26}:[ \t]+/.test(line);
    const isIndentedContinuation =
      !isListOrTurnStart && /^[ \t]{2,}\S/.test(line) && logicalUnits.length > 0;

    if (isIndentedContinuation) {
      logicalUnits[logicalUnits.length - 1] += '\n' + line;
    } else {
      logicalUnits.push(line);
    }
  }

  const segments: Array<{ text: string; sep: string }> = [];
  let current = '';

  for (let u = 0; u < logicalUnits.length; u++) {
    const unit = logicalUnits[u];
    if (!current) {
      current = unit;
    } else if (current.length + 1 + unit.length <= TARGET_CHUNK_CHARS) {
      current += '\n' + unit;
    } else {
      segments.push({ text: current, sep: '\n' });
      current = unit;
    }
  }

  if (current) {
    segments.push({ text: current, sep: trailingSep });
  }

  return segments;
}

/**
 * Splits long text into meaning- and format-preserving chunks:
 * 1. Keeps whole JSON documents and fenced code blocks intact.
 * 2. Splits along blank-line block boundaries first while preserving exact separators.
 * 3. Splits oversized multi-line blocks (lists, dialogues, subtitles) on '\n' boundaries.
 * 4. Falls back to sentence boundaries only for giant single-line prose paragraphs.
 */
export function splitIntoMeaningPreservingChunks(rawText: string): TextChunk[] {
  const normalized = normalizeInputPreservingFormat(rawText);

  if (normalized.length <= CHUNK_THRESHOLD_CHARS || isWholeJsonDocument(normalized)) {
    return [
      {
        index: 0,
        total: 1,
        content: normalized,
        separatorAfter: '',
        previousContextTail: '',
      },
    ];
  }

  const blocks = splitIntoFormatSafeBlocks(normalized);
  const rawSegments: Array<{ text: string; sep: string }> = [];

  for (let i = 0; i < blocks.length; i++) {
    const { text: block, sep } = blocks[i];
    if (!block) continue;

    const isFencedBlock = /^[ \t]*(`{3,}|~{3,})/.test(block);

    if (block.length <= TARGET_CHUNK_CHARS || isFencedBlock) {
      rawSegments.push({ text: block, sep });
    } else if (block.includes('\n')) {
      rawSegments.push(...splitOversizedMultiLineBlock(block, sep));
    } else {
      const sentences = splitIntoSentences(block);
      let currentBlock = '';
      for (let s = 0; s < sentences.length; s++) {
        const sentence = sentences[s];
        if (!currentBlock) {
          currentBlock = sentence;
        } else if (currentBlock.length + 1 + sentence.length <= TARGET_CHUNK_CHARS) {
          currentBlock += ' ' + sentence;
        } else {
          rawSegments.push({ text: currentBlock, sep: ' ' });
          currentBlock = sentence;
        }
      }
      if (currentBlock) {
        rawSegments.push({ text: currentBlock, sep });
      }
    }
  }

  // Pack adjacent blocks together up to TARGET_CHUNK_CHARS to minimize API calls
  const packed: Array<{ text: string; sep: string }> = [];
  for (const seg of rawSegments) {
    const last = packed[packed.length - 1];
    if (
      last &&
      last.text.length + last.sep.length + seg.text.length <= TARGET_CHUNK_CHARS
    ) {
      last.text = last.text + last.sep + seg.text;
      last.sep = seg.sep;
    } else {
      packed.push({ ...seg });
    }
  }

  return packed.map((item, idx) => {
    const prevText = idx > 0 ? packed[idx - 1].text : '';
    const previousContextTail = prevText
      ? prevText.slice(Math.max(0, prevText.length - 280))
      : '';
    return {
      index: idx,
      total: packed.length,
      content: item.text,
      separatorAfter: item.sep,
      previousContextTail,
    };
  });
}

function splitIntoSentences(paragraph: string): string[] {
  const matches = paragraph.match(/[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g);
  if (!matches) return [paragraph];
  return matches.map((s) => s.trim()).filter(Boolean);
}
