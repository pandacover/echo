import { verifyToken } from '@clerk/backend'
import { auth } from '@clerk/tanstack-react-start/server'
import { createServerFn } from '@tanstack/react-start'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, DictionaryEntry, Note } from './database.types'
import { toRecordingQuota, type RecordingQuota } from './quota'
import {
  getServerClerkSecretKey,
  isClerkSecretKey,
} from './clerk-env'
import {
  countWords,
  formatFromMime,
  polishTranscript,
  transcribeAudio,
} from './openrouter'
import {
  createClerkSupabaseClient,
  createServiceSupabaseClient,
  getServerSupabaseSecretKey,
  readJwtClaims,
} from './supabase'

const SERVER_SESSION_MISSING =
  'Not signed in on the server. Sign in again, then retry the recording.'

const QUOTA_REACHED = "You've used all of your recording time."
const QUOTA_EXCEEDED = 'This recording is longer than your remaining time.'

const CLERK_SUPABASE_SETUP =
  'Supabase did not accept the Clerk session as this user. The Clerk Frontend API URL in Supabase is expected and is not editable. Set SUPABASE_SECRET_KEY (sb_secret_…) or SUPABASE_SERVICE_ROLE_KEY on Vercel as a server-only env var, then redeploy.'

type ClerkSessionAuth = {
  isAuthenticated?: boolean
  userId?: string | null
  getToken?: (options?: { skipCache?: boolean }) => Promise<string | null>
}

async function requireUser(sessionToken?: string | null) {
  const fromClient = sessionToken?.trim() || null
  let clerkUserId: string | null = null
  let token = fromClient

  try {
    const session = (await auth()) as ClerkSessionAuth
    if (session.isAuthenticated && session.userId) {
      clerkUserId = session.userId
      if (!token && typeof session.getToken === 'function') {
        token = (await session.getToken({ skipCache: true })) ?? null
      }
    }
  } catch (error) {
    console.error('Clerk auth() failed', error)
  }

  if (!clerkUserId && token) {
    const secretKey = getServerClerkSecretKey()
    if (isClerkSecretKey(secretKey)) {
      try {
        const payload = await verifyToken(token, { secretKey })
        clerkUserId = payload.sub ?? null
      } catch (error) {
        console.error('Clerk session token verify failed', error)
      }
    }
  }

  const claims = token ? readJwtClaims(token) : { keys: [] }
  const userId = claims.sub || clerkUserId

  if (!userId) {
    throw new Error(SERVER_SESSION_MISSING)
  }

  const service = createServiceSupabaseClient()
  if (service) {
    console.info('Supabase client=service_role')
    return { userId, supabase: service, persistUserId: true }
  }

  if (!token) {
    throw new Error(CLERK_SUPABASE_SETUP)
  }

  console.info('Supabase client=clerk_jwt', {
    hasSub: Boolean(claims.sub),
    role: claims.role ?? null,
    claimKeys: claims.keys,
    clerkUserMatchesSub: !clerkUserId || clerkUserId === claims.sub,
    usingServiceKey: Boolean(getServerSupabaseSecretKey()),
  })

  return {
    userId,
    supabase: createClerkSupabaseClient(token),
    // Let notes.user_id default to auth.jwt()->>'sub' so the insert WITH CHECK cannot drift.
    persistUserId: false,
  }
}

async function loadQuota(
  supabase: SupabaseClient<Database>,
  userId: string,
  persistUserId: boolean,
): Promise<RecordingQuota> {
  if (persistUserId) {
    const { data: existing, error: readError } = await supabase
      .from('profiles')
      .select('quota_seconds, used_seconds')
      .eq('user_id', userId)
      .maybeSingle()
    if (readError) throw new Error(readError.message)
    if (existing) return toRecordingQuota(existing)

    const { data: created, error: insertError } = await supabase
      .from('profiles')
      .insert({ user_id: userId })
      .select('quota_seconds, used_seconds')
      .single()
    if (!insertError && created) return toRecordingQuota(created)

    const { data: retry, error: retryError } = await supabase
      .from('profiles')
      .select('quota_seconds, used_seconds')
      .eq('user_id', userId)
      .maybeSingle()
    if (retry) return toRecordingQuota(retry)
    throw new Error(insertError?.message || retryError?.message || 'Could not create recording quota.')
  }

  const { data, error } = await supabase.rpc('ensure_my_profile')
  if (error) throw new Error(error.message)
  if (!data) throw new Error('Could not load recording quota.')
  return toRecordingQuota(data)
}

async function consumeQuota(
  supabase: SupabaseClient<Database>,
  userId: string,
  persistUserId: boolean,
  seconds: number,
) {
  if (persistUserId) {
    const { data: current, error: readError } = await supabase
      .from('profiles')
      .select('used_seconds')
      .eq('user_id', userId)
      .single()
    if (readError) throw new Error(readError.message)
    if (!current) throw new Error('Could not update recording quota.')
    const { error } = await supabase
      .from('profiles')
      .update({ used_seconds: current.used_seconds + seconds })
      .eq('user_id', userId)
    if (error) throw new Error(error.message)
    return
  }

  const { error } = await supabase.rpc('consume_my_recording_quota', {
    p_seconds: seconds,
  })
  if (error) throw new Error(error.message)
}

export const fetchLibrary = createServerFn({ method: 'POST' }).handler(async () => {
  const { supabase, userId, persistUserId } = await requireUser()
  const [notesRes, dictRes] = await Promise.all([
    supabase
      .from('notes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
    supabase
      .from('dictionary_entries')
      .select('*')
      .eq('user_id', userId)
      .order('word', { ascending: true }),
  ])

  if (notesRes.error) throw new Error(notesRes.error.message)
  if (dictRes.error) throw new Error(dictRes.error.message)

  let quota: RecordingQuota | null = null
  try {
    quota = await loadQuota(supabase, userId, persistUserId)
  } catch (error) {
    console.error('Recording quota lookup failed', error)
  }

  return {
    notes: (notesRes.data ?? []) as Note[],
    dictionary: (dictRes.data ?? []) as DictionaryEntry[],
    quota,
  }
})

export const fetchNote = createServerFn({ method: 'POST' })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const { supabase, userId } = await requireUser()
    const { data: note, error } = await supabase
      .from('notes')
      .select('*')
      .eq('id', data.id)
      .eq('user_id', userId)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return (note as Note | null) ?? null
  })

export const deleteNote = createServerFn({ method: 'POST' })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const { supabase, userId } = await requireUser()
    const { error: dictionaryError } = await supabase
      .from('dictionary_entries')
      .delete()
      .eq('note_id', data.id)
      .eq('user_id', userId)
    if (dictionaryError) throw new Error(dictionaryError.message)

    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', data.id)
      .eq('user_id', userId)
    if (error) throw new Error(error.message)
    return { ok: true }
  })

export const processRecording = createServerFn({ method: 'POST' })
  .validator((data: FormData) => {
    if (!(data instanceof FormData)) {
      throw new Error('Expected FormData')
    }
    return data
  })
  .handler(async ({ data }) => {
    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      throw new Error(
        'OPENROUTER_API_KEY is not set. Add it to .env and your Vercel project settings.',
      )
    }

    const sessionToken = String(data.get('clerkToken') || '')
    const { supabase, userId, persistUserId } = await requireUser(sessionToken)
    const audio = data.get('audio')
    const duration = Number(data.get('duration') || 0)
    if (!(audio instanceof File)) {
      throw new Error('Missing audio upload')
    }

    const quota = await loadQuota(supabase, userId, persistUserId)
    if (quota.remainingSeconds <= 0) {
      throw new Error(QUOTA_REACHED)
    }
    if (duration > quota.remainingSeconds + 5) {
      throw new Error(QUOTA_EXCEEDED)
    }

    const format = formatFromMime(audio.type || 'audio/webm')
    const raw = await transcribeAudio({
      apiKey,
      audio: await audio.arrayBuffer(),
      format,
    })

    if (!raw) {
      throw new Error('Whisper returned an empty transcript. Try recording again.')
    }

    const cleaned = await polishTranscript({ apiKey, raw })
    const wordCount = countWords(cleaned.polished)

    const { data: note, error } = await supabase
      .from('notes')
      .insert({
        ...(persistUserId ? { user_id: userId } : {}),
        title: cleaned.title,
        raw_transcript: raw,
        polished_transcript: cleaned.polished,
        duration_seconds: Math.round(duration),
        word_count: wordCount,
      })
      .select('*')
      .single()

    if (error) {
      throw new Error(`Could not save to Supabase (${error.message}). ${CLERK_SUPABASE_SETUP}`)
    }

    try {
      await consumeQuota(
        supabase,
        userId,
        persistUserId,
        Math.max(1, Math.round(duration)),
      )
    } catch (quotaError) {
      console.error('Recording quota consume failed', quotaError)
    }

    if (cleaned.dictionary.length > 0) {
      const { error: dictError } = await supabase.from('dictionary_entries').upsert(
        cleaned.dictionary.map((entry) => ({
          ...(persistUserId ? { user_id: userId } : {}),
          note_id: note.id,
          word: entry.word,
          definition: entry.definition,
        })),
        { onConflict: 'user_id,word' },
      )
      if (dictError) {
        console.error('Dictionary upsert failed', dictError.message)
      }
    }

    return { note: note as Note, dictionary: cleaned.dictionary }
  })
