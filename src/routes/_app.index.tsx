import { createFileRoute } from '@tanstack/react-router'
import { useRouter } from '@tanstack/react-router'
import { Recorder } from '~/components/Recorder'

export const Route = createFileRoute('/_app/')({
  component: Home,
})

function Home() {
  const router = useRouter()

  return (
    <Recorder
      onSaved={() => {
        void router.invalidate()
      }}
    />
  )
}
