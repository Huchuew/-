import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    target: 'es2020',
  },
  server: {
    host: true,
    port: 5200,
    strictPort: true,
    open: false,
    watch: {
      usePolling: true,
      interval: 300,
    },
    hmr: {
      overlay: true,
    },
  },
  preview: {
    host: true,
    port: 5200,
    strictPort: true,
  },
});
