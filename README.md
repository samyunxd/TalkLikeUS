# TalkLikeUS

A 1990s-inspired American English voice transformation studio that rewrites text into four distinct American voices (**Natural American**, **Casual & Slang**, **Unfiltered & Blunt**, and **Badass & Confident**) with optional **Universal Chat Mode** compression and **Teach Me** phrasing notes.

## Deploy to Vercel

1. **Push latest code to GitHub first**: Click the **GitHub** export/sync button in AI Studio so your GitHub repository receives the latest commit (`api/index.js` and `vercel.json`).
2. Import or open your repository in **Vercel** (`Add New... -> Project`).
3. Keep the auto-detected settings from `vercel.json`:
   - **Framework Preset:** `Vite`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. In Vercel **Project Settings -> Environment Variables**, add:
   - **Key:** `GEMINI_API_KEY`
   - **Value:** your Gemini API key (`AIza...` or `AQ....`), pasted directly without quotes (ensure key Application restrictions are set to **None** so server-side requests are allowed)
   - **Environments:** Production, Preview, and Development
5. Trigger a **Redeploy** from the latest `main` commit so serverless functions pick up the environment variable and updated API bundle.

## Local Development

1. Copy `.env.example` to `.env` and set `GEMINI_API_KEY`.
2. Install dependencies and start the server on `http://localhost:3000`:

```bash
npm install
npm run dev
```

## Scripts

- `npm run dev` — Run full-stack Express + Vite dev server on port `3000`
- `npm run build` — Bundle `api/index.js` serverless handler and build Vite frontend into `dist/`
- `npm start` — Run standalone production server (`node server.ts`)
- `npm run lint` — Type-check the TypeScript codebase
