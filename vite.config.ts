import { defineConfig, type Plugin } from 'vite';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

function emitVersionJson(): Plugin {
  return {
    name: 'emit-version-json',
    writeBundle(options) {
      const outDir = options.dir ?? 'dist';
      const pkg = JSON.parse(readFileSync(resolve('package.json'), 'utf8')) as { version: string };
      const payload = JSON.stringify({
        version: pkg.version,
        builtAt: new Date().toISOString(),
      });
      writeFileSync(resolve(outDir, 'version.json'), payload);
      writeFileSync(resolve('public', 'version.json'), payload);
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [emitVersionJson()],
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
