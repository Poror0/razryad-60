import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // GitHub Pages serves the site from https://<user>.github.io/razryad-60/
  base: '/razryad-60/',
  plugins: [react()],
  // only index.html goes to the production build (render.html is a dev tool)
  build: { target: 'es2020', chunkSizeWarningLimit: 1500 },
})
