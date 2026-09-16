import assert from 'node:assert/strict'
import test from 'node:test'
import {
  annotateDictionaryTerms,
  dictionaryTermRegex,
  indexDictionary,
  mentionsForWord,
  notesMentioningWord,
  normalizeWordKey,
} from './dictionary-text.ts'
import type { DictionaryEntry, Note } from './database.types.ts'

function note(partial: Partial<Note> & Pick<Note, 'id' | 'title'>): Note {
  return {
    created_at: '2026-01-01T00:00:00Z',
    duration_seconds: 12,
    polished_transcript: '',
    raw_transcript: '',
    updated_at: '2026-01-01T00:00:00Z',
    user_id: 'user_1',
    word_count: 4,
    ...partial,
  }
}

test('normalizeWordKey collapses case and spaces', () => {
  assert.equal(normalizeWordKey('  Depth   of Field '), 'depth of field')
})

test('annotates whole words and longer phrases first', () => {
  const segments = annotateDictionaryTerms(
    'Keep shutter speed high to freeze motion blur, not art.',
    ['art', 'shutter speed', 'motion blur'],
  )
  const marked = segments.filter((segment) => segment.wordKey)
  assert.deepEqual(
    marked.map((segment) => segment.text),
    ['shutter speed', 'motion blur', 'art'],
  )
})

test('does not mark substrings inside other words', () => {
  const segments = annotateDictionaryTerms('The start of the article.', ['art'])
  assert.equal(
    segments.some((segment) => segment.wordKey === 'art'),
    false,
  )
})

test('preserves surrounding punctuation and newlines', () => {
  const segments = annotateDictionaryTerms('Open the aperture,\nthen wait.', [
    'aperture',
  ])
  assert.equal(segments[0]?.text, 'Open the ')
  assert.equal(segments[1]?.text, 'aperture')
  assert.equal(segments[1]?.wordKey, 'aperture')
  assert.equal(segments[2]?.text, ',\nthen wait.')
})

test('indexDictionary keeps the first entry per normalized word', () => {
  const index = indexDictionary([
    {
      id: '1',
      user_id: 'u',
      word: 'Aperture',
      definition: 'first',
      note_id: null,
      created_at: '',
    },
    {
      id: '2',
      user_id: 'u',
      word: 'aperture',
      definition: 'second',
      note_id: null,
      created_at: '',
    },
  ] as DictionaryEntry[])
  assert.equal(index.get('aperture')?.definition, 'first')
})

test('notesMentioningWord finds the term across title and body', () => {
  const notes = [
    note({
      id: 'a',
      title: 'Studio day',
      polished_transcript: 'Watch the depth of field on the subject.',
    }),
    note({
      id: 'b',
      title: 'Depth of field notes',
      polished_transcript: 'Nothing else.',
    }),
    note({
      id: 'c',
      title: 'Unrelated',
      polished_transcript: 'A field trip.',
    }),
  ]
  const hits = notesMentioningWord(notes, 'depth of field').map((item) => item.id)
  assert.deepEqual(hits, ['a', 'b'])
  assert.equal(dictionaryTermRegex('field').test('A field trip.'), true)
})

test('mentionsForWord keeps the open note even if the scan missed it', () => {
  const notes = [
    note({ id: 'a', title: 'Studio day', polished_transcript: 'Watch the light.' }),
    note({ id: 'b', title: 'Depth of field notes', polished_transcript: 'Nothing else.' }),
  ]
  const hits = mentionsForWord(notes, 'depth of field', 'a').map((item) => item.id)
  assert.deepEqual(hits, ['a', 'b'])
})
