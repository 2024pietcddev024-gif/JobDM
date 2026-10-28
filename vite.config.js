import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    open: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err, _req, res) => {
            if (!res.headersSent) {
              res.writeHead(503, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                error: 'Backend API service is unreachable. Please make sure the backend server is running on port 3001.'
              }));
            }
          });
        }
      }
    },
    watch: {
      ignored: ['**/PortableGit/**', '**/*.exe']
    }
  }
});
