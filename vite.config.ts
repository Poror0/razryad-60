import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // only the site goes to the production build (inspect/render pages are dev tools)
  build: { target: 'es2020', chunkSizeWarningLimit: 1500 },
})
