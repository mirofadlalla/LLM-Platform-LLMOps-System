import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],

  // Expose VITE_* env vars — they are read from .env / .env.production etc.
  // Access in code via: import.meta.env.VITE_API_URL
  // No further config needed; Vite handles .env files automatically.
})
