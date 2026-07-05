# Pipeline

Personal deal pipeline and lead tracker for a solo real-estate agent. Mobile-first, installable PWA, fully offline. **One job: never forget a lead, never miss a follow-up.**

No backend, no login — all data lives in your browser's `localStorage`, with JSON export/import for backup.

## Setup

```bash
npm install
npm run dev        # http://localhost:5173
```

Other scripts:

```bash
npm run build      # typecheck + production build to dist/
npm run preview    # serve the production build (test PWA/offline here)
npx vitest run     # data-layer unit tests
```

## Install as an app

**Android (Chrome):** open the deployed site → three-dot menu → **Add to Home screen** → **Install**. Chrome may also show an install banner, or use Settings → Install inside the app. Long-press the installed icon for the **Add Lead** and **Today** shortcuts.

**iPhone (Safari):** open the site → Share button → **Add to Home Screen**. (iOS doesn't support install prompts or notification scheduling as richly as Android; the app still works fully offline.)

## Backing up your data

Everything is on your device — treat exports like money:

1. **Settings → Export data** downloads `pipeline-backup-YYYY-MM-DD.json`.
2. Keep it somewhere safe (Google Drive, email to yourself).
3. **Settings → Import from backup** restores it — *Merge* (adds/updates by lead id) or *Replace* (wipes first).
4. The app nags you with a banner when the last export is over 7 days old (toggle in Settings).

## Notifications

Enable in Settings. The app checks for due follow-ups when it opens (and hourly while open) and fires "{n} follow-ups due today". Browsers don't yet support true background-scheduled notifications, so opening the app daily is the reliable trigger — tapping the notification lands on Today.

## localStorage schema versioning

All data sits under one key, `pipeline.data.v1`:

```json
{ "schemaVersion": 1, "leads": [], "settings": {} }
```

If the data model ever changes incompatibly, bump `schemaVersion`, add a migration in `src/lib/db.ts` (`load()` is the single read path), and keep accepting old export files in `importAll` — that's the whole migration story.

## AI outreach scripts (Gemini)

Lead Detail has a **Generate script** button that drafts a short WhatsApp-style message (first outreach / follow-up / after viewing / re-engage) from that lead's own details. This calls Gemini through a server-side function — **the API key never reaches the browser**.

**Setup:**

1. Get a key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey).
2. Copy `.env.example` to `.env` and set `GEMINI_API_KEY=your-key`. `.env` is gitignored — never commit it.
3. `npm run dev` (or `npm run preview`) works locally without `vercel dev`: a small Vite middleware (`vite.config.ts`) mounts the same handler that runs in production.

**On Vercel:** set the environment variable **`GEMINI_API_KEY`** in Project Settings → Environment Variables (all environments), then redeploy. Optional: `GEMINI_MODEL` to override the default (`gemini-2.5-flash`).

This feature needs internet — everything else in Pipeline (leads, follow-ups, call/WhatsApp/email, offline mode) keeps working exactly as before with or without it configured.

## Deploy

Static site, zero config on Vercel: import the repo, framework preset **Vite**, done. `vercel.json` rewrites everything except `/api/*` to `index.html` so both SPA deep links (`/leads/abc`) and the serverless function resolve correctly. Remember to set `GEMINI_API_KEY` (above) before the script generator will work in production.

## Adding Supabase later

1. All persistence goes through the `db` object in [`src/lib/db.ts`](src/lib/db.ts) — UI code never touches `localStorage`.
2. Reimplement each `db` method against Supabase tables (`leads`, plus `settings` as a single row or user metadata).
3. Methods are synchronous today; make them async and update `src/lib/store.ts` to hydrate/subscribe (the only other file that knows about persistence).
4. Keep `exportAll`/`importAll` working — they're the escape hatch.
5. Nothing else changes: screens and components only import from `db.ts`/`store.ts`.
