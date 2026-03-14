import { defineConfig } from 'vite';

export default defineConfig({
  // GitHub Pages serves at https://<user>.github.io/interior-design/
  base: '/interior-design/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
});
