import { createFileRoute } from '@tanstack/react-router'
import { useRouter } from '@tanstack/react-router'
import { AppShell } from '~/components/AppShell'
import { Recorder } from '~/components/Recorder'
import { WelcomeGate } from '~/components/WelcomeGate'
import { AuthSwitch } from '~/components/AuthSwitch'
import { fetchLibrary } from '~/lib/notes.functions'

export const Route = createFileRoute('/')({
  loader: async ({ context }) => {
    if (!context.userId) return { wordCount: 0 }
    try {
      const library = await fetchLibrary()
      return { wordCount: library.dictionary.length }
    } catch {
      return { wordCount: 0 }
    }
  },
  component: Home,
})

function Home() {
  const { wordCount } = Route.useLoaderData()
  const router = useRouter()

  return (
    <AppShell wordCount={wordCount}>
      <AuthSwitch
        signedIn={
          <Recorder
            onSaved={() => {
              void router.invalidate()
            }}
          />
        }
        signedOut={<WelcomeGate />}
      />
    </AppShell>
  )
}
