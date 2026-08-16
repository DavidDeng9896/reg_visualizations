import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { sqlProxyDevPlugin } from './vite-sql-proxy'

const root = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [vue(), sqlProxyDevPlugin()],
  resolve: {
    alias: {
      'node:async_hooks': path.resolve(root, 'src/shims/async-hooks.ts'),
    },
  },
  assetsInclude: ['**/*.wasm'],
  server: {
    port: 7100,
    host: true,
    // allow Cloudflare / localtunnel hosts for external preview
    allowedHosts: true,
    proxy: {
      // 更具体的路径必须写在 /api 之前，否则会被 insight-api 代理吞掉
      '/api/ai/agent': {
        target: process.env.INSIGHT_DSH_ORIGIN ?? 'http://127.0.0.1:3081',
        changeOrigin: true,
      },
      '/api/sql': {
        target: 'http://127.0.0.1:7120',
        changeOrigin: true,
      },
      // 同源代理 insight-api，公网隧道只需暴露前端端口；e2e 用 INSIGHT_API_ORIGIN 指向独立测试库
      '/api': { target: process.env.INSIGHT_API_ORIGIN ?? 'http://127.0.0.1:8787', changeOrigin: true },
      '/health': { target: process.env.INSIGHT_API_ORIGIN ?? 'http://127.0.0.1:8787', changeOrigin: true },
    },
  },
  optimizeDeps: {
    // Plotly 预打包，避免开发期首点图表才 optimize 造成卡顿
    include: ['plotly.js-dist-min'],
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
          // jspdf 系不手动分包：vendor chunk 会捕获 preload helper 变成首屏静态依赖，
          // 交给动态 import 自然分包（export.ts 按需加载）
          if (id.includes('@rdkit/rdkit')) return 'vendor-rdkit'
          if (id.includes('@rdkit/rdkit')) return 'vendor-rdkit'
          if (id.includes('dexie') || id.includes('papaparse')) return 'vendor-data'
          if (id.includes('pinia') || id.includes('vue-router') || id.includes('/vue/') || id.includes('@vue/')) return 'vendor-vue'
        },
      },
    },
  },
})
