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
            allowedHosts: true,
            hmr: true,
            proxy: {
                '/api': {
                    target: env.BACKEND_URL || 'http://localhost:8001',
                    changeOrigin: true,
                    secure: false,
                },
            },
        },
    }
})
