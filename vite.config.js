import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/svg_master_pro/',
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('monaco-editor/esm/vs/language')) {
              return 'vendor-monaco-lang'
            }
            if (id.includes('monaco-editor/esm/vs/editor/editor.worker') ||
                id.includes('monaco-editor/esm/vs/base/worker/workerMain')) {
              return 'vendor-monaco-worker'
            }
            if (id.includes('monaco-editor')) {
              return 'vendor-monaco'
            }
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor-react'
            }
            return 'vendor'
          }
        }
      }
    },
    chunkSizeWarningLimit: 5000,
    reportCompressedSize: true,
  },
})
