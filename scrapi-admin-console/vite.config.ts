import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    server: {
      port: 3000,
      host: '0.0.0.0',
      allowedHosts: 'all',
      hmr: true,
      proxy: {
        // Only proxy API endpoints (not frontend routes like /api-docs)
        '^/api/': {
          target: env.BACKEND_URL,
          changeOrigin: true,
          secure: false,
          ws: true, // Enable WebSocket proxying
        },
      },
    },
  }
})
