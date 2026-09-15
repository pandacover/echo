import { Show } from '@clerk/tanstack-react-start'
import type { ReactNode } from 'react'

export function AuthSwitch({
  signedIn,
  signedOut,
}: {
  signedIn: ReactNode
  signedOut: ReactNode
}) {
  return (
    <>
      <Show when="signed-in">{signedIn}</Show>
      <Show when="signed-out">{signedOut}</Show>
    </>
  )
}
