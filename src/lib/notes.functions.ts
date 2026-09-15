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
  readJwtClaims,
} from './supabase'

const SERVER_SESSION_MISSING =
  'Not signed in on the server (this is Clerk, not Supabase RLS). Set CLERK_PUBLISHABLE_KEY to a pk_test_ or pk_live_ key in Vercel — not a pasted docs page — then redeploy.'

const CLERK_SUPABASE_SETUP =
  'Clerk is signed in, but Supabase still sees an anonymous request. Activate the Clerk Supabase integration (dashboard.clerk.com/setup/supabase), add Clerk as a third-party provider in Supabase Auth, and set SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY on Vercel (server-only).'

type ClerkSessionAuth = {
  isAuthenticated?: boolean
  userId?: string | null
  getToken?: (options?: { skipCache?: boolean }) => Promise<string | null>
}

async function requireUser(sessionToken?: string | null) {
  const fromClient = sessionToken?.trim() || null
  let userId: string | null = null
  let token = fromClient

  try {
    const session = (await auth()) as ClerkSessionAuth
    if (session.isAuthenticated && session.userId) {
      userId = session.userId
      if (!token && typeof session.getToken === 'function') {
        token = (await session.getToken({ skipCache: true })) ?? null
      }
    }
  } catch (error) {
    console.error('Clerk auth() failed', error)
  }

  if (!userId && token) {
    const secretKey = getServerClerkSecretKey()
    if (isClerkSecretKey(secretKey)) {
      try {
        const payload = await verifyToken(token, { secretKey })
        userId = payload.sub ?? null
      } catch (error) {
        console.error('Clerk session token verify failed', error)
      }
    }
  }

  if (!userId) {
    throw new Error(SERVER_SESSION_MISSING)
  }

  const service = createServiceSupabaseClient()
  if (service) {
    return { userId, supabase: service }
  }

  if (!token) {
    throw new Error(CLERK_SUPABASE_SETUP)
  }

  const claims = readJwtClaims(token)
  if (claims.role !== 'authenticated' || (claims.sub && claims.sub !== userId)) {
    throw new Error(CLERK_SUPABASE_SETUP)
  }

  return {
    userId,
    supabase: createClerkSupabaseClient(async () => token),
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
    const { supabase, userId } = await requireUser(sessionToken)
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
        user_id: userId,
        title: cleaned.title,
        raw_transcript: raw,
        polished_transcript: cleaned.polished,
        duration_seconds: Math.round(duration),
        word_count: wordCount,
      })
      .select('*')
      .single()

    if (error) {
      throw new Error(
        `Could not save to Supabase (${error.message}). ${CLERK_SUPABASE_SETUP}`,
      )
    }

    if (cleaned.dictionary.length > 0) {
      const { error: dictError } = await supabase.from('dictionary_entries').upsert(
        cleaned.dictionary.map((entry) => ({
          user_id: userId,
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
