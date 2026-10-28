# TalkLikeUS

A 1990s-inspired American English voice transformation studio that rewrites text into four distinct American voices (**Natural American**, **Casual & Slang**, **Unfiltered & Blunt**, and **Badass & Confident**) with optional **Universal Chat Mode** compression and **Teach Me** phrasing notes.

## Deploy to Vercel

1. Push this repository to GitHub, GitLab, or Bitbucket and import it into **Vercel** (`Add New... -> Project`).
2. Keep the auto-detected settings from `vercel.json`:
   - **Framework Preset:** `Vite`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
3. In Vercel **Project Settings -> Environment Variables**, add:
   - `GEMINI_API_KEY` = your Gemini API key
4. Deploy (or redeploy after adding `GEMINI_API_KEY`).

## Local Development

1. Copy `.env.example` to `.env` and set `GEMINI_API_KEY`.
2. Install dependencies and start the server on `http://localhost:3000`:

```bash
npm install
npm run dev
```

## Scripts

- `npm run dev` — Run full-stack Express + Vite dev server on port `3000`
- `npm run build` — Bundle `/api/index.js` serverless handler and build Vite frontend into `dist/`
- `npm start` — Run standalone production server (`node server.ts`)
- `npm run lint` — Type-check the TypeScript codebase
