import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const api = 'http://localhost:4310'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: { '/api': api, '/uploads': api, '/sitemap.xml': api, '/robots.txt': api },
  },
})
