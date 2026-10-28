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

function buildNetworkErrorMessage(context: 'transform' | 'regen' | 'explain'): string {
  const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
  if (isOffline) {
    return 'You appear to be offline. Your text is safe—reconnect to the internet and tap Retry.';
  }
  if (context === 'regen') {
    return 'Network connection interrupted during regeneration. Your existing results are safe—tap Retry.';
  }
  if (context === 'explain') {
    return 'Could not load Teach Me notes due to a network interruption. Tap Retry in a moment.';
  }
  return 'Network connection interrupted. Your original text is safe—check your signal and tap Retry.';
}

export async function requestAllTransformations(params: {
  text: string;
  teachMe: boolean;
  chatMode: boolean;
  signal?: AbortSignal;
}): Promise<TransformResponse> {
  try {
    const response = await fetch('/api/transform', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: params.text,
        teachMe: params.teachMe,
        chatMode: params.chatMode,
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
      error: buildNetworkErrorMessage('transform'),
      code: 'UPSTREAM_ERROR',
      retryable: true,
    });
  }
}

export async function requestSingleRegeneration(params: {
  text: string;
  mode: VoiceMode;
  teachMe: boolean;
  chatMode: boolean;
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
        chatMode: params.chatMode,
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
      error: buildNetworkErrorMessage('regen'),
      code: 'UPSTREAM_ERROR',
      retryable: true,
    });
  }
}

export async function requestTeachMeExplanations(params: {
  text: string;
  currentResults: Record<VoiceMode, string>;
  chatMode: boolean;
  signal?: AbortSignal;
}): Promise<ExplainResponse> {
  try {
    const response = await fetch('/api/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: params.text,
        currentResults: params.currentResults,
        chatMode: params.chatMode,
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
      error: buildNetworkErrorMessage('explain'),
      code: 'UPSTREAM_ERROR',
      retryable: true,
    });
  }
}
