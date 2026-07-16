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
          if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('purify')) return 'export'
          if (
            id.includes('element-plus') &&
            (id.includes('/message') ||
              id.includes('/message-box') ||
              id.includes('/notification') ||
              id.includes('/loading'))
          ) {
            return 'element-feedback'
          }
          if (id.includes('element-plus')) return 'element-plus'
          if (id.includes('vxe-table') || id.includes('vxe-pc-ui') || id.includes('@vxe-ui')) return 'vxe'
          if (id.includes('@vue-flow')) return 'vue-flow'
          if (id.includes('vue') || id.includes('pinia') || id.includes('vue-router')) return 'vue-vendor'
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
