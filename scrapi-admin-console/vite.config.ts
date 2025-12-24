import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: '0.0.0.0',
    allowedHosts: [
      'admin-host-setup.preview.emergentagent.com',
      'visual-crawler-2.preview.emergentagent.com',
      'localhost',
      '.emergentagent.com'
    ],
    hmr: {
      clientPort: 443,
    },
    proxy: {
      // Only proxy API endpoints (not frontend routes like /api-docs)
      '^/api/': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
