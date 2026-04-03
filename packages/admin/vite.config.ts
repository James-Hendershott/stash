import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3002,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: `http://${process.env.BACKEND_HOST || 'localhost'}:3001`,
        changeOrigin: true,
      },
    },
  },
});
