import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'

export function NotFound({ children }: { children?: ReactNode }) {
  return (
    <div className="space-y-4 p-8 text-center">
      <p className="font-serif text-3xl">Page not found</p>
      <div className="text-nota-muted">
        {children || <p>That note or screen does not exist.</p>}
      </div>
      <Link
        to="/"
        className="inline-flex rounded-full bg-nota-terracotta px-5 py-2 text-sm font-semibold text-white"
      >
        Back to Record
      </Link>
    </div>
  )
}
