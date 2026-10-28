import {
  GoogleGenAI,
  HarmBlockThreshold,
  HarmCategory,
  ThinkingLevel,
  Type,
  type GenerateContentConfig,
} from '@google/genai';
import {
  VOICE_MODES,
  type ExplainResponse,
  type ExplanationCategory,
  type ExplanationNote,
  type ModeTransformation,
  type RegisterLevel,
  type SingleModeResponse,
  type TransformResponse,
  type VoiceMode,
} from '../src/types/transform.ts';
import { splitIntoMeaningPreservingChunks } from './chunker.ts';
import {
  SYSTEM_INSTRUCTION,
  buildExplainExistingPrompt,
  buildRegenerateSinglePrompt,
  buildTransformAllPrompt,
} from './prompts.ts';

export class ServiceError extends Error {
  statusCode: number;
  code:
    | 'INVALID_INPUT'
    | 'INPUT_TOO_LONG'
    | 'MISSING_API_KEY'
    | 'INVALID_API_KEY'
    | 'RATE_LIMITED'
    | 'MODEL_OVERLOADED'
    | 'SAFETY_BLOCKED'
    | 'UPSTREAM_ERROR';
  retryable: boolean;

  constructor(
    message: string,
    statusCode: number,
    code: ServiceError['code'],
    retryable = false
  ) {
    super(message);
    this.name = 'ServiceError';
    this.statusCode = statusCode;
    this.code = code;
    this.retryable = retryable;
  }
}

const DEFAULT_PRIMARY_MODEL = 'gemini-3.8-flash';
const GEMINI_FALLBACK_MODELS = [
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
  'gemini-2.5-flash',
] as const;
const VERTEX_FALLBACK_MODELS = ['gemini-2.5-flash', 'gemini-3.1-flash-lite'] as const;

const modelCooldownUntil = new Map<string, number>();
const COOLDOWN_MS = 3 * 60 * 1000;
const UNAVAILABLE_COOLDOWN_MS = 30 * 60 * 1000;

function resolveServerApiKey(): string {
  const raw =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.API_KEY ||
    '';
  return raw.trim().replace(/^["']+|["']+$/g, '').trim();
}

function shouldUseVertexExpress(apiKey: string): boolean {
  const explicitFlag = process.env.GOOGLE_GENAI_USE_VERTEXAI?.trim().toLowerCase();
  if (explicitFlag === 'true') return true;
  if (explicitFlag === 'false') return false;
  // Keys prefixed with "AQ." are Google Cloud Vertex AI Express Mode API keys.
  return apiKey.startsWith('AQ.');
}

export function getConfiguredModel(): string {
  const configured = process.env.GEMINI_MODEL?.trim().replace(/^["']+|["']+$/g, '').trim();
  return configured && configured.length > 0 ? configured : DEFAULT_PRIMARY_MODEL;
}

function getCandidateModels(): string[] {
  const primary = getConfiguredModel();
  const apiKey = resolveServerApiKey();
  const fallbacks = shouldUseVertexExpress(apiKey)
    ? VERTEX_FALLBACK_MODELS
    : GEMINI_FALLBACK_MODELS;

  const candidates = [primary];
  for (const fallback of fallbacks) {
    if (!candidates.includes(fallback)) {
      candidates.push(fallback);
    }
  }
  const now = Date.now();
  const healthy = candidates.filter((m) => (modelCooldownUntil.get(m) || 0) <= now);
  const cooled = candidates.filter((m) => (modelCooldownUntil.get(m) || 0) > now);
  return [...healthy, ...cooled];
}

function buildThinkingConfig(model: string): GenerateContentConfig['thinkingConfig'] | undefined {
  if (model === 'gemini-3.1-flash-lite') {
    return { thinkingLevel: ThinkingLevel.MINIMAL };
  }
  if (model.startsWith('gemini-3') || model.startsWith('gemini-4')) {
    return { thinkingLevel: ThinkingLevel.LOW };
  }
  return undefined;
}

function getGenAIClient(): GoogleGenAI {
  const apiKey = resolveServerApiKey();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey === 'your_gemini_api_key_here') {
    throw new ServiceError(
      'Gemini API key is not configured on the server. Set GEMINI_API_KEY in your Vercel Project Settings -> Environment Variables (or Secrets panel).',
      503,
      'MISSING_API_KEY',
      false
    );
  }
  const useVertex = shouldUseVertexExpress(apiKey);
  return new GoogleGenAI({
    apiKey,
    ...(useVertex ? { vertexai: true } : {}),
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
      timeout: 28000,
      retryOptions: {
        attempts: 1,
      },
    },
  });
}

const EXPLANATION_ITEM_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    original: {
      type: Type.STRING,
      description: 'Original phrase or structural aspect from the user text.',
    },
    replacement: {
      type: Type.STRING,
      description: 'Exact phrase or abbreviation used in this transformed American output.',
    },
    reason: {
      type: Type.STRING,
      description:
        'Concise practical explanation of why this phrasing sounds natural and when to use it.',
    },
    type: {
      type: Type.STRING,
      description: 'One of: vocabulary, slang, idiom, contraction, rhythm, tone.',
    },
    register: {
      type: Type.STRING,
      description: 'One of: everyday, mildly_informal, very_informal, blunt, vulgar.',
    },
  },
  required: ['original', 'replacement', 'reason', 'type', 'register'],
};

const MODE_ITEM_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    mode: {
      type: Type.STRING,
      description:
        'Mode identifier: natural_american, casual_slang, unfiltered_blunt, or badass_confident.',
    },
    text: {
      type: Type.STRING,
      description: 'The complete transformed American English text for this voice.',
    },
    toneSummary: {
      type: Type.STRING,
      description:
        'Optional 1-sentence note on tone and appropriate context when Teach Me is enabled.',
    },
    reusablePattern: {
      type: Type.STRING,
      description: 'Optional 1-sentence reusable phrasing pattern when Teach Me is enabled.',
    },
    explanations: {
      type: Type.ARRAY,
      items: EXPLANATION_ITEM_SCHEMA,
      description: 'Grounded explanation items when Teach Me is enabled; empty array otherwise.',
    },
  },
  required: ['mode', 'text', 'explanations'],
};

const ALL_MODES_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    results: {
      type: Type.ARRAY,
      items: MODE_ITEM_SCHEMA,
      description: 'All four voice transformations in order.',
    },
  },
  required: ['results'],
};

const SINGLE_MODE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    result: MODE_ITEM_SCHEMA,
  },
  required: ['result'],
};

const EXPLAIN_ONLY_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          mode: { type: Type.STRING },
          toneSummary: { type: Type.STRING },
          reusablePattern: { type: Type.STRING },
          explanations: {
            type: Type.ARRAY,
            items: EXPLANATION_ITEM_SCHEMA,
          },
        },
        required: ['mode', 'explanations'],
      },
    },
  },
  required: ['items'],
};

const SAFETY_SETTINGS = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
];

const VALID_CATEGORIES = new Set<ExplanationCategory>([
  'vocabulary',
  'slang',
  'idiom',
  'contraction',
  'rhythm',
  'tone',
]);

const VALID_REGISTERS = new Set<RegisterLevel>([
  'everyday',
  'mildly_informal',
  'very_informal',
  'blunt',
  'vulgar',
]);

function sanitizeExplanations(raw: unknown): ExplanationNote[] {
  if (!Array.isArray(raw)) return [];
  const cleaned: ExplanationNote[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const rec = item as Record<string, unknown>;
    const replacement = typeof rec.replacement === 'string' ? rec.replacement.trim() : '';
    const reason = typeof rec.reason === 'string' ? rec.reason.trim() : '';
    const original =
      typeof rec.original === 'string' ? rec.original.trim() : 'Original phrasing';
    if (!replacement || !reason) continue;

    const rawType =
      typeof rec.type === 'string'
        ? (rec.type.trim().toLowerCase() as ExplanationCategory)
        : 'vocabulary';
    const rawRegister =
      typeof rec.register === 'string'
        ? (rec.register.trim().toLowerCase() as RegisterLevel)
        : 'everyday';

    cleaned.push({
      original,
      replacement,
      reason,
      type: VALID_CATEGORIES.has(rawType) ? rawType : 'vocabulary',
      register: VALID_REGISTERS.has(rawRegister) ? rawRegister : 'everyday',
    });
  }
  return cleaned.slice(0, 6);
}

function mapUpstreamError(err: unknown): ServiceError {
  if (err instanceof ServiceError) return err;

  const message = err instanceof Error ? err.message : String(err);
  const upper = message.toUpperCase();

  if (
    upper.includes('API_KEY_INVALID') ||
    upper.includes('PERMISSION_DENIED') ||
    upper.includes('INVALID API KEY') ||
    upper.includes('403')
  ) {
    return new ServiceError(
      'The Gemini API rejected the server credentials. Verify that GEMINI_API_KEY is valid in your server environment.',
      401,
      'INVALID_API_KEY',
      false
    );
  }

  if (upper.includes('RESOURCE_EXHAUSTED') || upper.includes('429') || upper.includes('QUOTA')) {
    return new ServiceError(
      'Rate limit or quota reached on the Gemini service. Wait a few seconds and click Retry.',
      429,
      'RATE_LIMITED',
      true
    );
  }

  if (
    upper.includes('UNAVAILABLE') ||
    upper.includes('OVERLOADED') ||
    upper.includes('503') ||
    upper.includes('504') ||
    upper.includes('DEADLINE_EXCEEDED') ||
    upper.includes('TIMEOUT') ||
    upper.includes('ABORT')
  ) {
    return new ServiceError(
      'The Gemini language service is temporarily busy. Please try again in a moment.',
      503,
      'MODEL_OVERLOADED',
      true
    );
  }

  if (upper.includes('SAFETY') || upper.includes('BLOCKED')) {
    return new ServiceError(
      'This text triggered provider safety filters and could not be processed. Try rephrasing threats or extreme content while keeping your point.',
      422,
      'SAFETY_BLOCKED',
      false
    );
  }

  return new ServiceError(
    'Could not complete the voice transformation right now. Your original text is safe—please retry.',
    502,
    'UPSTREAM_ERROR',
    true
  );
}

function isModelUnavailableOnKey(err: unknown): boolean {
  const status = (err as { status?: number })?.status;
  if (status === 404) return true;
  const message = (err instanceof Error ? err.message : String(err)).toUpperCase();
  return (
    message.includes('NOT_FOUND') ||
    message.includes('NOT FOUND') ||
    message.includes('PUBLISHER MODEL') ||
    message.includes('UNKNOWN MODEL') ||
    message.includes('INVALID MODEL') ||
    message.includes('MODEL IS NOT SUPPORTED') ||
    message.includes('DOES NOT EXIST') ||
    message.includes('DOES NOT HAVE ACCESS') ||
    message.includes('NOT SUPPORTED FOR GENERATECONTENT') ||
    /\b404\b/.test(message)
  );
}

async function executeAcrossCandidateModels<T>(
  operation: (model: string) => Promise<T>
): Promise<{ data: T; usedModel: string }> {
  const candidates = getCandidateModels();
  let lastError: unknown;

  for (const model of candidates) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const data = await operation(model);
        return { data, usedModel: model };
      } catch (err) {
        lastError = err;

        if (isModelUnavailableOnKey(err) && candidates.length > 1) {
          modelCooldownUntil.set(model, Date.now() + UNAVAILABLE_COOLDOWN_MS);
          break;
        }

        const mapped = mapUpstreamError(err);

        if (!mapped.retryable) {
          throw mapped;
        }

        if (mapped.code === 'MODEL_OVERLOADED' && candidates.length > 1) {
          modelCooldownUntil.set(model, Date.now() + COOLDOWN_MS);
          break;
        }

        if (attempt === 0) {
          await new Promise((r) => setTimeout(r, 450 + Math.floor(Math.random() * 200)));
        }
      }
    }
  }

  throw mapUpstreamError(lastError);
}

async function generateSingleModeChunk(params: {
  ai: GoogleGenAI;
  sourceText: string;
  mode: VoiceMode;
  teachMe: boolean;
  chatMode: boolean;
  previousResult?: string;
  otherResults?: Partial<Record<VoiceMode, string>>;
  chunk?: ReturnType<typeof splitIntoMeaningPreservingChunks>[number];
}): Promise<{ item: ModeTransformation; usedModel: string }> {
  const { ai, sourceText, mode, teachMe, chatMode, previousResult, otherResults, chunk } = params;

  const { data, usedModel } = await executeAcrossCandidateModels(async (model) => {
    const thinkingConfig = buildThinkingConfig(model);
    const response = await ai.models.generateContent({
      model,
      contents: buildRegenerateSinglePrompt({
        sourceText,
        mode,
        teachMe,
        chatMode,
        previousResult,
        otherResults,
        chunk,
      }),
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.85,
        responseMimeType: 'application/json',
        responseSchema: SINGLE_MODE_SCHEMA,
        safetySettings: SAFETY_SETTINGS,
        ...(thinkingConfig ? { thinkingConfig } : {}),
      },
    });

    const rawText = response.text?.trim();
    if (!rawText) {
      const blockReason = response.promptFeedback?.blockReason;
      if (blockReason) {
        throw new ServiceError(
          'This input was blocked by provider safety controls.',
          422,
          'SAFETY_BLOCKED',
          false
        );
      }
      throw new Error('Empty model response');
    }

    const parsed = JSON.parse(rawText) as { result?: Record<string, unknown> };
    const resObj = parsed?.result;
    const outText = typeof resObj?.text === 'string' ? resObj.text.trim() : '';
    if (!outText) {
      throw new Error('Missing transformed text in single mode response');
    }

    return {
      mode,
      text: outText,
      explanations: teachMe ? sanitizeExplanations(resObj?.explanations) : [],
      toneSummary:
        teachMe && typeof resObj?.toneSummary === 'string'
          ? resObj.toneSummary.trim()
          : undefined,
      reusablePattern:
        teachMe && typeof resObj?.reusablePattern === 'string'
          ? resObj.reusablePattern.trim()
          : undefined,
      chatMode,
    } satisfies ModeTransformation;
  });

  return { item: data, usedModel };
}

async function generateAllModesChunk(params: {
  ai: GoogleGenAI;
  chunk: ReturnType<typeof splitIntoMeaningPreservingChunks>[number];
  teachMe: boolean;
  chatMode: boolean;
}): Promise<{ map: Record<VoiceMode, ModeTransformation>; usedModel: string }> {
  const { ai, chunk, teachMe, chatMode } = params;

  const partialMap: Partial<Record<VoiceMode, ModeTransformation>> = {};
  let activeModel = getConfiguredModel();

  try {
    const { data: parsedResults, usedModel } = await executeAcrossCandidateModels(async (model) => {
      const thinkingConfig = buildThinkingConfig(model);
      const response = await ai.models.generateContent({
        model,
        contents: buildTransformAllPrompt(chunk.content, teachMe, chatMode, chunk),
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          temperature: 0.8,
          responseMimeType: 'application/json',
          responseSchema: ALL_MODES_SCHEMA,
          safetySettings: SAFETY_SETTINGS,
          ...(thinkingConfig ? { thinkingConfig } : {}),
        },
      });

      const rawText = response.text?.trim();
      if (!rawText) {
        const blockReason = response.promptFeedback?.blockReason;
        if (blockReason) {
          throw new ServiceError(
            'This input was blocked by provider safety controls.',
            422,
            'SAFETY_BLOCKED',
            false
          );
        }
        throw new Error('Empty model response');
      }

      const parsed = JSON.parse(rawText) as { results?: Array<Record<string, unknown>> };
      if (!Array.isArray(parsed?.results)) {
        throw new Error('Malformed results array in structured output');
      }
      return parsed.results;
    });

    activeModel = usedModel;

    for (const item of parsedResults) {
      const modeId = typeof item.mode === 'string' ? (item.mode.trim() as VoiceMode) : undefined;
      const textVal = typeof item.text === 'string' ? item.text.trim() : '';
      if (modeId && VOICE_MODES.includes(modeId) && textVal) {
        partialMap[modeId] = {
          mode: modeId,
          text: textVal,
          explanations: teachMe ? sanitizeExplanations(item.explanations) : [],
          toneSummary:
            teachMe && typeof item.toneSummary === 'string'
              ? item.toneSummary.trim()
              : undefined,
          reusablePattern:
            teachMe && typeof item.reusablePattern === 'string'
              ? item.reusablePattern.trim()
              : undefined,
          chatMode,
        };
      }
    }
  } catch (err) {
    if (
      err instanceof ServiceError &&
      (err.code === 'MISSING_API_KEY' ||
        err.code === 'INVALID_API_KEY' ||
        err.code === 'SAFETY_BLOCKED' ||
        err.code === 'MODEL_OVERLOADED' ||
        err.code === 'RATE_LIMITED')
    ) {
      throw err;
    }
  }

  const missingModes = VOICE_MODES.filter((m) => !partialMap[m]);
  if (missingModes.length > 0) {
    const recovered = await Promise.all(
      missingModes.map((mode) =>
        generateSingleModeChunk({
          ai,
          sourceText: chunk.content,
          mode,
          teachMe,
          chatMode,
          chunk,
        })
      )
    );
    for (const r of recovered) {
      partialMap[r.item.mode] = r.item;
      activeModel = r.usedModel;
    }
  }

  return {
    map: partialMap as Record<VoiceMode, ModeTransformation>,
    usedModel: activeModel,
  };
}

export async function transformAllModes(
  sourceText: string,
  teachMe: boolean,
  chatMode = false
): Promise<TransformResponse> {
  const ai = getGenAIClient();
  const chunks = splitIntoMeaningPreservingChunks(sourceText);

  const chunkOutputs: Array<Record<VoiceMode, ModeTransformation>> = [];
  let usedModel = getConfiguredModel();

  for (const chunk of chunks) {
    const chunkRes = await generateAllModesChunk({
      ai,
      chunk,
      teachMe,
      chatMode,
    });
    chunkOutputs.push(chunkRes.map);
    usedModel = chunkRes.usedModel;
  }

  const finalResults: ModeTransformation[] = VOICE_MODES.map((mode) => {
    const combinedText = chunkOutputs
      .map((out, idx) => out[mode].text + chunks[idx].separatorAfter)
      .join('')
      .trim();

    const mergedExplanations: ExplanationNote[] = [];
    const seenReplacements = new Set<string>();
    for (const out of chunkOutputs) {
      for (const note of out[mode].explanations) {
        const key = note.replacement.toLowerCase();
        if (!seenReplacements.has(key)) {
          seenReplacements.add(key);
          mergedExplanations.push(note);
        }
      }
    }

    return {
      mode,
      text: combinedText,
      explanations: teachMe ? mergedExplanations.slice(0, 6) : [],
      toneSummary: teachMe ? chunkOutputs[0]?.[mode]?.toneSummary : undefined,
      reusablePattern: teachMe ? chunkOutputs[0]?.[mode]?.reusablePattern : undefined,
      chatMode,
    };
  });

  return {
    results: finalResults,
    chunkCount: chunks.length,
    model: usedModel,
    chatMode,
  };
}

export async function regenerateSingleMode(params: {
  sourceText: string;
  mode: VoiceMode;
  teachMe: boolean;
  chatMode?: boolean;
  previousResult?: string;
  otherResults?: Partial<Record<VoiceMode, string>>;
}): Promise<SingleModeResponse> {
  const { sourceText, mode, teachMe, chatMode = false, previousResult, otherResults } = params;
  const ai = getGenAIClient();
  const chunks = splitIntoMeaningPreservingChunks(sourceText);

  const chunkResults: ModeTransformation[] = [];
  let usedModel = getConfiguredModel();

  for (const chunk of chunks) {
    const singleChunkRes = await generateSingleModeChunk({
      ai,
      sourceText: chunk.content,
      mode,
      teachMe,
      chatMode,
      previousResult: chunks.length === 1 ? previousResult : undefined,
      otherResults: chunks.length === 1 ? otherResults : undefined,
      chunk,
    });
    chunkResults.push(singleChunkRes.item);
    usedModel = singleChunkRes.usedModel;
  }

  const combinedText = chunkResults
    .map((r, idx) => r.text + chunks[idx].separatorAfter)
    .join('')
    .trim();

  const mergedExplanations: ExplanationNote[] = [];
  const seen = new Set<string>();
  for (const r of chunkResults) {
    for (const note of r.explanations) {
      const key = note.replacement.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        mergedExplanations.push(note);
      }
    }
  }

  return {
    result: {
      mode,
      text: combinedText,
      explanations: teachMe ? mergedExplanations.slice(0, 6) : [],
      toneSummary: teachMe ? chunkResults[0]?.toneSummary : undefined,
      reusablePattern: teachMe ? chunkResults[0]?.reusablePattern : undefined,
      chatMode,
    },
    chunkCount: chunks.length,
    model: usedModel,
  };
}

export async function explainExistingResults(
  originalText: string,
  currentResults: Record<VoiceMode, string>,
  chatMode = false
): Promise<ExplainResponse> {
  const ai = getGenAIClient();

  const boundedSource = originalText.slice(0, 4500);
  const boundedResults: Record<VoiceMode, string> = {
    natural_american: (currentResults.natural_american || '').slice(0, 4500),
    casual_slang: (currentResults.casual_slang || '').slice(0, 4500),
    unfiltered_blunt: (currentResults.unfiltered_blunt || '').slice(0, 4500),
    badass_confident: (currentResults.badass_confident || '').slice(0, 4500),
  };

  const { data: items } = await executeAcrossCandidateModels(async (model) => {
    const thinkingConfig = buildThinkingConfig(model);
    const response = await ai.models.generateContent({
      model,
      contents: buildExplainExistingPrompt(boundedSource, boundedResults, chatMode),
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.4,
        responseMimeType: 'application/json',
        responseSchema: EXPLAIN_ONLY_SCHEMA,
        safetySettings: SAFETY_SETTINGS,
        ...(thinkingConfig ? { thinkingConfig } : {}),
      },
    });

    const rawText = response.text?.trim();
    if (!rawText) throw new Error('Empty explanation response');
    const parsed = JSON.parse(rawText) as { items?: Array<Record<string, unknown>> };
    if (!Array.isArray(parsed?.items)) throw new Error('Malformed explanation items');
    return parsed.items;
  });

  const explanationsByMode: ExplainResponse['explanationsByMode'] = {
    natural_american: { explanations: [] },
    casual_slang: { explanations: [] },
    unfiltered_blunt: { explanations: [] },
    badass_confident: { explanations: [] },
  };

  for (const item of items) {
    const mode = typeof item.mode === 'string' ? (item.mode.trim() as VoiceMode) : undefined;
    if (mode && VOICE_MODES.includes(mode)) {
      explanationsByMode[mode] = {
        explanations: sanitizeExplanations(item.explanations),
        toneSummary:
          typeof item.toneSummary === 'string' ? item.toneSummary.trim() : undefined,
        reusablePattern:
          typeof item.reusablePattern === 'string' ? item.reusablePattern.trim() : undefined,
      };
    }
  }

  return { explanationsByMode };
}
