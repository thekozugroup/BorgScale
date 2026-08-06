import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

const devBackendPort = process.env.DEV_PORT || '8083'
const proxyTarget = process.env.VITE_PROXY_TARGET || `http://localhost:${devBackendPort}`

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 7879,
    fs: {
      allow: [path.resolve(__dirname, '..')],
    },
    proxy: {
      '/api': {
        target: proxyTarget,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'build',
    // Source maps are ~7 MB and are shipped with the container image. The code
    // is AGPL and published, so they add weight without adding disclosure.
    // Set VITE_SOURCEMAP=true when you need to debug a production build.
    sourcemap: process.env.VITE_SOURCEMAP === 'true',
    rollupOptions: {
      output: {
        // Split rarely-changing vendor code out of the app chunk so a release
        // does not invalidate the browser cache for the whole framework, and so
        // the heavy editor/chart libraries only download on pages that use them.
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          query: ['@tanstack/react-query', 'axios'],
          charts: ['recharts'],
          editor: ['@monaco-editor/react'],
          i18n: ['i18next', 'react-i18next'],
        },
      },
    },
  },
})
