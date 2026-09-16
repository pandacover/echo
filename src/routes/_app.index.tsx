import { createFileRoute, getRouteApi, useRouter } from '@tanstack/react-router'
import { Recorder } from '~/components/Recorder'

const appRoute = getRouteApi('/_app')

export const Route = createFileRoute('/_app/')({
  component: Home,
})

function Home() {
  const router = useRouter()
  const { quota } = appRoute.useLoaderData()

  return (
    <Recorder
      remainingSeconds={quota?.remainingSeconds ?? null}
      onSaved={() => router.invalidate({ sync: true })}
    />
  )
}
