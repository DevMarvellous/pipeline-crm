/// <reference types="vitest/config" />
import { defineConfig, loadEnv, type Plugin, type Connect } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { generateScript } from './api/_lib/generate.ts'

// Vercel functions don't run under `vite dev`/`vite preview`. This shim mounts
// the same handler locally so the feature is fully testable without `vercel dev`.
function devApiPlugin(env: Record<string, string>): Plugin {
  const handle = async (req: Connect.IncomingMessage, res: import('http').ServerResponse) => {
    if (req.method !== 'POST') {
      res.statusCode = 405
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: 'bad_request' }))
      return
    }
    const chunks: Buffer[] = []
    for await (const chunk of req) chunks.push(chunk as Buffer)
    let body: unknown = {}
    try {
      body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
    } catch {
      res.statusCode = 400
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: 'bad_request' }))
      return
    }
    try {
      const result = await generateScript(body, env.GEMINI_API_KEY, {
        model: env.GEMINI_MODEL,
        baseUrl: env.GEMINI_BASE_URL,
      })
      res.statusCode = result.message ? 200 : result.status
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify(result.message ? { message: result.message } : { error: result.error ?? 'gemini_down' }))
    } catch (err) {
      console.error('[dev api] unhandled error:', err)
      res.statusCode = 500
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: 'gemini_down' }))
    }
  }
  const mount = (server: { middlewares: Connect.Server }) => {
    server.middlewares.use('/api/generate-script', handle)
  }
  return {
    name: 'dev-api-generate-script',
    configureServer: mount,
    configurePreviewServer: mount,
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load all env (incl. non-VITE_ vars) for the server-side dev shim.
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [
      react(),
      tailwindcss(),
      devApiPlugin(env),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg'],
        manifest: {
          name: 'Pipeline',
          short_name: 'Pipeline',
          description: 'Personal deal pipeline and lead tracker',
          theme_color: '#0f1012',
          background_color: '#0f1012',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/today',
          icons: [
            { src: '/icons/pwa-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/icons/pwa-512.png', sizes: '512x512', type: 'image/png' },
            { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
          shortcuts: [
            {
              name: 'Add Lead',
              short_name: 'Add',
              url: '/add',
              icons: [{ src: '/icons/pwa-192.png', sizes: '192x192' }],
            },
            {
              name: 'Today',
              short_name: 'Today',
              url: '/today',
              icons: [{ src: '/icons/pwa-192.png', sizes: '192x192' }],
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
          navigateFallback: '/index.html',
          // Never let the SW shadow the API route with the SPA fallback.
          navigateFallbackDenylist: [/^\/api\//],
          importScripts: ['sw-notifications.js'],
        },
      }),
    ],
    test: {
      environment: 'node',
    },
  }
})
