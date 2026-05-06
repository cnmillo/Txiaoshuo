import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../shared/src')
    }
  },
  server: {
    port: 5173,
    host: true,
    hmr: {
      overlay: true
    },
    headers: {
      'Cache-Control': 'no-store'
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        timeout: 600000, // 代理超时 10 分钟
        proxyTimeout: 600000 // 后端响应超时 10 分钟
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
})
