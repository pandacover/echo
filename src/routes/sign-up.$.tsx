import { SignUp } from '@clerk/tanstack-react-start'
import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/sign-up/$')({
  component: Page,
})

function Page() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-nota-bg px-6">
      <Link to="/" className="mb-8 font-serif text-5xl text-nota-ink">
        Nota
      </Link>
      <SignUp />
    </div>
  )
}
