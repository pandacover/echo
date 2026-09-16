import type { ReactNode } from 'react'

export const FLOATING_NOTICES_ID = 'echo-floating-notices'

export function FloatingNotices({ children }: { children: ReactNode }) {
  return (
    <div
      id={FLOATING_NOTICES_ID}
      className="pointer-events-none fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-50 flex flex-col-reverse items-center gap-2 px-5"
    >
      {children}
    </div>
  )
}
