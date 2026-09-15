import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const publishableKey = import.meta.env.VITE_SUPABASE_KEY

export type JwtClaims = {
  sub?: string
  role?: string
  keys: string[]
}

export function readJwtClaims(token: string): JwtClaims {
  const payload = token.split('.')[1]
  if (!payload) return { keys: [] }
  try {
    const parsed = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8'),
    ) as Record<string, unknown>
    return {
      sub: typeof parsed.sub === 'string' ? parsed.sub : undefined,
      role: typeof parsed.role === 'string' ? parsed.role : undefined,
      keys: Object.keys(parsed),
    }
  } catch {
    return { keys: [] }
  }
}

function isServiceRoleKey(value: string): boolean {
  if (value.startsWith('sb_secret_')) return true
  if (!value.startsWith('eyJ')) return false
  return readJwtClaims(value).role === 'service_role'
}

export function getServerSupabaseSecretKey(): string {
  const candidates = [
    process.env.SUPABASE_SECRET_KEY,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    process.env.SUPABASE_SERVICE_KEY,
  ]
  for (const raw of candidates) {
    const value = (raw ?? '').trim()
    if (isServiceRoleKey(value)) return value
  }
  return ''
}

export function createClerkSupabaseClient(
  token: string,
): SupabaseClient<Database> {
  return createClient<Database>(supabaseUrl, publishableKey, {
    accessToken: async () => token,
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/** Bypasses RLS. Only use after Clerk has already identified the user, and always filter by user_id. */
export function createServiceSupabaseClient(): SupabaseClient<Database> | null {
  const secretKey = getServerSupabaseSecretKey()
  if (!secretKey) return null
  return createClient<Database>(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: {
        // Secret keys are rejected when the User-Agent looks like a browser.
        'User-Agent': 'EchoServer/1.0',
      },
    },
  })
}
