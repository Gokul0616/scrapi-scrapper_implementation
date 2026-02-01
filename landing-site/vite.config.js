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
      'localhost',
      '.emergentagent.com',
      "https://signup-script-1.preview.emergentagent.com/"
    ],
    hmr: {
      clientPort: 443,
    },
    proxy: {
      '/api': {
        target: "https://signup-script-1.preview.emergentagent.com/",
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
