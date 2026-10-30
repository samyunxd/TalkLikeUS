export type FormatArchetype =
  | 'single_paragraph'
  | 'multi_paragraph'
  | 'line_by_line'
  | 'bullet_list'
  | 'numbered_list'
  | 'checklist'
  | 'email_or_letter'
  | 'dialogue_or_chat_log'
  | 'qa_format'
  | 'labeled_fields'
  | 'markdown_document'
  | 'markdown_table'
  | 'code_or_fenced'
  | 'json_payload'
  | 'html_markup'
  | 'subtitles';

export type LineSlotKind =
  | 'blank'
  | 'code_fence'
  | 'code_line'
  | 'subtitle_meta'
  | 'table_separator'
  | 'table_row'
  | 'horizontal_rule'
  | 'markdown_heading'
  | 'checklist_item'
  | 'bullet_item'
  | 'numbered_item'
  | 'blockquote'
  | 'email_header'
  | 'qa_turn'
  | 'timestamped_turn'
  | 'labeled_line'
  | 'email_greeting'
  | 'email_signoff'
  | 'email_signature'
  | 'prose_line';

export interface LineSlot {
  lineNumber: number;
  kind: LineSlotKind;
  prefix: string;
  indent: string;
  rawLine: string;
}

export interface FormatProfile {
  archetypes: FormatArchetype[];
  isStructured: boolean;
  isJsonPayload: boolean;
  jsonIndent: string | number | null;
  isOuterFencedBlock: boolean;
  outerFenceHeader: string | null;
  outerQuote: '"' | "'" | '“' | null;
  hasHtmlMarkup: boolean;
  isSubtitles: boolean;
  hasMarkdownTable: boolean;
  fencedCodeBlockCount: number;
  totalLines: number;
  nonBlankLines: number;
  paragraphBlocks: number;
  hasIntentionalSingleLineBreaks: boolean;
  bulletCount: number;
  checklistCount: number;
  numberedCount: number;
  headingCount: number;
  blockquoteCount: number;
  qaCount: number;
  labeledLineCount: number;
  hasEmailHeader: boolean;
  hasEmailGreeting: boolean;
  hasEmailSignoff: boolean;
  hasBoldMarkdown: boolean;
  hasItalicMarkdown: boolean;
  hasInlineCode: boolean;
  hasMarkdownLinks: boolean;
  protectedTokens: string[];
  lineSlots: LineSlot[];
}

const STANDALONE_FIELD_LABELS = new Set([
  'note',
  'notes',
  'ps',
  'p.s',
  'p.s.',
  'tl;dr',
  'tldr',
  'summary',
  'title',
  'headline',
  'subheadline',
  'subtitle',
  'caption',
  'cta',
  'hook',
  'goal',
  'objective',
  'context',
  'background',
  'problem',
  'solution',
  'pros',
  'cons',
  'status',
  'update',
  'reminder',
  'warning',
  'important',
  'tip',
  'action',
  'action item',
  'action items',
  'next steps',
  'bio',
  'prompt',
  'description',
  'location',
  'time',
  'agenda',
]);

const DIALOGUE_ROLE_WORDS = new Set([
  'me',
  'you',
  'him',
  'her',
  'them',
  'boss',
  'manager',
  'client',
  'customer',
  'user',
  'agent',
  'support',
  'interviewer',
  'candidate',
  'host',
  'guest',
  'doctor',
  'patient',
  'teacher',
  'student',
  'friend',
  'mom',
  'dad',
  'narrator',
  'speaker',
  'person',
]);

const NON_LABEL_CLAUSE_STARTERS = new Set([
  'however',
  'therefore',
  'furthermore',
  'meanwhile',
  'remember',
  'imagine',
  'consider',
  'think',
  'look',
  'listen',
  'here',
  'there',
  'this',
  'that',
  'these',
  'those',
]);

/**
 * Normalizes line endings and trims outer blank lines without stripping
 * intentional leading indentation on multi-line inputs.
 */
export function normalizeInputPreservingFormat(raw: string): string {
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

function detectOuterQuote(text: string): '"' | "'" | '“' | null {
  const t = text.trim();
  if (t.length < 3) return null;

  if (t.startsWith('"') && t.endsWith('"')) {
    const quoteCount = (t.match(/"/g) || []).length;
    if (quoteCount === 2) return '"';
  }

  if (t.startsWith('“') && t.endsWith('”')) {
    const openCount = (t.match(/“/g) || []).length;
    const closeCount = (t.match(/”/g) || []).length;
    if (openCount === 1 && closeCount === 1) return '“';
  }

  if (t.startsWith("'") && t.endsWith("'") && !t.includes('\n')) {
    const inner = t.slice(1, -1);
    if (!inner.startsWith("'") && !inner.endsWith("'") && !/'\s/.test(inner)) {
      return "'";
    }
  }

  return null;
}

function detectJsonPayload(text: string): {
  isJson: boolean;
  indent: string | number | null;
} {
  const trimmed = text.trim();
  if (
    !(trimmed.startsWith('{') && trimmed.endsWith('}')) &&
    !(trimmed.startsWith('[') && trimmed.endsWith(']'))
  ) {
    return { isJson: false, indent: null };
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (typeof parsed !== 'object' || parsed === null) {
      return { isJson: false, indent: null };
    }
    if (!trimmed.includes('\n')) {
      return { isJson: true, indent: 0 };
    }
    const indentMatch = trimmed.match(/\n([ \t]+)"/);
    if (indentMatch) {
      return {
        isJson: true,
        indent: indentMatch[1].includes('\t') ? '\t' : indentMatch[1].length,
      };
    }
    return { isJson: true, indent: 2 };
  } catch {
    return { isJson: false, indent: null };
  }
}

function isHardWrappedProseBlock(lines: string[]): boolean {
  if (lines.length < 3) return false;
  let wrappedContinuations = 0;
  for (let i = 0; i < lines.length - 1; i++) {
    const curr = lines[i].trimEnd();
    const next = lines[i + 1].trimStart();
    if (
      curr.length >= 62 &&
      !/[.!?:,;)\]"'”’]$/.test(curr) &&
      /^[a-z]/.test(next)
    ) {
      wrappedContinuations++;
    }
  }
  return wrappedContinuations >= Math.ceil((lines.length - 1) * 0.6);
}

function extractProtectedTokens(textOutsideCode: string): string[] {
  const found = new Set<string>();

  const patterns = [
    /https?:\/\/[^\s)>\]"']+/g,
    /\{\{[^{}\n]{1,50}\}\}/g,
    /\$\{[^{}\n]{1,50}\}/g,
    /\{[A-Za-z_][\w.-]{0,40}\}/g,
    /(?:^|\s)(@[A-Za-z0-9_.-]{1,35})\b/g,
    /(?:^|\s)(#[A-Za-z][\w-]{1,35})\b/g,
    /\[(?:Name|Client|Company|Recipient|Sender|Date|Time|Link|URL|Email|Phone|Price|Amount|Product|Team|Role|Placeholder)[^\]]*\]/gi,
  ];

  for (const regex of patterns) {
    const matches = textOutsideCode.matchAll(regex);
    for (const m of matches) {
      const token = (m[1] || m[0]).trim();
      if (token) found.add(token);
      if (found.size >= 16) break;
    }
    if (found.size >= 16) break;
  }

  return Array.from(found);
}

export function analyzeTextFormat(rawText: string): FormatProfile {
  const text = normalizeInputPreservingFormat(rawText);
  const lines = text ? text.split('\n') : [''];

  const outerFenceMatch = text.match(/^([ \t]*(`{3,}|~{3,})[^\n]*)\n([\s\S]*?)\n[ \t]*\2[ \t]*$/);
  const isOuterFencedBlock = Boolean(outerFenceMatch);
  const outerFenceHeader = outerFenceMatch ? outerFenceMatch[1] : null;

  const { isJson: isJsonPayload, indent: jsonIndent } = detectJsonPayload(text);
  const outerQuote = !isJsonPayload && !isOuterFencedBlock ? detectOuterQuote(text) : null;

  const isSubtitles =
    !isJsonPayload &&
    (/\b\d{1,2}:\d{2}:\d{2}[,.]\d{3}\s*-->\s*\d{1,2}:\d{2}:\d{2}[,.]\d{3}\b/.test(text) ||
      /^WEBVTT\b/m.test(text));

  const hasHtmlMarkup =
    !isJsonPayload &&
    (/<([a-zA-Z][\w:-]*)(?:\s[^<>]*)?>[\s\S]*?<\/\1>/.test(text) ||
      /<(?:div|p|span|h[1-6]|ul|ol|li|section|article|blockquote|strong|em|a|br|hr|table|tr|td|th)\b[^<>]*>/i.test(
        text
      ));

  const pipeLines = lines.filter((l) => /^\s*\|.+\|\s*$/.test(l));
  const hasTableSeparator = lines.some((l) => /^\s*\|[\s:|-]+\|\s*$/.test(l));
  const hasMarkdownTable =
    !isJsonPayload &&
    ((pipeLines.length >= 2 && hasTableSeparator) || pipeLines.length >= 3);

  // Pre-scan for multi-line lettered/Roman lists & repeated colon-labeled lines
  let letterOrRomanCandidates = 0;
  const colonCandidates: Array<{ lineIdx: number; label: string }> = [];

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (/^[ \t]*(?:\([a-zA-Z]\)|[a-zA-Z][.)]|\(?[IVXLCDMivxlcdm]{1,5}[.)])[ \t]+\S/.test(l)) {
      letterOrRomanCandidates++;
    }
    const colonMatch = l.match(/^([ \t]*([A-Za-z0-9_][A-Za-z0-9_ .'/&-]{0,26}):[ \t]+)(.+)$/);
    if (colonMatch) {
      const labelClean = colonMatch[2].trim();
      const words = labelClean.split(/\s+/);
      const firstLower = words[0].toLowerCase();
      if (words.length <= 4 && !NON_LABEL_CLAUSE_STARTERS.has(firstLower)) {
        colonCandidates.push({ lineIdx: i, label: labelClean });
      }
    }
  }

  const allowLetterOrRomanLists = letterOrRomanCandidates >= 2;
  const allowMultiLineColonLabels = colonCandidates.length >= 2;

  const lineSlots: LineSlot[] = [];
  const linesOutsideCode: string[] = [];
  let inCodeFence = false;
  let activeFenceMarker = '';
  let fencedCodeBlockCount = 0;

  // Identify indices of first and last non-blank lines for greeting/sign-off heuristics
  const nonBlankIndices: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().length > 0) nonBlankIndices.push(i);
  }
  const topWindowSet = new Set(nonBlankIndices.slice(0, 4));
  const bottomWindowSet = new Set(nonBlankIndices.slice(Math.max(0, nonBlankIndices.length - 4)));

  let signoffLineIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const indent = line.match(/^([ \t]*)/)?.[1] ?? '';

    const fenceMatch = line.match(/^[ \t]*(`{3,}|~{3,})/);
    if (fenceMatch) {
      const markerChar = fenceMatch[1][0];
      if (!inCodeFence) {
        inCodeFence = true;
        activeFenceMarker = markerChar;
        fencedCodeBlockCount++;
        lineSlots.push({
          lineNumber: i + 1,
          kind: 'code_fence',
          prefix: line,
          indent,
          rawLine: line,
        });
        continue;
      } else if (markerChar === activeFenceMarker) {
        inCodeFence = false;
        activeFenceMarker = '';
        lineSlots.push({
          lineNumber: i + 1,
          kind: 'code_fence',
          prefix: line,
          indent,
          rawLine: line,
        });
        continue;
      }
    }

    if (inCodeFence) {
      lineSlots.push({
        lineNumber: i + 1,
        kind: 'code_line',
        prefix: indent,
        indent,
        rawLine: line,
      });
      continue;
    }

    linesOutsideCode.push(line);

    if (line.trim().length === 0) {
      lineSlots.push({
        lineNumber: i + 1,
        kind: 'blank',
        prefix: '',
        indent: '',
        rawLine: line,
      });
      continue;
    }

    if (
      isSubtitles &&
      (/^\s*\d+\s*$/.test(line) || /-->/.test(line) || /^WEBVTT\b/.test(line))
    ) {
      lineSlots.push({
        lineNumber: i + 1,
        kind: 'subtitle_meta',
        prefix: line,
        indent,
        rawLine: line,
      });
      continue;
    }

    if (hasMarkdownTable && /^\s*\|[\s:|-]+\|\s*$/.test(line)) {
      lineSlots.push({
        lineNumber: i + 1,
        kind: 'table_separator',
        prefix: line,
        indent,
        rawLine: line,
      });
      continue;
    }

    if (hasMarkdownTable && /^\s*\|.+\|\s*$/.test(line)) {
      lineSlots.push({
        lineNumber: i + 1,
        kind: 'table_row',
        prefix: '|',
        indent,
        rawLine: line,
      });
      continue;
    }

    if (/^[ \t]*(?:-{3,}|\*{3,}|_{3,})[ \t]*$/.test(line)) {
      lineSlots.push({
        lineNumber: i + 1,
        kind: 'horizontal_rule',
        prefix: line,
        indent,
        rawLine: line,
      });
      continue;
    }

    const headingMatch = line.match(/^([ \t]*#{1,6}[ \t]+)(.+)$/);
    if (headingMatch) {
      lineSlots.push({
        lineNumber: i + 1,
        kind: 'markdown_heading',
        prefix: headingMatch[1],
        indent,
        rawLine: line,
      });
      continue;
    }

    const checklistMatch = line.match(
      /^([ \t]*(?:[-*+•][ \t]+)?\[[ xX]\][ \t]+|[ \t]*[☐☑✓✔✗✘][ \t]+)(.+)$/
    );
    if (checklistMatch) {
      lineSlots.push({
        lineNumber: i + 1,
        kind: 'checklist_item',
        prefix: checklistMatch[1],
        indent,
        rawLine: line,
      });
      continue;
    }

    const bulletMatch = line.match(/^([ \t]*(?:[-*+•‣⁃▪▸▹→⇒–—])[ \t]+)(.+)$/);
    if (bulletMatch) {
      lineSlots.push({
        lineNumber: i + 1,
        kind: 'bullet_item',
        prefix: bulletMatch[1],
        indent,
        rawLine: line,
      });
      continue;
    }

    const numericListMatch =
      line.match(/^([ \t]*(?:\(\d{1,3}\)|\d{1,3}[.)]|#\d{1,3})[ \t]+)(.+)$/) ||
      line.match(
        /^([ \t]*(?:Step|Item|Point|Part|Rule|Tip|Phase|Option)[ \t]+\d{1,3}[ \t]*[:.)-][ \t]+)(.+)$/i
      ) ||
      (allowLetterOrRomanLists
        ? line.match(/^([ \t]*(?:\([a-zA-Z]\)|[a-zA-Z][.)]|\(?[IVXLCDMivxlcdm]{1,5}[.)])[ \t]+)(.+)$/)
        : null);

    if (numericListMatch) {
      lineSlots.push({
        lineNumber: i + 1,
        kind: 'numbered_item',
        prefix: numericListMatch[1],
        indent,
        rawLine: line,
      });
      continue;
    }

    const blockquoteMatch = line.match(/^([ \t]*>+[ \t]*)(.*)$/);
    if (blockquoteMatch) {
      lineSlots.push({
        lineNumber: i + 1,
        kind: 'blockquote',
        prefix: blockquoteMatch[1],
        indent,
        rawLine: line,
      });
      continue;
    }

    if (topWindowSet.has(i)) {
      const emailHeaderMatch = line.match(
        /^([ \t]*(?:Subject|Re|To|From|Cc|Bcc|Date)[ \t]*:[ \t]*)(.*)$/i
      );
      if (emailHeaderMatch) {
        lineSlots.push({
          lineNumber: i + 1,
          kind: 'email_header',
          prefix: emailHeaderMatch[1],
          indent,
          rawLine: line,
        });
        continue;
      }
    }

    const qaMatch = line.match(/^([ \t]*(?:Q|A|Question|Answer)\d*[ \t]*[:.-][ \t]+)(.+)$/i);
    if (qaMatch) {
      lineSlots.push({
        lineNumber: i + 1,
        kind: 'qa_turn',
        prefix: qaMatch[1],
        indent,
        rawLine: line,
      });
      continue;
    }

    const timestampTurnMatch = line.match(
      /^([ \t]*(?:\[\d{1,2}:\d{2}(?::\d{2})?(?:\s*[APap][Mm])?\]|\(\d{1,2}:\d{2}(?::\d{2})?\))[ \t]*(?:[^:\n]{1,28}:[ \t]+)?)(.+)$/
    );
    if (timestampTurnMatch) {
      lineSlots.push({
        lineNumber: i + 1,
        kind: 'timestamped_turn',
        prefix: timestampTurnMatch[1],
        indent,
        rawLine: line,
      });
      continue;
    }

    const colonMatch = line.match(/^([ \t]*([A-Za-z0-9_][A-Za-z0-9_ .'/&-]{0,26}):[ \t]+)(.+)$/);
    if (colonMatch) {
      const rawLabel = colonMatch[2].trim();
      const labelLower = rawLabel.toLowerCase();
      const words = rawLabel.split(/\s+/);
      const firstLower = words[0].toLowerCase();

      const isKnownLabel =
        STANDALONE_FIELD_LABELS.has(labelLower) || DIALOGUE_ROLE_WORDS.has(labelLower);
      const isQualifiedMultiColon =
        allowMultiLineColonLabels &&
        words.length <= 4 &&
        !NON_LABEL_CLAUSE_STARTERS.has(firstLower);

      if (isKnownLabel || isQualifiedMultiColon) {
        lineSlots.push({
          lineNumber: i + 1,
          kind: 'labeled_line',
          prefix: colonMatch[1],
          indent,
          rawLine: line,
        });
        continue;
      }
    }

    if (
      nonBlankIndices.length >= 2 &&
      topWindowSet.has(i) &&
      line.trim().split(/\s+/).length <= 8 &&
      /^[ \t]*(?:Dear|Hi|Hello|Hey|Good\s+(?:morning|afternoon|evening)|Greetings|To\s+whom\s+it\s+may\s+concern)\b[^\n]{0,42}[,:!]?[ \t]*$/i.test(
        line
      )
    ) {
      lineSlots.push({
        lineNumber: i + 1,
        kind: 'email_greeting',
        prefix: indent,
        indent,
        rawLine: line,
      });
      continue;
    }

    if (
      nonBlankIndices.length >= 2 &&
      bottomWindowSet.has(i) &&
      signoffLineIndex === -1 &&
      /^[ \t]*(?:Best(?:\s+regards|\s+wishes)?|Kind\s+regards|Warm\s+regards|Regards|Sincerely|Yours(?:\s+truly|\s+sincerely)?|Thanks(?:\s+again|\s+so\s+much|\s+in\s+advance)?|Thank\s+you(?:\s+so\s+much|\s+again)?|Cheers|Respectfully|Talk\s+soon|Speak\s+soon|Take\s+care|Warmly|Many\s+thanks|With\s+gratitude)[ \t]*[,!]?[ \t]*$/i.test(
        line
      )
    ) {
      signoffLineIndex = i;
      lineSlots.push({
        lineNumber: i + 1,
        kind: 'email_signoff',
        prefix: indent,
        indent,
        rawLine: line,
      });
      continue;
    }

    if (
      signoffLineIndex !== -1 &&
      i > signoffLineIndex &&
      line.trim().split(/\s+/).length <= 7
    ) {
      lineSlots.push({
        lineNumber: i + 1,
        kind: 'email_signature',
        prefix: indent,
        indent,
        rawLine: line,
      });
      continue;
    }

    lineSlots.push({
      lineNumber: i + 1,
      kind: 'prose_line',
      prefix: indent,
      indent,
      rawLine: line,
    });
  }

  const textOutsideCode = linesOutsideCode.join('\n');
  const hasBoldMarkdown = /\*\*[^*\n]+\*\*|__[^_\n]+__/.test(textOutsideCode);
  const hasItalicMarkdown =
    /(?:^|[^*])\*[^*\s][^*\n]*\*(?!\*)|(?:^|[^_])_[^_\s][^_\n]*_(?!_)/.test(textOutsideCode);
  const hasInlineCode = /`[^`\n]+`/.test(textOutsideCode);
  const hasMarkdownLinks = /\[[^\]\n]+\]\(https?:\/\/[^\s)]+\)/.test(textOutsideCode);
  const protectedTokens = extractProtectedTokens(textOutsideCode);

  const countByKind = (kind: LineSlotKind) =>
    lineSlots.filter((s) => s.kind === kind).length;

  const bulletCount = countByKind('bullet_item');
  const checklistCount = countByKind('checklist_item');
  const numberedCount = countByKind('numbered_item');
  const headingCount = countByKind('markdown_heading');
  const blockquoteCount = countByKind('blockquote');
  const qaCount = countByKind('qa_turn');
  const timestampTurnCount = countByKind('timestamped_turn');
  const labeledLineCount = countByKind('labeled_line');
  const hasEmailHeader = countByKind('email_header') > 0;
  const hasEmailGreeting = countByKind('email_greeting') > 0;
  const hasEmailSignoff = countByKind('email_signoff') > 0;

  const rawBlocks = text ? text.split(/\n{2,}/).filter((b) => b.trim().length > 0) : [];
  const paragraphBlocks = rawBlocks.length;

  // Check if any block has intentional single-\n breaks (vs hard-wrapped PDF prose)
  let hasIntentionalSingleLineBreaks = false;
  for (const block of rawBlocks) {
    const blockLines = block.split('\n');
    if (blockLines.length >= 2 && !isHardWrappedProseBlock(blockLines)) {
      hasIntentionalSingleLineBreaks = true;
      break;
    }
  }

  // Classify high-level archetypes
  const archetypes: FormatArchetype[] = [];
  if (isJsonPayload) archetypes.push('json_payload');
  if (hasHtmlMarkup) archetypes.push('html_markup');
  if (isSubtitles) archetypes.push('subtitles');
  if (isOuterFencedBlock || fencedCodeBlockCount > 0) archetypes.push('code_or_fenced');
  if (hasMarkdownTable) archetypes.push('markdown_table');
  if (hasEmailHeader || hasEmailGreeting || hasEmailSignoff) {
    archetypes.push('email_or_letter');
  }
  if (checklistCount > 0) archetypes.push('checklist');
  if (bulletCount > 0) archetypes.push('bullet_list');
  if (numberedCount > 0) archetypes.push('numbered_list');
  if (qaCount > 0) archetypes.push('qa_format');

  if (timestampTurnCount > 0 || labeledLineCount > 0) {
    // Determine whether labeled lines look more like conversational dialogue or key-value fields
    const labels = lineSlots
      .filter((s) => s.kind === 'labeled_line')
      .map((s) => s.prefix.replace(/:[ \t]*$/, '').trim().toLowerCase());
    const uniqueLabels = new Set(labels);
    const hasRepeatedSpeaker = labels.length > uniqueLabels.size;
    const hasDialogueRole = labels.some((l) => DIALOGUE_ROLE_WORDS.has(l));
    const hasFieldKeyword = labels.some((l) => STANDALONE_FIELD_LABELS.has(l));

    if (timestampTurnCount > 0 || hasRepeatedSpeaker || (hasDialogueRole && !hasFieldKeyword)) {
      archetypes.push('dialogue_or_chat_log');
    } else {
      archetypes.push('labeled_fields');
    }
  }

  if (
    headingCount > 0 ||
    blockquoteCount > 0 ||
    hasBoldMarkdown ||
    hasItalicMarkdown ||
    hasInlineCode ||
    hasMarkdownLinks ||
    countByKind('horizontal_rule') > 0
  ) {
    archetypes.push('markdown_document');
  }

  if (archetypes.length === 0) {
    if (hasIntentionalSingleLineBreaks) {
      archetypes.push('line_by_line');
    } else if (paragraphBlocks >= 2) {
      archetypes.push('multi_paragraph');
    } else {
      archetypes.push('single_paragraph');
    }
  } else if (hasIntentionalSingleLineBreaks && paragraphBlocks >= 2) {
    // Multi-block structured layout already captured by specific archetypes
  }

  const isStructured = !(
    archetypes.length === 1 && archetypes[0] === 'single_paragraph'
  );

  return {
    archetypes,
    isStructured,
    isJsonPayload,
    jsonIndent,
    isOuterFencedBlock,
    outerFenceHeader,
    outerQuote,
    hasHtmlMarkup,
    isSubtitles,
    hasMarkdownTable,
    fencedCodeBlockCount,
    totalLines: lines.length,
    nonBlankLines: nonBlankIndices.length,
    paragraphBlocks,
    hasIntentionalSingleLineBreaks,
    bulletCount,
    checklistCount,
    numberedCount,
    headingCount,
    blockquoteCount,
    qaCount,
    labeledLineCount,
    hasEmailHeader,
    hasEmailGreeting,
    hasEmailSignoff,
    hasBoldMarkdown,
    hasItalicMarkdown,
    hasInlineCode,
    hasMarkdownLinks,
    protectedTokens,
    lineSlots,
  };
}

function describeSlotForLineMap(slot: LineSlot): string {
  const escapedPrefix = JSON.stringify(slot.prefix);
  switch (slot.kind) {
    case 'blank':
      return '[BLANK LINE]';
    case 'code_fence':
      return `Code fence delimiter ${escapedPrefix} (keep verbatim)`;
    case 'code_line':
      return 'Code line inside fence (keep code verbatim)';
    case 'subtitle_meta':
      return `Subtitle cue/timestamp ${JSON.stringify(slot.rawLine.trim())} (keep verbatim)`;
    case 'table_separator':
      return `Markdown table separator ${JSON.stringify(slot.rawLine.trim())} (keep verbatim)`;
    case 'table_row':
      return 'Markdown table row "| ... |" (keep exact pipe columns, rewrite cell prose)';
    case 'horizontal_rule':
      return `Horizontal divider ${JSON.stringify(slot.rawLine.trim())} (keep verbatim)`;
    case 'markdown_heading':
      return `Heading prefix ${escapedPrefix} + rewritten heading`;
    case 'checklist_item':
      return `Checklist prefix ${escapedPrefix} + rewritten item`;
    case 'bullet_item':
      return `Bullet prefix ${escapedPrefix} + rewritten item`;
    case 'numbered_item':
      return `Numbered/ordered prefix ${escapedPrefix} + rewritten item`;
    case 'blockquote':
      return slot.rawLine.trim() === '>'
        ? 'Empty blockquote line ">"'
        : `Blockquote prefix ${escapedPrefix} + rewritten quote line`;
    case 'email_header':
      return `Header prefix ${escapedPrefix} + rewritten header value`;
    case 'qa_turn':
      return `Q&A prefix ${escapedPrefix} + rewritten text`;
    case 'timestamped_turn':
      return `Timestamp/speaker prefix ${escapedPrefix} (keep verbatim) + rewritten message`;
    case 'labeled_line':
      return `Label/speaker prefix ${escapedPrefix} (keep prefix intact) + rewritten content`;
    case 'email_greeting':
      return 'Greeting / salutation line (adapt naturally to voice; keep recipient name)';
    case 'email_signoff':
      return 'Sign-off / closing line (adapt naturally to voice)';
    case 'email_signature':
      return `Sender signature line ${JSON.stringify(slot.rawLine)} (preserve name/details)`;
    case 'prose_line':
      return slot.indent
        ? `Indented text line (keep leading indent ${JSON.stringify(slot.indent)})`
        : 'Text / paragraph line';
  }
}

/**
 * Generates an explicit, deterministic Format Recognition & Mirroring prompt section
 * tailored to the exact structure of the user's input.
 */
export function buildFormatBlueprintPromptBlock(
  profile: FormatProfile,
  chatMode: boolean
): string {
  const inlineNotes: string[] = [];

  if (profile.hasBoldMarkdown || profile.hasItalicMarkdown) {
    inlineNotes.push(
      'Preserve Markdown emphasis (`**bold**`, `*italic*`) around the corresponding emphasized phrases.'
    );
  }
  if (profile.hasInlineCode) {
    inlineNotes.push('Keep inline backtick code spans (`` `...` ``) verbatim.');
  }
  if (profile.hasMarkdownLinks) {
    inlineNotes.push(
      'Preserve Markdown link syntax `[anchor](url)` with the exact URL untouched.'
    );
  }
  if (profile.protectedTokens.length > 0) {
    inlineNotes.push(
      `Keep literal tokens/placeholders intact in place: ${profile.protectedTokens
        .slice(0, 10)
        .join(', ')}.`
    );
  }

  // Case 1: Plain single-paragraph input
  if (!profile.isStructured) {
    const quoteRule = profile.outerQuote
      ? `The source is wrapped in ${profile.outerQuote}...${
          profile.outerQuote === '“' ? '”' : profile.outerQuote
        } quotation marks—keep the output wrapped in matching quotation marks.`
      : 'Do NOT wrap the output in quotation marks.';

    return `DETECTED INPUT FORMAT — SINGLE-PARAGRAPH PLAIN TEXT:
- Return a single clean ${
      chatMode ? 'compressed text message / fragment' : 'paragraph'
    } with NO invented bullet points, NO numbering, NO headings, NO speaker labels, and NO added line breaks.
- ${quoteRule}${inlineNotes.length > 0 ? '\n- ' + inlineNotes.join('\n- ') : ''}`;
  }

  // Case 2: JSON payload
  if (profile.isJsonPayload) {
    return `DETECTED INPUT FORMAT — STRUCTURED JSON PAYLOAD (MANDATORY FORMAT LOCK):
- Return ONLY valid raw JSON matching the exact schema, object keys, array order, booleans, numbers, and ${
      profile.jsonIndent === 0 ? 'single-line minified' : 'pretty-printed'
    } formatting of the source.
- NEVER wrap the JSON in \`\`\`json markdown fences unless the source itself had fences.
- Do NOT rename, add, or remove any JSON keys. Rewrite ONLY the natural-language string values into each target American voice${
      chatMode ? ' (using concise American chat/texting compression inside each string value)' : ''
    }.${inlineNotes.length > 0 ? '\n- ' + inlineNotes.join('\n- ') : ''}`;
  }

  // Case 3: Rich structured / multi-line / multi-paragraph input
  const rules: string[] = [
    `Detected Format Archetype(s): ${profile.archetypes.join(', ')} (${profile.totalLines} total lines, ${profile.paragraphBlocks} block(s)).`,
    `MANDATORY 1:1 FORMAT MIRRORING: Your output in EVERY mode MUST mirror the exact structural format, line breaks (\\n), blank-line spacing (\\n\\n), and indentation of <source_text_to_transform>.`,
    chatMode
      ? `CHAT MODE + STRUCTURED INPUT RULE: Do NOT collapse lists, multi-line layouts, emails, dialogues, or paragraphs into a single blob! Keep every bullet, number, header, speaker turn, paragraph break, and line break in its exact slot while compressing the prose INSIDE each individual item/line into punchy American texting shorthand.`
      : `Never flatten lists, emails, dialogues, headers, or intentional line breaks into a plain paragraph, and never invent extra bullets or headings that were not in the source.`,
  ];

  if (profile.isOuterFencedBlock && profile.outerFenceHeader) {
    rules.push(
      `The entire input is enclosed in a fenced block starting with ${JSON.stringify(
        profile.outerFenceHeader
      )}—keep the exact opening and closing fence delimiters.`
    );
  } else if (profile.fencedCodeBlockCount > 0) {
    rules.push(
      `Preserve all ${profile.fencedCodeBlockCount} fenced code block(s) (\`\`\`...\`\`\`) and the code inside them verbatim.`
    );
  } else {
    rules.push('Do NOT wrap your output in ``` markdown code fences.');
  }

  if (profile.bulletCount > 0 || profile.checklistCount > 0) {
    const uniqueBullets = Array.from(
      new Set(
        profile.lineSlots
          .filter((s) => s.kind === 'bullet_item' || s.kind === 'checklist_item')
          .map((s) => JSON.stringify(s.prefix))
      )
    ).slice(0, 6);
    rules.push(
      `Preserve all ${
        profile.bulletCount + profile.checklistCount
      } bullet/checklist items in exact 1-to-1 order using the EXACT same marker prefixes and indentation (${uniqueBullets.join(
        ', '
      )}).`
    );
  }

  if (profile.numberedCount > 0) {
    const sampleNumbers = profile.lineSlots
      .filter((s) => s.kind === 'numbered_item')
      .slice(0, 5)
      .map((s) => JSON.stringify(s.prefix));
    rules.push(
      `Preserve all ${
        profile.numberedCount
      } ordered/numbered list items in exact 1-to-1 sequence using the EXACT numbering punctuation & indentation (${sampleNumbers.join(
        ', '
      )}${profile.numberedCount > 5 ? ', ...' : ''}). Do NOT swap "1)" to "1." or reset item numbers.`
    );
  }

  if (profile.hasEmailHeader || profile.hasEmailGreeting || profile.hasEmailSignoff) {
    rules.push(
      `Preserve the full email/letter layout in exact position: ${[
        profile.hasEmailHeader ? 'top header line(s) (e.g., "Subject: ")' : '',
        profile.hasEmailGreeting ? 'greeting/salutation line (keeping recipient name)' : '',
        'body paragraphs/lists',
        profile.hasEmailSignoff
          ? 'sign-off line + exact sender name/signature at the bottom'
          : '',
      ]
        .filter(Boolean)
        .join(', ')}, separated by matching blank lines.`
    );
  }

  if (
    profile.archetypes.includes('dialogue_or_chat_log') ||
    profile.archetypes.includes('qa_format') ||
    profile.archetypes.includes('labeled_fields')
  ) {
    rules.push(
      'Keep every speaker name, timestamp, Q&A marker ("Q:", "A:"), or field label prefix ("Label: ") intact at the start of its line, rewriting ONLY the message/value text after the prefix.'
    );
  }

  if (profile.headingCount > 0 || profile.blockquoteCount > 0) {
    rules.push(
      'Keep exact Markdown heading `#` levels and blockquote `>` prefixes on their corresponding lines.'
    );
  }

  if (profile.hasMarkdownTable) {
    rules.push(
      'Preserve the Markdown pipe table (`| ... |`) column count and `| --- |` separator row exactly; rewrite only the human text inside table cells.'
    );
  }

  if (profile.hasHtmlMarkup) {
    rules.push(
      'Preserve all HTML/XML tags and attributes (`<tag ...>...</tag>`) verbatim; transform ONLY the human-readable text inside the elements.'
    );
  }

  if (profile.isSubtitles) {
    rules.push(
      'Preserve subtitle sequence numbers and `-->` timestamp lines verbatim; rewrite ONLY the spoken subtitle lines.'
    );
  }

  for (const note of inlineNotes) {
    rules.push(note);
  }

  // Provide an explicit 1:1 line slot blueprint for inputs up to 45 lines so the model never drops a blank line, header, bullet, or signature
  let lineMapSection = '';
  if (
    profile.totalLines >= 2 &&
    profile.totalLines <= 45 &&
    (profile.hasIntentionalSingleLineBreaks || profile.paragraphBlocks >= 2)
  ) {
    const mappedLines = profile.lineSlots
      .map((s) => `  L${s.lineNumber}: ${describeSlotForLineMap(s)}`)
      .join('\n');
    lineMapSection = `\nSTRUCTURAL LINE BLUEPRINT (mirror this ${profile.totalLines}-line structure in every voice):\n${mappedLines}`;
  }

  return `DETECTED INPUT FORMAT & MANDATORY STRUCTURAL CONTRACT:
- ${rules.join('\n- ')}${lineMapSection}`;
}

/**
 * Post-processes generated text to fix deterministic mechanical drift
 * (accidental code-fence wrapping, quote mismatches, bullet/number punctuation swaps)
 * without altering the voice phrasing itself.
 */
export function enforceFormatFidelity(
  generatedText: string,
  sourceText: string,
  profile: FormatProfile
): string {
  const normalizedSource = normalizeInputPreservingFormat(sourceText);
  let out = generatedText.replace(/\r\n?/g, '\n');

  // 1. Trim outer blank lines while preserving intentional leading indentation on line 1
  out = out
    .replace(/^(?:[ \t]*\n)+/, '')
    .replace(/(?:\n[ \t]*)+$/, '')
    .replace(/[ \t]+$/, '');

  if (!normalizedSource.includes('\n')) {
    out = out.trim();
  }

  // 2. Unwrap accidental outer ```lang ... ``` wrapper if the user's input did NOT start with a fence
  if (!profile.isOuterFencedBlock) {
    const accidentalFence = out.match(/^[ \t]*(`{3,}|~{3,})[^\n]*\n([\s\S]*?)\n[ \t]*\1[ \t]*$/);
    if (accidentalFence && !accidentalFence[2].includes(accidentalFence[1])) {
      out = accidentalFence[2]
        .replace(/^(?:[ \t]*\n)+/, '')
        .replace(/(?:\n[ \t]*)+$/, '')
        .replace(/[ \t]+$/, '');
    }
  }

  // 3. Single-line input continuity & outer quotation fidelity
  if (!normalizedSource.includes('\n')) {
    out = out.replace(/\s*\n+\s*/g, ' ').trim();
  }

  if (!profile.isStructured) {
    if (profile.outerQuote === null) {
      if (
        out.length >= 3 &&
        out.startsWith('"') &&
        out.endsWith('"') &&
        (out.match(/"/g) || []).length === 2
      ) {
        out = out.slice(1, -1).trim();
      } else if (
        out.length >= 3 &&
        out.startsWith('“') &&
        out.endsWith('”') &&
        (out.match(/“/g) || []).length === 1 &&
        (out.match(/”/g) || []).length === 1
      ) {
        out = out.slice(1, -1).trim();
      }
    } else if (profile.outerQuote === '"') {
      if (!(out.startsWith('"') && out.endsWith('"'))) {
        const stripped = out.replace(/^[“"']+|[”"']+$/g, '').trim();
        out = `"${stripped}"`;
      }
    } else if (profile.outerQuote === '“') {
      if (!(out.startsWith('“') && out.endsWith('”'))) {
        const stripped = out.replace(/^[“"']+|[”"']+$/g, '').trim();
        out = `“${stripped}”`;
      }
    }
    return out;
  }

  // 4. JSON formatting normalization if input was valid JSON
  if (profile.isJsonPayload) {
    try {
      const parsedOut = JSON.parse(out) as unknown;
      if (typeof parsedOut === 'object' && parsedOut !== null) {
        return profile.jsonIndent === 0
          ? JSON.stringify(parsedOut)
          : JSON.stringify(parsedOut, null, profile.jsonIndent ?? 2);
      }
    } catch {
      return out;
    }
  }

  // 5. Line-aligned prefix restoration (exact bullet char, checkbox state, numbering punctuation, heading depth)
  const outLines = out.split('\n');
  if (outLines.length === profile.lineSlots.length) {
    for (let i = 0; i < outLines.length; i++) {
      const slot = profile.lineSlots[i];
      const currentLine = outLines[i];

      if (slot.kind === 'bullet_item') {
        const m = currentLine.match(/^[ \t]*(?:[-*+•‣⁃▪▸▹→⇒–—])[ \t]+(.*)$/);
        if (m) {
          outLines[i] = `${slot.prefix}${m[1]}`;
        }
      } else if (slot.kind === 'checklist_item') {
        const m = currentLine.match(
          /^[ \t]*(?:(?:[-*+•][ \t]+)?\[[ xX]\][ \t]+|[☐☑✓✔✗✘][ \t]+|[-*+•][ \t]+)(.*)$/
        );
        if (m) {
          outLines[i] = `${slot.prefix}${m[1]}`;
        }
      } else if (slot.kind === 'numbered_item') {
        const m = currentLine.match(
          /^[ \t]*(?:\(\d{1,3}\)|\d{1,3}[.)]|#\d{1,3}|\([a-zA-Z]\)|[a-zA-Z][.)]|\(?[IVXLCDMivxlcdm]{1,5}[.)])[ \t]+(.*)$/
        );
        if (m && !/^[ \t]*(?:Step|Item|Point|Part|Rule|Tip|Phase|Option)\b/i.test(slot.prefix)) {
          outLines[i] = `${slot.prefix}${m[1]}`;
        }
      } else if (slot.kind === 'markdown_heading') {
        const m = currentLine.match(/^[ \t]*#{1,6}[ \t]+(.*)$/);
        if (m) {
          outLines[i] = `${slot.prefix}${m[1]}`;
        }
      } else if (slot.kind === 'qa_turn') {
        const m = currentLine.match(/^[ \t]*(?:Q|A|Question|Answer)\d*[ \t]*[:.-][ \t]+(.*)$/i);
        if (m) {
          outLines[i] = `${slot.prefix}${m[1]}`;
        }
      } else if (
        slot.kind === 'prose_line' &&
        slot.indent.length > 0 &&
        !currentLine.startsWith(slot.indent) &&
        currentLine.trim().length > 0
      ) {
        outLines[i] = `${slot.indent}${currentLine.trimStart()}`;
      }
    }
    return outLines.join('\n');
  }

  // Fallback when total blank lines shifted slightly: still normalize uniform bullet symbols if non-blank bullet count matches
  const sourceBulletSlots = profile.lineSlots.filter((s) => s.kind === 'bullet_item');
  if (sourceBulletSlots.length > 0) {
    const outBulletIndices: number[] = [];
    for (let i = 0; i < outLines.length; i++) {
      if (/^[ \t]*(?:[-*+•‣⁃▪▸▹→⇒–—])[ \t]+\S/.test(outLines[i])) {
        outBulletIndices.push(i);
      }
    }
    if (outBulletIndices.length === sourceBulletSlots.length) {
      for (let b = 0; b < outBulletIndices.length; b++) {
        const lineIdx = outBulletIndices[b];
        const m = outLines[lineIdx].match(/^[ \t]*(?:[-*+•‣⁃▪▸▹→⇒–—])[ \t]+(.*)$/);
        if (m) {
          outLines[lineIdx] = `${sourceBulletSlots[b].prefix}${m[1]}`;
        }
      }
      return outLines.join('\n');
    }
  }

  return out;
}

/**
 * Safely cleans outer blank lines on combined multi-chunk outputs while preserving
 * intentional first-line indentation if present in the source text.
 */
export function finalizeCombinedOutput(combinedText: string, fullSourceText: string): string {
  const normalizedSource = normalizeInputPreservingFormat(fullSourceText);
  const cleaned = combinedText
    .replace(/\r\n?/g, '\n')
    .replace(/^(?:[ \t]*\n)+/, '')
    .replace(/(?:\n[ \t]*)+$/, '')
    .replace(/[ \t]+$/, '');

  if (!normalizedSource.includes('\n')) {
    return cleaned.trim();
  }
  return cleaned;
}
