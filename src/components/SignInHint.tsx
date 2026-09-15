import { SignInButton } from '@clerk/tanstack-react-start'
import { Show } from '@clerk/tanstack-react-start'

export function SignInHint({ message }: { message: string }) {
  return (
    <Show when="signed-out">
      <div className="mt-8 rounded-3xl border border-nota-line bg-white/70 px-5 py-4">
        <p className="text-sm leading-relaxed text-nota-muted">{message}</p>
        <SignInButton mode="modal">
          <button className="mt-3 rounded-full bg-nota-terracotta px-4 py-2 text-sm font-semibold text-white">
            Sign in
          </button>
        </SignInButton>
      </div>
    </Show>
  )
}
