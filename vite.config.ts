import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    include: ['react-dropzone', 'papaparse', 'jstat', 'lodash', 'recharts']
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-recharts': ['recharts'],
          'vendor-utils': ['lodash', 'jstat', 'papaparse']
        }
      }
    }
  }
})
