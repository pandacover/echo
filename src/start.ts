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
} from './lib/clerk-env'

const csrfMiddleware = createCsrfMiddleware({
  // GET server functions run during SSR (auth, library). Address-bar and
  // Vercel SSO navigations send Sec-Fetch-Site none/cross-site, which the
  // default matcher rejects and Nitro then surfaces as HTTPError 500.
  filter: (ctx) =>
    ctx.handlerType === 'serverFn' && ctx.request.method !== 'GET',
})

const unsignedAuth = {
  auth: () => ({
    userId: null,
    isAuthenticated: false,
  }),
}

const clerk = clerkMiddleware({
  publishableKey: getServerClerkPublishableKey(),
  secretKey: getServerClerkSecretKey(),
})

const safeClerkMiddleware = createMiddleware().server(async (ctx) => {
  const publishableKey = getServerClerkPublishableKey()
  const secretKey = getServerClerkSecretKey()

  if (!isClerkPublishableKey(publishableKey) || !secretKey) {
    console.warn(
      `Skipping Clerk middleware (${describeClerkKey(publishableKey)}; secret ${secretKey ? 'set' : 'missing'}). Expected pk_test_ or pk_live_ with no quotes.`,
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
