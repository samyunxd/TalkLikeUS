import type {
  ApiErrorPayload,
  ExplainResponse,
  SingleModeResponse,
  TransformResponse,
  VoiceMode,
} from '../types/transform';

export class ClientApiError extends Error {
  code?: ApiErrorPayload['code'];
  retryable: boolean;
  maxChars?: number;

  constructor(payload: ApiErrorPayload) {
    super(payload.error || 'Request failed.');
    this.name = 'ClientApiError';
    this.code = payload.code;
    this.retryable = payload.retryable ?? true;
    this.maxChars = payload.maxChars;
  }
}

async function parseJsonOrThrow<T>(response: Response): Promise<T> {
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    if (!response.ok) {
      throw new ClientApiError({
        error: `Server returned status ${response.status}. Please retry in a moment.`,
        code: 'UPSTREAM_ERROR',
        retryable: true,
      });
    }
    throw new ClientApiError({
      error: 'Received an unreadable response from the studio server.',
      code: 'UPSTREAM_ERROR',
      retryable: true,
    });
  }

  if (!response.ok) {
    const errPayload = (body || {}) as ApiErrorPayload;
    throw new ClientApiError({
      error: errPayload.error || `Transformation failed (HTTP ${response.status}).`,
      code: errPayload.code || 'UPSTREAM_ERROR',
      retryable: errPayload.retryable ?? true,
      maxChars: errPayload.maxChars,
    });
  }

  return body as T;
}

export async function requestAllTransformations(params: {
  text: string;
  teachMe: boolean;
  signal?: AbortSignal;
}): Promise<TransformResponse> {
  try {
    const response = await fetch('/api/transform', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: params.text,
        teachMe: params.teachMe,
      }),
      signal: params.signal,
    });
    return await parseJsonOrThrow<TransformResponse>(response);
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw err;
    }
    if (err instanceof ClientApiError) {
      throw err;
    }
    throw new ClientApiError({
      error: 'Network connection interrupted. Check your connection and click Retry.',
      code: 'UPSTREAM_ERROR',
      retryable: true,
    });
  }
}

export async function requestSingleRegeneration(params: {
  text: string;
  mode: VoiceMode;
  teachMe: boolean;
  previousResult?: string;
  otherResults?: Partial<Record<VoiceMode, string>>;
  signal?: AbortSignal;
}): Promise<SingleModeResponse> {
  try {
    const response = await fetch('/api/regenerate-mode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: params.text,
        mode: params.mode,
        teachMe: params.teachMe,
        previousResult: params.previousResult,
        otherResults: params.otherResults,
      }),
      signal: params.signal,
    });
    return await parseJsonOrThrow<SingleModeResponse>(response);
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw err;
    }
    if (err instanceof ClientApiError) {
      throw err;
    }
    throw new ClientApiError({
      error: 'Network connection interrupted during regeneration. Please try again.',
      code: 'UPSTREAM_ERROR',
      retryable: true,
    });
  }
}

export async function requestTeachMeExplanations(params: {
  text: string;
  currentResults: Record<VoiceMode, string>;
  signal?: AbortSignal;
}): Promise<ExplainResponse> {
  try {
    const response = await fetch('/api/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: params.text,
        currentResults: params.currentResults,
      }),
      signal: params.signal,
    });
    return await parseJsonOrThrow<ExplainResponse>(response);
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw err;
    }
    if (err instanceof ClientApiError) {
      throw err;
    }
    throw new ClientApiError({
      error: 'Could not load Teach Me notes due to a network error.',
      code: 'UPSTREAM_ERROR',
      retryable: true,
    });
  }
}
