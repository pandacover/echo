import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { defineConfig } from 'vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'

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
  ],
  resolve: {
    tsconfigPaths: true,
  },
})
