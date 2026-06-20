import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
  ],
  server: {
    host: '127.0.0.1',
    port: 5173,
    headers: {
      // Explicitly opt out of COOP isolation so that when the OAuth popup
      // returns to our domain after visiting Google (which sets same-origin
      // COOP), it can rejoin the opener's browsing context group and
      // window.close() / popup.closed work without requiring a user gesture.
      'Cross-Origin-Opener-Policy': 'unsafe-none',
    },
  },
})
