import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { MAX_INPUT_CHARS } from './src/config/modes.ts';
import { VOICE_MODES, type ApiErrorPayload, type VoiceMode } from './src/types/transform.ts';
import {
  ServiceError,
  explainExistingResults,
  getConfiguredModel,
  regenerateSingleMode,
  transformAllModes,
} from './server/geminiService.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

const rateBuckets = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000;
const MAX_REQ_PER_WINDOW = 30;

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

  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    res.status(400).json({
      error: 'Your input is empty. Paste a sentence, message, or paragraph first.',
      code: 'INVALID_INPUT',
      retryable: false,
    } satisfies ApiErrorPayload);
    return null;
  }

  if (trimmed.length > MAX_INPUT_CHARS) {
    res.status(413).json({
      error: `Your text is ${trimmed.length.toLocaleString()} characters, which exceeds the ${MAX_INPUT_CHARS.toLocaleString()}-character studio limit. Trim or split the text below to proceed.`,
      code: 'INPUT_TOO_LONG',
      retryable: false,
      maxChars: MAX_INPUT_CHARS,
    } satisfies ApiErrorPayload);
    return null;
  }

  return trimmed;
}

async function startServer() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '256kb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      ok: true,
      model: getConfiguredModel(),
      maxChars: MAX_INPUT_CHARS,
    });
  });

  app.post('/api/transform', async (req: Request, res: Response) => {
    const clientIp = req.ip || 'local';
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

    try {
      const result = await transformAllModes(text, teachMe);
      res.json(result);
    } catch (err) {
      sendServiceError(res, err);
    }
  });

  app.post('/api/regenerate-mode', async (req: Request, res: Response) => {
    const clientIp = req.ip || 'local';
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
        previousResult,
        otherResults,
      });
      res.json(result);
    } catch (err) {
      sendServiceError(res, err);
    }
  });

  app.post('/api/explain', async (req: Request, res: Response) => {
    const clientIp = req.ip || 'local';
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

    try {
      const explained = await explainExistingResults(text, currentResults);
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

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`TalkLikeUS studio server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
