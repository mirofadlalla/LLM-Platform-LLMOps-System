import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],

  // ── Local development proxy ───────────────────────────────────────────────
  // Mirrors the Vercel rewrite rule in vercel.json so the dev server and
  // production both use the same relative VITE_API_URL (/api/v1).
  // The browser always sends requests to the Vite dev server (HTTP/HTTPS),
  // which proxies them to the local or remote backend — no Mixed Content.
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        // Uncomment the line below to proxy to the EC2 backend during local dev:
        // target: 'http://63.187.109.126:8000',
      },
    },
  },
})
