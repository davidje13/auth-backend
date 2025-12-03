import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';
import { dts } from 'rollup-plugin-dts';

const modules = ['backend', 'jwt', 'mock'];

const plugins = [
  typescript({
    compilerOptions: {
      noEmit: false,
      declaration: true,
      module: 'esnext',
      rootDir: '.',
      declarationDir: './build/types',
    },
    tslib: {},
    exclude: ['**/*.test.*', 'test-helpers/**'],
  }),
  terser({
    format: { ascii_only: true },
    mangle: { properties: { regex: /^_/ } },
  }),
];

export default [
  {
    input: Object.fromEntries(modules.map((module) => [module, `${module}/index.ts`])),
    output: {
      dir: 'build',
      format: 'esm',
      entryFileNames: '[name]/index.mjs',
      paths: (p) => p.replace(/.+\/(jwt)$/, '$1/index.mjs'),
    },
    external: [/node:.*/, /\/jwt$/],
    plugins,
  },
  ...modules.map((module) => ({
    input: `./build/types/${module}/index.d.ts`,
    output: [{ file: `build/${module}/index.d.ts`, format: 'esm' }],
    external: [/node:.*/],
    plugins: [dts()],
  })),
];
