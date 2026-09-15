import { clerkMiddleware } from '@clerk/tanstack-react-start/server'
import {
  createCsrfMiddleware,
  createMiddleware,
  createStart,
} from '@tanstack/react-start'
import {
  describeClerkKey,
  getServerClerkPublishableKey,
  getServerClerkSecretKey,
  isClerkPublishableKey,
  isClerkSecretKey,
  sanitizeClerkProcessEnv,
} from './lib/clerk-env.server'
import {
  CLERK_AFTER_AUTH_PATH,
  CLERK_SIGN_IN_PATH,
  CLERK_SIGN_UP_PATH,
} from './lib/clerk-urls'

sanitizeClerkProcessEnv()

const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) =>
    ctx.handlerType === 'serverFn' && ctx.request.method !== 'GET',
})

const unsignedAuth = {
  auth: () => ({
    userId: null,
    isAuthenticated: false,
  }),
}

const clerkPaths = {
  signInUrl: CLERK_SIGN_IN_PATH,
  signUpUrl: CLERK_SIGN_UP_PATH,
  signInFallbackRedirectUrl: CLERK_AFTER_AUTH_PATH,
  signUpFallbackRedirectUrl: CLERK_AFTER_AUTH_PATH,
}

const clerk = clerkMiddleware(() => {
  const publishableKey = getServerClerkPublishableKey()
  const secretKey = getServerClerkSecretKey()
  return {
    ...(isClerkPublishableKey(publishableKey) ? { publishableKey } : {}),
    ...(isClerkSecretKey(secretKey) ? { secretKey } : {}),
    ...clerkPaths,
  }
})

const safeClerkMiddleware = createMiddleware().server(async (ctx) => {
  const publishableKey = getServerClerkPublishableKey()
  const secretKey = getServerClerkSecretKey()

  if (!isClerkPublishableKey(publishableKey) || !isClerkSecretKey(secretKey)) {
    console.warn(
      `Skipping Clerk middleware (${describeClerkKey(publishableKey)}; secret ${isClerkSecretKey(secretKey) ? 'set' : 'invalid'}). Expected pk_/sk_ keys, not a pasted docs page.`,
    )
    return ctx.next({ context: unsignedAuth })
  }

  const clerkServer = clerk.options.server
  if (!clerkServer) {
    return ctx.next({ context: unsignedAuth })
  }

  try {
    return await clerkServer(ctx)
  } catch (error) {
    console.error('Clerk middleware failed', error)
    return ctx.next({ context: unsignedAuth })
  }
})

export const startInstance = createStart(() => {
  return {
    requestMiddleware: [safeClerkMiddleware, csrfMiddleware],
  }
})
