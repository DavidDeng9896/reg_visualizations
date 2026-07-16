import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: true,
    port: 5173,
    // allow localtunnel / cloudflare quick tunnels for external preview
    allowedHosts: true,
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
