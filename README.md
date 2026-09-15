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

The echo project is already linked. `notes` and `dictionary_entries` (with RLS) are applied from `supabase/migrations`.

1. In the Supabase dashboard, open **Authentication → Sign In / Providers → Third-party** and add **Clerk** with the Clerk domain from step 1.
2. Publishable values are in `.env.example`:

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
2. Framework preset can stay **Other**; Nitro emits `.vercel/output` when `VERCEL=1`.
3. Set **only these** environment variables (`VITE_*` values are inlined at build time, so Redeploy after changing them). Ignore `POSTGRES_*`, `NEXT_PUBLIC_*`, and extra `SUPABASE_*` names from the marketplace integration — this app does not read them.

| Name | Notes |
| --- | --- |
| `VITE_SUPABASE_URL` | `https://….supabase.co` |
| `VITE_SUPABASE_KEY` | Publishable / `sb_publishable_…` key |
| `VITE_CLERK_PUBLISHABLE_KEY` | Must start with `pk_test_` or `pk_live_` (no quotes) |
| `CLERK_PUBLISHABLE_KEY` | Same value as above |
| `CLERK_SECRET_KEY` | Must start with `sk_test_` or `sk_live_` (no quotes) |
| `OPENROUTER_API_KEY` | From OpenRouter |

Paste **only** the key value (it must start with `pk_` / `sk_`). Do not paste a markdown docs page or a `# Add Clerk…` comment block into the key field. After saving, use **Deployments → ⋮ → Redeploy** so the new values are injected.

If recording finishes with a server-session error, that is Clerk middleware failing to see the signed-in user — not Supabase RLS. RLS failures say `Could not save to Supabase`.

Do **not** put keys in `VITE_CLERK_SIGN_IN_URL` / `VITE_CLERK_SIGN_UP_URL`. Those must be paths (`/sign-in`), and this app ignores them and uses `/sign-in` and `/sign-up` in code. Delete those Vercel env vars if they contain `sk_` or `pk_` values.

4. Deploy. Add the production URL to Clerk allowed origins and the PWA will be installable over HTTPS.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Vite + TanStack Start |
| `npm run build` | Production build |
| `npm run preview` | Preview the production build |
| `npm run typecheck` | `tsc --noEmit` |
