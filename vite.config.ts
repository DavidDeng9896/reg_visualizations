import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [
    vue(),
    AutoImport({
      resolvers: [ElementPlusResolver()],
      dts: 'src/auto-imports.d.ts',
    }),
    Components({
      resolvers: [ElementPlusResolver()],
      dts: 'src/components.d.ts',
    }),
  ],
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
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('echarts')) return 'echarts'
          // Keep jspdf/html2canvas/vxe as automatic async chunks — forcing named
          // manual chunks can steal shared helpers (e.g. __vitePreload) or pull
          // vxe into the list-route shared graph via cross-chunk re-exports.
          if (id.includes('@vue-flow')) return 'vue-flow'
          if (
            /node_modules\/(?:vue|pinia|vue-router)\//.test(id) ||
            /node_modules\/@vue\//.test(id)
          ) {
            return 'vue-vendor'
          }
        },
      },
    },
    chunkSizeWarningLimit: 1500,
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
