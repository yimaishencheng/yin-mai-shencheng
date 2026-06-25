import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const DEEPSEEK_KEY = process.env.VITE_DEEPSEEK_API_KEY || ''

export default defineConfig({
  base: '/yin-mai-shencheng/',
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api/deepseek': {
        target: 'https://api.deepseek.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/deepseek/, '/v1'),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            if (DEEPSEEK_KEY) {
              proxyReq.setHeader('Authorization', `Bearer ${DEEPSEEK_KEY}`)
            }
          })
        },
      },
    },
  },
})
