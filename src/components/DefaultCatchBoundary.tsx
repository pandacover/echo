import {
  ErrorComponent,
  Link,
  useLocation,
  useRouter,
} from '@tanstack/react-router'
import type { ErrorComponentProps } from '@tanstack/react-router'
import type { MouseEvent } from 'react'

export function DefaultCatchBoundary({ error }: ErrorComponentProps) {
  const router = useRouter()
  const isRoot = useLocation({
    select: (location) => location.pathname === '/',
  })

  console.error(error)

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-6 text-center">
      <ErrorComponent error={error} />
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          onClick={() => {
            void router.invalidate()
          }}
          className="rounded-full bg-nota-ink px-4 py-2 text-sm font-semibold text-white"
        >
          Try again
        </button>
        {isRoot ? (
          <Link
            to="/"
            className="rounded-full bg-nota-terracotta px-4 py-2 text-sm font-semibold text-white"
          >
            Home
          </Link>
        ) : (
          <Link
            to="/"
            className="rounded-full bg-nota-terracotta px-4 py-2 text-sm font-semibold text-white"
            onClick={(event: MouseEvent<HTMLAnchorElement>) => {
              event.preventDefault()
              window.history.back()
            }}
          >
            Go back
          </Link>
        )}
      </div>
    </div>
  )
}
