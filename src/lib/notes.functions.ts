import { verifyToken } from '@clerk/backend'
import { auth } from '@clerk/tanstack-react-start/server'
import { createServerFn } from '@tanstack/react-start'
import type { DictionaryEntry, Note } from './database.types'
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

export const fetchLibrary = createServerFn({ method: 'GET' }).handler(async () => {
  const { supabase, userId } = await requireUser()
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

  return {
    notes: (notesRes.data ?? []) as Note[],
    dictionary: (dictRes.data ?? []) as DictionaryEntry[],
  }
})

export const fetchNote = createServerFn({ method: 'GET' })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const { supabase, userId } = await requireUser()
    const { data: note, error } = await supabase
      .from('notes')
      .select('*')
      .eq('id', data.id)
      .eq('user_id', userId)
      .single()
    if (error) throw new Error(error.message)
    return note as Note
  })

export const deleteNote = createServerFn({ method: 'POST' })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const { supabase, userId } = await requireUser()
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
