import { fileURLToPath, URL } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      output: {
        /**
         * Vendor ajratiladi (S-002). Maqsad — keshlash: React va GSAP
         * oyiga bir marta ham o'zgarmaydi, sayt kodi esa har deployda
         * o'zgaradi. Bitta faylda bo'lsa, bitta matn tuzatish butun
         * 400 KB ni qaytadan yuklatadi.
         *
         * ⚠ Bu chunklar BIRINCHI EKRANDA baribir so'raladi: `Layout`
         *   (Cursor, Lenis, ScrollTrigger) doim mount bo'ladi. GSAP ni
         *   haqiqatan kechiktirish S-016 (kursor) dan keyin mumkin.
         */
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return 'vendor-react'
          if (id.includes('react-router')) return 'vendor-router'
          if (id.includes('lenis')) return 'vendor-lenis'
          if (id.includes('gsap')) return 'vendor-gsap'
          return 'vendor'
        },
      },
    },
  },
})
