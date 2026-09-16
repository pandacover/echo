# Echo

Installable voice-note PWA built with **TanStack Start**, **Vite**, and **React**. Record audio, transcribe with OpenRouter `openai/whisper-large-v3-turbo`, polish with `openai/gpt-4.1-nano`, and store raw + cleaned transcripts in **Supabase** behind **Clerk** session tokens and row-level security.

## Features

- Record button with live waveform and browser live-preview (Web Speech API when available)
- Whisper transcription + GPT cleanup, grammar, title, and dictionary terms
- Notes library and dictionary extracted from polished transcripts
- Clerk auth, Supabase RLS on `notes`, `dictionary_entries`, and `profiles`
- 10-minute free recording quota, with a remaining-time pill above the tab bar
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

The echo project is already linked. `notes`, `dictionary_entries`, and `profiles` (with RLS) are applied from `supabase/migrations`.

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
3. Set **only these** environment variables (`VITE_*` values are inlined at build time, so Redeploy after changing them). Ignore `POSTGRES_*` and `NEXT_PUBLIC_*`. The Vercel marketplace `SUPABASE_SERVICE_ROLE_KEY` (or `SUPABASE_SECRET_KEY`) **is** used by the server after Clerk verifies the user.

| Name | Notes |
| --- | --- |
| `VITE_SUPABASE_URL` | `https://….supabase.co` |
| `VITE_SUPABASE_KEY` | Publishable / `sb_publishable_…` key |
| `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SECRET_KEY` | Server-only. Lets recordings save without depending on Clerk-as-a-Supabase-provider |
| `VITE_CLERK_PUBLISHABLE_KEY` | Must start with `pk_test_` or `pk_live_` (no quotes) |
| `CLERK_PUBLISHABLE_KEY` | Same value as above |
| `CLERK_SECRET_KEY` | Must start with `sk_test_` or `sk_live_` (no quotes) |
| `OPENROUTER_API_KEY` | From OpenRouter |

Paste **only** the key value (it must start with `pk_` / `sk_`). Do not paste a markdown docs page or a `# Add Clerk…` comment block into the key field. After saving, use **Deployments → ⋮ → Redeploy** so the new values are injected.

If recording finishes with a server-session error, that is Clerk middleware failing to see the signed-in user. If it says a new row violates row-level security, the insert `user_id` did not match `auth.jwt()->>'sub'`.

Do not edit the Clerk Frontend API URL in Supabase — that field is filled by the integration and is supposed to be read-only. Set `SUPABASE_SECRET_KEY` (`sb_secret_…`) or `SUPABASE_SERVICE_ROLE_KEY` on Vercel as a **server-only** env var (the marketplace one is fine), then redeploy.

Do **not** put keys in `VITE_CLERK_SIGN_IN_URL` / `VITE_CLERK_SIGN_UP_URL`. Those must be paths (`/sign-in`), and this app ignores them and uses `/sign-in` and `/sign-up` in code. Delete those Vercel env vars if they contain `sk_` or `pk_` values.

4. Deploy. Add the production URL to Clerk allowed origins and the PWA will be installable over HTTPS.

## Recording quota

Every account is treated as a free user and starts with **10 minutes** of recording time (`profiles.quota_seconds = 600`). Time is consumed when a recording is saved and is **not** restored if the note is deleted.

The remaining time is shown in a small pill just above the tab bar and counts down while you record. Recording **stops automatically** when that time runs out (including if the tab is backgrounded or you leave Record); the take is saved and billed up to the remaining seconds. The mic is disabled at 0. The server measures duration from the audio size as well as the client clock, and saving the note consumes quota in the same database transaction.

If a PWA update banner is also visible, the two stack so they do not overlap.

To raise a user's limit:

1. Copy their Clerk user id from the [Clerk Users](https://dashboard.clerk.com) page (`user_…`).
2. In Supabase, open **Table Editor → `profiles`**.
3. Find that `user_id` and set `quota_seconds` to the new **total** (for example `3600` for 60 minutes).

Or run this in the SQL Editor:

```sql
select public.set_recording_quota('user_2abc...', 3600);

-- equivalent:
update public.profiles
set quota_seconds = 3600
where user_id = 'user_2abc...';
```

If they have no row yet, `set_recording_quota` creates one.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Vite + TanStack Start |
| `npm run build` | Production build |
| `npm run preview` | Preview the production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Quota helper tests |
