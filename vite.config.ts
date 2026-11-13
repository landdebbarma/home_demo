import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import site from './vite.site.ts'

export default defineConfig({
  plugins: [react(), tailwindcss(), site()],
})
