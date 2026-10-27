import { CHUNK_THRESHOLD_CHARS, TARGET_CHUNK_CHARS } from '../src/config/modes.ts';

export interface TextChunk {
  index: number;
  total: number;
  content: string;
  separatorAfter: string;
  previousContextTail: string;
}

/**
 * Splits long text into meaning-preserving chunks along paragraph boundaries first,
 * falling back to sentence boundaries only when a single paragraph exceeds target size.
 * Never truncates or drops source text.
 */
export function splitIntoMeaningPreservingChunks(rawText: string): TextChunk[] {
  const normalized = rawText.replace(/\r\n/g, '\n').trim();

  if (normalized.length <= CHUNK_THRESHOLD_CHARS) {
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

  // Split into paragraphs while keeping track of paragraph breaks
  const paragraphs = normalized.split(/\n{2,}/);
  const rawSegments: Array<{ text: string; sep: string }> = [];

  for (let i = 0; i < paragraphs.length; i++) {
    const para = paragraphs[i].trim();
    if (!para) continue;
    const isLastPara = i === paragraphs.length - 1;

    if (para.length <= TARGET_CHUNK_CHARS) {
      rawSegments.push({
        text: para,
        sep: isLastPara ? '' : '\n\n',
      });
    } else {
      // Split an oversized single paragraph cleanly on sentence boundaries
      const sentences = splitIntoSentences(para);
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
        rawSegments.push({
          text: currentBlock,
          sep: isLastPara ? '' : '\n\n',
        });
      }
    }
  }

  // Pack adjacent paragraphs together up to TARGET_CHUNK_CHARS to minimize API calls
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
