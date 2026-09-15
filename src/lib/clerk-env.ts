function stripEnvQuotes(value: string | undefined): string {
  return (value ?? '').trim().replace(/^["']|["']$/g, '')
}

export function isClerkPublishableKey(value: string): boolean {
  return value.startsWith('pk_test_') || value.startsWith('pk_live_')
}

export function getClientClerkPublishableKey(): string {
  return stripEnvQuotes(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY)
}

export function describeClerkKey(value: string): string {
  if (!value) return 'empty'
  return `length=${value.length} prefix=${value.slice(0, 8)}`
}
