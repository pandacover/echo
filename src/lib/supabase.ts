import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY

export function createClerkSupabaseClient(
  getToken: () => Promise<string | null>,
): SupabaseClient<Database> {
  return createClient<Database>(supabaseUrl, supabaseKey, {
    accessToken: async () => (await getToken()) ?? null,
  })
}
