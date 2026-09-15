import { clerkMiddleware } from '@clerk/tanstack-react-start/server'
import {
  createCsrfMiddleware,
  createMiddleware,
  createStart,
} from '@tanstack/react-start'

const csrfMiddleware = createCsrfMiddleware({
  // GET server functions run during SSR (auth, library). Address-bar and
  // Vercel SSO navigations send Sec-Fetch-Site none/cross-site, which the
  // default matcher rejects and Nitro then surfaces as HTTPError 500.
  filter: (ctx) =>
    ctx.handlerType === 'serverFn' && ctx.request.method !== 'GET',
})

const clerk = clerkMiddleware()

const safeClerkMiddleware = createMiddleware().server(async (ctx) => {
  const clerkServer = clerk.options.server
  if (!clerkServer) {
    return ctx.next({
      context: {
        auth: () => ({
          userId: null,
          isAuthenticated: false,
        }),
      },
    })
  }

  try {
    return await clerkServer(ctx)
  } catch (error) {
    console.error('Clerk middleware failed', error)
    return ctx.next({
      context: {
        auth: () => ({
          userId: null,
          isAuthenticated: false,
        }),
      },
    })
  }
})

export const startInstance = createStart(() => {
  return {
    requestMiddleware: [safeClerkMiddleware, csrfMiddleware],
  }
})
