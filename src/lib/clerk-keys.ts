/** Shared Clerk key parsing. Safe for client and server; never logs full keys. */

export function stripEnvQuotes(value: string | undefined): string {
  return (value ?? '').trim().replace(/^["']|["']$/g, '')
}

const PUBLISHABLE_TOKEN = 'pk_(?:test|live)_[A-Za-z0-9]+'
const SECRET_TOKEN = 'sk_(?:test|live)_[A-Za-z0-9]+'
const MIN_EMBEDDED_KEY_LENGTH = 24

export function isClerkPublishableKey(value: string): boolean {
  return value.startsWith('pk_test_') || value.startsWith('pk_live_')
}

export function isClerkSecretKey(value: string): boolean {
  return value.startsWith('sk_test_') || value.startsWith('sk_live_')
}

function exactToken(pattern: string, raw: string | undefined): string {
  const value = stripEnvQuotes(raw)
  const match = value.match(new RegExp(`^(${pattern})`))
  return match?.[1] ?? ''
}

function assignedToken(
  names: string[],
  pattern: string,
  raw: string | undefined,
): string {
  const value = stripEnvQuotes(raw)
  if (!value) return ''
  const nameGroup = names.map(escapeRegExp).join('|')
  const match = value.match(
    new RegExp(
      `(?:^|[\\n\\r;])[\\t ]*(?:${nameGroup})[\\t ]*=[\\t ]*["']?(${pattern})`,
    ),
  )
  return match?.[1] ?? ''
}

function searchToken(pattern: string, raw: string | undefined): string {
  const value = stripEnvQuotes(raw)
  const matches = value.match(new RegExp(pattern, 'g')) ?? []
  return matches
    .filter((key) => key.length >= MIN_EMBEDDED_KEY_LENGTH)
    .reduce((best, key) => (key.length > best.length ? key : best), '')
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function resolveClerkPublishableKey(
  candidates: Array<string | undefined>,
): string {
  for (const raw of candidates) {
    const exact = exactToken(PUBLISHABLE_TOKEN, raw)
    if (exact) return exact
  }
  for (const raw of candidates) {
    const assigned = assignedToken(
      [
        'CLERK_PUBLISHABLE_KEY',
        'VITE_CLERK_PUBLISHABLE_KEY',
        'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
      ],
      PUBLISHABLE_TOKEN,
      raw,
    )
    if (assigned) return assigned
  }
  for (const raw of candidates) {
    const found = searchToken(PUBLISHABLE_TOKEN, raw)
    if (found) return found
  }
  return stripEnvQuotes(candidates.find((value) => stripEnvQuotes(value)) ?? '')
}

export function resolveClerkSecretKey(
  candidates: Array<string | undefined>,
): string {
  for (const raw of candidates) {
    const exact = exactToken(SECRET_TOKEN, raw)
    if (exact) return exact
  }
  for (const raw of candidates) {
    const assigned = assignedToken(
      ['CLERK_SECRET_KEY'],
      SECRET_TOKEN,
      raw,
    )
    if (assigned) return assigned
  }
  for (const raw of candidates) {
    const found = searchToken(SECRET_TOKEN, raw)
    if (found) return found
  }
  return stripEnvQuotes(candidates.find((value) => stripEnvQuotes(value)) ?? '')
}

export function describeClerkKey(value: string): string {
  if (!value) return 'empty'
  const compact = value.replace(/\s+/g, ' ')
  return `length=${value.length} prefix=${compact.slice(0, 8)}`
}

export function assertClerkKeyParsing(): void {
  const pk = 'pk_test_' + 'A'.repeat(40)
  const sk = 'sk_test_' + 'B'.repeat(40)
  const blob = `# Add Clerk keys\nCLERK_PUBLISHABLE_KEY=${pk}\nCLERK_SECRET_KEY=${sk}\n`
  const cases: Array<[string, string]> = [
    [resolveClerkPublishableKey([pk]), pk],
    [resolveClerkPublishableKey([`"${pk}"`]), pk],
    [resolveClerkPublishableKey([blob, 'ignored']), pk],
    [
      resolveClerkPublishableKey([
        blob,
        pk.replace('A', 'Z'),
      ]),
      pk.replace('A', 'Z'),
    ],
    [resolveClerkSecretKey([blob]), sk],
    [resolveClerkPublishableKey(['# Add Clerk documentation only']), '# Add Clerk documentation only'],
  ]
  for (const [got, want] of cases) {
    if (got !== want) {
      throw new Error(`Clerk key parse mismatch: ${describeClerkKey(got)} vs ${describeClerkKey(want)}`)
    }
  }
  if (isClerkPublishableKey(blob) || !isClerkPublishableKey(pk)) {
    throw new Error('Clerk publishable key predicate failed')
  }
}
