import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

// https://vite.dev/config/
export default defineConfig(({ mode, command }) => {
  // 🔒 D-048: production build'ga localhost API manzili tushib qolmasin (VITE_API_URL build paytida yoziladi)
  if (command === 'build' && mode === 'production') {
    const apiUrl = loadEnv(mode, process.cwd(), 'VITE_').VITE_API_URL ?? '';
    if (/\/\/(localhost|127\.0\.0\.1)[:/]/.test(apiUrl)) {
      console.warn(`\n⚠ VITE_API_URL=${apiUrl} — production build lokal backendga ulanadi. Deploy uchun haqiqiy API manzilini bering.\n`);
    }
  }
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      // `@/shared/api` → `src/shared/api` (tsconfig.app.json `paths` bilan bir xil)
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    server: { port: 5174 },
    test: {
      environment: 'node',
      include: ['src/**/*.test.{ts,tsx}'],
    },
  };
});
