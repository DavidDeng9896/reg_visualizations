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
          // Do NOT force all of element-plus into one chunk — let Rollup split by
          // sync route usage vs dynamic import('element-plus') in feedback + async dialogs.
          if (id.includes('vxe-table') || id.includes('vxe-pc-ui') || id.includes('@vxe-ui')) return 'vxe'
          if (id.includes('@vue-flow')) return 'vue-flow'
          // Narrow match: avoid catching @vueuse / element-plus via substring "vue"
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
