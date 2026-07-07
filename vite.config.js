import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// The pitch build is a SINGLE self-contained index.html: the singleFile plugin
// inlines the JS/CSS, and assetsInlineLimit inlines the art as data URIs, so the
// whole game runs offline from one file (double-click, no server) — and it still
// works served from GitHub Pages. `base: './'` keeps relative paths portable.
export default defineConfig({
  base: './',
  server: { host: true },
  plugins: [viteSingleFile()],
  build: {
    target: 'es2020',
    assetsInlineLimit: 100000000, // inline every asset (data URIs)
    chunkSizeWarningLimit: 4000,
  },
});
