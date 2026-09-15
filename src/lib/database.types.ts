export type Note = {
  id: string
  user_id: string
  title: string
  raw_transcript: string
  polished_transcript: string
  duration_seconds: number
  word_count: number
  created_at: string
  updated_at: string
}

export type DictionaryEntry = {
  id: string
  user_id: string
  note_id: string | null
  word: string
  definition: string
  created_at: string
}

export type Database = {
  public: {
    Tables: {
      notes: {
        Row: Note
        Insert: Partial<Note> & {
          raw_transcript: string
          polished_transcript: string
        }
        Update: Partial<Note>
        Relationships: []
      }
      dictionary_entries: {
        Row: DictionaryEntry
        Insert: Partial<DictionaryEntry> & {
          word: string
        }
        Update: Partial<DictionaryEntry>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
