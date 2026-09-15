import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'

function stampServiceWorker(): Plugin {
  const version =
    process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) || Date.now().toString()

  const stamp = (file: string) => {
    if (!existsSync(file)) return
    const source = readFileSync(file, 'utf8')
    if (!source.includes('__SW_BUILD__')) return
    writeFileSync(file, source.replaceAll('__SW_BUILD__', version))
  }

  const stampOutputs = () => {
    for (const dir of ['.output/public', 'dist', '.vercel/output/static']) {
      stamp(path.resolve(dir, 'sw.js'))
    }
  }

  return {
    name: 'stamp-service-worker',
    apply: 'build',
    enforce: 'post',
    closeBundle: {
      sequential: true,
      order: 'post',
      handler() {
        stampOutputs()
      },
    },
  }
}

export default defineConfig({
  server: {
    port: 3000,
    host: true,
  },
  plugins: [
    tailwindcss(),
    tanstackStart(),
    // Vercel's default Nitro web handler overwrites srvx `runtime.node`,
    // which crashes TanStack SSR as an unhandled HTTPError. Node entry
    // keeps the Node request context. Local builds still use node-server.
    nitro({
      ...(process.env.VERCEL ? { preset: 'vercel' as const } : {}),
      vercel: {
        entryFormat: 'node',
        functions: {
          maxDuration: 60,
        },
      },
    }),
    viteReact(),
    stampServiceWorker(),
  ],
  resolve: {
    tsconfigPaths: true,
  },
})
