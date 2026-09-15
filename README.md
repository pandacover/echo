# Nota

Installable voice-note PWA built with **TanStack Start**, **Vite**, and **React**. Record audio, transcribe with OpenRouter `openai/whisper-large-v3-turbo`, polish with `openai/gpt-4.1-nano`, and store raw + cleaned transcripts in **Supabase** behind **Clerk** session tokens and row-level security.

## Features

- Record button with live waveform and browser live-preview (Web Speech API when available)
- Whisper transcription + GPT cleanup, grammar, title, and dictionary terms
- Notes library and dictionary extracted from polished transcripts
- Clerk auth, Supabase RLS on `notes` and `dictionary_entries`
- Installable PWA (manifest, service worker, home-screen icons)
- Vercel-ready via the Nitro Vite plugin

## Setup

```bash
npm install
cp .env.example .env
```

### 1. Clerk

From the project root:

```bash
npx -y clerk@latest init
```

That writes development keys into `.env`. Claim the app later with `npx clerk@latest auth login` before production.

In the [Clerk Supabase integration](https://dashboard.clerk.com/setup/supabase), activate the integration and copy the **Clerk domain**.

### 2. Supabase

1. In the Supabase dashboard, open **Authentication → Sign In / Providers → Third-party** and add **Clerk** with that domain.
2. Run `supabase/migrations/20260915100000_notes_and_dictionary.sql` in the SQL editor.
3. Keep the publishable values already in `.env.example`:

```
VITE_SUPABASE_URL=https://audpduzramwavabcrqws.supabase.co
VITE_SUPABASE_KEY=sb_publishable_LDQcjzFSABlvFGb1YSgX4Q_dQL2tjbI
```

RLS policies compare `auth.jwt()->>'sub'` (the Clerk user id) to `user_id`. The app creates a Supabase client with `accessToken: () => session.getToken()`, so every query runs as that Clerk user.

### 3. OpenRouter

Add a server-only key (never prefix with `VITE_`):

```
OPENROUTER_API_KEY=sk-or-...
```

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), sign in, and allow the microphone.

## Vercel

1. Import the GitHub repo in Vercel.
2. Framework preset can stay **Other**; Nitro emits the correct output from `vite build`.
3. Set environment variables:

| Name | Notes |
| --- | --- |
| `VITE_SUPABASE_URL` | Project URL |
| `VITE_SUPABASE_KEY` | Publishable key |
| `VITE_CLERK_PUBLISHABLE_KEY` / `CLERK_PUBLISHABLE_KEY` | From Clerk |
| `CLERK_SECRET_KEY` | From Clerk |
| `OPENROUTER_API_KEY` | From OpenRouter |

4. Deploy. Add the production URL to Clerk allowed origins and the PWA will be installable over HTTPS.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Vite + TanStack Start |
| `npm run build` | Production build |
| `npm run preview` | Preview the production build |
| `npm run typecheck` | `tsc --noEmit` |
