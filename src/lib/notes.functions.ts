import { verifyToken } from '@clerk/backend'
import { auth } from '@clerk/tanstack-react-start/server'
import { createServerFn } from '@tanstack/react-start'
import type { DictionaryEntry, Note } from './database.types'
import {
  getServerClerkSecretKey,
  isClerkSecretKey,
} from './clerk-env.server'
import {
  countWords,
  formatFromMime,
  polishTranscript,
  transcribeAudio,
} from './openrouter'
import { createClerkSupabaseClient } from './supabase'

const SERVER_SESSION_MISSING =
  'Not signed in on the server (this is Clerk, not Supabase RLS). Set CLERK_PUBLISHABLE_KEY to a pk_test_ or pk_live_ key in Vercel — not a pasted docs page — then redeploy.'

async function requireUser(sessionToken?: string | null) {
  try {
    const session = await auth()
    if (session.isAuthenticated && session.userId) {
      return {
        userId: session.userId,
        supabase: createClerkSupabaseClient(() => session.getToken()),
      }
    }
  } catch (error) {
    console.error('Clerk auth() failed', error)
  }

  const token = sessionToken?.trim()
  const secretKey = getServerClerkSecretKey()
  if (token && isClerkSecretKey(secretKey)) {
    try {
      const payload = await verifyToken(token, { secretKey })
      if (payload.sub) {
        return {
          userId: payload.sub,
          supabase: createClerkSupabaseClient(async () => token),
        }
      }
    } catch (error) {
      console.error('Clerk session token verify failed', error)
    }
  }

  throw new Error(SERVER_SESSION_MISSING)
}

export const fetchLibrary = createServerFn({ method: 'GET' }).handler(async () => {
  const { supabase } = await requireUser()
  const [notesRes, dictRes] = await Promise.all([
    supabase.from('notes').select('*').order('created_at', { ascending: false }),
    supabase.from('dictionary_entries').select('*').order('word', { ascending: true }),
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
    const { supabase } = await requireUser()
    const { data: note, error } = await supabase
      .from('notes')
      .select('*')
      .eq('id', data.id)
      .single()
    if (error) throw new Error(error.message)
    return note as Note
  })

export const deleteNote = createServerFn({ method: 'POST' })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const { supabase } = await requireUser()
    const { error } = await supabase.from('notes').delete().eq('id', data.id)
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
        `Could not save to Supabase (${error.message}). Confirm the notes table exists and Clerk is added as a third-party auth provider.`,
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
