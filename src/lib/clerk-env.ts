import {
  describeClerkKey,
  isClerkPublishableKey,
  resolveClerkPublishableKey,
} from './clerk-keys'

export {
  describeClerkKey,
  isClerkPublishableKey,
  stripEnvQuotes,
} from './clerk-keys'

export function getClientClerkPublishableKey(): string {
  return resolveClerkPublishableKey([import.meta.env.VITE_CLERK_PUBLISHABLE_KEY])
}
