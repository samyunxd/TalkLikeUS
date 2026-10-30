import 'dotenv/config';
import express, { type Express, type Request, type Response } from 'express';
import { MAX_INPUT_CHARS } from '../src/config/modes.ts';
import { VOICE_MODES, type ApiErrorPayload, type VoiceMode } from '../src/types/transform.ts';
import { normalizeInputPreservingFormat } from './formatAnalyzer.ts';
import {
  ServiceError,
  explainExistingResults,
  getConfiguredModel,
  isApiKeyConfigured,
  regenerateSingleMode,
  transformAllModes,
} from './geminiService.ts';

const rateBuckets = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000;
const MAX_REQ_PER_WINDOW = 30;

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim().length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || 'local';
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateBuckets.get(ip);
  if (!entry || now > entry.resetAt) {
    rateBuckets.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (entry.count >= MAX_REQ_PER_WINDOW) {
    return false;
  }
  entry.count += 1;
  return true;
}

function sendServiceError(res: Response, err: unknown): void {
  if (err instanceof ServiceError) {
    const payload: ApiErrorPayload = {
      error: err.message,
      code: err.code,
      retryable: err.retryable,
    };
    res.status(err.statusCode).json(payload);
    return;
  }

  const fallback: ApiErrorPayload = {
    error: 'An unexpected error occurred while processing your request. Please try again.',
    code: 'UPSTREAM_ERROR',
    retryable: true,
  };
  res.status(500).json(fallback);
}

function validateSourceText(raw: unknown, res: Response): string | null {
  if (typeof raw !== 'string') {
    res.status(400).json({
      error: 'Please enter text to transform.',
      code: 'INVALID_INPUT',
      retryable: false,
    } satisfies ApiErrorPayload);
    return null;
  }

  const normalized = normalizeInputPreservingFormat(raw);
  if (normalized.length === 0) {
    res.status(400).json({
      error: 'Your input is empty. Paste a sentence, message, or paragraph first.',
      code: 'INVALID_INPUT',
      retryable: false,
    } satisfies ApiErrorPayload);
    return null;
  }

  if (normalized.length > MAX_INPUT_CHARS) {
    res.status(413).json({
      error: `Your text is ${normalized.length.toLocaleString()} characters, which exceeds the ${MAX_INPUT_CHARS.toLocaleString()}-character studio limit. Trim or split the text below to proceed.`,
      code: 'INPUT_TOO_LONG',
      retryable: false,
      maxChars: MAX_INPUT_CHARS,
    } satisfies ApiErrorPayload);
    return null;
  }

  return normalized;
}

export interface CreateApiAppOptions {
  normalizeServerlessPaths?: boolean;
}

function normalizeServerlessRequestUrl(rawUrl: string): string {
  const parsed = new URL(rawUrl || '/', 'http://localhost');
  const rewrittenSubpath = parsed.searchParams.get('__path');

  if (
    rewrittenSubpath !== null &&
    (parsed.pathname === '/api' ||
      parsed.pathname === '/api/' ||
      parsed.pathname === '/api/index' ||
      parsed.pathname === '/api/index.js' ||
      parsed.pathname === '/index' ||
      parsed.pathname === '/')
  ) {
    parsed.searchParams.delete('__path');
    const cleanSubpath = rewrittenSubpath.replace(/^\/+/, '');
    const search = parsed.searchParams.toString();
    return `/api/${cleanSubpath}${search ? `?${search}` : ''}`;
  }

  if (parsed.searchParams.has('__path')) {
    parsed.searchParams.delete('__path');
  }

  const normalizedPathname = parsed.pathname.startsWith('/api')
    ? parsed.pathname
    : `/api${parsed.pathname.startsWith('/') ? '' : '/'}${parsed.pathname}`;
  const search = parsed.searchParams.toString();
  return `${normalizedPathname}${search ? `?${search}` : ''}`;
}

export function createApiApp(options: CreateApiAppOptions = {}): Express {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  if (options.normalizeServerlessPaths) {
    app.use((req: Request, _res: Response, next) => {
      req.url = normalizeServerlessRequestUrl(req.url || '/');

      // Safely unwrap @vercel/node getter-based or pre-buffered req.body before express.json()
      const bodyDescriptor = Object.getOwnPropertyDescriptor(req, 'body');
      if (bodyDescriptor) {
        let existingBody: unknown;
        try {
          existingBody = (req as { body?: unknown }).body;
        } catch {
          existingBody = undefined;
        }

        if (typeof existingBody === 'string') {
          const trimmedBody = existingBody.trim();
          if (trimmedBody.length > 0) {
            try {
              existingBody = JSON.parse(trimmedBody);
            } catch {
              // Leave as-is if non-JSON string
            }
          } else {
            existingBody = {};
          }
        } else if (Buffer.isBuffer(existingBody)) {
          const textBody = existingBody.toString('utf8').trim();
          if (textBody.length > 0) {
            try {
              existingBody = JSON.parse(textBody);
            } catch {
              existingBody = {};
            }
          } else {
            existingBody = {};
          }
        }

        Object.defineProperty(req, 'body', {
          value: existingBody,
          writable: true,
          enumerable: true,
          configurable: true,
        });

        if (existingBody !== undefined) {
          (req as Request & { _body?: boolean })._body = true;
        }
      }

      next();
    });
  }

  app.use(express.json({ limit: '256kb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      ok: true,
      configured: isApiKeyConfigured(),
      model: getConfiguredModel(),
      maxChars: MAX_INPUT_CHARS,
    });
  });

  app.post('/api/transform', async (req: Request, res: Response) => {
    const clientIp = getClientIp(req);
    if (!checkRateLimit(clientIp)) {
      res.status(429).json({
        error:
          'Too many transformation requests in a short period. Please wait a few seconds and retry.',
        code: 'RATE_LIMITED',
        retryable: true,
      } satisfies ApiErrorPayload);
      return;
    }

    const text = validateSourceText(req.body?.text, res);
    if (!text) return;

    const teachMe = Boolean(req.body?.teachMe);
    const chatMode = Boolean(req.body?.chatMode);

    try {
      const result = await transformAllModes(text, teachMe, chatMode);
      res.json(result);
    } catch (err) {
      sendServiceError(res, err);
    }
  });

  app.post('/api/regenerate-mode', async (req: Request, res: Response) => {
    const clientIp = getClientIp(req);
    if (!checkRateLimit(clientIp)) {
      res.status(429).json({
        error:
          'Too many regeneration requests in a short period. Please wait a few seconds and retry.',
        code: 'RATE_LIMITED',
        retryable: true,
      } satisfies ApiErrorPayload);
      return;
    }

    const text = validateSourceText(req.body?.text, res);
    if (!text) return;

    const mode = req.body?.mode as VoiceMode | undefined;
    if (!mode || !VOICE_MODES.includes(mode)) {
      res.status(400).json({
        error: 'Invalid voice mode selected for regeneration.',
        code: 'INVALID_INPUT',
        retryable: false,
      } satisfies ApiErrorPayload);
      return;
    }

    const teachMe = Boolean(req.body?.teachMe);
    const chatMode = Boolean(req.body?.chatMode);
    const previousResult =
      typeof req.body?.previousResult === 'string'
        ? req.body.previousResult.slice(0, MAX_INPUT_CHARS)
        : undefined;
    const otherResults =
      req.body?.otherResults && typeof req.body.otherResults === 'object'
        ? (req.body.otherResults as Partial<Record<VoiceMode, string>>)
        : undefined;

    try {
      const result = await regenerateSingleMode({
        sourceText: text,
        mode,
        teachMe,
        chatMode,
        previousResult,
        otherResults,
      });
      res.json(result);
    } catch (err) {
      sendServiceError(res, err);
    }
  });

  app.post('/api/explain', async (req: Request, res: Response) => {
    const clientIp = getClientIp(req);
    if (!checkRateLimit(clientIp)) {
      res.status(429).json({
        error: 'Too many requests in a short period. Please wait a moment and retry.',
        code: 'RATE_LIMITED',
        retryable: true,
      } satisfies ApiErrorPayload);
      return;
    }

    const text = validateSourceText(req.body?.text, res);
    if (!text) return;

    const currentResults = req.body?.currentResults as Record<VoiceMode, string> | undefined;
    if (!currentResults || typeof currentResults !== 'object') {
      res.status(400).json({
        error: 'Missing transformed outputs to explain.',
        code: 'INVALID_INPUT',
        retryable: false,
      } satisfies ApiErrorPayload);
      return;
    }

    const chatMode = Boolean(req.body?.chatMode);

    try {
      const explained = await explainExistingResults(text, currentResults, chatMode);
      res.json(explained);
    } catch (err) {
      sendServiceError(res, err);
    }
  });

  app.use('/api', (_req: Request, res: Response) => {
    res.status(404).json({
      error: 'API endpoint not found.',
      code: 'INVALID_INPUT',
      retryable: false,
    } satisfies ApiErrorPayload);
  });

  return app;
}
