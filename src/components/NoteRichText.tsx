import {
  createContext,
  useContext,
  useId,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react'
import { DictionaryTerm } from './DictionaryTerm'
import type { DictionaryEntry, Note } from '~/lib/database.types'
import {
  annotateDictionaryTerms,
  indexDictionary,
  mentionsForWord,
} from '~/lib/dictionary-text'

const OpenTermContext = createContext<{
  openKey: string | null
  setOpenKey: Dispatch<SetStateAction<string | null>>
} | null>(null)

export function NoteTermsProvider({ children }: { children: ReactNode }) {
  const [openKey, setOpenKey] = useState<string | null>(null)
  const value = useMemo(() => ({ openKey, setOpenKey }), [openKey])
  return <OpenTermContext.Provider value={value}>{children}</OpenTermContext.Provider>
}

export function NoteRichText({
  text,
  dictionary,
  notes,
  currentNoteId,
  className,
}: {
  text: string
  dictionary: DictionaryEntry[]
  notes: Note[]
  currentNoteId: string
  className?: string
}) {
  const instanceId = useId()
  const shared = useContext(OpenTermContext)
  const [localOpenKey, setLocalOpenKey] = useState<string | null>(null)
  const openKey = shared?.openKey ?? localOpenKey
  const setOpenKey = shared?.setOpenKey ?? setLocalOpenKey
  const index = useMemo(() => indexDictionary(dictionary), [dictionary])
  const segments = useMemo(
    () => annotateDictionaryTerms(text, [...index.keys()]),
    [index, text],
  )
  const mentionsByWord = useMemo(() => {
    const mentions = new Map<string, Note[]>()
    for (const [key, entry] of index) {
      mentions.set(key, mentionsForWord(notes, entry.word, currentNoteId))
    }
    return mentions
  }, [currentNoteId, index, notes])

  return (
    <span className={className}>
      {segments.map((segment, offset) => {
        if (!segment.wordKey) {
          return <span key={offset}>{segment.text}</span>
        }
        const entry = index.get(segment.wordKey)
        if (!entry) return <span key={offset}>{segment.text}</span>
        const key = `${instanceId}-${segment.wordKey}-${offset}`
        return (
          <DictionaryTerm
            key={key}
            text={segment.text}
            entry={entry}
            mentions={mentionsByWord.get(segment.wordKey) ?? []}
            currentNoteId={currentNoteId}
            open={openKey === key}
            blocked={openKey != null && openKey !== key}
            onOpen={() => setOpenKey(key)}
            onClose={() =>
              setOpenKey((current) => (current === key ? null : current))
            }
          />
        )
      })}
    </span>
  )
}
