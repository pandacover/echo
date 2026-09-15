function stripEnvQuotes(value: string | undefined): string {
  return (value ?? '').trim().replace(/^["']|["']$/g, '')
}

export function isClerkPublishableKey(value: string): boolean {
  return value.startsWith('pk_test_') || value.startsWith('pk_live_')
}

export function isClerkSecretKey(value: string): boolean {
  return value.startsWith('sk_test_') || value.startsWith('sk_live_')
}

/** Prefer the non-VITE server key so Vite build inlining cannot shadow it. */
export function getServerClerkPublishableKey(): string {
  return stripEnvQuotes(
    process.env.CLERK_PUBLISHABLE_KEY || process.env.VITE_CLERK_PUBLISHABLE_KEY,
  )
}

export function getServerClerkSecretKey(): string {
  return stripEnvQuotes(process.env.CLERK_SECRET_KEY)
}

export function describeClerkKey(value: string): string {
  if (!value) return 'empty'
  return `length=${value.length} prefix=${value.slice(0, 8)}`
}
