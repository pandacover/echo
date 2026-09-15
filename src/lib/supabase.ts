import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const publishableKey = import.meta.env.VITE_SUPABASE_KEY

function getServerSupabaseSecretKey(): string {
  return (
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    ''
  ).trim()
}

export function createClerkSupabaseClient(
  getToken: () => Promise<string | null>,
): SupabaseClient<Database> {
  return createClient<Database>(supabaseUrl, publishableKey, {
    accessToken: async () => (await getToken()) ?? null,
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/** Bypasses RLS. Only use after Clerk has already identified the user, and always filter by user_id. */
export function createServiceSupabaseClient(): SupabaseClient<Database> | null {
  const secretKey = getServerSupabaseSecretKey()
  if (!secretKey) return null
  return createClient<Database>(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export function readJwtClaims(token: string): {
  sub?: string
  role?: string
} {
  const payload = token.split('.')[1]
  if (!payload) return {}
  try {
    const parsed = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8'),
    ) as { sub?: string; role?: string }
    return { sub: parsed.sub, role: parsed.role }
  } catch {
    return {}
  }
}
