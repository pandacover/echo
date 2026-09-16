import type { DictionaryEntry, Note } from './database.types'

export type TextSegment = {
  text: string
  wordKey?: string
}

export function normalizeWordKey(word: string) {
  return word.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function dictionaryTermPattern(word: string) {
  return escapeRegExp(word.trim()).replace(/\s+/g, '\\s+')
}

export function dictionaryTermRegex(word: string) {
  return new RegExp(
    `(?<![\\p{L}\\p{N}_])(${dictionaryTermPattern(word)})(?![\\p{L}\\p{N}_])`,
    'giu',
  )
}

export function indexDictionary(entries: DictionaryEntry[]) {
  const index = new Map<string, DictionaryEntry>()
  for (const entry of entries) {
    const key = normalizeWordKey(entry.word)
    if (key && !index.has(key)) index.set(key, entry)
  }
  return index
}

export function annotateDictionaryTerms(
  text: string,
  words: string[],
): TextSegment[] {
  const unique = [
    ...new Set(words.map(normalizeWordKey).filter((word) => word.length > 0)),
  ].sort((a, b) => b.length - a.length)

  if (!text || unique.length === 0) return [{ text }]

  const re = new RegExp(
    `(?<![\\p{L}\\p{N}_])(${unique.map(dictionaryTermPattern).join('|')})(?![\\p{L}\\p{N}_])`,
    'giu',
  )
  const segments: TextSegment[] = []
  let cursor = 0

  for (const match of text.matchAll(re)) {
    const index = match.index ?? 0
    if (index > cursor) {
      segments.push({ text: text.slice(cursor, index) })
    }
    const matched = match[1] ?? match[0]
    segments.push({ text: matched, wordKey: normalizeWordKey(matched) })
    cursor = index + match[0].length
  }

  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor) })
  }

  return segments.length > 0 ? segments : [{ text }]
}

export function notesMentioningWord(notes: Note[], word: string) {
  const re = dictionaryTermRegex(word)
  return notes.filter((note) => {
    re.lastIndex = 0
    if (re.test(note.title)) return true
    re.lastIndex = 0
    if (re.test(note.polished_transcript)) return true
    re.lastIndex = 0
    return re.test(note.raw_transcript)
  })
}

export function mentionsForWord(
  notes: Note[],
  word: string,
  currentNoteId?: string,
) {
  const hits = notesMentioningWord(notes, word)
  if (!currentNoteId || hits.some((note) => note.id === currentNoteId)) return hits
  const current = notes.find((note) => note.id === currentNoteId)
  return current ? [current, ...hits] : hits
}
