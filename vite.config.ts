/// <reference types='vitest' />
import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';

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
      transform(_, id) {
        if (id.endsWith('.ppm')) {
          const buffer = fs.readFileSync(id);

          return `
            import parsePPM from 'ppm-parser';

            const data = new Uint8Array(${JSON.stringify(Array.from(buffer))});
            export default parsePPM(data);
          `;
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
