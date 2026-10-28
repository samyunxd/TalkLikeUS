export const VOICE_MODES = [
  'natural_american',
  'casual_slang',
  'unfiltered_blunt',
  'badass_confident',
] as const;

export type VoiceMode = (typeof VOICE_MODES)[number];

export type ExplanationCategory =
  | 'vocabulary'
  | 'slang'
  | 'idiom'
  | 'contraction'
  | 'rhythm'
  | 'tone';

export type RegisterLevel =
  | 'everyday'
  | 'mildly_informal'
  | 'very_informal'
  | 'blunt'
  | 'vulgar';

export interface ExplanationNote {
  original: string;
  replacement: string;
  reason: string;
  type: ExplanationCategory;
  register: RegisterLevel;
}

export interface ModeTransformation {
  mode: VoiceMode;
  text: string;
  generatedText?: string;
  isEdited?: boolean;
  explanations: ExplanationNote[];
  toneSummary?: string;
  reusablePattern?: string;
  chatMode?: boolean;
}

export interface TransformResponse {
  results: ModeTransformation[];
  chunkCount?: number;
  model?: string;
  chatMode?: boolean;
}

export interface SingleModeResponse {
  result: ModeTransformation;
  chunkCount?: number;
  model?: string;
}

export interface ExplainResponse {
  explanationsByMode: Record<
    VoiceMode,
    {
      explanations: ExplanationNote[];
      toneSummary?: string;
      reusablePattern?: string;
    }
  >;
}

export interface ApiErrorPayload {
  error: string;
  code?:
    | 'INVALID_INPUT'
    | 'INPUT_TOO_LONG'
    | 'MISSING_API_KEY'
    | 'INVALID_API_KEY'
    | 'RATE_LIMITED'
    | 'MODEL_OVERLOADED'
    | 'SAFETY_BLOCKED'
    | 'UPSTREAM_ERROR';
  retryable?: boolean;
  maxChars?: number;
}
