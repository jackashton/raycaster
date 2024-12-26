/// <reference types='vitest' />
import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';
import parsePPM from 'ppm-parser';

const __dirname = path.dirname(new URL(import.meta.url).pathname);

export default defineConfig({
  root: __dirname,
  cacheDir: 'node_modules/.vite',

  // Configuration for building your library.
  // See: https://vitejs.dev/guide/build.html#library-mode
  build: {
    outDir: 'dist',
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
  plugins: [
    {
      name: 'vite-ppm-loader',
      async transform(_, id) {
        if (id.endsWith('.ppm')) {
          const buffer = fs.readFileSync(id);
          const uint8Array = new Uint8Array(buffer);
          const parsedData = parsePPM(uint8Array);
          return `export default ${JSON.stringify(parsedData)};`;
        }
      },
    },
  ],

  test: {
    globals: true,
    cache: {
      dir: 'node_modules/.vitest',
    },
    environment: 'node',
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],

    reporters: ['default'],
  },
});
