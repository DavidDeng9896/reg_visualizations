import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  assetsInclude: ['**/*.wasm'],
  server: {
    port: 7100,
    host: true,
    // allow Cloudflare / localtunnel hosts for external preview
    allowedHosts: true,
    proxy: {
      // 同源代理 insight-api，公网隧道只需暴露前端端口
      '/api': { target: 'http://127.0.0.1:8787', changeOrigin: true },
      '/health': { target: 'http://127.0.0.1:8787', changeOrigin: true },
    },
  },
  build: {
    rollupOptions: {
      output: {
        // 第三方重依赖分包：首屏只拉 vendor-vue + 路由 chunk；
        // plotly/vxe/vue-flow/jspdf 各自独立缓存，不再挤在 WorkspacePage 单 chunk。
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return
          if (id.includes('plotly.js')) return 'vendor-plotly'
          if (id.includes('vxe-table') || id.includes('xe-utils')) return 'vendor-vxe'
          if (id.includes('@vue-flow') || id.includes('d3-') || id.includes('@dagrejs')) return 'vendor-vue-flow'
          if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('dompurify') || id.includes('fflate')) return 'vendor-jspdf'
          if (id.includes('@rdkit/rdkit')) return 'vendor-rdkit'
          if (id.includes('dexie') || id.includes('papaparse')) return 'vendor-data'
          if (id.includes('pinia') || id.includes('vue-router') || id.includes('/vue/') || id.includes('@vue/')) return 'vendor-vue'
        },
      },
    },
  },
})
