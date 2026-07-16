import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Same-origin API calls in dev; no CORS config needed on the backend.
      '/api': 'http://localhost:8000',
    },
  },
})
