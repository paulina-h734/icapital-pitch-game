import { defineConfig } from 'vite';

// GitHub Pages serves from a subpath; relative base keeps the offline/local
// build working from a file server too. Adjust `base` to the repo name when
// wiring up Pages deploy.
export default defineConfig({
  base: './',
  server: { host: true },
  build: { target: 'es2020' },
});
