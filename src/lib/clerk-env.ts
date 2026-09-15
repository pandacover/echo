import {
  describeClerkKey,
  isClerkPublishableKey,
  isClerkSecretKey,
  resolveClerkPublishableKey,
  resolveClerkSecretKey,
} from './clerk-keys'

export {
  describeClerkKey,
  isClerkPublishableKey,
  isClerkSecretKey,
  stripEnvQuotes,
} from './clerk-keys'

export function getClientClerkPublishableKey(): string {
  return resolveClerkPublishableKey([import.meta.env.VITE_CLERK_PUBLISHABLE_KEY])
}

/** Prefer a real pk_ over a pasted docs page, including the Vite-inlined client key. */
export function getServerClerkPublishableKey(): string {
  return resolveClerkPublishableKey([
    process.env.CLERK_PUBLISHABLE_KEY,
    process.env.VITE_CLERK_PUBLISHABLE_KEY,
    getClientClerkPublishableKey(),
  ])
}

export function getServerClerkSecretKey(): string {
  return resolveClerkSecretKey([process.env.CLERK_SECRET_KEY])
}

/**
 * Clerk's own SDK reads process.env / VITE_ keys directly. Rewrite those values
 * to extracted pk_/sk_ tokens so authenticateRequest is not handed a markdown paste.
 */
export function sanitizeClerkProcessEnv(): {
  publishableKey: string
  secretKey: string
  rewritten: boolean
} {
  const before =
    process.env.CLERK_PUBLISHABLE_KEY || process.env.VITE_CLERK_PUBLISHABLE_KEY || ''
  const publishableKey = getServerClerkPublishableKey()
  const secretKey = getServerClerkSecretKey()
  let rewritten = false

  if (isClerkPublishableKey(publishableKey)) {
    if (process.env.CLERK_PUBLISHABLE_KEY !== publishableKey) {
      process.env.CLERK_PUBLISHABLE_KEY = publishableKey
      rewritten = true
    }
    if (process.env.VITE_CLERK_PUBLISHABLE_KEY !== publishableKey) {
      process.env.VITE_CLERK_PUBLISHABLE_KEY = publishableKey
      rewritten = true
    }
  }

  if (isClerkSecretKey(secretKey) && process.env.CLERK_SECRET_KEY !== secretKey) {
    process.env.CLERK_SECRET_KEY = secretKey
    rewritten = true
  }

  if (rewritten) {
    console.info(
      `Normalized Clerk env keys (${describeClerkKey(before)} -> ${describeClerkKey(publishableKey)})`,
    )
  }

  return { publishableKey, secretKey, rewritten }
}
