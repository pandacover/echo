import { SignInButton, SignUpButton } from '@clerk/tanstack-react-start'

export function WelcomeGate() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-8 pb-10 text-center">
      <p className="font-serif text-5xl">Nota</p>
      <p className="mt-4 max-w-xs text-base leading-relaxed text-nota-muted">
        Tap to capture a thought. Whisper transcribes it, GPT polishes it, and your notes stay private behind Clerk +
        Supabase RLS.
      </p>
      <div className="mt-8 flex w-full max-w-xs flex-col gap-3">
        <SignInButton mode="modal">
          <button className="w-full rounded-full bg-nota-terracotta py-3 text-base font-semibold text-white shadow-[0_10px_24px_rgba(196,92,62,0.25)]">
            Sign in
          </button>
        </SignInButton>
        <SignUpButton mode="modal">
          <button className="w-full rounded-full border border-nota-line bg-white/70 py-3 text-base font-semibold text-nota-ink">
            Create account
          </button>
        </SignUpButton>
      </div>
    </div>
  )
}
